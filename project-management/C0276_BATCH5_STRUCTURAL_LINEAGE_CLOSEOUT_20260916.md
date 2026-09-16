# C0276 Batch 5 — Structural Lineage Closeout

Date: 2026-09-16 (Dubai)

## Decision
C0229 remains the canonical structural robustness layer. C0276 must orchestrate it; C0276 must not duplicate or redesign its model logic.

## Production lineage proven
`Decision Cycle #2 → PLAYER_PROJECTION #1387 → UNCERTAINTY #1387 → OPTIMIZER #35 → ENSEMBLE #12 → STRUCTURAL #10`

Structural request #7179 returned HTTP 200 and `STRUCTURAL_CONTROL_READY`. Run #10 is bound to ensemble #12 and preserves `historical_forecasts_rewritten=false`.

C0229 challenged the raw ensemble optimum: DUAL_PREMIUM_MID_VALUE 174.402 vs structurally preferred BALANCED_VALUE 173.367, gap 1.035. Because the gap remains within the structural sensitivity contract, the challenge is preserved rather than converted into an xPts rewrite.

## Implementation
Supabase migration `c0276_batch5_structural_lineage_dispatch` added an idempotent private request ledger and `private.c0276_dispatch_structural_v01`. The dispatcher fails closed unless the cycle ensemble node is READY, the artifact is immutable and ENSEMBLE_READY, and the cycle ensemble is the latest artifact for the exact GW/horizon.

## Safety
No transfer, chip, manager-plan write, publication, historical rewrite, decision/noise gate relaxation, C0240 concurrency change, or C0265 change occurred.

## Next
Wrap the existing canonical C0231 forward-management runtime in the same cycle-bound, idempotent dispatch/reconciliation contract. FORWARD remains STALE until that proof succeeds.