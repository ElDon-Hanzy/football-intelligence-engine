# C0123 — Regularized signal-effect model v0.1

Date: 2026-08-25
Parent: C0068
Status: Completed / Verified

## Question
Can the currently supported historical residual signals justify non-zero learned effects once chronology, coverage and shrinkage are enforced?

## Data split
- Training: 688 team-side rows strictly before 2026-01-31.
- Temporal gap: 6 team-side rows on 2026-01-31, excluded from both fit and holdout.
- Holdout: 210 team-side rows from 2026-02-01 through 2026-05-24.
- Inner training: 488 rows before 2025-11-01.
- Inner validation: 200 rows from 2025-11-01 through 2026-01-30.

No Feb-May outcome was used to choose the penalty or promotion decision.

## Residual features
The target is attack-xG residual versus the C0067 baseline. Supported historical features are:
- own form trend = `(L5 xG for - L10 xG for) * coverage`;
- opponent defence trend = `(opponent L10 xGA - opponent L5 xGA) * opponent coverage`;
- short rest = `1` when rest <4 days.

Coverage is `min(1, sample_l10 / 10)`. Unsupported tactical/personnel/quality families are left unlearned rather than filled with zeros.

## Regularization
Standardized ridge penalties tested on the inner chronological split:
`0, .001, .005, .01, .025, .05, .1, .25, .5, 1.0`.

Promotion gate for a non-zero residual model: improve both MAE and RMSE on the inner validation set.

Inner validation baseline:
- MAE 0.668900
- RMSE 0.806557

Best RMSE candidate (penalty 0):
- MAE 0.670355
- RMSE 0.806177

Best MAE candidate (penalty 1.0):
- MAE 0.668669
- RMSE 0.806834

No candidate improved both metrics. Therefore the learned decision is **shrink to zero**.

## Untouched holdout
Baseline / selected zero:
- MAE 0.639759
- RMSE 0.817821

Unregularized full-train residual fit:
- MAE 0.637819
- RMSE 0.819550

Ridge k=1 full-train residual fit:
- MAE 0.637968
- RMSE 0.818446

The non-zero fits marginally improved MAE but worsened RMSE, confirming that the evidence is not robust enough for activation.

## Decision
Current learned residual coefficients are all zero. This is an evidence-backed shrinkage result, not “no model.”

`model_effect_enabled=false` remains mandatory. The existing small manual form heuristic can only remain as a research comparator until manual-vs-learned ablation and forward evidence justify it.

Production model record: `RSE0001` in `regularized_signal_effect_models`.
