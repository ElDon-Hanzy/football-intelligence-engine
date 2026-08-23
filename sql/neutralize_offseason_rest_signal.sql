-- Evidence-quality correction: a long offseason gap is not a positive fatigue signal.
-- This remains observational and does not alter lambda/xPts.

create or replace function public.generate_observational_intelligence(p_gameweek integer)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  n_attack integer := 0;
  n_defence integer := 0;
  n_schedule integer := 0;
begin
  insert into public.fixture_intelligence_signals(match_id,gameweek,team_id,opponent_team_id,signal_family,signal_key,direction,magnitude,confidence,evidence,source,model_effect_enabled)
  select match_id,gameweek,team_id,opponent_team_id,'recent_performance','attacking_xg_trend',
    case when coalesce(l5_xg_for-l10_xg_for,0)>.12 then 1 when coalesce(l5_xg_for-l10_xg_for,0)<-.12 then -1 else 0 end,
    coalesce(l5_xg_for-l10_xg_for,0),least(1,coalesce(sample_l10,0)/10.0),
    jsonb_build_object('l5_xg_for',l5_xg_for,'l10_xg_for',l10_xg_for,'l5_xga',l5_xg_against,'l10_xga',l10_xg_against,'l5_goals_for',l5_goals_for,'l5_shots_for',l5_shots_for,'sample_l5',sample_l5,'sample_l10',sample_l10),
    'team_match_intelligence',false
  from public.team_intelligence_features
  where gameweek=p_gameweek and kickoff_time>now();
  get diagnostics n_attack=row_count;

  insert into public.fixture_intelligence_signals(match_id,gameweek,team_id,opponent_team_id,signal_family,signal_key,direction,magnitude,confidence,evidence,source,model_effect_enabled)
  select match_id,gameweek,team_id,opponent_team_id,'recent_performance','defensive_xga_trend',
    case when coalesce(l10_xg_against-l5_xg_against,0)>.12 then 1 when coalesce(l10_xg_against-l5_xg_against,0)<-.12 then -1 else 0 end,
    coalesce(l10_xg_against-l5_xg_against,0),least(1,coalesce(sample_l10,0)/10.0),
    jsonb_build_object('l5_xga',l5_xg_against,'l10_xga',l10_xg_against,'l5_goals_against',l5_goals_against,'l5_shots_against',l5_shots_against,'sample_l5',sample_l5,'sample_l10',sample_l10),
    'team_match_intelligence',false
  from public.team_intelligence_features
  where gameweek=p_gameweek and kickoff_time>now();
  get diagnostics n_defence=row_count;

  insert into public.fixture_intelligence_signals(match_id,gameweek,team_id,opponent_team_id,signal_family,signal_key,direction,magnitude,confidence,evidence,source,model_effect_enabled)
  select match_id,gameweek,team_id,opponent_team_id,'schedule_fatigue','rest_congestion',
    case when rest_days is null then 0 when rest_days>21 then 0 when rest_days<4 or matches_prev_7d>=3 then -1 when rest_days between 7 and 14 then 1 else 0 end,
    case when rest_days is null or rest_days>21 then 0 when rest_days<4 then 4-rest_days when matches_prev_7d>=3 then greatest(1,3-rest_days) when rest_days between 7 and 14 then least(rest_days-6,2) else 0 end,
    case when previous_match is null then .25 else .9 end,
    jsonb_build_object('rest_days',rest_days,'matches_prev_7d',matches_prev_7d,'matches_prev_14d',matches_prev_14d,'congestion_band',congestion_band,'offseason_gap',coalesce(rest_days>21,false)),
    'fixture_schedule',false
  from public.team_intelligence_features
  where gameweek=p_gameweek and kickoff_time>now();
  get diagnostics n_schedule=row_count;

  return n_attack+n_defence+n_schedule;
end $$;

revoke all on function public.generate_observational_intelligence(integer) from public, anon, authenticated;
grant execute on function public.generate_observational_intelligence(integer) to service_role;
