# C0213 P3 — Retired External Deployment Retirement Audit

Date: 2026-09-07
Change: C0213
Scope: architecture consolidation only. No numerical model change. No historical forecast rewrite. No GW4 manager decision output.

## Objective

Audit the 19 external runtime components classified `RETIRED`, prove current consumption/traffic, preserve deterministic rollback, and physically remove only runtimes that pass static-consumer, traffic, rollback and exact-runtime-identity gates.

## Current result

**18 of the 19 RETIRED external runtimes have now been physically deleted.**

`audit-gw` remains physically ACTIVE on an explicit traffic hold. The architecture registry correctly remains fail-closed with exactly one active RETIRED external deployment and `system_consolidation_ok=false`.

No FPL projection coefficient, frozen forecast, research cohort or manager decision was changed. GW4 manager-plan count remains zero.

## Static consumer proof

Static consumer proof is green for all 19 manifest items:

- dependency-graph incoming edges: 0
- dependency-graph outgoing edges: 0
- exact live database-function consumers: 0
- exact active-cron consumers: 0
- trigger/view consumers: 0
- canonical UI/API dependency edges: 0

Two initial text matches were substring false positives:

- `sync-fpl` matched cron 25 only because the live target is `sync-fpl-data`.
- `c0206-build-understat-foreign-pairs` matched `private.invoke_engine_ingest` only because the allowlist retains successor `c0206-build-understat-foreign-pairs-v02`.

The two superseded C0206 v01 endpoints were already blocked from canonical internal invocation before physical deletion.

## Durable rollback archive

All 19 manifest items have durable rollback source.

The 18 previously runtime-only bundles are stored outside `supabase/functions/` under:

`project-management/retired-runtime-archive/20260906/`

The archive is intentionally non-deployable so bulk function deployment cannot accidentally resurrect legacy runtimes. Each bundle records the captured runtime UUID, version, `verify_jwt` state, SHA-256 and exact runtime files. `c0206-fit-translation-shadow-v01` already had repository-backed source.

Archive commits:

- `3f3d29d7cf860d22e009ee8867f955b7578a54b2`
- `22ee2613a7d8ced3a18b3506b1c923a347b3c73b`
- archive reconciliation: `a7bb796199b790f3583a7749f5de8f0e70636219`

No access token or service credential is stored in the archive.

## Runtime-traffic audit

The scoped `SUPABASE_ACCESS_TOKEN` was supplied through GitHub Actions secrets; it was never committed or printed.

Audit workflow:

`.github/workflows/c0213-retired-function-traffic-audit.yml`

Successful historical traffic run:

- run `34074665804`
- queried `function_edge_logs` in <=24-hour windows from 2026-08-20 through 2026-09-07
- excluded OPTIONS traffic
- validated expected Supabase project identity and 19/19 live target presence before audit

Every retired runtime had historical traffic, but 16 stopped on 2026-08-21/22. The two C0206 v01 runtimes had isolated recent research/probe POSTs only:

- `c0206-build-understat-foreign-pairs`: one POST on 2026-09-04 23:55:10 UTC
- `c0206-fit-translation-shadow-v01`: two POSTs on 2026-09-05 15:51:21 and 15:51:35 UTC

No recurring caller existed for either v01 runtime, their canonical successors are deployed, their internal allowlist entries are removed, and both were included in the approved physical-retirement set.

## `audit-gw` traffic hold

`audit-gw` is different and was **not deleted**.

Historical audit found 184 non-OPTIONS invocations, with traffic continuing through 2026-09-06 22:45:09.485 UTC. Recent forensics showed repeated successful GETs close to a 15-minute cadence.

Detailed caller-forensics workflow:

`.github/workflows/c0213-audit-gw-caller-forensics.yml`

Run `34074994748` established the recent requests have:

- method: GET
- status: 200
- User-Agent: `FootballIntelligence/0.3`
- no `x_client_info`
- no referer

Exact searches of current DB functions, active cron commands, current views and the current repository found no caller string for either `audit-gw` or `FootballIntelligence/0.3`. Current `net.http_request_queue` also contains no matching queued request.

Therefore the endpoint remains `RETIRED` but physically `ACTIVE`, with manifest state `HOLD` and reason:

`RECENT_15_MIN_ENGINE_OWNED_TRAFFIC_CALLER_NOT_YET_LOCATED`

We do not infer that an unidentified engine-owned caller is safe to break.

## Physical retirement execution

Deletion workflow:

`.github/workflows/c0213-retired-function-delete-approved.yml`

Commit:

`7de99737ad89891a7fe0d06e861682200a24b2a9`

Run:

`34075158188`

Before deletion the workflow failed closed unless every approved target matched its manifest-captured:

- slug
- Supabase runtime UUID
- runtime version
- runtime `ezbr_sha256`
- ACTIVE status

It also asserted `audit-gw` was present and not in the deletion list.

All 18 runtime identities matched. The workflow then issued exact Management API DELETE calls one-by-one and verified all 18 were absent afterward while `audit-gw` remained present.

Physically deleted:

1. `c0206-build-understat-foreign-pairs`
2. `c0206-fit-translation-shadow-v01`
3. `fpl-dashboard`
4. `generate-fixture-predictions`
5. `generate-fpl-predictions`
6. `generate-fpl-predictions-v012`
7. `generate-fpl-predictions-v013`
8. `optimize-fpl-squad`
9. `projection-benchmark-api`
10. `publish-dashboard`
11. `refresh-player-state`
12. `refresh-player-state-v012`
13. `refresh-team-state`
14. `sync-core-insights`
15. `sync-current-team-meta`
16. `sync-fpl`
17. `sync-historical-priors`
18. `sync-team-priors`

Held:

- `audit-gw`

## Manifest / registry reconciliation

Production migrations:

- `c0213_p3_retired_external_physical_retirement_18_v01`
- `c0213_p3_audit_gw_active_hold_registry_truth_v01`

Repository mirrors:

- `supabase/migrations/20260907020730_c0213_p3_retired_external_physical_retirement_18_v01.sql`
- `supabase/migrations/20260907020910_c0213_p3_audit_gw_active_hold_registry_truth_v01.sql`

The second migration is deliberately important. An intermediate label `ACTIVE_TRAFFIC_HOLD` caused the existing registry counter to miss the still-active retired runtime. That would have made `system_consolidation_ok=true` while `audit-gw` was still physically deployed. C0213 corrected this immediately: `audit-gw` remains `deployment_status='ACTIVE'`, with traffic-hold detail stored separately in evidence.

Current truthful architecture state:

- registry integrity: true
- required capability missing: 0
- required capability contradictions: 0
- duplicate active cron targets: 0
- active RETIRED external deployments: **1**
- active RETIRED Edge deployments: **1**
- active RETIRED API deployments: **0**
- `system_consolidation_ok=false`

Retirement manifest:

- manifest rows: 19
- physically deleted: **18**
- holds: **1**
- durable rollback sources: 19
- rollback sources not archived: 0

## Remaining action

Locate and disable/replace the external scheduler sending `User-Agent: FootballIntelligence/0.3` to `audit-gw`. Only after a confirmed quiet period should `audit-gw` pass a final live runtime-identity check and be physically deleted.

Until then, one consolidation blocker remains by design.
