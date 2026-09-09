-- C0236: chronology-safe historical website serving repair.
-- Adds gameweek-leading serving indexes and a scoped correct-score price cache.
-- This changes serving/query performance only; historical forecasts and odds observations remain append-only.

create index if not exists odds_market_selections_gw_cs_serving_idx
  on public.odds_market_selections (
    gameweek,
    match_id,
    bookmaker,
    selection_key,
    captured_at,
    raw_snapshot_id
  )
  include (decimal_odds, implied_probability, provider, selection_name, source_timestamp)
  where market_key = 'correct_score';

create index if not exists betting_edge_observations_gw_cs_serving_idx
  on public.betting_edge_observations (
    gameweek,
    raw_snapshot_id,
    match_id,
    bookmaker,
    selection_key,
    devig_method,
    odds_captured_at desc
  )
  include (expected_value, conditional_edge, market_overround, model_offered_mass, chronology_valid, model_effect_enabled)
  where market_key = 'correct_score' and chronology_valid = true;

create table if not exists public.correct_score_price_summary_cache (
  gameweek integer not null,
  match_id bigint not null,
  provider text,
  bookmaker text not null,
  bookmaker_family text,
  selection_key text not null,
  selection_name text,
  kickoff_time timestamptz not null,
  snapshot_count integer not null,
  first_observed_raw_snapshot_id bigint,
  first_observed_decimal_odds numeric,
  first_observed_implied_probability numeric,
  first_observed_captured_at timestamptz,
  first_observed_seconds_before_kickoff bigint,
  latest_raw_snapshot_id bigint,
  latest_decimal_odds numeric,
  latest_implied_probability numeric,
  latest_captured_at timestamptz,
  latest_seconds_before_kickoff bigint,
  first_observed_to_latest_odds_return numeric,
  first_observed_to_latest_implied_probability_move numeric,
  refreshed_at timestamptz not null default now(),
  primary key (gameweek, match_id, bookmaker, selection_key)
);

create index if not exists correct_score_price_summary_cache_match_idx
  on public.correct_score_price_summary_cache (gameweek, match_id, bookmaker);

create or replace function private.refresh_correct_score_price_summary_cache_v01(p_gameweek integer)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'private', 'public'
as $function$
declare
  v_rows integer;
begin
  if p_gameweek is null then raise exception 'gameweek required'; end if;

  delete from public.correct_score_price_summary_cache where gameweek = p_gameweek;

  with h as (
    select
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
      oms.captured_at,
      ors.event_kickoff as kickoff_time,
      greatest(0, extract(epoch from ors.event_kickoff - oms.captured_at))::bigint as seconds_before_kickoff
    from public.odds_market_selections oms
    join public.odds_raw_snapshots ors on ors.id = oms.raw_snapshot_id
    where oms.gameweek = p_gameweek
      and oms.market_key = 'correct_score'
      and ors.pre_kickoff = true
      and ors.event_kickoff is not null
      and oms.captured_at < ors.event_kickoff
      and (oms.source_timestamp is null or oms.source_timestamp < ors.event_kickoff)
  ), opening as (
    select distinct on (match_id, bookmaker, selection_key)
      match_id,
      bookmaker,
      selection_key,
      raw_snapshot_id,
      decimal_odds,
      implied_probability,
      captured_at,
      seconds_before_kickoff
    from h
    order by match_id, bookmaker, selection_key, captured_at, raw_snapshot_id
  ), latest as (
    select distinct on (match_id, bookmaker, selection_key)
      match_id,
      bookmaker,
      selection_key,
      gameweek,
      provider,
      bookmaker_family,
      selection_name,
      kickoff_time,
      raw_snapshot_id,
      decimal_odds,
      implied_probability,
      captured_at,
      seconds_before_kickoff
    from h
    order by match_id, bookmaker, selection_key, captured_at desc, raw_snapshot_id desc
  ), counts as (
    select
      match_id,
      bookmaker,
      selection_key,
      count(distinct raw_snapshot_id)::integer as snapshot_count
    from h
    group by match_id, bookmaker, selection_key
  )
  insert into public.correct_score_price_summary_cache (
    gameweek,
    match_id,
    provider,
    bookmaker,
    bookmaker_family,
    selection_key,
    selection_name,
    kickoff_time,
    snapshot_count,
    first_observed_raw_snapshot_id,
    first_observed_decimal_odds,
    first_observed_implied_probability,
    first_observed_captured_at,
    first_observed_seconds_before_kickoff,
    latest_raw_snapshot_id,
    latest_decimal_odds,
    latest_implied_probability,
    latest_captured_at,
    latest_seconds_before_kickoff,
    first_observed_to_latest_odds_return,
    first_observed_to_latest_implied_probability_move,
    refreshed_at
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
    o.raw_snapshot_id,
    o.decimal_odds,
    o.implied_probability,
    o.captured_at,
    o.seconds_before_kickoff,
    l.raw_snapshot_id,
    l.decimal_odds,
    l.implied_probability,
    l.captured_at,
    l.seconds_before_kickoff,
    case when o.decimal_odds > 0 then l.decimal_odds / o.decimal_odds - 1 else null end,
    l.implied_probability - o.implied_probability,
    now()
  from latest l
  join opening o using (match_id, bookmaker, selection_key)
  join counts c using (match_id, bookmaker, selection_key);

  get diagnostics v_rows = row_count;

  return jsonb_build_object(
    'ok',true,
    'change_id','C0236',
    'gameweek',p_gameweek,
    'rows',v_rows,
    'historical_forecasts_rewritten',false
  );
end
$function$;

create or replace view public.correct_score_price_summary as
select
  gameweek,
  match_id,
  provider,
  bookmaker,
  bookmaker_family,
  selection_key,
  selection_name,
  kickoff_time,
  snapshot_count,
  first_observed_raw_snapshot_id,
  first_observed_decimal_odds,
  first_observed_implied_probability,
  first_observed_captured_at,
  first_observed_seconds_before_kickoff,
  latest_raw_snapshot_id,
  latest_decimal_odds,
  latest_implied_probability,
  latest_captured_at,
  latest_seconds_before_kickoff,
  first_observed_to_latest_odds_return,
  first_observed_to_latest_implied_probability_move,
  kickoff_time <= now() as frozen,
  case when kickoff_time <= now() then latest_decimal_odds else null::numeric end as closing_proxy_decimal_odds,
  case when kickoff_time <= now() then latest_implied_probability else null::numeric end as closing_proxy_implied_probability,
  case when kickoff_time <= now() then latest_captured_at else null::timestamptz end as closing_proxy_captured_at,
  case when kickoff_time <= now() then latest_seconds_before_kickoff else null::bigint end as closing_proxy_seconds_before_kickoff,
  case
    when kickoff_time > now() then null::text
    when latest_seconds_before_kickoff <= 300 then 'NEAR_CLOSE'::text
    when latest_seconds_before_kickoff <= 900 then 'LATE'::text
    when latest_seconds_before_kickoff <= 3600 then 'WITHIN_1H'::text
    else 'EARLY'::text
  end as closing_proxy_recency_band
from public.correct_score_price_summary_cache;

create or replace function private.refresh_upcoming_correct_score_price_cache_v01()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'private', 'public'
as $function$
declare
  v_gw integer;
begin
  select m.gameweek
  into v_gw
  from public.matches m
  where m.source = 'fpl' and m.kickoff_time > now()
  order by m.kickoff_time
  limit 1;

  if v_gw is null then
    return jsonb_build_object('ok',true,'status','NO_UPCOMING_GW','change_id','C0236');
  end if;

  return private.refresh_correct_score_price_summary_cache_v01(v_gw);
end
$function$;

-- Seed every already-observed Gameweek so historical website reads do not depend on the future cron.
do $block$
declare
  r record;
begin
  for r in
    select distinct gameweek
    from public.odds_market_selections
    where market_key = 'correct_score' and gameweek is not null
    order by gameweek
  loop
    perform private.refresh_correct_score_price_summary_cache_v01(r.gameweek);
  end loop;
end
$block$;

-- Refresh the upcoming Gameweek cache on the same quarter-hour production rhythm, offset from ingestion.
do $block$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname = 'c0236_correct_score_price_cache' limit 1;
  if v_jobid is not null then perform cron.unschedule(v_jobid); end if;
  perform cron.schedule(
    'c0236_correct_score_price_cache',
    '7,22,37,52 * * * *',
    'select private.refresh_upcoming_correct_score_price_cache_v01();'
  );
end
$block$;
