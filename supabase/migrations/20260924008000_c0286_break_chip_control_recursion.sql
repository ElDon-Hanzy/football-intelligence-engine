-- C0248 current-chip status is consumed by the structural window; the bounded
-- C0276 helper also consumes that window.  Calling the helper back from C0248
-- created a recursion loop.  Keep the bounded evidence at its C0276 gate and
-- let C0248 report the direct selected-path state only.

do $$
declare
  v_source text;
  v_old constant text := ' if not v_all then v_bound:=private.c0276_bounded_chip_option_value_status_v01(p_gameweek,p_horizon); if coalesce((v_bound->>''bounded_no_chip_robust'')::boolean,false) and (v_bound->>''planner_run_id'')::bigint=v_id then v_all:=true; end if; end if;';
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0248_current_chip_action_status_v01'
    and pg_get_function_identity_arguments(p.oid)='p_gameweek integer, p_horizon integer';
  if v_source is null or position(v_old in v_source)=0 then
    raise exception 'C0286 expected C0248 bounded-chip recursion was not found';
  end if;
  v_source:=replace(v_source,v_old,' v_bound:=null;');
  execute format(
    'create or replace function private.c0248_current_chip_action_status_v01(p_gameweek integer, p_horizon integer default 5) returns jsonb language plpgsql security definer set search_path to '''' as %L',
    v_source
  );
end
$$;
