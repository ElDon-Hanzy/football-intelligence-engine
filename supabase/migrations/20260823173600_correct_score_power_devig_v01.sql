alter table public.betting_edge_observations
  add column if not exists devig_parameter numeric;

create or replace function public.solve_power_devig_exponent(p_probs numeric[])
returns numeric
language plpgsql
immutable
security invoker
set search_path=public,pg_temp
as $$
declare
  lo numeric:=1;
  hi numeric:=10;
  mid numeric;
  s numeric;
  i integer;
begin
  if p_probs is null or array_length(p_probs,1) is null then return null; end if;
  for i in 1..80 loop
    mid:=(lo+hi)/2;
    select sum(power(x,mid)) into s from unnest(p_probs) x;
    if s>1 then lo:=mid; else hi:=mid; end if;
  end loop;
  return (lo+hi)/2;
end $$;

revoke all on function public.solve_power_devig_exponent(numeric[]) from public,anon,authenticated;
grant execute on function public.solve_power_devig_exponent(numeric[]) to service_role;

create or replace function public.generate_correct_score_edge_observations(p_gameweek integer)
returns integer
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  n_prop integer:=0;
  n_power integer:=0;
begin
  with eligible_raw as (
    select r.* from public.odds_raw_snapshots r
    where r.gameweek=p_gameweek and r.pre_kickoff=true
      and r.captured_at<r.event_kickoff and r.event_kickoff>now()
  ), priced as (
    select r.gameweek,r.match_id,r.id raw_snapshot_id,r.bookmaker,r.captured_at odds_captured_at,
      r.event_kickoff kickoff_time,o.id odds_selection_id,o.market_key,o.selection_key,o.selection_name,o.decimal_odds,
      coalesce(o.implied_probability,1/o.decimal_odds) bookmaker_implied_probability,
      o.source_timestamp bookmaker_source_timestamp,
      p.id prediction_snapshot_id,p.captured_at model_captured_at,
      case when o.selection_name ~ '^[0-9]+-[0-9]+$' then nullif(p.score_matrix->>o.selection_name,'')::numeric else null end model_probability
    from eligible_raw r
    join public.odds_market_selections o on o.raw_snapshot_id=r.id
    join lateral (
      select fp.* from public.fixture_prediction_snapshots fp
      where fp.match_id=r.match_id and fp.is_pre_kickoff=true
        and fp.captured_at<=r.captured_at and fp.captured_at<fp.kickoff_time
      order by fp.captured_at desc,fp.id desc limit 1
    ) p on true
    where o.market_key='correct_score' and o.decimal_odds>1
      and (o.source_timestamp is null or o.source_timestamp<r.event_kickoff)
  ), usable as (
    select * from priced where model_probability is not null and model_probability>=0
  ), calc as (
    select u.*,
      sum(bookmaker_implied_probability) over(partition by raw_snapshot_id) market_overround,
      count(*) over(partition by raw_snapshot_id)::integer market_selection_count,
      sum(model_probability) over(partition by raw_snapshot_id) model_offered_mass
    from usable u
  )
  insert into public.betting_edge_observations(
    gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,devig_method,devig_parameter,
    market_fair_conditional_probability,model_probability,model_offered_mass,model_conditional_probability,conditional_edge,expected_value,
    bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,chronology_valid,research_classification,model_effect_enabled,evidence
  )
  select gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,'proportional_offered_set',null,
    bookmaker_implied_probability/nullif(market_overround,0),model_probability,model_offered_mass,
    model_probability/nullif(model_offered_mass,0),
    (model_probability/nullif(model_offered_mass,0))-(bookmaker_implied_probability/nullif(market_overround,0)),
    model_probability*decimal_odds-1,bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,
    (model_captured_at<=odds_captured_at and odds_captured_at<kickoff_time and (bookmaker_source_timestamp is null or bookmaker_source_timestamp<kickoff_time)),
    'UNVALIDATED',false,
    jsonb_build_object('market_scope','offered_correct_scores_only','devig_note','Proportional de-vig conditional on bookmaker offered exact-score set','ev_note','EV uses unconditional model score probability','generated_live_pre_kickoff',true)
  from calc where market_overround>0 and model_offered_mass>0
  on conflict (odds_selection_id,prediction_snapshot_id,devig_method) do nothing;
  get diagnostics n_prop=row_count;

  with eligible_raw as (
    select r.* from public.odds_raw_snapshots r
    where r.gameweek=p_gameweek and r.pre_kickoff=true
      and r.captured_at<r.event_kickoff and r.event_kickoff>now()
  ), priced as (
    select r.gameweek,r.match_id,r.id raw_snapshot_id,r.bookmaker,r.captured_at odds_captured_at,
      r.event_kickoff kickoff_time,o.id odds_selection_id,o.market_key,o.selection_key,o.selection_name,o.decimal_odds,
      coalesce(o.implied_probability,1/o.decimal_odds) bookmaker_implied_probability,
      o.source_timestamp bookmaker_source_timestamp,
      p.id prediction_snapshot_id,p.captured_at model_captured_at,
      case when o.selection_name ~ '^[0-9]+-[0-9]+$' then nullif(p.score_matrix->>o.selection_name,'')::numeric else null end model_probability
    from eligible_raw r
    join public.odds_market_selections o on o.raw_snapshot_id=r.id
    join lateral (
      select fp.* from public.fixture_prediction_snapshots fp
      where fp.match_id=r.match_id and fp.is_pre_kickoff=true
        and fp.captured_at<=r.captured_at and fp.captured_at<fp.kickoff_time
      order by fp.captured_at desc,fp.id desc limit 1
    ) p on true
    where o.market_key='correct_score' and o.decimal_odds>1
      and (o.source_timestamp is null or o.source_timestamp<r.event_kickoff)
  ), usable as (
    select * from priced where model_probability is not null and model_probability>=0
  ), market_agg as (
    select raw_snapshot_id,sum(bookmaker_implied_probability) market_overround,count(*)::integer market_selection_count,
      sum(model_probability) model_offered_mass,array_agg(bookmaker_implied_probability order by odds_selection_id) implied_probs
    from usable group by raw_snapshot_id
  ), calc as (
    select u.*,a.market_overround,a.market_selection_count,a.model_offered_mass,
      public.solve_power_devig_exponent(a.implied_probs) power_k
    from usable u join market_agg a using(raw_snapshot_id)
  )
  insert into public.betting_edge_observations(
    gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,devig_method,devig_parameter,
    market_fair_conditional_probability,model_probability,model_offered_mass,model_conditional_probability,conditional_edge,expected_value,
    bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,chronology_valid,research_classification,model_effect_enabled,evidence
  )
  select gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,'power_offered_set',power_k,
    power(bookmaker_implied_probability,power_k),model_probability,model_offered_mass,
    model_probability/nullif(model_offered_mass,0),
    (model_probability/nullif(model_offered_mass,0))-power(bookmaker_implied_probability,power_k),
    model_probability*decimal_odds-1,bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,
    (model_captured_at<=odds_captured_at and odds_captured_at<kickoff_time and (bookmaker_source_timestamp is null or bookmaker_source_timestamp<kickoff_time)),
    'UNVALIDATED',false,
    jsonb_build_object('market_scope','offered_correct_scores_only','devig_note','Power de-vig conditional on bookmaker offered exact-score set','ev_note','EV uses unconditional model score probability','generated_live_pre_kickoff',true,'power_k',power_k)
  from calc where market_overround>0 and model_offered_mass>0 and power_k is not null
  on conflict (odds_selection_id,prediction_snapshot_id,devig_method) do nothing;
  get diagnostics n_power=row_count;

  return n_prop+n_power;
end $$;