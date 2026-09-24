-- prediction_run_ids is bigint[], not jsonb; keep the candidate lineage check
-- typed and fail closed on a mismatched run.

do $$
declare v_source text;
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0242_captaincy_equivalence_gate_v02'
    and pg_get_function_identity_arguments(p.oid)='p_gameweek integer, p_mean_error_band numeric';
  if v_source is null then
    raise exception 'C0286 expected C0242 candidate gate was not found';
  end if;
  v_source:=replace(v_source,'(r.prediction_run_ids->>0)::bigint','r.prediction_run_ids[1]');
  execute format(
    'create or replace function private.c0242_captaincy_equivalence_gate_v02(p_gameweek integer, p_mean_error_band numeric default 1.0) returns jsonb language plpgsql security definer set search_path to ''private'', ''public'', ''pg_temp'' as %L',
    v_source
  );
end
$$;
