# C0213 P3 — Retired External Deployment Retirement Audit

Date: 2026-09-06
Change: C0213
Scope: architecture consolidation only. No numerical model change. No historical forecast rewrite. No GW4 manager decision output.

## Objective

Audit the 19 runtime components classified `RETIRED` but still physically deployed, prove whether any current production path consumes them, identify canonical successors, establish a fail-closed retirement/rollback contract, durably preserve the exact live runtime bundles, and physically delete only after both rollback and runtime-traffic gates are proven.

## Current result

All 19 retired deployments are **STATIC_RETIREMENT_READY** and all 19 now have **durable rollback source**.

Static consumer proof is green for every item:

- dependency-graph incoming edges: 0
- dependency-graph outgoing edges: 0
- exact live database-function consumers: 0
- exact active-cron consumers: 0
- trigger/view consumers: 0
- canonical UI/API dependency edges: 0

Two initial text matches were rejected as substring false positives rather than counted as consumers:

- `sync-fpl` matched cron 25 only because the actual target is `sync-fpl-data`.
- `c0206-build-understat-foreign-pairs` matched `private.invoke_engine_ingest` only because the allowlist contains the canonical successor `c0206-build-understat-foreign-pairs-v02`.

The two superseded C0206 v01 endpoints remain blocked from internal invocation and return `Function not allowed` when addressed through the canonical invoker.

## Retirement manifest

Initial production migration:

`20260906172600_c0213_p3_retired_external_retirement_manifest_v01`

Repository migration:

`supabase/migrations/20260906172600_c0213_p3_retired_external_retirement_manifest_v01.sql`

Archive reconciliation production migration:

`c0213_p3_retired_runtime_archive_reconciliation_v01`

Repository migration:

`supabase/migrations/20260906184500_c0213_p3_retired_runtime_archive_reconciliation_v01.sql`

Objects:

- `private.c0213_retired_external_retirement_manifest`
- `private.c0213_retired_external_retirement_status_v01()`

The manifest records for every retired deployment:

- component key and slug
- runtime kind
- live Supabase function UUID
- live runtime version
- live deployment SHA-256
- JWT-gateway setting
- canonical successor where one exists
- static consumer counts
- repository runtime-source location
- durable rollback-source status
- runtime-traffic visibility status
- retirement state
- whether physical deletion is currently allowed
- rollback requirements

## Retired deployment set

| Retired deployment | Successor / current owner |
|---|---|
| `sync-fpl` | `sync-fpl-data` |
| `sync-core-insights` | `ingest-competitive-core-stats` |
| `sync-historical-priors` | no live endpoint consumer; legacy historical-prior path retired |
| `refresh-player-state` | `refresh-current-player-state` |
| `sync-team-priors` | database-native current-season team assimilation |
| `refresh-team-state` | database-native current-season team assimilation |
| `sync-current-team-meta` | `sync-fpl-data` |
| `generate-fpl-predictions` | `private.generate_upcoming_fpl_snapshot_v01(...)` |
| `optimize-fpl-squad` | `fpl-full-pool-optimizer` + canonical decision orchestration |
| `fpl-dashboard` | `frontend-v2` |
| `publish-dashboard` | GitHub Pages workflow |
| `audit-gw` | database-native audit/readiness functions |
| `projection-benchmark-api` | no current consumer |
| `generate-fpl-predictions-v012` | canonical DB FPL snapshot wrapper |
| `refresh-player-state-v012` | `refresh-current-player-state` |
| `generate-fpl-predictions-v013` | canonical DB FPL snapshot wrapper |
| `generate-fixture-predictions` | `private.refresh_c0166_fixture_cycle_v01(...)` |
| `c0206-build-understat-foreign-pairs` | `c0206-build-understat-foreign-pairs-v02` |
| `c0206-fit-translation-shadow-v01` | `c0206-fit-translation-shadow-v02` |

## Durable rollback archive

The exact runtime bundles for the 18 previously runtime-only deployments are now stored outside `supabase/functions/` under:

`project-management/retired-runtime-archive/20260906/`

This is intentionally a non-deployable archive namespace, so a bulk Supabase function deployment cannot accidentally resurrect retired runtimes.

Each `.bundle.json` records the live deployment metadata and exact runtime files captured from Supabase, including the live function UUID, runtime version, `verify_jwt` state and recorded Supabase runtime SHA-256.

The nineteenth deployment, `c0206-fit-translation-shadow-v01`, already had repository-backed runtime source and therefore did not require a duplicate archive bundle.

Archive commits:

- `3f3d29d7cf860d22e009ee8867f955b7578a54b2` — initial `sync-fpl` runtime bundle
- `22ee2613a7d8ced3a18b3506b1c923a347b3c73b` — remaining runtime-only rollback bundles

Archive reconciliation migration repository commit:

- `a7bb796199b790f3583a7749f5de8f0e70636219`

No hard-coded service token or personal access token was introduced into the archive; the captured legacy runtimes obtain credentials through runtime environment variables/backend-secret lookup.

## Why physical deletion has not yet been performed

The rollback gate is now fully green, but physical deletion remains fail-closed on a separate platform-evidence gate.

Current Supabase documentation confirms Edge Function invocation evidence is available from function invocation logs / hosted log queries. For hosted projects, the relevant ClickHouse source is `function_edge_logs` for HTTP request/response invocation records. Static dependency proof cannot substitute for this evidence because an unknown external client could call a retired HTTP endpoint directly.

The connected Supabase capability in this environment exposes Edge Function list/get/deploy but does **not** expose hosted `query_logs`/invocation-log querying.

Current Supabase documentation also confirms physical function deletion is performed through:

`DELETE /v1/projects/{ref}/functions/{function_slug}`

or an authenticated Supabase CLI delete operation. The connected Supabase capability does **not** expose the Edge Function delete action or a generic authenticated Management API transport.

We intentionally did not substitute:

- `deploy --prune`
- tombstone redeployments
- registry relabeling
- guessed/unavailable credentials
- unauthenticated Management API calls

Those approaches would either risk unrelated runtime functions, destroy useful rollback identity, or make the architecture registry claim a physical state that is not true.

## Rollback gate

Current status after archive reconciliation:

- manifest rows: 19
- static-retirement-ready: 19
- durable rollback sources: **19**
- rollback sources not archived: **0**
- physical delete allowed: **0**
- physically deleted: **0**
- holds: 0

Rollback is now deterministic: reconstruct the retired function from its repository bundle/source, preserve the recorded `verify_jwt` state, redeploy, and validate against the recorded runtime identity/hash lineage.

## Remaining platform gate

Exactly two platform capabilities remain necessary before destructive retirement can be truthfully completed:

1. **Runtime traffic visibility** — query recent `function_edge_logs` / function invocation records and prove no unexplained live HTTP consumer exists for each retired slug over the available retention window.
2. **Authenticated delete transport** — expose the Supabase Edge Function delete action or authenticated Management API/CLI access to `DELETE /v1/projects/{ref}/functions/{function_slug}`.

Until both are available, `physical_delete_allowed` remains false and all 19 deployments remain physically ACTIVE even though they are architecturally RETIRED.

## Integrity verification

After archive reconciliation:

- retirement status function: `ok=true`
- manifest rows: 19
- static-retirement-ready: 19
- durable rollback sources: 19
- rollback sources not archived: 0
- holds: 0
- physical delete allowed: 0
- physically deleted: 0

No projection coefficients, model effects, frozen forecasts, research cohorts, or manager decisions were changed.
