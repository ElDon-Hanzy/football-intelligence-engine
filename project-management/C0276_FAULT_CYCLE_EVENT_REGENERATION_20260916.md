# C0276 — Fault Cycle + Event-Triggered Regeneration — 2026-09-16

## Scope
Next bounded autonomy batch after the one-node executor. Preserve append-only historical forecasts, fail-closed governance, current C0240 concurrency and C0265 behavior. No transfer/chip execution.

## Isolated end-to-end fault proof
Migration `c0276_isolated_fault_cycle_harness_v01` added `private.c0276_fault_cycle_e2e_test_v01()`.

The isolated state-machine test passed the full required sequence:
`STALE -> DISPATCH -> FAILED -> RETRY_WAIT -> RETRY -> READY -> INVALIDATE_DESCENDANTS -> REGENERATE -> READY`.

Assertions: retry budget honored, backoff required, recovery succeeded, descendants invalidated, dependency-safe reconvergence completed, production cycle rows mutated=false, production artifacts mutated=false, historical forecasts rewritten=false, external FPL execution=false.

## Event-triggered bounded convergence
Migration `c0276_event_triggered_executor_v01` added `private.c0276_event_converge_one_v01(cycle_id)`.

Each pass:
1. runs the existing authoritative fixture/player-state event detector;
2. invalidates downstream through the existing dependency DAG;
3. invokes the bounded executor for at most one dependency-safe action.

## Live proof and discovered boundary
The first live Cycle 2 pass detected a genuine fresh `FIXTURE_LINEAGE_CHANGED` event. Descendants were correctly marked STALE. The executor then reached `PLAYER_PROJECTION` and deliberately failed closed with `NO_GOVERNED_DISPATCHER_FOR_NODE`; it did not skip to downstream layers.

The existing governed projection recovery was then used. It appended immutable prediction run **1391**, produced **604** prediction rows, reconciled **10/10** GW5 fixtures with **0 mismatches**, updated the cycle fixture/player-state baseline and preserved `historical_forecasts_rewritten=false`.

C0227 uncertainty was regenerated for prediction run 1391 with 604 rows. A subsequent event scan returned zero new events. Current dependency-safe frontier is **OPTIMIZER / STALE**.

## Safety
No transfer/chip execution. No publication authorization. No historical forecast rewrite. C0240 concurrency unchanged; no 5-worker validation claimed. C0265 unchanged. The missing generic PLAYER_PROJECTION/UNCERTAINTY/OPTIMIZER adapters are treated as a fail-closed implementation boundary, not bypassed.

## Exact next batch
Register governed executor adapters for PLAYER_PROJECTION, UNCERTAINTY and OPTIMIZER using the already-proven canonical recovery/orchestration paths. Then reconverge Cycle 2 in bounded one-node passes from OPTIMIZER onward, retaining event scans between stages. Only after the complete live chain is stable should a scheduler/cron invoke event-triggered convergence automatically.