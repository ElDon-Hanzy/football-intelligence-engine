# C0276 Batch 13 — Recovery Baseline Reconciliation Closeout

Date: 2026-09-16
Cycle: 2 / GW5

## Problem
The projection recovery path could generate a fixture-aligned replacement projection but leave `fpl_decision_cycles.fixture_lineage_signature` on the old baseline. The next event scan therefore re-detected the already-recovered fixture state and invalidated the cycle again.

## Production change
Applied migration `c0276_batch13_recovery_baseline_reconciliation`.

`private.c0276_recover_player_projection_v01` now:
- takes a cycle-scoped advisory lock;
- calls `c0276_reconcile_projection_lineage_v01` when an existing projection is already aligned;
- after regeneration, invalidates descendants, binds the new projection, and immediately requires lineage reconciliation;
- fails the PLAYER_PROJECTION node if reconciliation fails;
- only returns `RECOVERED_AND_RECONCILED` after the cycle fixture/player-state baselines are advanced and pending state events are handled.

No historical forecast rows are rewritten.

## Production recovery test
During the test, canonical fixture state changed again before reconciliation. Projection #1389 correctly failed the alignment proof (10 mismatches), so the system did not advance the baseline incorrectly.

The repaired recovery path then generated projection #1390 and returned `RECOVERED_AND_RECONCILED`:
- 604 prediction rows / 604 projectable;
- 659 total FPL players;
- 55 governed exclusions;
- 0 ungoverned missing;
- C0220/C0223 integrity OK;
- 10 canonical fixtures / 10 run fixtures / 0 mismatches;
- fixture signature reconciled to `2ce9456a3921d622c71655c2b1b9496e`;
- player-state cutoff reconciled to `2026-09-16T08:37:03.519+00:00`;
- historical_forecasts_rewritten=false.

Immediate `c0276_detect_events_v01(2)` returned `events_detected=0`, proving the recovery loop no longer self-invalidates on the reconciled baseline.

C0227 uncertainty was then refreshed for projection #1390 with 604 rows. A second event scan again returned zero events.

## Current frontier
READY: PLAYER_PROJECTION #1390, UNCERTAINTY #1390.
STALE: OPTIMIZER #36 and every downstream decision node.

Optimizer #36 / Ensemble #13 remain immutable historical evidence only and are not current authority.

## Governance
- no FPL transfer execution;
- no chip execution;
- no publication;
- no decision/noise gate weakening;
- no C0240 concurrency change or 5-worker test;
- no C0265 xMins change;
- historical forecast immutability preserved.

## Exact next batch
Rebuild the optimizer from projection #1390 plus governed GW6/GW7 horizon artifacts, run the mandatory event scan, and if stable dispatch a fresh ensemble. Stop at the next dependency boundary.