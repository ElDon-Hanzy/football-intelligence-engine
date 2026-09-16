# C0276 Batch 6 — C0231 Forward Lineage Closeout

Date: 2026-09-16

## Scope
One bounded dependency-safe production batch. No downstream decision execution.

## Live discovery
Canonical C0231 runtime is active Supabase Edge Function `fpl-forward-management` v1, version marker `C0231_FORWARD_MANAGEMENT_V01`. Immutable artifacts are stored in `public.fpl_forward_management_runs`.

## Change
Applied migration `c0276_batch6_forward_lineage_dispatch`:
- added private request ledger `private.c0276_forward_requests`;
- added `private.c0276_dispatch_forward_v01(bigint)`;
- dispatcher requires current Cycle STRUCTURAL=READY, latest structural equality, immutable structural artifact, and structural->ensemble lineage equality;
- dispatch is advisory-lock protected and idempotent by cycle/input signature;
- no manager-plan write, transfer execution, chip execution or publication path is invoked.

## Production proof
Cycle #2 lineage:
`PLAYER_PROJECTION #1387 -> UNCERTAINTY #1387 -> OPTIMIZER #35 -> ENSEMBLE #12 -> STRUCTURAL #10 -> FORWARD #10`.

Dispatch request #7182 was pinned to structural #10 and ensemble #12. HTTP returned 200 with `FORWARD_MANAGEMENT_READY`. A new immutable forward run #10 was created for GW5/H3, ensemble #12, after the governed request. Historical forecasts were not rewritten. FORWARD was reconciled to READY only after these checks.

## Safety
- historical forecast immutability preserved;
- C0240 concurrency unchanged;
- no 5-worker test performed;
- no transfers/chips executed;
- no publication;
- decision/noise gates unchanged;
- C0265 unchanged.

## Next dependency
C0232 OR/rank utility. Locate and verify its canonical runtime/artifact, then add equivalent fail-closed Cycle #2 lineage dispatch/reconciliation pinned to FORWARD #10. Stop if lineage cannot be proven.