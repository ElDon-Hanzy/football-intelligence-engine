# C0276 — Autonomous Decision Cycle Control Plane

Date: 2026-09-16 (Dubai)
Status: In Progress — production self-healing lineage through C0232; zero numeric model effect

## Purpose
Fresh fixture/player facts must invalidate every affected downstream decision artifact and the engine must converge onto one coherent Decision Cycle lineage without weakening fail-closed governance.

## Established control plane
`c0276_decision_cycle_control_plane_v01` created explicit Decision Cycles, per-node READY/STALE/RUNNING/FAILED/BLOCKED health, dependency DAG/invalidation, cycle health and append-only recovery semantics. Production Cycle #2 recovered GW5 projection #1387, C0227 uncertainty #1387, optimizer #35 and ensemble #12.

## Batch 5 — C0229 structural
`c0276_batch5_structural_lineage_dispatch`: governed structural request #7179 -> structural run #10 bound to ensemble #12. STRUCTURAL=READY. C0229 preserved its structural challenge without changing xPts.

## Batch 6 — C0231 forward
`c0276_batch6_forward_lineage_dispatch`: governed forward request #7182 -> forward run #10, pinned to structural #10 / ensemble #12. FORWARD=READY. Historical forecasts unchanged.

## Batch 7 — C0232 OR/rank utility
Migration: `c0276_batch7_or_utility_lineage_dispatch`.

Live inspection confirmed canonical runtime is active Edge Function `fpl-or-utility` v1, version `C0232_ENSEMBLE_OR_UTILITY_V01`, persisting immutable `public.fpl_or_utility_runs`. Its policy keeps numeric xPts unchanged, never forces a differential, uses rank/leverage only inside the fixed model-error band, and is explicitly `decisioning=false`.

Added:
- `private.c0276_or_utility_requests`, carrying Decision Cycle, forward, structural and ensemble lineage;
- `private.c0276_dispatch_or_utility_v01(cycle_id)`, advisory-lock protected and idempotent;
- fail-closed checks require FORWARD=READY, latest forward equality, immutable forward artifact tied to the Cycle ensemble, and valid structural->ensemble lineage before dispatch;
- OR_UTILITY becomes RUNNING only after governed dispatch.

Production Cycle #2 acceptance:
- projection #1387;
- optimizer #35;
- ensemble #12;
- structural #10;
- forward #10;
- OR utility request #7189;
- HTTP 200 / `OR_UTILITY_READY`;
- OR utility artifact #12, ensemble #12, created after request #7189;
- raw profile `DUAL_PREMIUM_MID_VALUE`;
- rank-controlled profile `DUAL_PREMIUM_MID_VALUE`;
- reordered=false;
- OR_UTILITY=READY / artifact #12;
- historical_forecasts_rewritten=false.

## Safety invariants
Historical forecasts remain append-only. No transfer/chip execution or publication occurred. Decision/noise gates were not weakened. C0240 concurrency is unchanged and the 5-worker test was not performed. C0265 remains untouched.

## Remaining autonomy work
- governed RED_TEAM and later dependency-safe orchestration;
- candidate-plan artifact independent of final publication;
- per-node retry/backoff and FAILED/BLOCKED recovery;
- bounded first-safe-stale convergence controller;
- deadline-aware priority escalation;
- end-to-end fault-injection recovery.

## Exact next batch
Inspect the dependency DAG and canonical C0233 red-team runtime/artifact contract. Confirm whether RED_TEAM depends directly on OR_UTILITY, STRUCTURAL, FORWARD or a combination; do not assume ordering from labels. Add the next dispatcher only after proving the actual dependency contract. Advance only that next safe node and stop at the following boundary.