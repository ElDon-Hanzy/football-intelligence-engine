# C0147 — Matchup Predictive Validation Layer

Date: 2026-08-31
Change ID: C0147
Experiment: E0011
Status at implementation: forward evidence accumulating
Model effect: **disabled**

## Objective

Test whether pre-kickoff football-context signals add genuine predictive value beyond the production fixture baseline before allowing them to influence FPL or betting forecasts.

The layer is intentionally a validation system, not a new production model. It converts tactical/personnel context into frozen shadow variants, scores those variants forward, and exposes a promotion gate. It does not change historical forecasts, the live betting model, FPL xPts, captaincy, or manager-plan logic.

## Why this was added

The human-facing intelligence layer now explains team form, named absences, player roles and fixture matchups. Those explanations are useful, but plausibility is not evidence that a signal improves forecasts. C0147 therefore enforces the Noise-Control rule at model level: matchup information must survive forward validation before it can become a numerical model effect.

## Prospective chronology

E0011 was registered before GW3 kickoff.

- GW3–GW6: VALIDATION — 40 fixtures.
- GW7–GW10: TEST — 40 fixtures.
- GW1/GW2 outcomes are explicitly forbidden from selecting or retuning E0011 coefficients.
- No retuning is permitted between validation and test.
- Only the latest valid pre-kickoff input snapshot is scored.
- Target match outcomes are forbidden in prediction generation.
- Any promotion requires a new manual Change ID; there is no automatic activation.

## Fixed signal variants

The experiment freezes one BASE control plus single-family ablations and one combined shadow:

1. BASE
2. WIDE_ONLY — wide-channel pressure
3. AERIAL_SET_PIECE_ONLY — aerial / set-piece mismatch
4. CENTRAL_ONLY — central creation vs defensive block
5. TRANSITION_ONLY — direct-transition opportunity
6. PERSONNEL_CONTINUITY_ONLY — existing role-continuity / personnel disruption research
7. CREATOR_ABSENCE_ONLY
8. STRIKER_ABSENCE_ONLY
9. DEFENSIVE_ABSENCE_ONLY — opponent defensive personnel loss
10. SET_PIECE_ABSENCE_ONLY
11. COMBINED_V01

The fixed maximum log-lambda magnitudes are deliberately conservative and were frozen before GW3 outcomes:

- wide 0.040
- aerial/set-piece 0.035
- central creation 0.050
- positive transition 0.025
- creator absence 0.060
- striker absence 0.070
- opponent defensive absence 0.050
- set-piece taker absence 0.030
- combined absolute cap 0.120

These are **test coefficients**, not learned or promoted effects.

## Role-specific absence burden

A generic injury list is not enough. The feature layer derives separate creator, striker, defensive and set-piece absence burdens from genuine pre-kickoff availability evidence.

For an unavailable/doubtful player, burden uses:

- probability unavailable (`1 - chance_of_playing`),
- previous-season EPL usage when available,
- multi-season ability percentile,
- primary / secondary role classification,
- role family relevance,
- ability confidence,
- first-choice penalty / free-kick / corner responsibility where applicable.

Players who have permanently left or gone on loan are excluded from the absence list rather than treated as injuries.

Missing data is not zero. If fewer than 80% of relevant absence candidates have the required ability evidence, the role-specific burden is stored NULL and that component is omitted from the combined shadow rather than fabricated.

The existing PERSONNEL_CONTINUITY_ONLY variant remains separate because replacement-role continuity is not validated player ability and must not be silently conflated with role-specific absence value.

## Baseline and outputs

Baseline fixture probabilities are taken from the latest genuine pre-kickoff `forward_fixture_v0.1.3` snapshot. Matchup research remains `model_effect_enabled=false`.

For every fixture/variant the layer stores immutable:

- baseline and shadow home/away lambdas,
- home/away log adjustments,
- 1X2 probabilities,
- O/U 2.5 probabilities,
- BTTS probabilities,
- clean-sheet probabilities,
- feature/source lineage,
- evidence cutoff,
- chronology validity.

## Forward scoring

When a fixture finishes, the latest pre-kickoff variant snapshot is evaluated on:

- 1X2 Brier score,
- exact-score Poisson log loss,
- goals MAE,
- process MAE versus xG when a genuine xG source is available,
- Over 2.5 Brier,
- BTTS Brier,
- direction accuracy.

The scorer is append-only. Earlier pre-kickoff snapshots are preserved but only the latest eligible snapshot for each match/variant is used in the prospective evaluation.

## Promotion / Noise-Control gate

E0011 cannot activate anything automatically.

Minimum evidence before manual review:

- 40 VALIDATION fixtures,
- 40 TEST fixtures,
- at least 8 materially activated observations per signal/split for signal-specific claims,
- zero chronology / mutation / target-leakage violations.

A candidate must improve **both 1X2 Brier and score log loss** in validation and test. Where process xG exists, process MAE may not regress by more than 2%. A result that flips under the independent TEST sample is noise, not a promoted signal.

## Automation

- `c0147_matchup_predictive_capture` — every 15 minutes; append-only pre-kickoff capture, hash-deduplicated.
- `c0147_matchup_predictive_evaluate` — hourly at minute 17; scores newly finished cohort fixtures.

Key functions:

- `private.capture_matchup_predictive_validation_v01(gameweek)`
- `private.evaluate_matchup_predictive_validation_v01()`
- `private.matchup_predictive_validation_status_v01()`

Key tables:

- `public.matchup_predictive_validation_cohort`
- `public.matchup_predictive_feature_snapshots`
- `public.matchup_predictive_predictions`
- `public.matchup_predictive_evaluations`

All new research tables have RLS enabled, no anon/authenticated direct grants, append-only mutation guards, and `model_effect_enabled=false`.

## Initial verification

Immediately after deployment:

- E0011 registered as forward-valid research, model effect disabled.
- Cohort: 40 VALIDATION + 40 TEST fixtures.
- GW3: 20 team-side feature snapshots captured.
- GW3: 110 prediction rows = 10 fixtures × 11 variants.
- Feature hashes: 20/20 unique.
- Prediction hashes: 110/110 unique.
- Current evaluations: 0, correctly, because GW3 has not started.
- Integrity status: 0 feature chronology violations, 0 prediction violations, 0 duplicate evaluations, 0 evaluation model-effect violations.
- Decision state: `ACCUMULATING_VALIDATION_GW3_GW6`.

## Important scope boundary

C0147 v0.1 validates the matchup layer at **fixture/team-goal-distribution level first**. That is the correct first gate for both betting and FPL because team scoring/concession probabilities feed both systems.

It does **not** yet numerically redistribute a validated team matchup effect across individual FPL players. Player-role interaction (for example, whether a wide-channel advantage should specifically raise a winger's xGI rather than the whole team's attack) should be a separate prospective layer only after the team-level signal demonstrates incremental predictive value. This prevents a plausible tactical story from being counted twice or overfit into player xPts.
