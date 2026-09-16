# C0276 — Bounded autonomy batch: retry-wait + player-state recovery — 2026-09-16

## Context
This batch inspected current production before changing anything. C0276 already had explicit decision cycles, DAG/invalidation, event-triggered regeneration, candidate-only sequential planning, bounded retries, convergence health, deadline priority, fault harnesses and a 5-minute autonomous tick. C0240 concurrency remains unchanged.

At 18:40 UTC a new `PLAYER_STATE_CHANGED` event invalidated the current GW5 chain. Projection run 1394 (generated 18:35 UTC) predated the new player-state cutoff 18:37 UTC. The projection reconciler correctly blocked it, but two autonomy defects were exposed.

## Defect 1 — player-state invalidation could not trigger projection regeneration
`c0276_recover_player_projection_v01` only regenerated when fixture lineage was misaligned. If fixture lineage was aligned, it immediately returned the reconciler's `PROJECTION_PREDATES_PLAYER_STATE` block. This left the autonomous chain blocked even though the correct recovery was a fresh immutable projection.

Migration: `c0276_player_state_recovery_gate_v02`.

Change: if fixture lineage is aligned but reconciliation fails specifically with `PROJECTION_PREDATES_PLAYER_STATE`, the recovery function now enters the same governed fresh-snapshot path used for fixture-lineage recovery. Other reconciliation failures still fail closed. It preserves append-only forecasts, invalidates descendants, and requires post-generation reconciliation.

Production test encountered a real concurrent scheduler deadlock while generating the fresh snapshot. The exception was caught and returned `RECOVERY_EXCEPTION`; no historical forecast rewrite occurred. The node is FAILED rather than falsely READY. This is useful fault evidence, not a reason to bypass governance.

## Defect 2 — RETRY_WAIT classifier bug
The previously identified concern was reproduced exactly. After recording recovery attempt 1/2, `c0276_convergence_status_v01` returned `C0276_RETRY_WAIT` without `node_status`. The executor classified that as `FAIL_CLOSED / UNKNOWN_HEALTH_STATE`, so automatic backoff could never behave correctly.

Migration: `c0276_retry_wait_executor_classification_v02`.

Change: `c0276_executor_status_v01` now handles top-level `C0276_RETRY_WAIT` before node-status classification and returns:
- executor_action = `WAIT_RETRY`
- executor_reason = `RETRY_BACKOFF_ACTIVE`
- retry_permitted = true
- preserves next_retry_at, retry budget, deadline priority and safety flags.

Verification after migration:
- status `C0276_RETRY_WAIT`
- node PLAYER_PROJECTION
- attempt_count 1 / retry_limit 2
- executor_action `WAIT_RETRY`
- executor_reason `RETRY_BACKOFF_ACTIVE`
- external_fpl_execution false
- historical_forecasts_rewritten false.

## Current frontier
The real player-state recovery attempt hit a database deadlock with the concurrent autonomous scheduler. Recovery attempt 1 was recorded and the normal retry backoff is active. Do not manually bypass the backoff. The next safe batch should observe the retry after `next_retry_at`; if deadlock repeats, implement bounded lock/contention isolation between autonomous tick and projection generation rather than increasing retries or weakening gates.

## Safety
- No transfer/chip execution.
- No historical forecast rewrite.
- C0265 unchanged.
- C0240 concurrency unchanged; no 5-worker expansion.
- No decision/noise gate weakened.
- FINAL/publication not bypassed.
