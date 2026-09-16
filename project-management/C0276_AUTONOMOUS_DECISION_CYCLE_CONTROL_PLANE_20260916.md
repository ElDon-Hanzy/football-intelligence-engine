# C0276 — Autonomous Decision Cycle Control Plane

Date: 2026-09-16 (Dubai)
Status: In Progress — production self-healing lineage through C0231; zero numeric model effect

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

## Production recovery lineage
Cycle #2 for GW5 exercised the real event/recovery path. Player/fixture lineage changes invalidated descendants; projection recovery appended current projection run #1387 rather than rewriting history. C0227 uncertainty was regenerated for #1387. The full-pool optimizer converged to run #35 using current horizon lineage, and the governed C0228 dispatcher produced ensemble run #12.

## Batch 5 — governed C0229 structural lineage
Migration: `c0276_batch5_structural_lineage_dispatch`.

C0229 is active Edge Function `fpl-structural-control` v1 and persists immutable artifacts in `public.fpl_structural_control_runs`. C0276 added an idempotent request ledger and fail-closed dispatcher. Production Cycle #2: request #7179 -> HTTP 200 -> structural run #10, bound to ensemble #12. Adjudication remained `RAW_OPTIMUM_STRUCTURALLY_CHALLENGED`: raw family 174.402 versus structurally preferred 173.367, a 1.035-point gap inside the sensitivity band. STRUCTURAL=READY. No xPts rewrite occurred.

## Batch 6 — governed C0231 forward-management lineage
Migration: `c0276_batch6_forward_lineage_dispatch`.

Live inspection confirmed canonical C0231 is active Edge Function `fpl-forward-management` v1 (`C0231_FORWARD_MANAGEMENT_V01`) with immutable output table `public.fpl_forward_management_runs`. The worker is supporting evaluation only: it measures premium reachability, transfer flexibility, fragile slots and approximate two-transfer access; it explicitly does not change xPts, auto-recommend chips, or perform decision execution.

Added:
- `private.c0276_forward_requests`: idempotent request ledger carrying Decision Cycle ID, structural run ID, ensemble run ID and input signature.
- `private.c0276_dispatch_forward_v01(cycle_id)`: fail-closed dispatcher requiring STRUCTURAL=READY, exact structural artifact existence, latest structural equality for the GW/horizon, structural->ensemble lineage equality, immutable structural evidence, and idempotent dispatch.
- FORWARD transitions to RUNNING only after governed dispatch.

Production acceptance on Cycle #2:
- projection #1387;
- optimizer #35;
- ensemble #12;
- structural #10;
- forward request #7182;
- HTTP 200 / `FORWARD_MANAGEMENT_READY`;
- forward artifact #10;
- forward artifact explicitly uses ensemble #12 and was created after governed request #7182;
- FORWARD=READY / artifact #10;
- historical forecasts rewritten=false.

The batch stopped at the next dependency boundary. OR_UTILITY and all later decision nodes remain STALE.

## Safety invariants
- Historical forecasts remain append-only.
- No FPL transfer or chip execution path was added or invoked.
- No publication was performed.
- No decision/noise gate was weakened.
- C0240 concurrency remains unchanged; no 5-worker validation was performed.
- C0265 behavior remains untouched.

## Remaining autonomy work
- governed dependency-safe dispatch/reconciliation for OR_UTILITY and later nodes;
- candidate-plan artifact independent of final publication;
- per-node retry counters/backoff and automatic FAILED/BLOCKED recovery;
- bounded convergence controller that advances only the first safe stale node;
- deadline-aware priority escalation;
- end-to-end fault-injection recovery through final fail-closed/publication state.

## Exact next batch
Locate and verify canonical C0232 OR/rank-utility runtime and artifact contract. Add a C0276 idempotent dispatcher/reconciler pinned to forward run #10, structural run #10, ensemble #12 and Cycle #2. Advance only OR_UTILITY if its immutable artifact proves current. Do not execute transfers/chips or publish.