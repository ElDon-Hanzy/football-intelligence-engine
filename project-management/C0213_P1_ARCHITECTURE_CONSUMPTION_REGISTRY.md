# C0213 P1 — Architecture & Model-Consumption Registry

## Scope

P1 is inventory/audit infrastructure only. It does not change model formulas, projection values, historical forecasts, forward cohorts, FPL decisions, or research promotion state.

The objective is to make the live architecture machine-readable and distinguish lifecycle from health/canonical status.

Allowed lifecycle values are exactly:

- `PRODUCTION`
- `SHADOW`
- `RESEARCH`
- `UI_ONLY`
- `INFRASTRUCTURE`
- `RETIRED`

A component can therefore remain `PRODUCTION` while carrying a contradiction/duplicate status; defects are not modeled as lifecycle values.

## Live registry

Primary machine-readable objects:

- `private.c0213_db_component_inventory_v01`
  - dynamically discovers current `public`/`private` tables, views and functions from `pg_catalog`;
  - applies deterministic default lifecycle classification;
  - overlays explicit semantic classifications only for architecture-critical components.
- `private.c0213_active_cron_components_v01`
  - dynamically discovers active `pg_cron` jobs;
  - resolves direct HTTP Edge Function targets, `private.invoke_engine_ingest(...)` targets and direct DB-function targets;
  - flags duplicate schedules by actual invoked target.
- `private.c0213_external_components`
  - captured live Supabase Edge Function inventory plus canonical UI/workflow artifacts;
  - records deployed runtime version, repository path when present, lifecycle and canonical status.
- `private.c0213_component_inventory_v01`
  - canonical union of DB, cron and external components.
- `private.c0213_component_dependency_graph_v01`
  - combines view/table dependencies, schema-qualified code references, cron invocations and explicit application/API edges.
- `private.c0213_required_capabilities`
  - maps the required production/research stages to their canonical implementation or an explicit `MISSING` / `CONTRADICTION` state.
- `private.c0213_architecture_registry_status_v01()`
  - compact audit status for drift and consolidation work.

Legacy `public.engine_component_versions` and `public.research_experiment_registry` are retained as historical evidence but explicitly marked non-authoritative. They each contain only 11 rows and do not represent the current production system.

## Verified P1 snapshot

After parser/signature regression fixes:

- total registered/discovered components: **582**
- DB components: **499**
- active cron jobs: **25**
- captured external/UI/workflow components: **58**
- dependency edges: **937**
- explicit production-effect components: **13**
- lifecycle distribution:
  - `INFRASTRUCTURE`: 337
  - `RESEARCH`: 123
  - `SHADOW`: 88
  - `RETIRED`: 19
  - `PRODUCTION`: 13
  - `UI_ONLY`: 2
- registry integrity: **green**
- system consolidation: **not green by design**; P1 exposes unresolved architecture debt rather than hiding it.

## Production-chain proof

The dependency graph now proves, among other links:

`CRON:13`
→ `private.generate_upcoming_fpl_snapshot_v01(...)`
→ C0204 coverage summary/reconciliation
→ `private.generate_upcoming_fpl_snapshot_c0160_legacy_v01(...)`
→ `private.fpl_adjusted_team_lambda_v01(...)`
→ `private.fpl_fixture_goal_lambda_v02(...)`
→ `private.fpl_fixture_assist_lambda_v02(...)`
→ `private.fpl_current_event_distribution_v01(...)`
→ `gameweek_prediction_runs` / `model_predictions` / `decision_snapshots`.

The fixture chain is also explicit:

`private.refresh_c0166_fixture_cycle_v01(...)`
→ `private.refresh_c0159_production_fixture_forecasts_v01(...)`
→ `private.refresh_c0166_production_fixture_forecasts_v01(...)`
→ C0166 evidence audit
→ C0167 decision evidence audit.

Crucially, the graph proves that `private.refresh_c0159_production_fixture_forecasts_v01(...)` reads `public.matchup_predictive_predictions`. This records the real governance relationship: C0147 remains a shadow experiment family, but a bounded derivative of its output is genuinely consumed by a production component.

## Contradictions exposed by P1

### 1. Duplicate competitive-core scheduling

Exactly one active duplicate target remains:

- cron 4 — `ingest-competitive-core-stats` at 08:00 and 18:00
- cron 16 — `ingest-competitive-core-stats` hourly at :17

P1 does not remove either job. Consolidation belongs to P3.

### 2. Active-deployed retired Edge Functions

Nineteen Edge Functions remain `ACTIVE` in Supabase but are classified `RETIRED` by architecture consumption evidence. Examples include:

- `generate-fpl-predictions`
- `generate-fpl-predictions-v012`
- `generate-fpl-predictions-v013`
- `optimize-fpl-squad`
- `generate-fixture-predictions`
- `refresh-player-state`
- `refresh-player-state-v012`
- `fpl-dashboard`
- `publish-dashboard`

`optimize-fpl-squad` was inspected directly. It only selects XI/bench/captain from the existing active 15-man squad; it is **not** the required full-pool £100m optimizer.

No retired deployment was deleted in P1.

### 3. Full-pool optimizer missing

`FPL_FULL_POOL_OPTIMIZER` is explicitly `MISSING`.

The database C0160 selector and legacy `optimize-fpl-squad` Edge Function both optimize only the current 15. `public.fpl_manager_plans` is the append-only saved output of the external full-pool + Noise-Control analysis, not a canonical optimizer implementation.

### 4. Tactical canonical-selector contradiction

`public.refresh_fixture_tactical_matchups_v011(...)` is the intended canonical calibrated refresh, but the previously identified timestamp/latest-row behavior can allow base v0.1 rows to win current selection. This remains a P3 consolidation defect; P1 only records it.

### 5. Projection readiness versus decision readiness

`private.refresh_c0166_fixture_cycle_v01(...)` writes forward fixture forecasts and then runs C0166/C0167 audits. A cron run can therefore complete successfully while semantic decision readiness is false.

`private.c0167_decision_evidence_audit_v01(...)` exists, but automated FPL saved decisions are not yet fail-closed on that gate. The registry consequently records separate projection and decision readiness capabilities and leaves decision readiness as `CONTRADICTION`.

No GW4 decision snapshot was manually forced during P1.

## Classification examples

- C0160 active projection/current-15 selector: `PRODUCTION`
- C0159 and C0166 numerical fixture layers: `PRODUCTION`
- C0212 realized-role state: `PRODUCTION`
- C0204/C0166/C0167 guards and orchestration: `INFRASTRUCTURE`
- C0147 forward experiment family: `SHADOW`
- C0197 shootout forward: `SHADOW`
- C0206 translation family: `RESEARCH`; current v02 fit is retained with canonical status `REJECTED`
- frontend-v2: `UI_ONLY / CANONICAL`
- legacy root: `UI_ONLY / LEGACY_ROLLBACK`
- old deployed FPL generators/optimizer/dashboard functions: `RETIRED / ORPHANED`

## Next phase

P2 should use this registry to build fail-closed orchestration/readiness lineage across:

`RESULTS → CURRENT DATA → REALIZED ROLES → PLAYER STATE → TEAM STATE → FIXTURE STATE → PROJECTIONS → DISTRIBUTIONS → SELECTION / OPTIMIZATION → SAVED DECISION`

with run IDs, freshness, readiness state and explicit prediction/decision lineage.
