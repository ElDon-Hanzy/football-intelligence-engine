create or replace view public.correct_score_edge_consensus
with (security_invoker=true)
as
select
  odds_selection_id,
  prediction_snapshot_id,
  gameweek,
  match_id,
  raw_snapshot_id,
  bookmaker,
  market_key,
  selection_key,
  selection_name,
  decimal_odds,
  max(model_probability) as model_probability,
  max(expected_value) as expected_value,
  min(conditional_edge) as min_edge_across_methods,
  max(conditional_edge) as max_edge_across_methods,
  max(market_overround) as market_overround,
  min(model_offered_mass) as model_offered_mass,
  count(distinct devig_method)::integer as devig_method_count,
  odds_captured_at,
  model_captured_at,
  kickoff_time,
  bool_and(chronology_valid) as chronology_valid,
  false as model_effect_enabled,
  case
    when count(distinct devig_method)>=2 and max(expected_value)>0 and min(conditional_edge)>0
      then 'ROBUST_POSITIVE_EV'
    when max(expected_value)>0
      then 'POSITIVE_EV_METHOD_SENSITIVE'
    when max(expected_value)<=0 and max(conditional_edge)>0
      then 'DEVIG_EDGE_BUT_NEGATIVE_EV'
    else 'NO_POSITIVE_EV'
  end as research_status,
  case
    when count(distinct devig_method)>=2 and min(model_offered_mass)>=0.98 and max(market_overround)<=1.35 then 'HIGH'
    when min(model_offered_mass)>=0.95 and max(market_overround)<=1.50 then 'MEDIUM'
    else 'LOW'
  end as evidence_quality
from public.betting_edge_observations
where market_key='correct_score' and chronology_valid=true
group by
  odds_selection_id,prediction_snapshot_id,gameweek,match_id,raw_snapshot_id,
  bookmaker,market_key,selection_key,selection_name,decimal_odds,
  odds_captured_at,model_captured_at,kickoff_time;

revoke all on table public.correct_score_edge_consensus from anon,authenticated;
grant select on table public.correct_score_edge_consensus to service_role;