# C0154 — Lambda-to-score calibration and modal concentration validation

_Date revised: 2026-08-31_

## Trigger

GW3 and GW4 production correct-score forecasts became dominated by 1-1: GW3 9/10, GW4 8/10, 17/20 combined.

This is not a UI regression. The stored independent-Poisson score matrices themselves make 1-1 the modal score in most fixtures because both team lambdas frequently lie between 1 and 2.

The user then challenged the point-score conversion itself: when lambda is materially above 1.5 (for example 1.84), should the headline predicted goal count remain the Poisson mode of 1, or should a calibrated rule select 2?

## Important distinction

Lambda is an expectation, not an integer forecast. Under a Poisson distribution, for non-integer 1 < lambda < 2 the marginal mode is 1. That mathematical property does not prove that the Poisson mode is the best practical headline correct-score selector.

The problem is therefore reframed from "reduce 1-1 frequency" to "find the most predictive lambda-to-score decision rule without corrupting the underlying probability distribution."

## C0154 research variants

### A — POISSON_MODE baseline

Keep the current independent-Poisson score matrix and select the single highest-probability exact score.

### B — ROUND_LAMBDA

Use nearest-integer lambda as a point-score selector. This is a descriptive decision rule only; it does not rewrite the Poisson probability matrix.

### C — CALIBRATED_THRESHOLD

Estimate an empirical threshold at which a lambda between 1 and 2 should switch the headline goal-count selection from 1 to 2. Candidate thresholds must be learned on a training period, frozen, and tested on a separate holdout / forward cohort. No threshold may be selected using the same results used to report its performance.

### D — DISTRIBUTION_AWARE_SELECTOR

Select a headline correct score using the full score distribution plus directional information rather than blindly taking the single cell maximum. Candidate features may include:

- top-1 vs top-2 probability gap;
- 1X2 probability / favourite direction;
- home-away lambda gap;
- total lambda;
- scoreline probability mass around neighbouring cells;
- confidence / uncertainty in the underlying lambdas.

This variant must not force a favourite win or cosmetic score diversity. It must demonstrate predictive improvement.

## Historical hypothesis-generation test — actual match xG vs actual goals

Source: stored Understat Premier League team-match intelligence. These are post-match xG values and therefore are NOT equivalent to chronology-safe pre-match model lambdas. They are useful only for hypothesis generation.

Coverage reconstructed from one stored row per Understat match using xG-for/xG-against and goals-for/goals-against:

- 2024/25: 360 fixtures / 720 team-sides;
- 2025/26: 374 fixtures / 748 team-sides;
- combined: 734 fixtures / 1,468 team-sides.

Candidate rule tested: retain the Poisson-mode integer except when 1 <= xG < 2; if xG >= threshold, select 2 instead of 1. Thresholds tested: 1.60, 1.65, 1.70, 1.75, 1.80.

### Team-side goal-count results

2024/25 baseline Poisson-mode hit rate = 42.92%, MAE = 0.7375. Every tested threshold reduced hit rate and worsened MAE.

2025/26 baseline = 40.64%, MAE = 0.7594. Threshold 1.70 was the only candidate that improved both metrics: hit rate 41.31% (+0.67pp), MAE 0.7447 (-0.0147). Other thresholds were flat or worse on hit rate, though some reduced MAE slightly.

Combined baseline = 41.76%, MAE = 0.7486. No tested threshold improved goal-count hit rate. Threshold 1.70 came closest: 41.35% (-0.41pp) with essentially flat/slightly better MAE 0.7480 (-0.0007).

### Fixture exact-score results

2024/25 baseline exact hit = 17.78%. All thresholds reduced exact-score hit rate; 1.60 was least harmful at 16.94%.

2025/26 baseline exact hit = 16.58%. Threshold 1.70 improved exact hits to 17.11% (+0.53pp), direction accuracy to 54.81% (+1.07pp), and score MAE to 0.7447 (-0.0147). Threshold 1.80 tied baseline exact hits at 16.58% while improving direction and MAE modestly.

Combined baseline exact hit = 17.17%. No candidate threshold beat it. Threshold 1.70 produced 16.35% exact hits (-0.82pp), although direction accuracy improved from 55.99% to 56.68% and score MAE improved marginally from 0.7486 to 0.7480.

## Current interpretation

There is no robust two-season evidence to replace the production correct-score selector with a simple fixed rounding threshold between 1.60 and 1.80.

The 2025/26 season provides a real signal around 1.70, but 2024/25 contradicts it. This is exactly why a threshold must be trained and tested chronologically rather than selected from one season.

The 1-1 concentration remains a genuine presentation / decision-compression weakness: a single modal score overstates conviction when neighbouring scorelines have nearly identical probability. That does not justify overriding the probability matrix without validation.

## Required next validation

1. Build or recover chronology-safe PRE-MATCH lambda cohorts for historical fixtures.
2. Freeze a training / validation / test split before fitting threshold rules.
3. Compare A/B/C/D on:
   - exact-score log loss;
   - top-score exact hit rate;
   - 1X2 Brier score;
   - direction hit rate;
   - per-team goal MAE and calibration;
   - total-goal MAE / calibration;
   - top-1 vs top-2 confidence calibration;
   - 1-1 concentration as a diagnostic only, never as an optimization target.
4. Any candidate threshold is selected on training only, then frozen before holdout.
5. Run genuine forward validation after historical holdout.
6. Promote only if the candidate shows a robust predictive edge and does not materially degrade 1X2 / goal-process accuracy.

## Integrity rules

- Historical production forecasts remain immutable.
- Post-match xG must never be substituted for pre-match lambda in production evaluation.
- Do not optimize for visually diverse scores.
- Do not force the favourite to win.
- Do not activate C0147 matchup effects as part of C0154 unless they pass their own validation gate.
- Any production model change requires a separate promotion Change ID after C0154 validation.

## State

C0154 is reopened as IN PROGRESS research. No live model effect is enabled.
