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
