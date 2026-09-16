# C0276 Batch 7 — C0232 OR Utility Lineage Closeout

Date: 2026-09-16

Canonical C0232 runtime was verified as active `fpl-or-utility` v1 (`C0232_ENSEMBLE_OR_UTILITY_V01`). Migration `c0276_batch7_or_utility_lineage_dispatch` added an idempotent private request ledger and fail-closed Cycle dispatcher.

Production Cycle #2 request #7189 was pinned through forward #10, structural #10 and ensemble #12. It returned HTTP 200 / `OR_UTILITY_READY` and created immutable OR utility run #12 after dispatch. Run #12 uses ensemble #12; historical forecasts were not rewritten. OR_UTILITY was reconciled READY only after those checks.

The current proven lineage is:
`Projection #1387 -> Uncertainty #1387 -> Optimizer #35 -> Ensemble #12 -> Structural #10 -> Forward #10 -> OR Utility #12`.

C0232 did not reorder the raw profile in this run: both raw and rank-controlled profile are `DUAL_PREMIUM_MID_VALUE`. This is descriptive evidence, not an execution instruction.

No transfer, chip or publication occurred. C0240 concurrency and C0265 were unchanged. Decision/noise gates were not weakened.

Next: inspect the actual DAG plus canonical C0233 red-team contract before implementing the next dependency-safe wrapper.