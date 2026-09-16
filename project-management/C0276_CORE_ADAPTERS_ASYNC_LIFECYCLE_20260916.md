# C0276 — Core Executor Adapters + Async Lifecycle Repair — 2026-09-16

## Production state before batch
Previous batch ended with Cycle 2 at `OPTIMIZER / STALE`, after immutable projection run 1391 and C0227 uncertainty regeneration. C0240 concurrency remained unchanged and no scheduler had been enabled.

## Changes
### Governed core adapters
Migration `c0276_core_executor_adapters_v01` registered bounded executor adapters for:
- `PLAYER_PROJECTION` -> existing C0276 governed projection recovery/reconciliation;
- `UNCERTAINTY` -> C0227 V02 refresh, lineage-checked against the cycle projection run;
- `OPTIMIZER` -> existing C0213/C0240 read-only optimizer orchestration.

`c0276_execute_one_v01` now recognizes those nodes in addition to the previously governed downstream dispatchers.

### Async-state bug found and repaired
The first live optimizer pass exposed an orchestration-state bug: an asynchronous `DISPATCHED` optimizer result was temporarily classified as governance `BLOCKED`. Live readback caught this immediately.

Migration `c0276_optimizer_async_state_repair_v01` established the permanent semantic rule:
- `DISPATCHED` = `RUNNING`;
- deliberate readiness/governance waits = `BLOCKED`;
- actual non-governance failures = `FAILED` and eligible for bounded retry.

It also added bounded optimizer reconciliation so completed asynchronous work becomes READY without retrying or bypassing governance.

### Async reconciliation
Migrations `c0276_ensemble_async_reconcile_v01` and `c0276_structural_async_reconcile_v01` added lineage-safe reconciliation for already-dispatched ENSEMBLE and STRUCTURAL work.

## Live results
A fresh authoritative state event arrived during the batch, so the event detector correctly invalidated downstream again. The executor regenerated an append-only projection snapshot:
- prediction run **1392**;
- **604** player projections;
- **10/10** canonical GW5 fixtures aligned;
- **0** fixture mismatches;
- historical forecasts rewritten = false.

Then:
- C0227 uncertainty: **604** rows for projection 1392 -> READY;
- optimizer run **40** -> READY;
- ensemble run **15** -> READY;
- structural run **12** -> READY.

Current dependency-safe frontier: **FORWARD / STALE**.

## Safety invariants
- no FPL transfer or chip execution;
- no publication authorization bypass;
- no historical forecast rewrite;
- no decision/noise-gate weakening;
- C0240 concurrency unchanged; no 5-worker validation claimed;
- C0265 unchanged;
- one dependency-safe action per executor pass remains the workload bound.

## Durable decision-history entry
C0276 now treats asynchronous lifecycle state as a first-class orchestration contract: dispatch is RUNNING, not BLOCKED. BLOCKED is reserved for deliberate governance/readiness waits and does not consume retry budget. FAILED is reserved for retryable/non-governance execution failure. READY requires lineage-matched persisted evidence.

## Exact next batch
Generalize bounded RUNNING reconciliation for FORWARD, OR_UTILITY, RED_TEAM and ADVERSARIAL, integrate that reconciliation into event-converge, and advance Cycle 2 one node per pass until FINAL_GATE or another genuine fail-closed blocker. Do not enable an automatic scheduler/cron until the complete chain reaches the intended FINAL_GATE governance wait safely.