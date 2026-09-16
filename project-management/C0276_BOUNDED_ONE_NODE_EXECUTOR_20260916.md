# C0276 — Bounded One-Node Executor — 2026-09-16

## Scope
Continuation after bounded executor/governance classification. This batch wires classification to existing governed dispatchers only. No C0240 concurrency change, no C0265 change, no gate weakening, no historical forecast rewrite, no FPL transfer/chip execution.

## Production inspection
Latest GitHub production head before this batch was `9f8c1d8e7e16d4c18a477ae866caee33db04a1a6`. Supabase already contained the retry/convergence controller, executor classifier, recovery ledger, and governed dispatchers for ENSEMBLE, STRUCTURAL, FORWARD, OR_UTILITY, RED_TEAM and ADVERSARIAL. Live Cycle 2 was already converged through SEQUENTIAL; FINAL_GATE was the dependency-safe frontier and intentionally BLOCKED by T-2 governance.

## Change
Migration: `c0276_bounded_executor_dispatch_v01`.

Added `private.c0276_execute_one_v01(cycle_id)`:
- takes an advisory lock per decision cycle;
- reads the existing executor/convergence classifier;
- performs at most one dependency-safe node action per call;
- dispatches only STALE or retryable FAILED nodes;
- supports only existing governed dispatchers: ENSEMBLE, STRUCTURAL, FORWARD, OR_UTILITY, RED_TEAM, ADVERSARIAL;
- leaves BLOCKED nodes untouched as `GOVERNANCE_WAIT`;
- leaves RUNNING nodes untouched;
- records bounded recovery attempts/backoff for non-governance dispatch failures;
- converts dispatcher governance blocks to unified BLOCKED state without consuming retry budget;
- fails closed when the frontier has no governed dispatcher;
- never authorizes publication or external FPL execution.

## Verification
Live Cycle 2 call returned FINAL_GATE / BLOCKED / GOVERNANCE_WAIT with `executed=false`, attempts `0/2`, deadline `2026-09-18T17:30:00Z`, historical rewrite false and external FPL execution false.

Existing isolated classifier fault-injection test was rerun and remained green: BLOCKED non-retryable, FAILED-with-budget retryable, exhausted failure fail-closed, T-2 deadline escalation true; production artifacts mutated false; historical forecasts rewritten false; external FPL execution false.

## Safety
C0240 concurrency remains unchanged; no 5-worker validation is claimed. C0265 remains untouched. Decision/noise/final/publication gates remain fail-closed. No transfers or chips were executed.

## Exact next batch
Build an isolated end-to-end fault-cycle harness around the bounded executor, using non-production/test cycle artifacts, and prove failure -> retry/backoff -> recovery -> downstream invalidation -> dependency-safe reconvergence. Then wire event-triggered invocation to the executor only after that proof passes, retaining one-node-per-pass workload bounds and current C0240 concurrency.