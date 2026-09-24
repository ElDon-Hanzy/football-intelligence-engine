-- C0286: C0240 only needs role evidence for its requested gameweek.  The
-- previous query joined the all-history current_player_fixture_roles view,
-- forcing every scheduler tick to rank every historical observation first.

create index if not exists idx_player_fixture_roles_gameweek_current
  on public.player_fixture_role_observations
  (gameweek, player_id, captured_at desc, id desc);

do $$
declare
  v_source text;
  v_old constant text :=
    'left join public.current_player_fixture_roles rr on rr.player_id=p.id and rr.gameweek=p_gameweek';
  v_new constant text :=
    'left join (\n+       select distinct on (o.player_id) o.player_id,o.confidence,o.primary_role\n+       from public.player_fixture_role_observations o\n+       where o.gameweek=p_gameweek\n+       order by o.player_id,o.captured_at desc,o.id desc\n+     ) rr on rr.player_id=p.id';
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0240_prepare_base_v05'
    and pg_get_function_identity_arguments(p.oid)='p_gameweek integer, p_horizon integer';

  if v_source is null or position(v_old in v_source)=0 then
    raise exception 'C0286 expected C0240 role lookup was not found';
  end if;

  v_source := replace(v_source,v_old,v_new);
  execute format(
    'create or replace function private.c0240_prepare_base_v05(p_gameweek integer, p_horizon integer default 5) returns jsonb language plpgsql security definer set search_path to ''private'', ''public'', ''pg_temp'' as %L',
    v_source
  );
end
$$;
