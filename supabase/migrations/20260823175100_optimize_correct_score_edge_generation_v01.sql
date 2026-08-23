create or replace function public.generate_correct_score_edge_observations_for_snapshots(p_raw_snapshot_ids bigint[])
returns integer
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  n integer:=0;
begin
  if p_raw_snapshot_ids is null or cardinality(p_raw_snapshot_ids)=0 then return 0; end if;

  with eligible_raw as materialized (
    select r.* from public.odds_raw_snapshots r
    where r.id=any(p_raw_snapshot_ids)
      and r.pre_kickoff=true
      and r.captured_at<r.event_kickoff
      and r.event_kickoff>now()
  ), priced as materialized (
    select r.gameweek,r.match_id,r.id raw_snapshot_id,r.bookmaker,r.captured_at odds_captured_at,
      r.event_kickoff kickoff_time,o.id odds_selection_id,o.market_key,o.selection_key,o.selection_name,o.decimal_odds,
      coalesce(o.implied_probability,1/o.decimal_odds) bookmaker_implied_probability,o.source_timestamp bookmaker_source_timestamp,
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
  ), usable as materialized (
    select * from priced where model_probability is not null and model_probability>=0
  ), market_agg as materialized (
    select raw_snapshot_id,sum(bookmaker_implied_probability) market_overround,count(*)::integer market_selection_count,
      sum(model_probability) model_offered_mass,
      public.solve_power_devig_exponent(array_agg(bookmaker_implied_probability order by odds_selection_id)) power_k
    from usable group by raw_snapshot_id
  ), calc as materialized (
    select u.*,a.market_overround,a.market_selection_count,a.model_offered_mass,a.power_k
    from usable u join market_agg a using(raw_snapshot_id)
    where a.market_overround>0 and a.model_offered_mass>0 and a.power_k is not null
  ), expanded as (
    select c.*,m.devig_method,m.devig_parameter,m.market_fair_conditional_probability
    from calc c
    cross join lateral (
      values
        ('proportional_offered_set'::text,null::numeric,c.bookmaker_implied_probability/nullif(c.market_overround,0)),
        ('power_offered_set'::text,c.power_k,power(c.bookmaker_implied_probability,c.power_k))
    ) m(devig_method,devig_parameter,market_fair_conditional_probability)
  )
  insert into public.betting_edge_observations(
    gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,devig_method,devig_parameter,
    market_fair_conditional_probability,model_probability,model_offered_mass,model_conditional_probability,conditional_edge,expected_value,
    bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,chronology_valid,research_classification,model_effect_enabled,evidence
  )
  select gameweek,match_id,raw_snapshot_id,odds_selection_id,prediction_snapshot_id,bookmaker,market_key,selection_key,selection_name,decimal_odds,
    bookmaker_implied_probability,market_overround,market_selection_count,devig_method,devig_parameter,
    market_fair_conditional_probability,model_probability,model_offered_mass,
    model_probability/nullif(model_offered_mass,0),
    (model_probability/nullif(model_offered_mass,0))-market_fair_conditional_probability,
    model_probability*decimal_odds-1,bookmaker_source_timestamp,odds_captured_at,model_captured_at,kickoff_time,
    (model_captured_at<=odds_captured_at and odds_captured_at<kickoff_time and (bookmaker_source_timestamp is null or bookmaker_source_timestamp<kickoff_time)),
    'UNVALIDATED',false,
    jsonb_build_object('market_scope','offered_correct_scores_only','devig_note',case when devig_method='power_offered_set' then 'Power de-vig conditional on bookmaker offered exact-score set' else 'Proportional de-vig conditional on bookmaker offered exact-score set' end,'ev_note','EV uses unconditional model score probability','generated_live_pre_kickoff',true,'power_k',devig_parameter)
  from expanded
  on conflict (odds_selection_id,prediction_snapshot_id,devig_method) do nothing;

  get diagnostics n=row_count;
  return n;
end $$;

revoke all on function public.generate_correct_score_edge_observations_for_snapshots(bigint[]) from public,anon,authenticated;
grant execute on function public.generate_correct_score_edge_observations_for_snapshots(bigint[]) to service_role;

create or replace function public.generate_correct_score_edge_observations(p_gameweek integer)
returns integer
language plpgsql
security invoker
set search_path=public,pg_temp
as $$
declare
  ids bigint[];
begin
  select array_agg(r.id order by r.id) into ids
  from public.odds_raw_snapshots r
  where r.gameweek=p_gameweek
    and r.pre_kickoff=true
    and r.captured_at<r.event_kickoff
    and r.event_kickoff>now()
    and exists (select 1 from public.odds_market_selections o where o.raw_snapshot_id=r.id and o.market_key='correct_score')
    and exists (
      select 1 from public.fixture_prediction_snapshots fp
      where fp.match_id=r.match_id and fp.is_pre_kickoff=true
        and fp.captured_at<=r.captured_at and fp.captured_at<fp.kickoff_time
    )
    and exists (
      select 1 from public.odds_market_selections o
      join lateral (
        select fp.id prediction_snapshot_id from public.fixture_prediction_snapshots fp
        where fp.match_id=r.match_id and fp.is_pre_kickoff=true
          and fp.captured_at<=r.captured_at and fp.captured_at<fp.kickoff_time
        order by fp.captured_at desc,fp.id desc limit 1
      ) p on true
      where o.raw_snapshot_id=r.id and o.market_key='correct_score'
        and not exists (
          select 1 from public.betting_edge_observations e
          where e.odds_selection_id=o.id and e.prediction_snapshot_id=p.prediction_snapshot_id
            and e.devig_method in ('proportional_offered_set','power_offered_set')
        )
    );
  return public.generate_correct_score_edge_observations_for_snapshots(ids);
end $$;

revoke all on function public.generate_correct_score_edge_observations(integer) from public,anon,authenticated;
grant execute on function public.generate_correct_score_edge_observations(integer) to service_role;