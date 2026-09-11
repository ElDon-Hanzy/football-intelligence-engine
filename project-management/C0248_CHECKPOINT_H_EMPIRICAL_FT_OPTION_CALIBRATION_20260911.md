# C0248 Checkpoint H — Empirical FT Option Calibration

Date: 2026-09-11
Status: Implemented checkpoint; C0245 remains In Progress.

## Objective
Estimate the state-dependent option value of an additional transfer from decision-time counterfactual search surfaces, without hindsight and without introducing a universal `1 FT = X points` constant.

## Source
`private.c0240_adversarial_batches` + `private.c0240_adversarial_tasks`, GW4 horizon 5.
Only COMPLETE tasks with `constrained_best` were used.
For each batch and transfer count, retain the best objective and add back explicit hit cost to recover gross squad-value improvement before transfer penalty.
Use only adjacent transfer-count comparisons (n -> n+1). Duplicate repeated cycles are de-duplicated before distribution statistics.

## Live calibration
- raw adjacent samples: 17
- unique adjacent samples: 9
- mean gross marginal value: 2.726 weighted points
- median: 2.587
- P25: 2.140
- P75: 4.134
- min: -1.494
- max: 5.851

Latest batch adjacent gross marginal values:
- 4 -> 5 transfers: +2.587
- 5 -> 6: +2.140
- 6 -> 7: +2.861

These values explain why extra hit-funded transfers fail: the current marginal football gain is generally below the 4-point hit.

## Wildcard implication
Current Wildcard exact-window edge = +15.659 with a terminal deficit of 4 FTs.
FT-only Wildcard break-even = 3.915 points per extra terminal FT.
That threshold is around the 67th percentile of observed decision-time marginal transfer values: above the median (2.587) but below/equal to P75 (4.134).

Interpretation:
- the Wildcard is not obviously wrong on the exact GW4-GW8 window;
- it requires terminal FTs to be materially more valuable than the current median to reverse the raw edge;
- unused Wildcard option value and future-information option value remain additional positive reasons to preserve the chip;
- therefore current Wildcard remains `HOLD_NO_ROBUST_EDGE`.

## Runtime additions
- `private.c0248_ft_option_calibration_v01(gameweek,horizon)`
- `private.c0248_c0245_option_value_status_v01(gameweek,horizon)`

## Policy
- calibration is sensitivity evidence, not a production scalar;
- no realized FPL points are used;
- hit cost is stripped before measuring gross marginal football value;
- no arbitrary fixed FT/cash value is injected into xPts or the optimizer;
- future-information and unused-chip option values remain separately fail-closed.

No player xPts rewritten. No manager-plan mutation. No transfer/chip execution.