create or replace view private.c0197_shot_side_quality_v01 as
with shot_agg_current as (
  select season, gameweek, match_id, is_home,
         count(*)::numeric as shot_event_count,
         count(*) filter (where outcome in ('goal','save'))::numeric as derived_sot,
         sum(xg) as shot_xg,
         sum(xgot) as shot_xgot,
         count(*) filter (where xg is null) as missing_xg_shots
  from public.research_c0197_shot_events
  where match_id is not null
  group by season, gameweek, match_id, is_home
),
shot_agg_historical as (
  select season, gameweek, source_match_id, source_team_code,
         count(*)::numeric as shot_event_count,
         count(*) filter (where outcome in ('goal','save'))::numeric as derived_sot,
         sum(xg) as shot_xg,
         sum(xgot) as shot_xgot,
         count(*) filter (where xg is null) as missing_xg_shots
  from public.research_c0197_shot_events
  where match_id is null and source_team_code is not null
  group by season, gameweek, source_match_id, source_team_code
),
joined as (
  select t.season,t.gameweek,t.source_match_id,t.match_id,t.source_team_code,t.team_id,t.venue,
         t.shots_for as team_shots,t.shots_on_target_for as team_sot,t.xg_for as team_xg,t.xgot_for as team_xgot,
         s.shot_event_count,s.derived_sot,s.shot_xg,s.shot_xgot,s.missing_xg_shots
  from public.research_c0197_team_match_evidence t
  join shot_agg_current s on t.match_id=s.match_id and s.is_home=(t.venue='home') and t.season=s.season and t.gameweek=s.gameweek
  where t.match_id is not null
  union all
  select t.season,t.gameweek,t.source_match_id,t.match_id,t.source_team_code,t.team_id,t.venue,
         t.shots_for,t.shots_on_target_for,t.xg_for,t.xgot_for,
         s.shot_event_count,s.derived_sot,s.shot_xg,s.shot_xgot,s.missing_xg_shots
  from public.research_c0197_team_match_evidence t
  join shot_agg_historical s on t.source_match_id=s.source_match_id and t.source_team_code=s.source_team_code and t.season=s.season and t.gameweek=s.gameweek
  where t.match_id is null and t.source_team_code is not null
)
select *,
       (team_shots=shot_event_count and team_sot=derived_sot) as counts_reconcile,
       abs(coalesce(team_xg,0)-coalesce(shot_xg,0)) as xg_abs_diff,
       abs(coalesce(team_xgot,0)-coalesce(shot_xgot,0)) as xgot_abs_diff,
       (team_shots=shot_event_count and team_sot=derived_sot and missing_xg_shots=0) as esot_training_eligible,
       case when team_shots=shot_event_count and team_sot=derived_sot and missing_xg_shots=0 then 'PASS' else 'REVIEW' end as quality_status
from joined;

create or replace function private.c0197_shot_reconciliation_status_v01()
returns jsonb
language sql
security definer
set search_path=public,private,pg_temp
as $$
select jsonb_build_object(
 'change_id','C0197',
 'by_season',(select coalesce(jsonb_agg(x order by x.season),'[]'::jsonb) from (
   select season,
          count(*) as team_sides,
          count(*) filter(where counts_reconcile) as count_reconciled_sides,
          count(*) filter(where esot_training_eligible) as esot_eligible_sides,
          round(avg(xg_abs_diff),4) as avg_xg_abs_diff,
          round(percentile_cont(0.5) within group(order by xg_abs_diff)::numeric,4) as median_xg_abs_diff,
          round(percentile_cont(0.9) within group(order by xg_abs_diff)::numeric,4) as p90_xg_abs_diff,
          round(avg(xgot_abs_diff),4) as avg_xgot_abs_diff,
          round(percentile_cont(0.5) within group(order by xgot_abs_diff)::numeric,4) as median_xgot_abs_diff,
          round(percentile_cont(0.9) within group(order by xgot_abs_diff)::numeric,4) as p90_xgot_abs_diff
   from private.c0197_shot_side_quality_v01 group by season
 ) x),
 'review_sides',(select coalesce(jsonb_agg(jsonb_build_object('season',season,'gameweek',gameweek,'source_match_id',source_match_id,'match_id',match_id,'source_team_code',source_team_code,'team_id',team_id,'venue',venue,'team_shots',team_shots,'shot_event_count',shot_event_count,'team_sot',team_sot,'derived_sot',derived_sot,'xg_abs_diff',xg_abs_diff,'xgot_abs_diff',xgot_abs_diff) order by season,gameweek,source_match_id,venue),'[]'::jsonb) from private.c0197_shot_side_quality_v01 where quality_status='REVIEW')
);
$$;
revoke all on function private.c0197_shot_reconciliation_status_v01() from public,anon,authenticated;
