# C0150 — Stable fixture-conditioned FPL event projection v0.2

Date: 2026-08-31
Status: Completed / Verified
Parent: C0149
Scope: prospective rolling FPL projections only

## Objective

Repair a confirmed implementation regression in C0135 without fitting to GW2 outcomes or rewriting any frozen historical prediction.

## Confirmed regression

C0135 was intended to use the active model's player-specific shape, current player state and current target-fixture lambdas. In implementation:

- a rolling snapshot could become the baseline for the next rolling snapshot, creating recursive lineage;
- goal and assist hazards did not actually use the target team lambda;
- the already-promoted explicit first-choice penalty event was folded into a generic multiplicative `goal_scale`, mixing open-play, penalty and fixture effects.

## Fix

### Stable anchor

The rolling generator now anchors each player to the immutable, non-rolling active-model prediction (`prediction_run_id IS NULL`) rather than a previous C0135 snapshot. Rolling rows can no longer recursively become their own shape prior.

### Goal event conditioning

`private.fpl_fixture_goal_lambda_v02()` restores the promoted model structure:

- uses the 0.1.2 calibrated non-penalty xG90 / matchup lineage;
- updates that rate using chronology-safe current player-state evidence relative to its pre-season anchor, with the existing conservative 0.5–2.0 change bound;
- reconditions open-play goal expectation by the target team lambda using the already-promoted 0.90 fixture exponent;
- keeps the first-choice penalty contribution additive rather than hiding it inside a generic multiplier;
- preserves the active 0.1.3 role attack multiplier;
- retains the existing small, positive-only current-season goal confirmation.

### Assist event conditioning

`private.fpl_fixture_assist_lambda_v02()`:

- uses the calibrated 0.1.2 assist-rate lineage;
- updates from chronology-safe xA90 state;
- reconditions by target team lambda with the already-promoted 0.70 assist fixture exponent;
- retains active role and positive-only assist confirmation.

No coefficient was selected from Bruno/Saka/Mbeumo GW2 outcomes.

## Historical integrity

GW1 and GW2 frozen rows were not modified. The new logic applies only to future immutable snapshots.

## Verification

First prospective corrected run: GW3 run **1240**.

- 600 prediction rows;
- frozen immutable run;
- projection layer: `rolling_projection_v0.2_event_integrity`;
- all tested Bruno/Mbeumo/Saka/Haaland baseline ids resolve directly to GW1 non-rolling active-model rows with `prediction_run_id = NULL`;
- no recursive rolling baseline remains;
- historical forecasts rewritten: false.

A reconstruction check using the new event functions on the original GW1 environment remained close to the already-promoted active-model event intensities, confirming the fix restores lineage rather than inventing a new scale.

### Current GW3 illustration after fix

- Haaland: 6.83 xPts; fixture xG ~0.87; fixture xA ~0.09.
- Mbeumo: 6.54 xPts; fixture xG ~0.62; fixture xA ~0.16.
- Bruno: 6.33 xPts; fixture xG ~0.38; fixture xA ~0.43.
- Saka: 5.19 xPts; fixture xG ~0.32; fixture xA ~0.21.

These are prospective GW3 numbers, not retrospective changes to GW2.

## Remaining boundary

C0150 does **not** retune C0136's early-season team assimilation weights. Their magnitude remains a model-assumption question, not a confirmed code defect, and should be evaluated prospectively rather than altered because of one result.

C0147 tactical/personnel matchup effects also remain an explicitly labelled under-observation layer and are not silently promoted by C0150.
