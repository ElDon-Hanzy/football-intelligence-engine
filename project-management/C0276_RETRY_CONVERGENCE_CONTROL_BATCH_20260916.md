# C0276 — Retry & Convergence Control Batch — 2026-09-16

## Scope
Bounded production batch toward autonomous orchestration/self-healing. This batch intentionally did not change C0240 concurrency, C0265 xMins behavior, decision/noise gates, historical forecasts, or external FPL execution.

## Production state inspected first
Cycle 2 / GW5 was already current through SEQUENTIAL: projection 1390, optimizer 38, ensemble 14, structural 11, forward 11, OR utility 13, red-team 13, adversarial 23, captaincy current, sequential production run 36. FINAL_GATE remained BLOCKED only by the intentional T-2h refresh requirement; PUBLICATION remained BLOCKED behind FINAL_GATE. Candidate-plan materialization already existed independently of publication.

## Changes
Supabase migrations:
- `c0276_retry_convergence_control_v01`
- `c0276_retry_convergence_control_fix_v01`

Added private recovery ledger `private.fpl_decision_node_recovery` with per-cycle/per-node attempt count, last attempt/error, exponential retry time, and IDLE/RETRY_WAIT/EXHAUSTED state.

Added `private.c0276_record_recovery_attempt_v01` and `private.c0276_reset_recovery_v01`. Retry limits continue to come from the existing dependency DAG; no gate thresholds were weakened.

Added `private.c0276_convergence_status_v01`. It walks the dependency DAG in ordinal order and returns only the first non-READY node whose dependencies are all READY. It reports heavy-node classification, retry state/limit, and deadline priority. Deadline is derived from the current production fixture prediction source. The first implementation referenced a nonexistent generic fixture table; readback exposed this immediately and the second migration corrected the source to `public.current_production_fixture_prediction_v01`.

## Verification
Live readback after the fix returned:
- `C0276_NEXT_NODE_READY`
- cycle 2
- node `FINAL_GATE`
- node status `BLOCKED`
- heavy `false`
- attempts 0 / retry limit 2
- priority `NORMAL`
- deadline `2026-09-18T17:30:00Z`
- historical forecasts rewritten `false`

This is the expected dependency-safe frontier. The controller did not skip FINAL_GATE and did not attempt PUBLICATION.

## Safety / invariants
- Historical forecast immutability preserved.
- No transfers or chips executed.
- No publication authorized.
- C0240 concurrency unchanged; no 5-worker test claimed.
- C0265 unchanged.
- Decision/noise gates unchanged.
- Recovery exhausts fail-closed rather than silently advancing.

## Remaining blocker
Current GW5 FINAL_GATE is intentionally time-blocked until the mandatory T-2h refresh window. This is governance, not an engineering failure.

## Exact next batch
Add the bounded convergence executor around the status controller: dispatch only the returned dependency-safe node, distinguish intentional BLOCKED states from retryable FAILED states, add deadline-aware escalation behavior without bypassing T-2 governance, and implement fault-injection tests against a disposable/test cycle so production artifacts and historical forecasts remain untouched. Then generalize event-triggered downstream regeneration and complete unified health-state certification.
