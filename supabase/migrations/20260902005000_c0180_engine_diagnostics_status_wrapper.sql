create or replace function public.engine_diagnostics_status_v01(p_gameweek integer)
returns jsonb
language sql
security definer
set search_path = public, private, pg_temp
as $$
  select jsonb_build_object(
    'governance', private.audit_change_tracker_governance_v01(),
    'decision_evidence_audit', private.c0167_decision_evidence_audit_v01(p_gameweek),
    'production_evidence_audit', private.c0166_production_evidence_audit_v01(p_gameweek),
    'a0005', private.a0005_forward_validation_status_v01(),
    'w0002', private.w0002_forward_validation_status_v01(),
    'zero_cost', private.c0139_zero_cost_source_status_v01(),
    'fotmob_metrics', private.c0139_fotmob_metric_status_v01(),
    'physical_load', private.c0140_team_physical_load_status_v01()
  );
$$;

revoke all on function public.engine_diagnostics_status_v01(integer) from public;
grant execute on function public.engine_diagnostics_status_v01(integer) to service_role;
