create or replace view public.correct_score_clv_consensus
with (security_invoker = true)
as
select
  gameweek,
  match_id,
  bookmaker,
  selection_key,
  max(selection_name) as selection_name,
  entry_raw_snapshot_id,
  max(entry_captured_at) as entry_captured_at,
  max(entry_seconds_before_kickoff) as entry_seconds_before_kickoff,
  max(entry_decimal_odds) as entry_decimal_odds,
  max(entry_model_probability) as entry_model_probability,
  max(entry_expected_value) as entry_expected_value,
  closing_proxy_raw_snapshot_id,
  max(closing_proxy_decimal_odds) as closing_proxy_decimal_odds,
  max(closing_proxy_captured_at) as closing_proxy_captured_at,
  max(closing_proxy_seconds_before_kickoff) as closing_proxy_seconds_before_kickoff,
  max(closing_proxy_recency_band) as closing_proxy_recency_band,
  max(price_clv) as price_clv,
  min(entry_conditional_edge) as min_entry_edge_across_methods,
  min(fair_probability_clv) as min_fair_probability_clv_across_methods,
  max(fair_probability_clv) as max_fair_probability_clv_across_methods,
  count(distinct devig_method)::integer as devig_method_count,
  bool_and(model_effect_enabled = false) as observational_only
from public.correct_score_clv_research
where is_closing_proxy_observation = false
group by gameweek,match_id,bookmaker,selection_key,entry_raw_snapshot_id,closing_proxy_raw_snapshot_id
having count(distinct devig_method) >= 2;

revoke all on public.correct_score_clv_consensus from public, anon, authenticated;
grant select on public.correct_score_clv_consensus to service_role;
