# C0276 Batch 9 — C0240 Adversarial Lineage (In Progress)

Date: 2026-09-16

## Discovery
The corrected Decision Cycle DAG requires ADVERSARIAL ancestry: ENSEMBLE, STRUCTURAL, FORWARD, OR_UTILITY, RED_TEAM. Canonical adversarial runtime is the existing private C0240 orchestrator (`c0240_orchestrate_v01`) with immutable outputs in `public.fpl_final_adversarial_runs`; this is not the C0234 `fpl-autonomous-gate` Edge Function.

Existing latest C0240 run #22 was stale for the current Cycle: it referenced ensemble #10 / red-team #11 rather than current ensemble #12 / red-team #12, so it was not reused.

## Change
Migration `c0276_batch9_adversarial_lineage_dispatch` added:
- `private.c0276_adversarial_requests` ledger;
- `private.c0276_dispatch_adversarial_v01(cycle_id)`;
- fail-closed checks that all five required ancestors are READY and that the current Red-Team artifact proves the complete ensemble/structural/forward/OR-utility lineage;
- ADVERSARIAL transitions to RUNNING only after governed dispatch.

## Production execution
Cycle #2 current lineage supplied to C0240:
- ensemble #12
- structural #10
- forward #10
- OR utility #12
- red-team #12

C0240 created batch #231. First governed pass dispatched 2 tasks with 27 remaining. Second bounded reconciliation captured both successfully (failed=0, complete=2) and dispatched 2 more, leaving 25 remaining.

This batch deliberately stopped rather than looping through a heavy asynchronous workload in one request. Existing C0240 workload limits remain unchanged; no 5-worker experiment was performed.

ADVERSARIAL remains RUNNING until batch #231 completes and its final immutable artifact proves exact Cycle #2 lineage. Do not mark READY early.

## Safety
Historical forecasts remain append-only. No transfers/chips/publication. Red-Team `EDGE_NOT_ROBUST` remains preserved as upstream evidence. No decision/noise gate was weakened. C0265 unchanged.

## Exact next action
Resume C0240 batch #231 in bounded capture/dispatch steps using the existing concurrency policy. On completion, verify the new `fpl_final_adversarial_runs` artifact against ensemble #12, structural #10, forward #10, OR utility #12, red-team #12 and current manager/projection lineage. Only then reconcile ADVERSARIAL=READY.