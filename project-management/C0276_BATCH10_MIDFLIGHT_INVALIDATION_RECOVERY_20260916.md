# C0276 Batch 10 — Mid-flight invalidation recovery

Date: 2026-09-16

## Trigger
Before continuing C0240 batch #231, `private.c0276_detect_events_v01(2)` detected a fresh `PLAYER_STATE_CHANGED` condition. The control plane invalidated projection #1387 and all dependent decision artifacts. C0240 batch #231 was still RUNNING with 2 COMPLETE, 2 DISPATCHED and 25 PENDING tasks.

## Fail-closed action
The engine did not continue dispatching stale-lineage C0240 work. Batch #231 was marked FAILED/superseded and Cycle #2 ADVERSARIAL was returned to STALE with reason `PLAYER_STATE_CHANGED_DURING_C0240_BATCH_231_SUPERSEDED`.

This is a production proof of event-triggered downstream invalidation interrupting a live bounded workload. Already-dispatched worker calls may finish their individual task writes, but their parent batch is superseded and cannot be promoted as current Cycle evidence.

## Recovery probe
`private.c0276_recover_player_projection_v01(2)` returned `ALREADY_ALIGNED` for prediction run #1387 with canonical fixture count 10 and zero fixture mismatch. This does not by itself clear the PLAYER_STATE_CHANGED invalidation: the recovery helper proved fixture alignment but did not provide sufficient evidence in this batch that the changed player-state cutoff was incorporated. Therefore the control plane remains STALE rather than incorrectly re-promoting #1387.

## Safety
- Historical forecasts were not rewritten.
- No transfers/chips were executed.
- No publication occurred.
- No decision/noise gate was weakened.
- C0240 concurrency was not increased and no 5-worker test was run.
- C0265 was not modified.

## Blocker / exact next batch
The next batch must inspect the player-state event signature/cutoff versus prediction run #1387 and the projection recovery contract. If #1387 genuinely incorporates the new player state, reconcile it with explicit proof; otherwise append a new projection run. Only then regenerate uncertainty and proceed dependency-by-dependency. Do not resume or finalize superseded C0240 batch #231.