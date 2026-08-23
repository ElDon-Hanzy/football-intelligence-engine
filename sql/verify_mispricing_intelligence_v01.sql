-- Read-only verification queries for Mispricing Intelligence v0.1

-- 1) Raw historical coverage by source
select source,
       count(*) as team_rows,
       count(distinct (team_id, fixture_kickoff::date)) as canonical_team_matches,
       min(fixture_kickoff) as first_match,
       max(fixture_kickoff) as last_match,
       count(xg_for) as rows_with_xg,
       count(shots_for) as rows_with_shots
from public.team_match_intelligence
group by source
order by source;

-- 2) Exact duplicate source records should be impossible after unique-index fix
select source, source_match_id, team_id, count(*)
from public.team_match_intelligence
where source_match_id is not null
group by source, source_match_id, team_id
having count(*) > 1;

-- 3) Feature coverage by GW/team
select gameweek,
       count(*) as team_fixture_rows,
       count(l10_xg_for) as rows_with_l10_xg,
       count(rest_days) as rows_with_rest,
       min(rest_days) as min_rest_days,
       max(rest_days) as max_rest_days
from public.team_intelligence_features
group by gameweek
order by gameweek;

-- 4) Signal counts and confidence distribution
select gameweek, signal_family, signal_key,
       count(*) as signals,
       round(avg(confidence)::numeric,3) as avg_confidence,
       min(confidence) as min_confidence,
       max(confidence) as max_confidence,
       count(*) filter (where direction=1) as positive,
       count(*) filter (where direction=0) as neutral,
       count(*) filter (where direction=-1) as negative
from public.fixture_intelligence_signals
group by gameweek, signal_family, signal_key
order by gameweek, signal_family, signal_key;

-- 5) Safety invariant: observational signals must not affect model yet
select count(*) as accidentally_enabled_signals
from public.fixture_intelligence_signals
where model_effect_enabled is true;
