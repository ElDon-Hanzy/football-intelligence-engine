# C0276 — Core Adapter Bounded Reconvergence — 2026-09-16

## Preflight
Inspected current production before writing. GitHub head was `f480b6adb8cea6611516ef0f067d427332c61b9b`. Supabase migration history showed `c0276_core_executor_adapters_v01` already deployed, so this batch did not duplicate PLAYER_PROJECTION / UNCERTAINTY / OPTIMIZER adapter work.

## Live bounded reconvergence
Cycle 2 remained the active GW5 decision cycle. Current projection lineage advanced to immutable prediction run 1392 and uncertainty was READY on the same run. The bounded event/convergence pass reached OPTIMIZER and dispatched request 7339. A governed capture then returned immutable optimizer run 40 READY on the current horizon lineage (GW5 1392, GW6 1385, GW7 1386).

## Defect found and repaired
The first optimizer async dispatch exposed a state-semantic bug: canonical optimizer status `DISPATCHED` was being translated to unified `BLOCKED`. That is incorrect because the node is executing asynchronously rather than waiting on governance.

Migration `c0276_optimizer_async_running_semantics_v01` repairs the adapter:
- `DISPATCHED` -> node `RUNNING`, `ok=true`;
- true upstream/cadence/manager waits remain `BLOCKED`;
- completed optimizer result -> `READY` with immutable optimizer run id;
- other failures remain `FAILED` and enter the existing bounded recovery policy.

This preserves the unified READY/STALE/RUNNING/FAILED/BLOCKED contract and prevents asynchronous work from consuming retry budget or being mistaken for a governance block.

## Current frontier
The next bounded pass advanced to ENSEMBLE and dispatched request 7340. ENSEMBLE remains `RUNNING`. The executor correctly waits rather than dispatching STRUCTURAL early. This batch intentionally stops here rather than polling or forcing an asynchronous completion.

## Safety
- C0240 concurrency unchanged; no 5-worker test claimed.
- No transfer or chip execution.
- No publication authorization.
- No decision/noise gate weakening.
- No historical forecast rewrite.
- No dependency skip.
- Candidate/final publication separation remains intact.

## Exact next batch
Capture ENSEMBLE request 7340 when complete, then run bounded one-node convergence through STRUCTURAL -> FORWARD -> OR_UTILITY -> RED_TEAM -> ADVERSARIAL. Stop immediately on any RUNNING, BLOCKED or FAILED frontier. After those layers reconverge, verify candidate-plan lineage and FINAL_GATE remain fail-closed before considering any scheduler/cron activation.