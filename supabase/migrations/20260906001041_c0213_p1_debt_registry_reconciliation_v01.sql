-- Register the four material P1 debt fixes without marking overall C0213 complete.
insert into private.c0213_external_components(
  component_key,component_name,component_kind,lifecycle,capability_key,canonical_status,
  canonical_component_key,production_effect_enabled,active,deployment_status,runtime_version,
  repo_path,source_locator,change_id,notes,evidence,captured_at,updated_at
)
values(
  'EDGE_FUNCTION:fpl-full-pool-optimizer','fpl-full-pool-optimizer','EDGE_FUNCTION','PRODUCTION',
  'FPL_FULL_POOL_OPTIMIZER','CANONICAL','EDGE_FUNCTION:fpl-full-pool-optimizer',true,true,'ACTIVE',3,
  'supabase/functions/fpl-full-pool-optimizer/index.ts',
  jsonb_build_object('supabase_slug','fpl-full-pool-optimizer','runtime_version',3),
  'C0213',
  'Read-only canonical full-pool GBP100m optimizer primitive. Top-300 xMins + explosive exceptions + legal 15-player constrained search. Cannot save manager decisions.',
  jsonb_build_object('optimizer_version','C0213_FULL_POOL_LOCAL_SEARCH_V02','decisioning',false,'writes_manager_plan',false,'search_exact',false,'behavioral_probe_request_id',3025,'behavioral_probe_status',200),
  clock_timestamp(),clock_timestamp()
)
on conflict(component_key) do update set
  component_name=excluded.component_name,
  component_kind=excluded.component_kind,
  lifecycle=excluded.lifecycle,
  capability_key=excluded.capability_key,
  canonical_status=excluded.canonical_status,
  canonical_component_key=excluded.canonical_component_key,
  production_effect_enabled=excluded.production_effect_enabled,
  active=excluded.active,
  deployment_status=excluded.deployment_status,
  runtime_version=excluded.runtime_version,
  repo_path=excluded.repo_path,
  source_locator=excluded.source_locator,
  change_id=excluded.change_id,
  notes=excluded.notes,
  evidence=excluded.evidence,
  updated_at=clock_timestamp();

update private.c0213_required_capabilities
set canonical_component_key='EDGE_FUNCTION:fpl-full-pool-optimizer',
    implementation_status='IMPLEMENTED',
    notes='Canonical read-only full-pool optimizer deployed and behaviorally proven. It cannot save or authorize an FPL decision; Noise-Control/decision readiness remains downstream.',
    updated_at=clock_timestamp()
where capability_key='FPL_FULL_POOL_OPTIMIZER';

update private.c0213_required_capabilities
set implementation_status='IMPLEMENTED',
    notes='Calibrated tactical selector fixed: current_fixture_tactical_matchups deterministically prefers fixture_tactical_matchup_v0.1.1 over v0.1 for the same match/team/signal.',
    updated_at=clock_timestamp()
where capability_key='ROLE_TACTICAL_REFRESH';

update private.c0213_required_capabilities
set implementation_status='IMPLEMENTED',
    notes='Projection refresh may write numerical forecasts before semantic readiness by design. Decision readiness is now a separate fail-closed contract, so cron success no longer implies decision readiness.',
    updated_at=clock_timestamp()
where capability_key='FIXTURE_PRODUCTION_CYCLE';

update private.c0213_required_capabilities
set canonical_component_key='DB_FUNCTION:private.c0213_decision_readiness_v01(p_gameweek integer)',
    implementation_status='IMPLEMENTED',
    notes='Fail-closed decision-write guard installed on decision_snapshots. Red readiness blocks automated valid decision inserts while allowing projection refresh.',
    updated_at=clock_timestamp()
where capability_key='DECISION_READINESS_AUDIT';
