# C0154 — Lambda-to-score calibration, match-script conditioning and modal concentration validation

_Date revised: 2026-08-31_

## Trigger

GW3 and GW4 production correct-score forecasts became dominated by 1-1: GW3 9/10, GW4 8/10, 17/20 combined.

This is not a UI regression. The stored independent-Poisson score matrices themselves make 1-1 the modal score in most fixtures because both team lambdas frequently lie between 1 and 2.

The user then challenged the point-score conversion itself: when lambda is materially above 1.5 (for example 1.84), should the headline predicted goal count remain the Poisson mode of 1, or should a calibrated rule select 2?

A second problem was then identified: the engine can make a strong 1X2 call such as Arsenal win while the single highest exact-score cell is 1-1. This is mathematically possible but is poor decision compression for a human-facing correct-score product.

## Important distinction

Lambda is an expectation, not an integer forecast. Under a Poisson distribution, for non-integer 1 < lambda < 2 the marginal mode is 1. That mathematical property does not prove that the Poisson mode is the best practical headline correct-score selector.

Likewise, a 1X2 winner and a top exact-score cell need not agree. 1X2 probabilities sum many score cells; one draw cell can still be the largest individual cell while the total mass of home-win cells is much larger.

Example from the current GW3 Arsenal-Chelsea snapshot:

- home win 56.44%;
- draw 22.71%;
- away win 20.78%;
- 1-1 = 10.7475%;
- 1-0 = 10.5059%;
- 2-1 = 9.8877%;
- 2-0 = 9.6654%.

The raw modal 1-1 beats the best Arsenal-win cell by only 0.2416 percentage points even though aggregate home-win probability is 56.44%. A single-cell headline therefore overstates the draw thesis.

## Production coherence audit

Latest pre-kickoff GW3/GW4 production snapshots:

- GW3: 9/10 fixtures have a top exact-score outcome that conflicts with the highest-probability 1X2 outcome;
- GW4: 8/10 fixtures conflict;
- combined: 17/20.

This is a structural consequence of modal-cell selection, not corrupted probability data.

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

### E — MATCH_SCRIPT_CONDITIONED_SELECTOR

Infer a match-script family first, then rank exact scores inside that family. Candidate families include:

- favourite win to nil;
- favourite win with BTTS;
- low-scoring draw;
- high-scoring/open draw;
- underdog resistance/upset;
- open high-scoring favourite win.

Candidate evidence may include the validated production team-strength model plus, only after their own promotion gates, defensive/attacking form, clean-sheet process, expected XI, absences, set pieces, tactical matchup, role continuity and other chronology-safe pre-match features.

The correct-score output should be outcome coherent when evidence establishes a meaningful match thesis. If outcome evidence is weak or conflicting, the selector may return UNRESOLVED rather than manufacture a precise score.

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

## Outcome-coherent selector hypothesis test

A simple coherence rule was also tested on the same two seasons: choose the highest-probability 1X2 outcome first, then choose the highest-probability exact-score cell inside that outcome family.

Results:

- 2024/25: exact hit 16.39% vs 17.78% raw mode; direction 60.56% vs 58.33%;
- 2025/26: exact hit 16.58% vs 16.58%; direction 56.68% vs 53.74%;
- combined: exact hit 16.49% vs 17.17%; direction 58.58% vs 55.99%.

Therefore universal forced coherence improves direction substantially but does not improve two-season exact-score accuracy.

Confidence-gated coherence was also tested at minimum 1X2 margins from 3 to 20 percentage points. No tested fixed margin robustly beat the raw Poisson exact-hit rate across both seasons. A 5-point margin came closest: combined exact hit 17.03% vs 17.17% baseline while direction improved to 58.99% from 55.99%.

Conclusion: outcome coherence is a product requirement for a high-conviction score thesis, but it cannot be implemented as a blind forced-outcome rule. It must be learned as part of the match-script selector and validated on chronology-safe pre-match inputs.

## Current interpretation

There is no robust two-season evidence to replace the production correct-score selector with a simple fixed rounding threshold between 1.60 and 1.80.

There is also no robust evidence to force every exact-score headline to follow the top 1X2 outcome.

The 2025/26 season provides a real signal around threshold 1.70 and outcome-conditioned selection improves directional coherence, but 2024/25 contradicts simple versions of both rules.

The deeper problem is decision compression: a single modal cell is often an unstable summary of a broad score distribution and can contradict the dominant match thesis. C0154 therefore targets a validated match-script-conditioned selector rather than cosmetic score diversity.

## Required next validation

1. Build or recover chronology-safe PRE-MATCH lambda cohorts for historical fixtures.
2. Freeze a training / validation / test split before fitting threshold or script rules.
3. Compare A/B/C/D/E on:
   - exact-score log loss;
   - top-score exact hit rate;
   - 1X2 Brier score;
   - direction hit rate;
   - per-team goal MAE and calibration;
   - total-goal MAE / calibration;
   - top-1 vs top-2 confidence calibration;
   - script-family calibration (win-to-nil, BTTS win, draw type, upset/open game);
   - 1-1 concentration as a diagnostic only, never as an optimization target.
4. Any candidate threshold or script rule is selected on training only, then frozen before holdout.
5. Test whether returning two scorelines inside the same validated script improves useful probability coverage without hiding poor calibration.
6. Run genuine forward validation after historical holdout.
7. Promote only if the candidate shows a robust predictive edge and does not materially degrade 1X2 / goal-process accuracy.

## Integrity rules

- Historical production forecasts remain immutable.
- Post-match xG must never be substituted for pre-match lambda in production evaluation.
- Do not optimize for visually diverse scores.
- Do not force the favourite to win merely to make outputs look coherent.
- If a high-confidence 1X2 thesis and the raw modal score conflict, the presentation layer should expose the conflict rather than pretending the raw modal is a coherent thesis.
- Do not activate C0147 matchup effects as part of C0154 unless they pass their own validation gate.
- Any production model change requires a separate promotion Change ID after C0154 validation.

## State

C0154 remains IN PROGRESS research. No live model effect is enabled.
