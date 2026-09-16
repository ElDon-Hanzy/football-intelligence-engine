# C0276 — Autonomous Decision Cycle Control Plane

Date: 2026-09-16 (Dubai)
Status: In Progress — production self-healing lineage through C0229; zero numeric model effect

## Purpose
Close the end-to-end autonomy gap exposed by GW5 lineage drift: fresh fixture/player facts must invalidate every affected downstream decision artifact and the engine must converge onto one coherent lineage without weakening fail-closed governance.

## Batch 1 — control-plane scaffold
Migration: `c0276_decision_cycle_control_plane_v01`.

Created:
- `public.fpl_decision_cycles`: explicit Decision Cycle identity and unified READY / STALE / RUNNING / FAILED / BLOCKED state.
- `public.fpl_decision_cycle_nodes`: per-cycle artifact/node health and lineage attachment.
- `private.fpl_decision_dependency_dag`: explicit dependency/invalidation graph from fixture/player state through projections, optimizer, ensemble, robustness evaluators, adversarial gate, captaincy, sequential planner, final gate and publication.
- `private.c0276_invalidate_cycle_v01`: deterministic downstream invalidation without rewriting historical forecasts.
- `private.c0276_cycle_health_v01`: one health object for cycle/node state.

A temporary synthetic cycle proved deterministic descendant invalidation. Historical forecasts remained append-only.

## Subsequent production recovery
Cycle #2 for GW5 exercised the real event/recovery path. Player/fixture lineage changes invalidated descendants; projection recovery appended current projection run #1387 rather than rewriting history. C0227 uncertainty was regenerated for #1387. The full-pool optimizer converged to run #35 using current horizon lineage, and the governed C0228 dispatcher produced ensemble run #12.

No FPL transfer/chip execution occurred. No decision/noise gate was weakened. C0240 concurrency was not changed.

## Current bounded batch — governed C0229 structural lineage
Migration: `c0276_batch5_structural_lineage_dispatch`.

Live inspection confirmed C0229 already exists as active Edge Function `fpl-structural-control` v1 and persists immutable artifacts in `public.fpl_structural_control_runs`. It is a structural adjudicator, not a new optimizer: it uses lexicographic controls, preserves xPts, compares only candidates inside the defined sensitivity band, and returns `decisioning=false`.

Added:
- `private.c0276_structural_requests`: idempotent request ledger keyed by Decision Cycle + structural input signature.
- `private.c0276_dispatch_structural_v01(cycle_id)`: fail-closed dispatcher requiring ENSEMBLE=READY, exact current cycle ensemble lineage, latest-ensemble equality for the GW/horizon, immutable ensemble evidence, and an idempotent request signature.
- STRUCTURAL node transition to RUNNING only after governed dispatch.

Production acceptance on Cycle #2:
- upstream projection: #1387;
- optimizer: #35;
- ensemble: #12;
- structural request: #7179;
- HTTP result: 200 / `STRUCTURAL_CONTROL_READY`;
- structural artifact: run #10, explicitly bound to ensemble #12;
- adjudication: `RAW_OPTIMUM_STRUCTURALLY_CHALLENGED`;
- raw family: `DUAL_PREMIUM_MID_VALUE`, objective 174.402;
- structurally preferred family: `BALANCED_VALUE`, objective 173.367;
- gap: 1.035 points, therefore inside the 2x model-error sensitivity band and correctly preserved as a structural challenge rather than overwritten as points;
- STRUCTURAL node: READY / artifact #10;
- historical forecasts rewritten: false.

This batch deliberately stopped at the next dependency boundary. FORWARD and all later nodes remain STALE.

## Safety invariants
- Historical forecasts remain append-only.
- No FPL transfer or chip execution path was added or invoked.
- No publication was performed.
- No decision/noise gate was weakened.
- C0240 concurrency remains unchanged; no 5-worker validation was performed.
- C0265 behavior remains untouched.

## Remaining autonomy work
- governed dependency-safe dispatch/reconciliation for FORWARD and later nodes;
- candidate-plan artifact independent of final publication;
- per-node retry counters/backoff and automatic FAILED/BLOCKED recovery;
- bounded convergence controller that advances only the first safe stale node;
- deadline-aware priority escalation;
- end-to-end fault-injection recovery through final fail-closed/publication state.

## Exact next batch
Locate and verify the canonical C0231 forward-management runtime and artifact contract. Add a C0276 idempotent dispatcher/reconciler pinned to structural run #10 and Cycle #2 lineage. Advance only FORWARD if its immutable artifact proves current. Do not advance later nodes in the same bounded batch unless required for a non-destructive verification.