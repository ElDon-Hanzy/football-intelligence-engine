# C0276 — Autonomous async reconciliation controller — 2026-09-17

## Scope
Bounded continuation from the live Cycle 2 frontier. No FPL transfer/chip execution, no historical forecast rewrite, no decision/noise gate weakening, no C0265 change, and no C0240 concurrency increase.

## Production state inspected first
The player/fixture recovery path had continued autonomously beyond the prior deadlock: projection lineage advanced through immutable runs 1396, 1397, 1398, 1399 and then 1400. Uncertainty was current for 1400. Optimizer request 7443 had completed successfully for projection 1399, but a later fixture-lineage event correctly superseded it with projection 1400.

A new autonomy defect was then exposed: asynchronous nodes could remain RUNNING indefinitely because the autonomous tick detected events and invoked the executor, but did not call the existing async reconcilers. In addition, ENSEMBLE remained RUNNING on an old optimizer lineage (request bound to optimizer 43) after optimizer had advanced to 46. The executor correctly WAITed, but nothing autonomously converted that stale in-flight lineage back to STALE.

## Changes
Migration `c0276_async_reconciliation_controller_v01`:
- strengthened `c0276_reconcile_ensemble_running_v01` to compare the request's optimizer_run_id against the cycle's current optimizer artifact;
- stale in-flight ensemble lineage now becomes STALE with `UPSTREAM_OPTIMIZER_LINEAGE_CHANGED`, rather than waiting forever;
- added `c0276_reconcile_running_frontier_v01`, which reconciles at most the earliest dependency-ordered RUNNING async node per tick;
- integrated that reconciliation step into `c0276_event_converge_one_v01` before the bounded executor;
- retained one-node dispatch semantics; reconciliation is state settlement, not a second workload dispatch;
- private execution privileges remain revoked from public/anon/authenticated.

Follow-up migration `c0276_async_reconciliation_controller_fix_v01` corrected the DAG table reference to the canonical `private.fpl_decision_dependency_dag`. The initial failed verification transaction made no cycle mutation.

## Verification
1. Projection 1400 READY; uncertainty 1400 READY.
2. Current optimizer request for projection 1400 completed and reconciled to optimizer run 46.
3. Controller observed ENSEMBLE RUNNING on optimizer 43, marked it STALE, and in the same bounded tick dispatched a fresh ensemble request 7447 bound to optimizer 46.
4. Request 7447 returned HTTP 200 and reconciled to ensemble run 18.
5. The next dependency-safe node, STRUCTURAL, dispatched as request 7448 and is RUNNING. Per bounded-batch discipline, this batch stops at that legitimate in-flight frontier.
6. Earlier fault classifier and isolated end-to-end fault recovery remained PASS in the immediately preceding batch; no gate was weakened here.

## Safety / governance
- historical_forecasts_rewritten=false throughout.
- external_fpl_execution=false throughout.
- No transfers or chips executed.
- Candidate/final publication separation unchanged.
- C0240 worker concurrency unchanged; no 5-worker claim/test introduced.
- C0265 unchanged.
- Autonomous cron remains 5-minute bounded tick.

## Exact next batch
Allow structural request 7448 to settle. The autonomous controller should reconcile it without manual intervention and advance one dependency-safe node at a time through FORWARD -> OR_UTILITY -> RED_TEAM -> ADVERSARIAL -> CAPTAINCY -> candidate SEQUENTIAL. Stop on any FAILED/BLOCKED or unresolved RUNNING frontier. Validate each async reconciler's upstream-lineage binding as it is encountered; repair stale-RUNNING lineage handling rather than bypassing it.