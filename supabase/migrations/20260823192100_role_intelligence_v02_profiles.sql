-- Multi-source behavioral role profile layer v0.2.
-- Historical EPL is a capped prior; preseason is weak; current competitive evidence dominates progressively.

create or replace function private.weighted_mean(p_values numeric[],p_weights numeric[])
returns numeric
language sql
immutable
set search_path=pg_catalog
as $$
  select case when sum(w) filter(where v is not null)>0
    then sum(v*w) filter(where v is not null)/sum(w) filter(where v is not null)
  end
  from unnest(p_values,p_weights) as x(v,w)
$$;
revoke all on function private.weighted_mean(numeric[],numeric[]) from public,anon,authenticated;
grant execute on function private.weighted_mean(numeric[],numeric[]) to service_role;

create or replace function private.role_vector_similarity(a jsonb,b jsonb)
returns numeric
language sql
immutable
set search_path=private,pg_catalog
as $$
  with k(key) as (values ('shot_threat'),('box_occupation'),('creation'),('width'),('defensive_load'),('progression'),('aerial')),
  v as (select private.json_num(a,key) x,private.json_num(b,key) y from k),
  d as (select count(*) filter(where x is not null and y is not null) n,avg(power(x-y,2)) filter(where x is not null and y is not null) mse from v)
  select case when n<4 or mse is null then null else greatest(0::numeric,least(1::numeric,1-sqrt(mse))) end from d
$$;
revoke all on function private.role_vector_similarity(jsonb,jsonb) from public,anon,authenticated;
grant execute on function private.role_vector_similarity(jsonb,jsonb) to service_role;

create or replace function private.role_production_score(p_role text,p_xg numeric,p_xa numeric,p_cbirt numeric)
returns numeric
language sql
immutable
set search_path=private,pg_catalog
as $$
select case
 when p_role in ('CENTRE_BACK','HYBRID_DEFENDER') then private.weighted_mean(array[private.unit_score(p_cbirt,8),private.unit_score(p_xa,.12),private.unit_score(p_xg,.10)],array[.70,.15,.15]::numeric[])
 when p_role in ('WIDE_BACK','WING_BACK') then private.weighted_mean(array[private.unit_score(p_cbirt,7),private.unit_score(p_xa,.18),private.unit_score(p_xg,.12)],array[.40,.40,.20]::numeric[])
 when p_role='HOLDING_MIDFIELDER' then private.weighted_mean(array[private.unit_score(p_cbirt,8),private.unit_score(p_xa,.15),private.unit_score(p_xg,.12)],array[.65,.25,.10]::numeric[])
 when p_role='BOX_TO_BOX' then private.weighted_mean(array[private.unit_score(p_cbirt,7),private.unit_score(p_xa,.20),private.unit_score(p_xg,.20)],array[.35,.30,.35]::numeric[])
 when p_role='CREATOR_10' then private.weighted_mean(array[private.unit_score(p_xa,.28),private.unit_score(p_xg,.22)],array[.68,.32]::numeric[])
 when p_role in ('WIDE_ATTACKER','WIDE_FORWARD') then private.weighted_mean(array[private.unit_score(p_xa,.25),private.unit_score(p_xg,.32)],array[.42,.58]::numeric[])
 when p_role in ('CENTRAL_STRIKER','TARGET_FORWARD') then private.weighted_mean(array[private.unit_score(p_xg,.40),private.unit_score(p_xa,.18)],array[.78,.22]::numeric[])
 when p_role='LINK_FORWARD' then private.weighted_mean(array[private.unit_score(p_xa,.28),private.unit_score(p_xg,.30)],array[.58,.42]::numeric[])
 else null end
$$;
revoke all on function private.role_production_score(text,numeric,numeric,numeric) from public,anon,authenticated;
grant execute on function private.role_production_score(text,numeric,numeric,numeric) to service_role;

create or replace function public.refresh_player_role_profiles_v02()
returns jsonb
language plpgsql
security invoker
set search_path=public,private,pg_temp
as $$
declare v_now timestamptz:=clock_timestamp(); v_inserted integer:=0;
begin
  with events as materialized (
    select h.player_id,p.position,'historical'::text bucket,'2026-05-25 23:59:59+00'::timestamptz evidence_time,h.minutes::numeric minutes,h.raw
    from public.historical_player_event_evidence h join public.players p on p.id=h.player_id
    where h.season='2025-2026' and coalesce(h.minutes,0)>0
    union all
    select pm.player_id,p.position,'preseason',m.kickoff_time,pm.minutes::numeric,pm.raw
    from public.player_matches pm join public.players p on p.id=pm.player_id join public.matches m on m.id=pm.match_id
    where pm.source='fpl_core_insights' and coalesce(pm.minutes,0)>0 and m.kickoff_time<v_now
    union all
    select pm.player_id,p.position,'competitive',m.kickoff_time,pm.minutes::numeric,pm.raw
    from public.player_matches pm join public.players p on p.id=pm.player_id join public.matches m on m.id=pm.match_id
    where pm.source='fpl_core_insights_premier_league' and coalesce(pm.minutes,0)>0 and m.kickoff_time<v_now
  ), parsed as materialized (
    select *,private.json_num(raw,'accurate_crosses') crosses,private.json_num(raw,'final_third_passes') final3,
      private.json_num(raw,'chances_created') chances,private.json_num(raw,'touches_opposition_box') box_touches,
      private.json_num(raw,'total_shots') shots,private.json_num(raw,'xg') xg,private.json_num(raw,'xa') xa,
      private.json_num(raw,'successful_dribbles') dribbles,private.json_num(raw,'tackles') tackles,
      private.json_num(raw,'interceptions') interceptions,private.json_num(raw,'recoveries') recoveries,
      private.json_num(raw,'clearances') clearances,private.json_num(raw,'aerial_duels_won') aerial,
      private.json_num(raw,'accurate_long_balls') long_balls,private.json_num(raw,'accurate_passes') passes
    from events
  ), bucketed as materialized (
    select player_id,max(position) position,bucket,max(evidence_time) evidence_cutoff,sum(minutes) minutes,
      90*sum(crosses)/nullif(sum(minutes) filter(where crosses is not null),0) cross90,
      90*sum(final3)/nullif(sum(minutes) filter(where final3 is not null),0) final390,
      90*sum(chances)/nullif(sum(minutes) filter(where chances is not null),0) chance90,
      90*sum(box_touches)/nullif(sum(minutes) filter(where box_touches is not null),0) box90,
      90*sum(shots)/nullif(sum(minutes) filter(where shots is not null),0) shots90,
      90*sum(xg)/nullif(sum(minutes) filter(where xg is not null),0) xg90,
      90*sum(xa)/nullif(sum(minutes) filter(where xa is not null),0) xa90,
      90*sum(dribbles)/nullif(sum(minutes) filter(where dribbles is not null),0) drib90,
      90*sum(tackles)/nullif(sum(minutes) filter(where tackles is not null),0) tackles90,
      90*sum(interceptions)/nullif(sum(minutes) filter(where interceptions is not null),0) interc90,
      90*sum(recoveries)/nullif(sum(minutes) filter(where recoveries is not null),0) recoveries90,
      90*sum(clearances)/nullif(sum(minutes) filter(where clearances is not null),0) clear90,
      90*sum(aerial)/nullif(sum(minutes) filter(where aerial is not null),0) aerial90,
      90*sum(long_balls)/nullif(sum(minutes) filter(where long_balls is not null),0) long90,
      90*sum(passes)/nullif(sum(minutes) filter(where passes is not null),0) passes90
    from parsed group by player_id,bucket
  ), massed as materialized (
    select *,case bucket when 'historical' then .55*least(1,minutes/1800) when 'preseason' then .15*least(1,minutes/360) when 'competitive' then .90*least(1,minutes/540) else 0 end mass
    from bucketed
  ), blended as materialized (
    select player_id,max(position) position,max(evidence_cutoff) evidence_cutoff,
      coalesce(sum(minutes) filter(where bucket='historical'),0) historical_minutes,
      coalesce(sum(minutes) filter(where bucket='preseason'),0) preseason_minutes,
      coalesce(sum(minutes) filter(where bucket='competitive'),0) competitive_minutes,
      coalesce(sum(mass) filter(where bucket='historical'),0) historical_mass,
      coalesce(sum(mass) filter(where bucket='preseason'),0) preseason_mass,
      coalesce(sum(mass) filter(where bucket='competitive'),0) competitive_mass,
      sum(cross90*mass) filter(where cross90 is not null)/nullif(sum(mass) filter(where cross90 is not null),0) cross90,
      sum(final390*mass) filter(where final390 is not null)/nullif(sum(mass) filter(where final390 is not null),0) final390,
      sum(chance90*mass) filter(where chance90 is not null)/nullif(sum(mass) filter(where chance90 is not null),0) chance90,
      sum(box90*mass) filter(where box90 is not null)/nullif(sum(mass) filter(where box90 is not null),0) box90,
      sum(shots90*mass) filter(where shots90 is not null)/nullif(sum(mass) filter(where shots90 is not null),0) shots90,
      sum(xg90*mass) filter(where xg90 is not null)/nullif(sum(mass) filter(where xg90 is not null),0) xg90,
      sum(xa90*mass) filter(where xa90 is not null)/nullif(sum(mass) filter(where xa90 is not null),0) xa90,
      sum(drib90*mass) filter(where drib90 is not null)/nullif(sum(mass) filter(where drib90 is not null),0) drib90,
      sum(tackles90*mass) filter(where tackles90 is not null)/nullif(sum(mass) filter(where tackles90 is not null),0) tackles90,
      sum(interc90*mass) filter(where interc90 is not null)/nullif(sum(mass) filter(where interc90 is not null),0) interc90,
      sum(recoveries90*mass) filter(where recoveries90 is not null)/nullif(sum(mass) filter(where recoveries90 is not null),0) recoveries90,
      sum(clear90*mass) filter(where clear90 is not null)/nullif(sum(mass) filter(where clear90 is not null),0) clear90,
      sum(aerial90*mass) filter(where aerial90 is not null)/nullif(sum(mass) filter(where aerial90 is not null),0) aerial90,
      sum(long90*mass) filter(where long90 is not null)/nullif(sum(mass) filter(where long90 is not null),0) long90,
      sum(passes90*mass) filter(where passes90 is not null)/nullif(sum(mass) filter(where passes90 is not null),0) passes90
    from massed group by player_id
  ), axes as materialized (
    select b.*,
      private.weighted_mean(array[private.unit_score(xg90,.35),private.unit_score(shots90,2.2)],array[.62,.38]::numeric[]) shot_threat,
      private.unit_score(box90,4) box_occupation,
      private.weighted_mean(array[private.unit_score(xa90,.25),private.unit_score(chance90,1.5),private.unit_score(final390,8)],array[.42,.30,.28]::numeric[]) creation,
      private.weighted_mean(array[private.unit_score(cross90,1.5),private.unit_score(drib90,1.2),private.unit_score(final390,8)],array[.45,.35,.20]::numeric[]) width,
      private.weighted_mean(array[private.unit_score(tackles90,2),private.unit_score(interc90,1.4),private.unit_score(recoveries90,5),private.unit_score(clear90,4)],array[.25,.20,.25,.30]::numeric[]) defensive_load,
      private.weighted_mean(array[private.unit_score(final390,8),private.unit_score(long90,4),private.unit_score(passes90,35)],array[.45,.25,.30]::numeric[]) progression,
      private.unit_score(aerial90,2.2) aerial
    from blended b
  ), scored as materialized (
    select a.player_id,s.role_label,s.score,row_number() over(partition by a.player_id order by s.score desc nulls last,s.role_label) rn
    from axes a cross join lateral (values
      ('GOALKEEPER',case when a.position='GKP' then 1::numeric end),
      ('CENTRE_BACK',case when a.position='DEF' then private.weighted_mean(array[a.defensive_load,a.aerial,a.progression,case when a.width is null then null else 1-a.width end],array[.45,.20,.20,.15]::numeric[]) end),
      ('WIDE_BACK',case when a.position='DEF' then private.weighted_mean(array[a.width,a.progression,a.defensive_load,a.box_occupation,a.creation],array[.28,.20,.18,.18,.16]::numeric[]) end),
      ('HYBRID_DEFENDER',case when a.position='DEF' then private.weighted_mean(array[a.defensive_load,a.width,a.progression,a.creation,a.box_occupation],array[.28,.18,.22,.16,.16]::numeric[]) end),
      ('HOLDING_MIDFIELDER',case when a.position='MID' then private.weighted_mean(array[a.defensive_load,a.progression,case when a.box_occupation is null then null else 1-a.box_occupation end,case when a.width is null then null else 1-a.width end],array[.45,.25,.15,.15]::numeric[]) end),
      ('BOX_TO_BOX',case when a.position='MID' then private.weighted_mean(array[a.defensive_load,a.progression,a.box_occupation,a.creation,a.shot_threat],array[.30,.22,.18,.18,.12]::numeric[]) end),
      ('CREATOR_10',case when a.position='MID' then private.weighted_mean(array[a.creation,a.progression,a.box_occupation,a.width],array[.45,.25,.15,.15]::numeric[]) end),
      ('WIDE_ATTACKER',case when a.position='MID' then private.weighted_mean(array[a.width,a.shot_threat,a.box_occupation,a.creation],array[.34,.26,.22,.18]::numeric[]) end),
      ('WING_BACK',case when a.position='MID' then private.weighted_mean(array[a.width,a.defensive_load,a.progression,a.box_occupation],array[.34,.30,.20,.16]::numeric[]) end),
      ('CENTRAL_STRIKER',case when a.position='FWD' then private.weighted_mean(array[a.shot_threat,a.box_occupation,a.aerial],array[.48,.34,.18]::numeric[]) end),
      ('LINK_FORWARD',case when a.position='FWD' then private.weighted_mean(array[a.creation,a.progression,a.box_occupation,a.shot_threat],array[.43,.22,.18,.17]::numeric[]) end),
      ('WIDE_FORWARD',case when a.position='FWD' then private.weighted_mean(array[a.width,a.shot_threat,a.box_occupation,a.creation],array[.34,.30,.22,.14]::numeric[]) end),
      ('TARGET_FORWARD',case when a.position='FWD' then private.weighted_mean(array[a.aerial,a.box_occupation,a.shot_threat,a.creation],array[.48,.27,.18,.07]::numeric[]) end)
    ) s(role_label,score) where s.score is not null
  ), top2 as materialized (
    select player_id,max(role_label) filter(where rn=1) top_role,max(score) filter(where rn=1) top_score,max(role_label) filter(where rn=2) second_role,max(score) filter(where rn=2) second_score from scored group by player_id
  ), f as materialized (
    select a.*,t.top_role,t.top_score,t.second_role,t.second_score,
      ((case when shot_threat is not null then 1 else 0 end)+(case when box_occupation is not null then 1 else 0 end)+(case when creation is not null then 1 else 0 end)+(case when width is not null then 1 else 0 end)+(case when defensive_load is not null then 1 else 0 end)+(case when progression is not null then 1 else 0 end)+(case when aerial is not null then 1 else 0 end))/7.0 coverage,
      least(1,(historical_mass+preseason_mass+competitive_mass)/.75) evidence_strength,
      least(1,greatest(0,coalesce(t.top_score,0)-coalesce(t.second_score,0))/.15) separation
    from axes a join top2 t using(player_id)
  ), final as materialized (
    select f.*,
      least(case when competitive_minutes<=0 then .72 when competitive_minutes<90 then .78 else .92 end,.15+.40*evidence_strength+.20*coverage+.25*separation) confidence,
      case when top_score is null or top_score<.38 or coverage<.43 or (.15+.40*evidence_strength+.20*coverage+.25*separation)<.45 or coalesce(top_score-second_score,0)<.025 then 'UNRESOLVED' else top_role end primary_role,
      case when top_score is null then null when top_score<.38 or coverage<.43 or (.15+.40*evidence_strength+.20*coverage+.25*separation)<.45 or coalesce(top_score-second_score,0)<.025 then top_role else second_role end secondary_role
    from f
  ), ins as (
    insert into public.player_role_profile_observations(player_id,observed_at,evidence_cutoff,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,confidence,weighted_minutes,competitive_minutes,preseason_minutes,feature_vector,evidence,observation_hash,model_effect_enabled)
    select player_id,v_now,evidence_cutoff,'event_role_v0.2',primary_role,secondary_role,round(top_score,4),round(second_score,4),round(confidence,4),
      round(least(historical_minutes,1800)*.30+least(preseason_minutes,360)*.30+least(competitive_minutes,540),2),round(competitive_minutes,2),round(preseason_minutes,2),
      jsonb_build_object('shot_threat',round(shot_threat,4),'box_occupation',round(box_occupation,4),'creation',round(creation,4),'width',round(width,4),'defensive_load',round(defensive_load,4),'progression',round(progression,4),'aerial',round(aerial,4),'cross90',round(cross90,4),'final_third_passes90',round(final390,4),'chances_created90',round(chance90,4),'box_touches90',round(box90,4),'shots90',round(shots90,4),'xg90',round(xg90,4),'xa90',round(xa90,4),'dribbles90',round(drib90,4),'tackles90',round(tackles90,4),'interceptions90',round(interc90,4),'recoveries90',round(recoveries90,4),'clearances90',round(clear90,4),'aerials_won90',round(aerial90,4),'long_balls90',round(long90,4),'passes90',round(passes90,4)),
      jsonb_build_object('method','multi_source_behavioral_role_v0.2','fpl_position_is_family_guardrail_not_exact_role',true,'historical_source','FPL-Core-Insights 2025-2026 EPL playermatchstats','historical_minutes',historical_minutes,'preseason_minutes',preseason_minutes,'competitive_minutes',competitive_minutes,'source_mass',jsonb_build_object('historical',round(historical_mass,4),'preseason',round(preseason_mass,4),'competitive',round(competitive_mass,4)),'missing_metrics_ignored_not_zero',true,'manual_role_research_not_used_as_training_input',true,'role_is_behavioral_archetype_not_exact_tactical_position',true,'model_effect_enabled',false),
      md5(jsonb_build_object('player_id',player_id,'taxonomy','event_role_v0.2','primary_role',primary_role,'secondary_role',secondary_role,'top_score',round(top_score,4),'second_score',round(second_score,4),'weighted_minutes',round(least(historical_minutes,1800)*.30+least(preseason_minutes,360)*.30+least(competitive_minutes,540),2),'competitive_minutes',round(competitive_minutes,2),'preseason_minutes',round(preseason_minutes,2),'axes',jsonb_build_array(round(shot_threat,4),round(box_occupation,4),round(creation,4),round(width,4),round(defensive_load,4),round(progression,4),round(aerial,4)))::text),false
    from final on conflict(player_id,observation_hash) do nothing returning 1
  ) select count(*) into v_inserted from ins;
  return jsonb_build_object('ok',true,'inserted',v_inserted,'taxonomy_version','event_role_v0.2','model_effect_enabled',false);
end $$;
revoke all on function public.refresh_player_role_profiles_v02() from public,anon,authenticated;
grant execute on function public.refresh_player_role_profiles_v02() to service_role;
