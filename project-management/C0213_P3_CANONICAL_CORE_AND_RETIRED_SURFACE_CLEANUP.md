# C0213 P3 — Canonical Core & Retired Invocation-Surface Cleanup

Date: 2026-09-06
Change: C0213
Scope: architecture/model-consumption consolidation only. No numerical model change. No frozen forecast rewrite. No GW4 decision output.

## Changes deployed

### 1. Canonical production-core rename

The active production core was previously named:

`private.generate_upcoming_fpl_snapshot_c0160_legacy_v01(integer, boolean)`

That name was misleading because the function is not a retired implementation: it is the active production projection/distribution/current-15-selection core consumed by the C0204 wrapper.

P3 renamed the existing Postgres function object in-place to:

`private.generate_upcoming_fpl_projection_core_v01(integer, boolean)`

The function OID remained **21786**, proving this is the same database object rather than a copied implementation. The outer canonical wrapper retained OID **454139** and now calls the canonical core name.

The old function name has zero rows in `pg_proc` and zero rows in the C0213 dependency graph.

The dynamic dependency graph now proves:

`private.generate_upcoming_fpl_snapshot_v01(...)`
→ `private.generate_upcoming_fpl_projection_core_v01(...)`
→ `fpl_adjusted_team_lambda_v01`
→ goal/assist lambdas
→ `fpl_current_event_distribution_v01`
→ current state / fixture / projection / decision storage relations.

### 2. Retired C0206 v01 invocation paths removed

Removed from `private.invoke_engine_ingest(...)` allowlist:

- `c0206-build-understat-foreign-pairs`
- `c0206-fit-translation-shadow-v01`

Retained canonical successors:

- `c0206-build-understat-foreign-pairs-v02`
- `c0206-fit-translation-shadow-v02`

Live behavioral probes against both removed v01 names now fail with:

`Function not allowed`

No HTTP/Edge dispatch occurs for those blocked names.

### 3. Retired deployment metric corrected

The previous architecture status field `active_retired_edge_deployments` counted every active RETIRED external component, including one API.

P3 now exposes separate counts:

- `active_retired_external_deployments = 19`
- `active_retired_edge_deployments = 18`
- `active_retired_api_deployments = 1`

The one RETIRED API is `projection-benchmark-api`.

`system_consolidation_ok` remains fail-closed against the combined retired external deployment count, so the corrected reporting does not weaken the consolidation gate.

The architecture registry status function retained OID **474789** across the reporting-only replacement.

## Verification

Post-migration registry status:

- registry integrity: **green**
- total components: **606**
- DB components: **521**
- active crons: **26**
- external components: **59**
- dependency edges: **1010**
- production-effect components: **14**
- missing required capabilities: **0**
- required capability contradictions: **0**
- canonical keys not found: **0**
- duplicate cron targets: **0**
- active retired external deployments: **19**
  - Edge Functions: **18**
  - APIs: **1**

`system_consolidation_ok` therefore remains **false only because retired external deployments are still physically active**.

### Rollback-only execution probe

A transaction-aborting probe executed:

`private.generate_upcoming_fpl_snapshot_v01(4, false)`

The wrapper returned:

- `ok = true`
- `status = SKIPPED_FRESH`
- `decision_saved = false`
- `decision_status = BLOCKED_NOT_READY`
- projection coverage green
- historical forecasts rewritten = false

The probe then deliberately raised an exception, rolling the transaction back. The production core contains no `pg_net`, HTTP, or Edge-dispatch calls, so the rollback probe had no external side effects.

GW4 decision readiness remains blocked by C0166/C0167 evidence readiness and the no-GW4-decision constraint remains intact.

Post-P3 persistence audit confirmed:

- GW4 manager plans: **0**
- GW4 decision snapshots created since P3 migration: **0**
- tracker governance: **green**

## Production migrations

Supabase migrations:

- `20260906162529_c0213_p3_canonical_core_and_retired_surface_cleanup_v01`
- `20260906162933_c0213_p3_registry_status_label_and_counts_v02`

Repository migrations:

- `supabase/migrations/20260906162529_c0213_p3_canonical_core_and_retired_surface_cleanup_v01.sql`
- `supabase/migrations/20260906162933_c0213_p3_registry_status_label_and_counts_v02.sql`

## Remaining P3 consolidation debt

P3 has reduced callable ambiguity but has **not** undeployed the 19 RETIRED external runtime components. They remain the only blocker currently reported by `system_consolidation_ok` after the P1/P2/P3 registry and readiness corrections.

Physical retired-deployment removal should only proceed after exact consumer/reference proof and rollback requirements are documented for each component.
