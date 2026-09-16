# C0276 — Autonomous Decision Cycle Control Plane

Date: 2026-09-16 (Dubai)
Status: In Progress — production self-healing lineage through C0233; zero numeric model effect

## Purpose
Fresh fixture/player facts must invalidate every affected downstream decision artifact and the engine must converge onto one coherent Decision Cycle lineage without weakening fail-closed governance.

## Established production lineage
Cycle #2: projection #1387 -> uncertainty #1387 -> optimizer #35 -> ensemble #12 -> structural #10 -> forward #10 -> OR utility #12 -> red-team #12.

Batches 1-7 established explicit Decision Cycle identity, unified READY/STALE/RUNNING/FAILED/BLOCKED node health, append-only projection recovery, and governed idempotent lineage through C0232.

## Batch 8 — DAG contract correction + C0233 red-team
Migration: `c0276_batch8_dag_contract_and_red_team_dispatch`.

Live inspection found a control-plane contract defect before C0233 was wired: the DAG still declared STRUCTURAL, FORWARD, OR_UTILITY and RED_TEAM as depending only on OPTIMIZER, while the already-governed production lineage and C0233 runtime consume later artifacts. This could allow a future convergence controller to dispatch a node before its real ancestors were current.

The migration aligned the DAG to the governed dependency chain:
- STRUCTURAL depends on ENSEMBLE;
- FORWARD depends on STRUCTURAL;
- OR_UTILITY depends on FORWARD;
- RED_TEAM depends on ENSEMBLE + STRUCTURAL + FORWARD + OR_UTILITY;
- invalidation sets were expanded so changes to an upstream governed artifact stale all affected downstream artifacts.

Canonical C0233 was verified as active Edge Function `fpl-red-team` v1, version `C0233_ADVERSARIAL_RED_TEAM_V01`. Its runtime reads the latest ensemble, structural, forward, OR-utility and team-regime shadow artifacts. Team-regime evidence has zero numeric effect.

Added `private.c0276_red_team_requests` and `private.c0276_dispatch_red_team_v01(cycle_id)`. Dispatch fails closed unless all represented ancestors are READY, all four Cycle artifacts are still latest for GW/horizon, structural/forward/OR artifacts point to the same Cycle ensemble, all are immutable/READY, and the latest team-regime shadow artifact is immutable/READY. Dispatch is advisory-lock protected and idempotent.

Production proof:
- Cycle #2 request #7193;
- pinned ensemble #12 / structural #10 / forward #10 / OR utility #12 / team regime #3;
- HTTP 200 / `RED_TEAM_READY`;
- new red-team run #12 created after dispatch with exact lineage;
- `red_team_status=EDGE_NOT_ROBUST`;
- RED_TEAM=READY / artifact #12;
- historical_forecasts_rewritten=false.

The red-team result is deliberately not converted into a recommendation here. Its high-severity challenge must remain available to the downstream adversarial/final governance layers.

## Safety invariants
Historical forecasts remain append-only. No transfer/chip execution or publication occurred. Decision/noise gates were not weakened. C0240 concurrency is unchanged; no 5-worker test was performed. C0265 remains untouched.

## Remaining autonomy work
- verify and govern the next ADVER​SARIAL runtime against the corrected DAG;
- candidate-plan artifact independent of final publication;
- per-node retry/backoff and FAILED/BLOCKED recovery;
- bounded first-safe-stale convergence controller;
- deadline-aware priority escalation;
- end-to-end fault-injection recovery.

## Exact next batch
Inspect canonical C0240/C0242 adversarial runtime and current ADVER​SARIAL artifact contract. Reconcile its real dependencies against the corrected DAG before dispatch. Because C0233 currently reports `EDGE_NOT_ROBUST`, preserve that challenge fail-closed; do not bypass or soften it. Advance only ADVER​SARIAL if the runtime can consume the exact current lineage safely.