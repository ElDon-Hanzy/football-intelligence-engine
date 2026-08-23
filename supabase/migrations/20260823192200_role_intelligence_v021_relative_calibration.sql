-- Calibrate behavioral role axes relative to positional peers.
-- Ambiguity remains UNRESOLVED rather than being forced.

create or replace function public.refresh_player_role_profiles_v021()
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare v_now timestamptz:=clock_timestamp(); v_inserted integer:=0;
begin
  with base as materialized (
    select distinct on (player_id) * from public.player_role_profile_observations
    where taxonomy_version='event_role_v0.2'
    order by player_id,observed_at desc,id desc
  ), a as materialized (
    select b.*,p.position,
      private.json_num(b.feature_vector,'shot_threat') shot,
      private.json_num(b.feature_vector,'box_occupation') box,
      private.json_num(b.feature_vector,'creation') creation,
      private.json_num(b.feature_vector,'width') width,
      private.json_num(b.feature_vector,'defensive_load') defense,
      private.json_num(b.feature_vector,'progression') progression,
      private.json_num(b.feature_vector,'aerial') aerial,
      coalesce(private.json_num(b.evidence->'source_mass','historical'),0) historical_mass,
      coalesce(private.json_num(b.evidence->'source_mass','preseason'),0) preseason_mass,
      coalesce(private.json_num(b.evidence->'source_mass','competitive'),0) competitive_mass
    from base b join public.players p on p.id=b.player_id
  ), q as materialized (
    select a.*,
      case when shot is null then null else percent_rank() over(partition by position order by shot)::numeric end shot_p,
      case when box is null then null else percent_rank() over(partition by position order by box)::numeric end box_p,
      case when creation is null then null else percent_rank() over(partition by position order by creation)::numeric end creation_p,
      case when width is null then null else percent_rank() over(partition by position order by width)::numeric end width_p,
      case when defense is null then null else percent_rank() over(partition by position order by defense)::numeric end defense_p,
      case when progression is null then null else percent_rank() over(partition by position order by progression)::numeric end progression_p,
      case when aerial is null then null else percent_rank() over(partition by position order by aerial)::numeric end aerial_p
    from a
  ), s as materialized (
    select q.*,r.role_label,r.score,row_number() over(partition by q.player_id order by r.score desc nulls last,r.role_label) rn
    from q cross join lateral (values
      ('GOALKEEPER',case when q.position='GKP' then 1::numeric end),
      ('CENTRE_BACK',case when q.position='DEF' then private.weighted_mean(array[q.defense_p,q.aerial_p,q.progression_p,case when q.width_p is null then null else 1-q.width_p end]::numeric[],array[.35,.20,.20,.25]::numeric[]) end),
      ('WIDE_BACK',case when q.position='DEF' then private.weighted_mean(array[q.width_p,q.creation_p,q.box_p,q.progression_p,q.defense_p]::numeric[],array[.35,.20,.20,.15,.10]::numeric[]) end),
      ('HYBRID_DEFENDER',case when q.position='DEF' then private.weighted_mean(array[q.defense_p,q.width_p,q.progression_p,q.creation_p,q.box_p,q.aerial_p]::numeric[],array[.25,.20,.20,.15,.10,.10]::numeric[]) end),
      ('HOLDING_MIDFIELDER',case when q.position='MID' then private.weighted_mean(array[q.defense_p,q.progression_p,case when q.box_p is null then null else 1-q.box_p end,case when q.width_p is null then null else 1-q.width_p end]::numeric[],array[.45,.25,.20,.10]::numeric[]) end),
      ('BOX_TO_BOX',case when q.position='MID' then private.weighted_mean(array[q.defense_p,q.progression_p,q.box_p,q.creation_p,q.shot_p]::numeric[],array[.30,.25,.20,.15,.10]::numeric[]) end),
      ('CREATOR_10',case when q.position='MID' then private.weighted_mean(array[q.creation_p,q.progression_p,q.box_p,q.width_p,q.shot_p]::numeric[],array[.40,.25,.15,.10,.10]::numeric[]) end),
      ('WIDE_ATTACKER',case when q.position='MID' then private.weighted_mean(array[q.width_p,q.shot_p,q.box_p,q.creation_p,case when q.defense_p is null then null else 1-q.defense_p end]::numeric[],array[.30,.25,.20,.15,.10]::numeric[]) end),
      ('WING_BACK',case when q.position='MID' then private.weighted_mean(array[q.width_p,q.defense_p,q.progression_p,q.box_p,case when q.shot_p is null then null else 1-q.shot_p end]::numeric[],array[.30,.30,.20,.10,.10]::numeric[]) end),
      ('CENTRAL_STRIKER',case when q.position='FWD' then private.weighted_mean(array[q.shot_p,q.box_p,q.aerial_p,case when q.creation_p is null then null else 1-q.creation_p end]::numeric[],array[.35,.30,.15,.20]::numeric[]) end),
      ('LINK_FORWARD',case when q.position='FWD' then private.weighted_mean(array[q.creation_p,q.progression_p,q.box_p,q.shot_p,q.width_p]::numeric[],array[.40,.25,.15,.10,.10]::numeric[]) end),
      ('WIDE_FORWARD',case when q.position='FWD' then private.weighted_mean(array[q.width_p,q.shot_p,q.box_p,q.creation_p,case when q.aerial_p is null then null else 1-q.aerial_p end]::numeric[],array[.35,.25,.20,.15,.05]::numeric[]) end),
      ('TARGET_FORWARD',case when q.position='FWD' then private.weighted_mean(array[q.aerial_p,q.box_p,q.shot_p,case when q.width_p is null then null else 1-q.width_p end]::numeric[],array[.35,.25,.20,.20]::numeric[]) end)
    ) r(role_label,score) where r.score is not null
  ), top2 as materialized (
    select player_id,max(role_label) filter(where rn=1) top_role,max(score) filter(where rn=1) top_score,max(role_label) filter(where rn=2) second_role,max(score) filter(where rn=2) second_score from s group by player_id
  ), f as materialized (
    select q.*,t.top_role,t.top_score,t.second_role,t.second_score,
      ((case when shot is not null then 1 else 0 end)+(case when box is not null then 1 else 0 end)+(case when creation is not null then 1 else 0 end)+(case when width is not null then 1 else 0 end)+(case when defense is not null then 1 else 0 end)+(case when progression is not null then 1 else 0 end)+(case when aerial is not null then 1 else 0 end))/7.0 coverage,
      least(1,(historical_mass+preseason_mass+competitive_mass)/.75) evidence_strength,
      case when position='GKP' then 1::numeric else least(1,greatest(0,coalesce(t.top_score,0)-coalesce(t.second_score,0))/.18) end separation
    from q join top2 t using(player_id)
  ), final as materialized (
    select f.*,
      least(case when competitive_minutes<=0 then .72 when competitive_minutes<90 then .78 else .92 end,.12+.38*evidence_strength+.20*coverage+.30*separation) calibrated_confidence,
      case when position='GKP' then 'GOALKEEPER'
           when top_score is null or top_score<.35 or coverage<.43 or (.12+.38*evidence_strength+.20*coverage+.30*separation)<.48 or coalesce(top_score-second_score,0)<.05 then 'UNRESOLVED'
           else top_role end calibrated_primary_role,
      case when position='GKP' then null
           when top_score is null then null
           when top_score<.35 or coverage<.43 or (.12+.38*evidence_strength+.20*coverage+.30*separation)<.48 or coalesce(top_score-second_score,0)<.05 then top_role
           else second_role end calibrated_secondary_role
    from f
  ), ins as (
    insert into public.player_role_profile_observations(player_id,observed_at,evidence_cutoff,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,confidence,weighted_minutes,competitive_minutes,preseason_minutes,feature_vector,evidence,observation_hash,model_effect_enabled)
    select player_id,v_now,evidence_cutoff,'event_role_v0.2.1',calibrated_primary_role,calibrated_secondary_role,round(top_score,4),round(second_score,4),round(calibrated_confidence,4),weighted_minutes,competitive_minutes,preseason_minutes,
      feature_vector || jsonb_build_object('relative_percentiles',jsonb_build_object('shot_threat',round(shot_p,4),'box_occupation',round(box_p,4),'creation',round(creation_p,4),'width',round(width_p,4),'defensive_load',round(defense_p,4),'progression',round(progression_p,4),'aerial',round(aerial_p,4))),
      evidence || jsonb_build_object('calibration','position_relative_percentiles_v0.2.1','raw_axis_profile_hash',observation_hash,'unresolved_is_valid_output',true,'role_margin_threshold',.05,'minimum_role_score',.35,'manual_role_research_not_used_as_training_input',true,'model_effect_enabled',false),
      md5(jsonb_build_object('player_id',player_id,'taxonomy','event_role_v0.2.1','raw_profile_hash',observation_hash,'primary',calibrated_primary_role,'secondary',calibrated_secondary_role,'top_score',round(top_score,4),'second_score',round(second_score,4),'percentiles',jsonb_build_array(round(shot_p,4),round(box_p,4),round(creation_p,4),round(width_p,4),round(defense_p,4),round(progression_p,4),round(aerial_p,4)))::text),false
    from final on conflict(player_id,observation_hash) do nothing returning 1
  ) select count(*) into v_inserted from ins;
  return jsonb_build_object('ok',true,'inserted',v_inserted,'taxonomy_version','event_role_v0.2.1','model_effect_enabled',false);
end $$;
revoke all on function public.refresh_player_role_profiles_v021() from public,anon,authenticated;
grant execute on function public.refresh_player_role_profiles_v021() to service_role;
