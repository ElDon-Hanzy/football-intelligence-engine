# C0213 P3 — Final Retired External Reconciliation

Date: 2026-09-07
Change: C0213

## Purpose

Close the final discrepancy between live Supabase runtime state and the C0213 architecture/retirement registries after the guarded physical deletion of the last retired external runtime, `audit-gw`.

## Caller root cause

The remaining `audit-gw` traffic was engine-owned. The active canonical `sync-gw-results` Edge Function contained a fire-and-forget request to `/functions/v1/audit-gw` after changed result ingestion.

Repository source:
- `supabase/functions/sync-gw-results/index.ts`

Caller removal commit:
- `2a563e2ce8b8bfedc2f03a5b9c30818bffc05ba8`

Production `sync-gw-results` after cleanup:
- runtime id: `b491fc7f-eecd-4ac5-9354-228671cd8f8e`
- version: `5`
- SHA-256: `707639a43f3626036fec83f2b833c290f57595c5da2368133203a8c5e0ba5e01`

## Behavioral proof

A live `sync-gw-results?gw=3` proof request returned HTTP 200 with:
- `unchanged=true`
- result run `185`
- 10 matches reconciled
- no historical/result rewrite

Hosted Edge logs then proved:
- canonical sync proof requests: 1
- post-fix `audit-gw` requests: 0

Silence-gate workflow:
- run `34146790315`

## Guarded physical retirement

The final delete workflow revalidated:
- Supabase project identity
- exact `audit-gw` UUID/version/SHA
- exact `sync-gw-results` v5 UUID/version/SHA
- fresh post-fix zero-traffic gate

Deleted runtime:
- slug: `audit-gw`
- runtime id: `c45d961c-f053-4b18-89c4-478a28f85d80`
- version: `3`
- SHA-256: `a9612f244c875f019d887b39b3e0b74e720a2b7b4f370b128e5581d9811415ae`

Delete workflow:
- run `34146869734`
- guard commit `24cfc335bbd14f901de489e0745e52df01e8a95d`
- physical deletion verified at `2026-09-07T17:15:56Z`

Rollback source remains preserved under:
- `project-management/retired-runtime-archive/20260906/audit-gw`

## Database reconciliation

Production migration:
- `20260907193849_c0213_p3_final_retired_external_reconciliation_v01`

GitHub mirror:
- `supabase/migrations/20260907193849_c0213_p3_final_retired_external_reconciliation_v01.sql`

The migration reconciles:
1. `private.c0213_retired_external_retirement_manifest`
   - `audit-gw` -> `DELETED`
   - hold cleared
   - zero-post-fix-traffic evidence recorded
   - caller and delete provenance recorded
2. `private.c0213_external_components`
   - `audit-gw`: `active=false`, `deployment_status=DELETED`
   - `sync-gw-results`: runtime version updated to v5 with exact runtime/proof provenance

## Verified final state

`private.c0213_retired_external_retirement_status_v01()`:
- `ok=true`
- manifest rows: 19
- physically deleted: 19
- holds: 0
- durable rollback sources: 19
- rollback sources missing: 0

`private.c0213_architecture_registry_status_v01()`:
- `registry_integrity_ok=true`
- `system_consolidation_ok=true`
- required capability gaps: 0
- required capability contradictions: 0
- duplicate active cron targets: 0
- active retired external deployments: 0
- active retired Edge deployments: 0
- active retired API deployments: 0

GW4 manager plans after reconciliation:
- 0

## Safety / model integrity

This change only reconciles runtime/registry truth and removes an obsolete retired side-call. It does not change:
- numerical model coefficients
- historical forecasts
- frozen research cohorts
- manager decisions
- FPL GW4 squad state

## Advisor result

Post-change Supabase advisors produced no new reconciliation-specific warning. Existing project-wide backlog remains, chiefly:
- RLS-enabled public tables with no policies
- older private functions with mutable `search_path`
- `pg_net` installed in `public`
- unindexed foreign keys
- low-use/unused indexes requiring evidence before removal
