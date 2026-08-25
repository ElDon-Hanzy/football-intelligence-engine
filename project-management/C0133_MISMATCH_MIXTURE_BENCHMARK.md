# C0133 — Mean-preserving mismatch mixture benchmark v0.1

Parent: C0063. Research only; no model effect.

## Hypothesis

For fixtures with a large pre-match lambda gap, a latent two-regime score model might represent game-state/mismatch uncertainty better than independent Poisson while preserving each team's unconditional mean lambda.

## Reproducible baseline

The benchmark uses the chronology-safe 449-fixture sample underlying the outcome-model work and the currently reproducible `team_strength_linear_v0.1` historical lambda formula. The original C0058 stored metrics are preserved unchanged; this is a new benchmark lineage because the original C0058 migration SQL is not repository-tracked.

Training = 344 fixtures through 2026-01-31. The 105-fixture Feb-May holdout is reserved and was not consumed because no candidate passed the training screen.

## Candidate definition

For fixtures whose absolute lambda gap clears a fixed threshold, use a 50/50 mixture of two opposite regimes:
- favourite lambda * (1+d), underdog lambda * (1-d)
- favourite lambda * (1-d), underdog lambda * (1+d)

The equal mixture preserves each team's unconditional mean lambda. Fixtures below threshold remain independent Poisson.

Predeclared grid:
- gap threshold: 0.50, 0.75, 1.00
- regime delta: 0.10, 0.20, 0.30

## Training result

Poisson control: NLL 1029.988205, score log loss 2.994152.

Every mixture was worse on training exact-score likelihood. Best candidate was gap >=1.00 / delta 0.10: NLL 1030.003100, +0.014895 worse than Poisson, and it affected only one training fixture. At gap >=0.50, delta 0.10 already worsened NLL by +0.277796; larger deltas degraded further.

## Decision

`REJECT_TRAINING_LIKELIHOOD`.

Because no predeclared mixture beat Poisson on the training screen, the untouched 105-fixture holdout was not opened for candidate selection or rescue. Expanding the parameter grid after seeing this result would be curve-searching.

Independent Poisson therefore remains the retained score-distribution family. The evidence reinforces the existing diagnosis that upstream team-strength/lambda quality is more important than adding score-distribution complexity.

Production evidence is append-only in `public.mismatch_mixture_benchmarks`. A0005, E0007 and W0002 are untouched.
