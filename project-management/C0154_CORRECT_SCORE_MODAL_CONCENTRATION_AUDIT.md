# C0154 — Correct-score modal concentration audit

_Date: 2026-08-31_

## Trigger

User observed that GW3 and GW4 had again become dominated by 1-1 predicted correct scores.

## Production finding

Latest pre-kickoff production fixture snapshots show:

- GW3: 9/10 top exact scores are 1-1;
- GW4: 8/10 top exact scores are 1-1;
- combined: 17/20.

This is not a UI regression. The stored top scorelines themselves are 1-1.

## Root cause

The active score matrix remains independent Poisson. For a Poisson variable with a non-integer lambda between 1 and 2, the marginal modal goal count is 1. When both home and away lambdas lie in that range, the joint independent-Poisson modal score is therefore 1-1.

That describes most GW3/GW4 fixtures. The resulting top exact-score probabilities are also weak: generally around 9-12%, and in several fixtures the second-ranked score is within roughly 0-2 percentage points of the top score.

Examples:

- Ipswich-Liverpool: 1-1 10.09%, 1-2 9.87%;
- Arsenal-Chelsea: 1-1 10.75%, 1-0 10.51%;
- Crystal Palace-Ipswich: 1-1 10.07%, 2-1 9.84%.

The single modal score should therefore not be interpreted as a high-confidence narrative prediction.

## Existing evidence

C0058 already tested common replacements. Dixon-Coles worsened scoreline log loss and 1-1 concentration, the bivariate-Poisson gain was microscopic, and the negative-binomial fit converged back toward Poisson. Independent Poisson was retained because no alternative had demonstrated a robust predictive edge.

## Decision

Do not create cosmetic score diversity by rounding xG, forcing the favourite's result, or selecting a lower-probability scoreline. That would make the displayed 'predicted correct score' less accurate under exact-match loss.

C0153 now exposes the top-score probability and flags tight top-score races so the website does not overstate confidence.

## Next research gate

A replacement exact-score distribution may be promoted only if it robustly improves exact-score prediction rather than merely reducing the visual frequency of 1-1. Candidate work should model uncertainty in fixture lambdas / score dispersion and be evaluated against independent Poisson on:

- exact-score log loss;
- exact top-score hit rate;
- 1X2 Brier score;
- total-goal calibration / MAE;
- draw and low-score calibration;
- locked historical holdout and genuine forward validation.

No live model effect is enabled by this audit.
