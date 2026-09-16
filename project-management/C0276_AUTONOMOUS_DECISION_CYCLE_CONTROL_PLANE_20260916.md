# C0276 — Autonomous Decision Cycle Control Plane

Date: 2026-09-16 (Dubai)
Status: In Progress — production scaffold deployed; zero numeric model effect

## Purpose
Close the end-to-end autonomy gap exposed by GW5 lineage drift: fresh fixture/player facts must invalidate every affected downstream decision artifact and the engine must converge onto one coherent lineage without weakening fail-closed governance.

## Batch 1 deployed
Migration: `c0276_decision_cycle_control_plane_v01`.

Created:
- `public.fpl_decision_cycles`: explicit Decision Cycle identity and unified READY / STALE / RUNNING / FAILED / BLOCKED state.
- `public.fpl_decision_cycle_nodes`: per-cycle artifact/node health and lineage attachment.
- `private.fpl_decision_dependency_dag`: explicit dependency/invalidation graph from fixture/player state through projections, optimizer, ensemble, robustness evaluators, adversarial gate, captaincy, sequential planner, final gate and publication.
- `private.c0276_invalidate_cycle_v01`: deterministic downstream invalidation without rewriting historical forecasts.
- `private.c0276_cycle_health_v01`: one health object for cycle/node state.

No FPL transfer/chip execution path was added. No decision/noise gate was weakened. Historical forecasts remain append-only.

## Verification
A temporary synthetic cycle populated every DAG node as READY. A simulated fixture-state change invalidated 13 descendants and changed the cycle to STALE while leaving FIXTURE_STATE and PLAYER_STATE READY. Health output correctly reported each descendant reason as `TEST_FIXTURE_CHANGE` and `historical_forecasts_rewritten=false`. The synthetic cycle was deleted after verification.

## Deliberately not included in this bounded batch
- no automatic regeneration worker yet;
- no production current-GW cycle instantiated yet;
- no candidate-plan/publication decoupling yet;
- no retry scheduler or deadline escalation yet;
- C0240 concurrency remains unchanged;
- no 5-worker test was performed.

## Next dependency-ordered batch
1. Build a current-GW Decision Cycle constructor from manager state + current prediction/fixture/player lineage.
2. Add event-to-invalidation detection for fixture cutoff and hard player-state changes.
3. Add a bounded controller that advances only the first stale dependency-safe node and records RUNNING/FAILED/BLOCKED/READY.
4. Use GW5's known fixture-lineage drift as the first real recovery acceptance case.
5. Keep projection regeneration append-only and retain all existing final/noise gates.

Promotion to fully autonomous status is forbidden until an end-to-end recovery test can inject stale fixture/player lineage and, with no manual repair, rebuild descendants, converge lineage, and reach the correct fail-closed or ready publication state.