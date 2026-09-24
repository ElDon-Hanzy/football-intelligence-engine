-- C0237 is an always-live pre-final publication contract.  C0234 is only
-- available in the T-2 final window, so its absent run cannot suppress a
-- truthful PRE_FINAL plan once all current decision evidence is complete.

do $$
declare v_source text;
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0237_publish_current_fpl_plan_core_v01'
    and pg_get_function_identity_arguments(p.oid)='p_gameweek integer, p_horizon integer';
  if v_source is null or position(' or v_or.id is null or v_red.id is null or v_gate.id is null then' in v_source)=0 then
    raise exception 'C0286 expected C0237 final-gate prerequisite was not found';
  end if;
  v_source:=replace(v_source,
    ' or v_or.id is null or v_red.id is null or v_gate.id is null then',
    ' or v_or.id is null or v_red.id is null then');
  execute format(
    'create or replace function private.c0237_publish_current_fpl_plan_core_v01(p_gameweek integer, p_horizon integer default 5) returns jsonb language plpgsql security definer set search_path to ''pg_catalog'', ''public'', ''private'' as %L',
    v_source
  );
end
$$;
