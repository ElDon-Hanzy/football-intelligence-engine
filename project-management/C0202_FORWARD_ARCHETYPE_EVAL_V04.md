# C0202 — Forward Archetype Evaluation v0.4

## Purpose
Preregister the outcome evaluation for frozen C0202 V03 GW3 directional snapshots **before GW3 outcomes are known**.

This layer does not change production xPts. It only captures final official outcomes after the Gameweek is complete and evaluates predefined matchup archetypes.

## Frozen input
Snapshot run: `C0202_V03_STRUCTURAL_DIRECTIONAL_20260904`

Evidence cutoff: `2026-09-04T17:30:00Z`

Pregame snapshot:
- 33 resolved-side expected-XI wide players
- 11 paired exact-side opposing wide defenders
- 22 unresolved exact opponents
- 9 HIGH mapping-quality pairs
- 33/33 effect direction unresolved

## Capture gate
Outcome capture is allowed only when the latest `official_fpl` `gameweek_result_runs` row for GW3 has `is_final=true`.

At preregistration the latest result run was:
- result run id 117
- observed `2026-09-04T18:30:09.215002Z`
- 0/10 fixtures finished
- `is_final=false`

The first capture test correctly returned:
`GW3_OFFICIAL_RESULT_RUN_NOT_FINAL`

Outcome rows after the test: **0**.

## Frozen archetypes
1. `WIDE_ATTACKER_VS_WIDE_DEFENDER`
2. `ATTACKING_WIDE_BACK_VS_WIDE_DEFENDER`
3. `SIDE_RESOLVED_OPPONENT_UNRESOLVED`

No archetype may be changed after outcomes to improve fit.

## Metrics
For each frozen attacker snapshot, capture from the final official FPL actuals run:
- minutes
- total FPL points
- P(5+)
- P(10+)
- goals
- assists
- bonus
- defensive contribution
- xG
- xA
- xGI
- xGI/90

Stratify by:
- archetype
- mapping quality
- defender pair status

## Double-Gameweek safeguard
The GW3 evaluator refuses silent aggregation when `fixture_count != 1`. Any such row is reported as unsupported rather than mixed into the single-fixture archetype test.

## Promotion gate
GW3 is **descriptive only**.

No production xPts effect may be considered until all are true:
- at least 100 paired exact-side outcome observations
- observations span at least 5 Gameweeks
- later holdout test exists
- sensitivity testing survives
- effect direction is stable under reasonable assumptions

This gate is intentionally much stricter than the first GW3 sample.

## Database objects
- `public.research_c0202_directional_outcomes`
- `private.capture_c0202_v03_outcomes_v01()`
- `private.c0202_v04_outcome_status_v01()`

All evidence is append-only, research-only, and `model_effect_enabled=false`.

## Decision
`PREREGISTER_FORWARD_ARCHETYPE_EVALUATION; NO_MODEL_EFFECT_FROM_GW3_ALONE`