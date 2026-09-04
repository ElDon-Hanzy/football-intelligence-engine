# C0204 — P0 active FPL projection coverage

## Defect
Post-window audit of frozen GW3 run 1274 found active FPL players missing from the projection universe.

Root cause is two-stage:
1. `refresh-current-player-state` iterates only players already present in `current_player_state_base`.
2. `private.generate_upcoming_fpl_snapshot_v01()` then inner-joins every player to both `current_player_state_latest` and an immutable baseline row in `model_predictions` with `prediction_run_id is null`.

Players newly added to FPL or never bootstrapped into the base state therefore disappear silently.

## Reconciled count
For GW4, all 652 FPL-listed players have target-team fixture mapping.

Before C0204 guard:
- projectable: 600
- missing state + baseline: 52
- active/doubtful among the 52: 48
- unavailable/other among the 52: 4
- ungoverned silent omissions: 52

The missing cohort includes material post-window players such as Barcola, Bouaddi, Harwood-Bellis, Mbaye, Fernandez-Pardo, Fofana, Norton-Cuffy, Chilwell, Maitland-Niles, Bahoya and others.

## Implemented P0 guard
Migration: `20260904195400_c0204_fpl_projection_coverage_guard_v01.sql`.

It adds:
- append-only `public.fpl_projection_eligibility_events`
- append-only `public.fpl_projection_coverage_audits`
- `private.c0204_projection_coverage_rows_v01()`
- `private.c0204_projection_coverage_summary_v01()`
- `private.c0204_projection_coverage_status_v01()`
- append-only mutation blockers
- a wrapper around the existing rolling generator.

The previous C0160 generator is preserved as `private.generate_upcoming_fpl_snapshot_c0160_legacy_v01()`.

The public callable name `private.generate_upcoming_fpl_snapshot_v01()` now performs a C0204 preflight first. Any future player missing the required state/baseline without a governed exclusion returns `C0204_PROJECTION_COVERAGE_BLOCKED` and no new snapshot is written.

## Current governed exclusions
The current 52 unresolved players have append-only `EXCLUDED` events with reason:

`PENDING_GOVERNED_PRIOR_C0206`

This is deliberately not a zero projection. It means the player has no approved current-state/baseline prior yet and must remain outside optimization until C0206 supplies a validated prior or a later `RESTORED` event is appended.

## Current GW4 status
- total FPL players: 652
- projectable: 600
- governed excluded: 52
- ungoverned missing: 0
- missing data treated as zero: false
- historical forecasts rewritten: false

A frozen coverage audit row was written with `prediction_run_id = null`; no GW1–GW3 prediction/decision row was modified.

## Scope boundary
C0204 solves the production reliability defect: the system can no longer silently claim full-pool coverage while dropping players.

C0204 does **not** fabricate priors for the 52 players. Actual newcomer/player-base bootstrapping is tracked separately as C0206 and remains subject to uncertainty shrinkage and validation.

## Follow-on work
- C0205 canonical transfer ledger
- C0206 new-player prior bootstrap
- C0207 teammate xMins/role redistribution
- C0208 set-piece/role hierarchy refresh
- C0209 squad churn / XI continuity index
- C0210 regime-aware historical decay
- C0211 transfer-regime uncertainty widening
