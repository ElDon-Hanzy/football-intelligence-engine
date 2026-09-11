# C0248 Checkpoint I — Mature C0244 First-Half Chip Opportunity Control

Date: 2026-09-11
Status: COMPLETED / VERIFIED
Parent: C0248
Scope: C0244 only; no player xPts rewrite; no FPL execution

## Executive judgment

C0244 is mature and absorbed into canonical C0248 decision-control.

The engine now evaluates first-half chip opportunity cost through GW19 at the strongest evidence level currently justified:

- GW4–GW8: exact numerical player-projection evidence.
- GW9–GW19: structural fixture evidence only.
- No fake player projections, chip EVs, percentiles or best-week ranks are manufactured for GW9–GW19.
- Current GW4 chip action remains `NONE`.
- Full first-half numerical best-chip-week ranking remains intentionally fail-closed until decision-grade future projections and/or authoritative fixture rearrangements exist.

This closes C0244 as a control problem. A null future numerical rank is an intended output under insufficient evidence, not unfinished implementation.

## Defects found during maturity audit

The previous structural guard had two weaknesses:

1. It classified a Gameweek as nonstandard only when total match count was not 10. A balanced blank/double configuration can still contain 10 matches, so total match count alone was insufficient.
2. `private.c0248_structural_chip_window_status_v01()` existed but was not consumed by `private.c0248_decision_control_status_v01()`. C0244 therefore had a documented control surface without a canonical decision-path consumer.

Both defects are fixed.

## Production migration

Applied Supabase migration:

- `20260911151816_c0248_c0244_mature_first_half_chip_control`

The migration replaces/extends:

- `private.c0248_structural_chip_window_status_v01(gameweek)`
- `private.c0248_decision_control_status_v01(gameweek,horizon)`

Security-definer functions use an empty `search_path` and schema-qualified objects.

## Mature structural contract

For every GW from the current GW through GW19, C0244 now derives team-level fixture counts and classifies the window as:

- `STANDARD_SINGLE`
- `BLANK`
- `DOUBLE_OR_MULTI`
- `MIXED_BLANK_DOUBLE`
- `NONSTANDARD_OTHER`
- `NO_SCHEDULE_OR_DATA_GAP`

This catches BGW/DGW structure even if total league match count remains 10.

Each Gameweek also receives an evidence tier:

- `EXACT_NUMERICAL`: frozen valid prospective player projections exist.
- `STRUCTURAL_ONLY`: fixture structure exists but decision-grade player projections do not.

Numerical chip ranking is authorized only for exact numerical windows.

## Chip-specific opportunity control

### Bench Boost

Current GW4 incremental EV remains 4.846 with only two bench slots at 60+ xMins.

Against the exact GW4–GW8 C0240 normal-root window, GW4 ranks 5th of 5 for BB incremental EV.

The first-half numerical rank is deliberately null because GW9–GW19 player projections are not decision-grade.

### Triple Captain

Current GW4 incremental EV remains 6.174.

Against the exact GW4–GW8 C0240 normal-root window, GW4 ranks 5th of 5 for TC incremental EV.

The first-half numerical rank is deliberately null beyond the exact window.

### Free Hit

Current same-utility GW4 edge remains +2.618 and the current action remains `HOLD_NO_ROBUST_EDGE`.

Future BGW/DGW asymmetry is tracked structurally. A future numerical FH rank requires same-utility fresh-squad projections and is therefore currently null.

### Wildcard

Current exact-window raw WC edge remains +15.659 with a four-FT terminal deficit and 3.915-point FT-only break-even.

Future WC ranking requires decision-grade future player/role/fixture information plus terminal option value. No fake numerical rank is assigned.

## Live official fixture verification

The production `matches` table still carried old `updated_at` timestamps, so C0244 was not closed on stale fixture metadata.

A live request to the official FPL fixtures endpoint was made from production through `pg_net` on 2026-09-11 at 15:19:48 UTC.

Validation across GW4–GW19:

- official fixture rows: 160
- DB fixture IDs missing from official data: 0
- official fixture IDs missing from DB: 0
- Gameweek assignment mismatches: 0
- kickoff-time mismatches before refresh: 25
- confirmed BGW windows: 0
- confirmed DGW/multi-fixture windows: 0

The 160 production FPL fixture rows were refreshed from the official response. The kickoff changes were in future GWs and did not change the GW4 deadline.

Important semantics: no BGW/DGW is *currently confirmed* through GW19. This does not mean none will emerge. Future rearrangements are re-evaluated as authoritative fixture information changes.

## Canonical C0248 consumption

`private.c0248_decision_control_status_v01()` now consumes the C0244 mature first-half structural control and requires `structural_first_half_control_mature=true` for decision-control readiness.

Current compact state after integration:

- C0248 decision-control ready: true
- C0244 structural first-half control mature: true
- C0244 full numerical first-half rank authorized: false
- C0245 mature option-value control: green
- current chip: `NONE`
- best normal root: `C0240_LEGACY`
- execution timing: `WAIT_FOR_T_MINUS_2`
- planner remains shadow-only / not production-selected

## Fail-closed boundary

C0244 is Complete / Verified because it can now answer the required decision correctly at each evidence level:

- use exact numerical evidence where valid;
- use structural first-half evidence where only structure is known;
- refuse false numerical ordering where player/role/fixture uncertainty is too high;
- preserve one-chip-per-GW competition and future option value;
- rerank when new fixture, projection, role or availability evidence arrives.

`season_best_chip_weeks_resolved=false` is therefore a valid fail-closed state, not a missing architecture component.

## Regression / governance proof

After the migration and fixture refresh:

- C0213 behavioral production tests: 14/14 PASS on GW4 prediction run 1356.
- historical forecasts rewritten: false.
- no transfer executed.
- no chip executed.
- no manager-plan mutation.

## Current GW4 decision effect

None.

The current chip recommendation remains `NONE` and execution guidance remains `WAIT_FOR_T_MINUS_2` unless a verified material price or injury event creates a robust reason to act earlier.
