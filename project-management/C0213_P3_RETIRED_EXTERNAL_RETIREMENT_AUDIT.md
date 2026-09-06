# C0213 P3 — Retired External Deployment Retirement Audit

Date: 2026-09-06
Change: C0213
Scope: architecture consolidation only. No numerical model change. No historical forecast rewrite. No GW4 manager decision output.

## Objective

Audit the 19 runtime components classified `RETIRED` but still physically deployed, prove whether any current production path consumes them, identify canonical successors, and establish a fail-closed retirement/rollback contract before physical deletion.

## Current result

All 19 retired deployments are **STATIC_RETIREMENT_READY**.

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

Production migration:

`20260906172600_c0213_p3_retired_external_retirement_manifest_v01`

Repository migration:

`supabase/migrations/20260906172600_c0213_p3_retired_external_retirement_manifest_v01.sql`

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
- repository runtime-source location if present
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

## Why physical deletion was not performed automatically

The current Supabase connector exposes function list/get/deploy operations but does **not** expose function deletion or inbound Edge invocation logs.

Current Supabase documentation confirms physical deletion is performed through either:

- Management API `DELETE /v1/projects/{ref}/functions/{function_slug}` with `edge_functions:write`, or
- `supabase functions delete <function> --project-ref <ref>`.

We intentionally did not substitute `deploy --prune`, tombstone redeployments, or registry relabeling because those would either delete unrelated runtime functions, destroy the latest rollback source, or make the architecture registry claim a runtime state that is not true.

## Rollback gate

Physical deletion remains fail-closed.

Current status:

- static-retirement-ready: 19
- durable rollback source already present in repository: 1 (`c0206-fit-translation-shadow-v01`)
- runtime-only source bundles not yet durably archived: 18
- physical delete allowed: 0
- physically deleted: 0
- holds: 0

Before any physical delete, the exact current runtime source bundle must be durably archived and tied to the manifest UUID/version/SHA-256. A rollback is then deterministic: redeploy that exact bundle with its original JWT setting and verify its recorded hash/version lineage.

## Runtime traffic caveat

Static dependency proof cannot prove absence of unknown direct HTTP callers. The available connector has no inbound Edge invocation-log action. The manifest therefore records runtime traffic visibility as `UNAVAILABLE_IN_CURRENT_CONNECTOR` rather than pretending no traffic exists.

This does not restore any retired component to production status; it only prevents destructive deletion without sufficient rollback/traffic evidence.

## Integrity verification

After deployment:

- retirement status function: `ok=true`
- manifest rows: 19
- static-retirement-ready: 19
- holds: 0
- physical delete allowed: 0
- GW4 manager plans: 0

No projection coefficients, model effects, frozen forecasts, research cohorts, or manager decisions were changed.
