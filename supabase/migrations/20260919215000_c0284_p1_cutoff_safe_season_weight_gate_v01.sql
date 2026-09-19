-- C0284 P1: one canonical season-weight schedule and a cutoff-safe integrity gate.

create or replace function private.current_season_weight_v01(
  p_matches integer,
  p_prior_source text default null
) returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select case
    when coalesce(p_matches, 0) <= 0 then 0.00::numeric
    when p_matches between 1 and 4 then 0.75::numeric
    when p_matches = 5 then 0.80::numeric
    when p_matches = 6 then 0.85::numeric
    when p_matches = 7 then 0.90::numeric
    when p_matches = 8 then 0.95::numeric
    else 1.00::numeric
  end;
$$;

comment on function private.current_season_weight_v01(integer,text) is
  'Canonical current-season share: 75% for matches 1-4, then 80/85/90/95%, reaching 100% at 9+. Prior source never changes this schedule.';

create or replace function private.current_season_weight_v01(
  p_matches bigint,
  p_prior_source text default null
) returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select private.current_season_weight_v01(p_matches::integer,p_prior_source);
$$;

comment on function private.current_season_weight_v01(bigint,text) is
  'Bigint adapter for aggregate count() callers; delegates to the canonical integer schedule.';

create or replace view public.current_season_state_integrity_v01
with (security_invoker = true)
as
with latest as (
  select distinct on (s.season_start, s.team_id) s.*
  from public.current_season_team_performance_states s
  order by s.season_start, s.team_id, s.as_of desc, s.id desc
), result_rows as (
  select l.season_start, l.team_id, l.as_of,
         m.home_score goals_for, m.away_score goals_against,
         case when fd_xg.xg is not null or us.xg_for is not null or fci.xg_for is not null then 1 else 0 end has_xg
  from latest l
  join public.matches m on m.home_team_id=l.team_id and m.source='fpl' and m.finished and m.gameweek between 1 and 38 and m.kickoff_time<l.as_of
  left join lateral (
    select case when tmi.venue='home' then nullif(tmi.raw->>'HxG','')::numeric else nullif(tmi.raw->>'AxG','')::numeric end xg
    from public.team_match_intelligence tmi where tmi.source='football-data.co.uk' and tmi.team_id=l.team_id and tmi.fixture_kickoff::date=m.kickoff_time::date
    order by tmi.captured_at desc limit 1
  ) fd_xg on true
  left join lateral (
    select tmi.xg_for from public.team_match_intelligence tmi where tmi.source='understat' and tmi.team_id=l.team_id and tmi.fixture_kickoff::date=m.kickoff_time::date
    order by tmi.captured_at desc limit 1
  ) us on true
  left join lateral (
    select tmi.xg_for from public.team_match_intelligence tmi where tmi.source='fpl_core_insights_premier_league' and tmi.team_id=l.team_id and (tmi.match_id=m.id or tmi.fixture_kickoff::date=m.kickoff_time::date)
    order by tmi.captured_at desc limit 1
  ) fci on true
  union all
  select l.season_start, l.team_id, l.as_of,
         m.away_score, m.home_score,
         case when fd_xg.xg is not null or us.xg_for is not null or fci.xg_for is not null then 1 else 0 end
  from latest l
  join public.matches m on m.away_team_id=l.team_id and m.source='fpl' and m.finished and m.gameweek between 1 and 38 and m.kickoff_time<l.as_of
  left join lateral (
    select case when tmi.venue='home' then nullif(tmi.raw->>'HxG','')::numeric else nullif(tmi.raw->>'AxG','')::numeric end xg
    from public.team_match_intelligence tmi where tmi.source='football-data.co.uk' and tmi.team_id=l.team_id and tmi.fixture_kickoff::date=m.kickoff_time::date
    order by tmi.captured_at desc limit 1
  ) fd_xg on true
  left join lateral (
    select tmi.xg_for from public.team_match_intelligence tmi where tmi.source='understat' and tmi.team_id=l.team_id and tmi.fixture_kickoff::date=m.kickoff_time::date
    order by tmi.captured_at desc limit 1
  ) us on true
  left join lateral (
    select tmi.xg_for from public.team_match_intelligence tmi where tmi.source='fpl_core_insights_premier_league' and tmi.team_id=l.team_id and (tmi.match_id=m.id or tmi.fixture_kickoff::date=m.kickoff_time::date)
    order by tmi.captured_at desc limit 1
  ) fci on true
), actual as (
  select season_start, team_id, count(*)::integer result_sample_count,
         sum(has_xg)::integer xg_sample_count,
         avg(goals_for)::numeric goals_for_90,
         avg(goals_against)::numeric goals_against_90
  from result_rows group by season_start, team_id
)
select l.season_start, l.team_id, l.as_of,
       l.completed_matches state_result_sample_count,
       coalesce(a.result_sample_count,0) result_sample_count,
       coalesce(a.xg_sample_count,0) xg_sample_count,
       private.current_season_weight_v01(l.completed_matches,l.prior_source) expected_current_weight,
       1-private.current_season_weight_v01(l.completed_matches,l.prior_source) expected_prior_weight,
       l.base_current_weight stored_current_weight,
       (l.completed_matches=coalesce(a.result_sample_count,0)) result_sample_ok,
       (abs(l.current_goals_for_90-a.goals_for_90)<0.000001 and abs(l.current_goals_against_90-a.goals_against_90)<0.000001) result_totals_ok,
       (abs(l.base_current_weight-private.current_season_weight_v01(l.completed_matches,l.prior_source))<0.000001) weight_schedule_ok,
       (coalesce(a.xg_sample_count,0)=coalesce(a.result_sample_count,0)) full_xg_coverage,
       case
         when l.completed_matches<>coalesce(a.result_sample_count,0) then 'BLOCK_RESULT_SAMPLE_MISMATCH'
         when not (abs(l.current_goals_for_90-a.goals_for_90)<0.000001 and abs(l.current_goals_against_90-a.goals_against_90)<0.000001) then 'BLOCK_RESULT_TOTAL_MISMATCH'
         when abs(l.base_current_weight-private.current_season_weight_v01(l.completed_matches,l.prior_source))>=0.000001 then 'BLOCK_WEIGHT_SCHEDULE_MISMATCH'
         when coalesce(a.xg_sample_count,0)<coalesce(a.result_sample_count,0) then 'WARN_PARTIAL_XG_COVERAGE'
         else 'PASS'
       end integrity_status
from latest l
left join actual a using (season_start,team_id);

comment on view public.current_season_state_integrity_v01 is
  'Latest state reconciled to result rows at its own cutoff. Result and xG sample counts are deliberately separate; BLOCK statuses prevent publication.';

revoke all on public.current_season_state_integrity_v01 from anon;
grant select on public.current_season_state_integrity_v01 to authenticated, service_role;
