-- C0239 — live FPL serving reliability. No model effect; no historical rewrite.

create table if not exists private.engine_diagnostics_status_cache_v01 (
  gameweek integer primary key check (gameweek between 1 and 38),
  status jsonb not null,
  captured_at timestamptz not null default clock_timestamp()
);
revoke all on private.engine_diagnostics_status_cache_v01 from public, anon, authenticated;

create or replace function private.refresh_engine_diagnostics_status_cache_v01(p_gameweek integer)
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_status jsonb;
begin
  if p_gameweek is null or p_gameweek < 1 or p_gameweek > 38 then
    raise exception 'gameweek must be between 1 and 38';
  end if;
  v_status := public.engine_diagnostics_status_v01(p_gameweek);
  insert into private.engine_diagnostics_status_cache_v01(gameweek,status,captured_at)
  values (p_gameweek,v_status,clock_timestamp())
  on conflict (gameweek) do update
    set status = excluded.status,
        captured_at = excluded.captured_at;
  return jsonb_build_object('ok',true,'gameweek',p_gameweek,'captured_at',(select captured_at from private.engine_diagnostics_status_cache_v01 where gameweek=p_gameweek));
end;
$$;
revoke all on function private.refresh_engine_diagnostics_status_cache_v01(integer) from public;

create or replace function private.current_engine_diagnostics_status_cache_v01(p_gameweek integer)
returns table(gameweek integer,status jsonb,captured_at timestamptz)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select c.gameweek,c.status,c.captured_at
  from private.engine_diagnostics_status_cache_v01 c
  where c.gameweek=p_gameweek;
$$;
revoke all on function private.current_engine_diagnostics_status_cache_v01(integer) from public;

create or replace function public.engine_diagnostics_cached_status_v01(p_gameweek integer)
returns jsonb
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select jsonb_build_object('status',c.status,'captured_at',c.captured_at)
  from private.engine_diagnostics_status_cache_v01 c
  where c.gameweek=p_gameweek;
$$;
revoke all on function public.engine_diagnostics_cached_status_v01(integer) from public, anon, authenticated;
grant execute on function public.engine_diagnostics_cached_status_v01(integer) to service_role;

select private.refresh_engine_diagnostics_status_cache_v01(4);
select cron.schedule(
  'c0239_engine_diagnostics_cache_v01',
  '*/15 * * * *',
  $$select private.refresh_engine_diagnostics_status_cache_v01((select min(gameweek)::int from public.matches where source='fpl' and coalesce(finished,false)=false and kickoff_time >= clock_timestamp()-interval '2 days'));$$
);
