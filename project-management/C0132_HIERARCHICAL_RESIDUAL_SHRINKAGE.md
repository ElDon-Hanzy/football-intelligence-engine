# C0132 — Hierarchical residual shrinkage benchmark v0.1

Parent: C0071. Research only; no model effect.

## Question

Does a team-specific residual xG adjustment add stable value when partially pooled toward the league/global residual mean?

## Target and baseline

The benchmark exactly reproduces the C0068/C0123 residual target (`c0067_attack_xg_residual_v01`): realized Understat team xG minus the `team_strength_linear_v0.1` pre-match team-side xG prediction.

The reproduced Feb–May control is exactly 210 rows, MAE 0.639759, RMSE 0.817821.

## Fixed candidates

For each chronological holdout, training uses only rows strictly before the holdout. Team residual means are shrunk toward the training-window global residual mean using pseudo-count K = 5, 10, 20, or 40. A global-mean-only correction is a separate control. Teams unseen in training fall back to the global mean rather than being dropped or zero-filled.

## Results

### W1 Aug–Oct 2025, n=120
- BASE: 0.626689 / 0.779443 MAE/RMSE
- GLOBAL: 0.623299 / 0.778644
- K10: 0.621797 / 0.777849
- K20: 0.621790 / 0.776438
- K40: 0.621989 / 0.775951

This window supports pooling.

### W2 Nov 2025–Jan 2026, n=200
- BASE: 0.668900 / 0.806557
- GLOBAL: 0.667890 / 0.808516
- K5: 0.671218 / 0.817731
- K10: 0.670319 / 0.814991
- K20: 0.669396 / 0.812358
- K40: 0.668838 / 0.810253

No team hierarchy improves both metrics; RMSE deteriorates for every hierarchical candidate.

### W3 Feb–May 2026, n=210
- BASE: 0.639759 / 0.817821
- GLOBAL: 0.638484 / 0.818344
- K5: 0.648562 / 0.820508
- K10: 0.646592 / 0.819331
- K20: 0.644162 / 0.818054
- K40: 0.641811 / 0.817126

K40 slightly improves RMSE but worsens MAE; all weaker pooling candidates are worse overall.

## Decision

REJECT_NO_CROSS_WINDOW_STABILITY.

The apparent team residual bias in Aug–Oct does not persist. Selecting K20/K40 from the first window would be regime overfit. Team/league hierarchy is therefore not activated and C0071 is closed as a tested negative hypothesis. A materially different hierarchy (for example a richer multi-level model justified by new independent evidence) requires a new Change ID and fresh validation design.

Production evidence is append-only in `public.hierarchical_residual_shrinkage_benchmarks`. Frozen A0005, E0007 and W0002 are untouched.
