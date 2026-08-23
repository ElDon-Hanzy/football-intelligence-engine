create index if not exists odds_market_selections_cs_history_idx
  on public.odds_market_selections (match_id, bookmaker, market_key, selection_key, captured_at desc)
  where market_key = 'correct_score';

create index if not exists betting_edge_observations_cs_history_idx
  on public.betting_edge_observations (match_id, bookmaker, market_key, selection_key, devig_method, odds_captured_at desc)
  where market_key = 'correct_score';

create or replace view public.correct_score_price_history
with (security_invoker = true)
as
select
  oms.id as odds_selection_id,
  oms.raw_snapshot_id,
  oms.gameweek,
  oms.match_id,
  oms.provider,
  oms.bookmaker,
  regexp_replace(oms.bookmaker, '\s*\(no latency\)\s*$', '', 'i') as bookmaker_family,
  oms.selection_key,
  oms.selection_name,
  oms.decimal_odds,
  oms.implied_probability,
  oms.source_timestamp,
  oms.captured_at,
  ors.event_kickoff as kickoff_time,
  greatest(0, extract(epoch from (ors.event_kickoff - oms.captured_at)))::bigint as seconds_before_kickoff
from public.odds_market_selections oms
join public.odds_raw_snapshots ors on ors.id = oms.raw_snapshot_id
where oms.market_key = 'correct_score'
  and ors.pre_kickoff = true
  and ors.event_kickoff is not null
  and oms.captured_at < ors.event_kickoff
  and (oms.source_timestamp is null or oms.source_timestamp < ors.event_kickoff);

revoke all on public.correct_score_price_history from public, anon, authenticated;
grant select on public.correct_score_price_history to service_role;

create or replace view public.correct_score_price_summary
with (security_invoker = true)
as
with h as (
  select * from public.correct_score_price_history
), opening as (
  select distinct on (match_id, bookmaker, selection_key)
    match_id, bookmaker, selection_key,
    raw_snapshot_id as opening_raw_snapshot_id,
    decimal_odds as opening_decimal_odds,
    implied_probability as opening_implied_probability,
    captured_at as opening_captured_at,
    seconds_before_kickoff as opening_seconds_before_kickoff
  from h
  order by match_id, bookmaker, selection_key, captured_at asc, raw_snapshot_id asc
), latest as (
  select distinct on (match_id, bookmaker, selection_key)
    match_id, bookmaker, selection_key,
    gameweek, provider, bookmaker_family, selection_name, kickoff_time,
    raw_snapshot_id as latest_raw_snapshot_id,
    decimal_odds as latest_decimal_odds,
    implied_probability as latest_implied_probability,
    captured_at as latest_captured_at,
    seconds_before_kickoff as latest_seconds_before_kickoff
  from h
  order by match_id, bookmaker, selection_key, captured_at desc, raw_snapshot_id desc
), counts as (
  select match_id, bookmaker, selection_key, count(distinct raw_snapshot_id)::integer as snapshot_count
  from h
  group by match_id, bookmaker, selection_key
)
select
  l.gameweek,
  l.match_id,
  l.provider,
  l.bookmaker,
  l.bookmaker_family,
  l.selection_key,
  l.selection_name,
  l.kickoff_time,
  c.snapshot_count,
  o.opening_raw_snapshot_id,
  o.opening_decimal_odds,
  o.opening_implied_probability,
  o.opening_captured_at,
  o.opening_seconds_before_kickoff,
  l.latest_raw_snapshot_id,
  l.latest_decimal_odds,
  l.latest_implied_probability,
  l.latest_captured_at,
  l.latest_seconds_before_kickoff,
  case when o.opening_decimal_odds > 0 then l.latest_decimal_odds / o.opening_decimal_odds - 1 end as opening_to_latest_odds_return,
  l.latest_implied_probability - o.opening_implied_probability as opening_to_latest_implied_probability_move,
  (l.kickoff_time <= now()) as frozen,
  case when l.kickoff_time <= now() then l.latest_decimal_odds end as closing_proxy_decimal_odds,
  case when l.kickoff_time <= now() then l.latest_implied_probability end as closing_proxy_implied_probability,
  case when l.kickoff_time <= now() then l.latest_captured_at end as closing_proxy_captured_at,
  case when l.kickoff_time <= now() then l.latest_seconds_before_kickoff end as closing_proxy_seconds_before_kickoff,
  case
    when l.kickoff_time > now() then null
    when l.latest_seconds_before_kickoff <= 300 then 'NEAR_CLOSE'
    when l.latest_seconds_before_kickoff <= 900 then 'LATE'
    when l.latest_seconds_before_kickoff <= 3600 then 'WITHIN_1H'
    else 'EARLY'
  end as closing_proxy_recency_band
from latest l
join opening o using (match_id, bookmaker, selection_key)
join counts c using (match_id, bookmaker, selection_key);

revoke all on public.correct_score_price_summary from public, anon, authenticated;
grant select on public.correct_score_price_summary to service_role;

create or replace view public.correct_score_clv_research
with (security_invoker = true)
as
with e as (
  select *
  from public.betting_edge_observations
  where market_key = 'correct_score'
    and chronology_valid = true
    and model_effect_enabled = false
), closing as (
  select distinct on (match_id, bookmaker, selection_key, devig_method)
    match_id,
    bookmaker,
    selection_key,
    devig_method,
    raw_snapshot_id as closing_proxy_raw_snapshot_id,
    decimal_odds as closing_proxy_decimal_odds,
    bookmaker_implied_probability as closing_proxy_implied_probability,
    market_fair_conditional_probability as closing_proxy_fair_probability,
    odds_captured_at as closing_proxy_captured_at,
    kickoff_time,
    greatest(0, extract(epoch from (kickoff_time - odds_captured_at)))::bigint as closing_proxy_seconds_before_kickoff
  from e
  where kickoff_time <= now()
  order by match_id, bookmaker, selection_key, devig_method, odds_captured_at desc, raw_snapshot_id desc
)
select
  e.gameweek,
  e.match_id,
  e.bookmaker,
  e.selection_key,
  e.selection_name,
  e.devig_method,
  e.raw_snapshot_id as entry_raw_snapshot_id,
  e.odds_captured_at as entry_captured_at,
  greatest(0, extract(epoch from (e.kickoff_time - e.odds_captured_at)))::bigint as entry_seconds_before_kickoff,
  e.decimal_odds as entry_decimal_odds,
  e.bookmaker_implied_probability as entry_implied_probability,
  e.market_fair_conditional_probability as entry_fair_probability,
  e.model_probability as entry_model_probability,
  e.expected_value as entry_expected_value,
  e.conditional_edge as entry_conditional_edge,
  e.research_classification as entry_research_classification,
  c.closing_proxy_raw_snapshot_id,
  c.closing_proxy_decimal_odds,
  c.closing_proxy_implied_probability,
  c.closing_proxy_fair_probability,
  c.closing_proxy_captured_at,
  c.closing_proxy_seconds_before_kickoff,
  case
    when c.closing_proxy_seconds_before_kickoff <= 300 then 'NEAR_CLOSE'
    when c.closing_proxy_seconds_before_kickoff <= 900 then 'LATE'
    when c.closing_proxy_seconds_before_kickoff <= 3600 then 'WITHIN_1H'
    else 'EARLY'
  end as closing_proxy_recency_band,
  case when c.closing_proxy_decimal_odds > 0 then e.decimal_odds / c.closing_proxy_decimal_odds - 1 end as price_clv,
  c.closing_proxy_implied_probability - e.bookmaker_implied_probability as implied_probability_clv,
  c.closing_proxy_fair_probability - e.market_fair_conditional_probability as fair_probability_clv,
  (e.raw_snapshot_id = c.closing_proxy_raw_snapshot_id) as is_closing_proxy_observation,
  false as model_effect_enabled
from e
join closing c
  on c.match_id = e.match_id
 and c.bookmaker = e.bookmaker
 and c.selection_key = e.selection_key
 and c.devig_method = e.devig_method
where e.odds_captured_at <= c.closing_proxy_captured_at;

revoke all on public.correct_score_clv_research from public, anon, authenticated;
grant select on public.correct_score_clv_research to service_role;
