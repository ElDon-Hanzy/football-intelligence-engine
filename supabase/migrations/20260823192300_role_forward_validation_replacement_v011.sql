-- Forward role validation and observational replacement-quality proxy.
-- Neither layer affects model forecasts.

create or replace function public.refresh_role_forward_validation_v02()
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare n integer:=0;
begin
  with pred as materialized (
    select distinct on (r.match_id,r.player_id) r.*,rp.feature_vector predicted_vector
    from public.player_fixture_role_observations r
    join public.player_role_profile_observations rp on rp.player_id=r.player_id and rp.observation_hash=r.evidence->>'role_profile_hash'
    where r.taxonomy_version like 'event_role_v0.2%'
    order by r.match_id,r.player_id,r.captured_at desc,r.id desc
  ), actual as materialized (
    select pm.match_id,pm.player_id,m.gameweek,pm.raw,pm.minutes,
      jsonb_build_object(
        'shot_threat',private.weighted_mean(array[private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'xg')/pm.minutes end,.35),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'total_shots')/pm.minutes end,2.2)],array[.62,.38]::numeric[]),
        'box_occupation',private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'touches_opposition_box')/pm.minutes end,4),
        'creation',private.weighted_mean(array[private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'xa')/pm.minutes end,.25),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'chances_created')/pm.minutes end,1.5),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'final_third_passes')/pm.minutes end,8)],array[.42,.30,.28]::numeric[]),
        'width',private.weighted_mean(array[private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'accurate_crosses')/pm.minutes end,1.5),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'successful_dribbles')/pm.minutes end,1.2),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'final_third_passes')/pm.minutes end,8)],array[.45,.35,.20]::numeric[]),
        'defensive_load',private.weighted_mean(array[private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'tackles')/pm.minutes end,2),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'interceptions')/pm.minutes end,1.4),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'recoveries')/pm.minutes end,5),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'clearances')/pm.minutes end,4)],array[.25,.20,.25,.30]::numeric[]),
        'progression',private.weighted_mean(array[private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'final_third_passes')/pm.minutes end,8),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'accurate_long_balls')/pm.minutes end,4),private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'accurate_passes')/pm.minutes end,35)],array[.45,.25,.30]::numeric[]),
        'aerial',private.unit_score(case when pm.minutes>0 then 90*private.json_num(pm.raw,'aerial_duels_won')/pm.minutes end,2.2)
      ) realized_vector
    from public.player_matches pm join public.matches m on m.id=pm.match_id
    where pm.source='fpl_core_insights_premier_league' and coalesce(pm.minutes,0)>=30 and m.finished=true
  ), src as materialized (
    select a.*,p.id pre_match_role_observation_id,p.taxonomy_version,p.primary_role,p.predicted_vector,private.role_vector_similarity(p.predicted_vector,a.realized_vector) similarity
    from actual a join pred p on p.match_id=a.match_id and p.player_id=a.player_id
  ), ins as (
    insert into public.player_role_validation_observations(match_id,gameweek,player_id,pre_match_role_observation_id,predicted_taxonomy_version,predicted_primary_role,realized_vector,axis_similarity,exact_label_match,evidence,observation_hash,model_effect_enabled)
    select match_id,gameweek,player_id,pre_match_role_observation_id,taxonomy_version,primary_role,realized_vector,round(similarity,4),null,
      jsonb_build_object('method','forward_axis_similarity_v0.2','minimum_realized_minutes',30,'label_match_not_scored_yet',true,'post_match_validation_only',true,'model_effect_enabled',false),
      md5(jsonb_build_object('match_id',match_id,'player_id',player_id,'pre_role_obs',pre_match_role_observation_id,'realized_vector',realized_vector)::text),false
    from src on conflict(match_id,player_id,observation_hash) do nothing returning 1
  ) select count(*) into n from ins;
  return jsonb_build_object('ok',true,'inserted',n,'validation','axis_similarity_v0.2','model_effect_enabled',false);
end $$;
revoke all on function public.refresh_role_forward_validation_v02() from public,anon,authenticated;
grant execute on function public.refresh_role_forward_validation_v02() to service_role;

create or replace function public.refresh_replacement_quality_v011(p_gameweek integer default null)
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare n integer:=0; v_now timestamptz:=clock_timestamp(); v_gw integer:=p_gameweek;
begin
  if v_gw is null then select m.gameweek into v_gw from public.matches m where m.source='fpl' and m.gameweek is not null and m.kickoff_time>v_now order by m.kickoff_time limit 1; end if;
  if v_gw is null then return jsonb_build_object('ok',true,'gameweek',null,'inserted',0); end if;
  with future as materialized (
    select * from public.current_player_fixture_availability a where a.gameweek=v_gw and a.kickoff_time>v_now
  ), target_base as materialized (
    select a.*,p.position target_position,rp.id target_role_profile_id,rp.taxonomy_version target_taxonomy,rp.primary_role target_role,rp.confidence target_role_conf,rp.feature_vector target_vector,
      ps.id target_state_id,ps.xg90 target_xg90,ps.xa90 target_xa90,ps.cbirt90 target_cbirt90,ps.state target_state,
      case when private.json_num(ps.state->'historical_pl','matches')>0 then
        (private.json_num(ps.state->'historical_pl','starts')/private.json_num(ps.state->'historical_pl','matches')) * least(1,coalesce(private.json_num(ps.state->'historical_pl','minutes'),0)/900)
      end hist_relevance,
      case when private.json_num(ps.state->'preseason','apps')>0 then
        (private.json_num(ps.state->'preseason','starts')/private.json_num(ps.state->'preseason','apps')) * least(1,coalesce(private.json_num(ps.state->'preseason','minutes'),0)/180)
      end pre_relevance
    from future a join public.players p on p.id=a.player_id
    left join public.current_player_role_profiles rp on rp.player_id=a.player_id and rp.taxonomy_version like 'event_role_v0.2%' and rp.evidence_cutoff<a.kickoff_time
    left join public.current_player_state_latest ps on ps.player_id=a.player_id and ps.as_of<a.kickoff_time
    where a.availability_status in ('DOUBTFUL','INJURED','SUSPENDED','UNAVAILABLE')
  ), target_scored as materialized (
    select t.*,private.weighted_mean(array[hist_relevance,pre_relevance,case when availability_status='DOUBTFUL' then base_start_probability else null end]::numeric[],array[.55,.20,.25]::numeric[]) absence_relevance
    from target_base t
  ), targets as materialized (
    select * from target_scored where (availability_status='DOUBTFUL' and coalesce(base_start_probability,0)>=.35) or (availability_status in ('INJURED','SUSPENDED','UNAVAILABLE') and coalesce(absence_relevance,0)>=.35)
  ), candidates0 as materialized (
    select t.*,c.id candidate_availability_observation_id,c.player_id candidate_player_id,cp.position candidate_position,
      crp.id candidate_role_profile_id,crp.taxonomy_version candidate_taxonomy,crp.primary_role candidate_role,crp.confidence candidate_role_conf,crp.feature_vector candidate_vector,
      cs.id candidate_state_id,cs.xg90 candidate_xg90,cs.xa90 candidate_xa90,cs.cbirt90 candidate_cbirt90
    from targets t join future c on c.match_id=t.match_id and c.team_id=t.team_id and c.player_id<>t.player_id and c.availability_status='AVAILABLE' and c.expected_xi=false
    join public.players cp on cp.id=c.player_id
    left join public.current_player_role_profiles crp on crp.player_id=c.player_id and crp.taxonomy_version like 'event_role_v0.2%' and crp.evidence_cutoff<t.kickoff_time
    left join public.current_player_state_latest cs on cs.player_id=c.player_id and cs.as_of<t.kickoff_time
  ), candidates as materialized (
    select c.*,
      case when candidate_position=target_position then true
           when target_role='WIDE_BACK' and candidate_position='MID' and candidate_role='WING_BACK' then true
           when target_role='WING_BACK' and candidate_position='DEF' and candidate_role='WIDE_BACK' then true
           when target_role='WIDE_ATTACKER' and candidate_position='FWD' and candidate_role='WIDE_FORWARD' then true
           when target_role='WIDE_FORWARD' and candidate_position='MID' and candidate_role='WIDE_ATTACKER' then true
           when target_role='HOLDING_MIDFIELDER' and candidate_position='DEF' and candidate_role='HYBRID_DEFENDER' then true
           else false end position_role_compatible
    from candidates0 c
    where (target_position='GKP' and candidate_position='GKP') or (target_position<>'GKP' and candidate_position<>'GKP')
  ), scored as materialized (
    select c.*,
      case when not position_role_compatible or target_role_profile_id is null or candidate_role_profile_id is null or coalesce(target_role_conf,0)<.45 or coalesce(candidate_role_conf,0)<.45 then null else private.role_vector_similarity(target_vector,candidate_vector) end role_fit,
      case when target_role is null or target_role='UNRESOLVED' then null else private.role_production_score(target_role,target_xg90,target_xa90,target_cbirt90) end target_prod,
      case when target_role is null or target_role='UNRESOLVED' then null else private.role_production_score(target_role,candidate_xg90,candidate_xa90,candidate_cbirt90) end candidate_prod
    from candidates c where position_role_compatible
  ), calc as materialized (
    select s.*,case when target_prod is not null and target_prod>.05 and candidate_prod is not null then least(1,candidate_prod/target_prod) end continuity,
      case when role_fit is not null and target_prod is not null and target_prod>.05 and candidate_prod is not null then .72*role_fit+.28*least(1,candidate_prod/target_prod) when role_fit is not null then role_fit end composite,
      case when role_fit is null then 'INSUFFICIENT_ROLE_EVIDENCE' when target_prod is null or target_prod<=.05 or candidate_prod is null then 'ROLE_FIT_ONLY' else 'PROXY_NOT_VALIDATED' end status
    from scored s
  ), ranked as materialized (
    select c.*,row_number() over(partition by match_id,player_id order by composite desc nulls last,role_fit desc nulls last,candidate_role_conf desc nulls last,candidate_player_id) rn
    from calc c
  ), ins as (
    insert into public.player_replacement_quality_observations(match_id,gameweek,team_id,opponent_team_id,target_player_id,candidate_player_id,kickoff_time,captured_at,target_role_profile_id,candidate_role_profile_id,target_availability_observation_id,candidate_availability_observation_id,target_primary_role,candidate_primary_role,role_fit_score,production_continuity_score,composite_score,candidate_rank,quality_status,confidence,evidence,observation_hash,model_effect_enabled)
    select match_id,gameweek,team_id,opponent_team_id,player_id,candidate_player_id,kickoff_time,v_now,target_role_profile_id,candidate_role_profile_id,id,candidate_availability_observation_id,target_role,candidate_role,round(role_fit,4),round(continuity,4),round(composite,4),rn,status,
      round(least(coalesce(target_role_conf,.25),coalesce(candidate_role_conf,.25),coalesce(confidence,.5))*.85,4),
      jsonb_build_object('method','replacement_proxy_v0.1.1','target_availability_status',availability_status,'absence_relevance_proxy',round(absence_relevance,4),'historical_relevance',round(hist_relevance,4),'preseason_relevance',round(pre_relevance,4),'target_position',target_position,'candidate_position',candidate_position,'position_role_compatible',position_role_compatible,'target_taxonomy',target_taxonomy,'candidate_taxonomy',candidate_taxonomy,'target_state_id',target_state_id,'candidate_state_id',candidate_state_id,'role_fit_weight',.72,'production_continuity_weight',.28,'candidate_pool','available non-XI same-team players; same FPL position by default with explicit role bridges only','sample_size_scaled_absence_relevance',true,'unresolved_labels_can_use_same-position behavioral vector fit only',true,'ability_and_team_tactical_effect_not_validated',true,'replacement_quality_is_observational_proxy',true,'model_effect_enabled',false),
      md5(jsonb_build_object('method','replacement_proxy_v0.1.1','match_id',match_id,'target',player_id,'candidate',candidate_player_id,'target_role_profile',target_role_profile_id,'candidate_role_profile',candidate_role_profile_id,'target_availability',id,'candidate_availability',candidate_availability_observation_id,'role_fit',round(role_fit,4),'continuity',round(continuity,4),'status',status)::text),false
    from ranked where rn<=5 on conflict(match_id,target_player_id,candidate_player_id,observation_hash) do nothing returning 1
  ) select count(*) into n from ins;
  return jsonb_build_object('ok',true,'gameweek',v_gw,'inserted',n,'method','replacement_proxy_v0.1.1','model_effect_enabled',false);
end $$;
revoke all on function public.refresh_replacement_quality_v011(integer) from public,anon,authenticated;
grant execute on function public.refresh_replacement_quality_v011(integer) to service_role;
