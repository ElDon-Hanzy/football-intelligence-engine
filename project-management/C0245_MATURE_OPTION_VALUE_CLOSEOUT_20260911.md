# C0245 — Mature Sequential FT / Option Value Control Closeout

Date: 2026-09-11
Status: Completed / Verified
Parent: C0248 consolidated sequential planner

## Scope completed
C0245 is now fully absorbed into C0248 and no longer exists as a separate architecture branch.

Implemented capabilities:
- weekly FT accrual/carry and staged transfer sequences;
- ROLL, normal transfers, hits and preserved root branches;
- exact sequential comparison of C0240 legacy, C0228 baseline, named 2FT challenger and Wildcard root;
- terminal FT and bank sensitivity;
- empirical decision-time calibration of marginal transfer value from C0240 counterfactual search surfaces;
- explicit future-information optionality control;
- no hindsight realized points;
- no universal fixed FT point scalar;
- no arbitrary numeric information bonus;
- integration into canonical C0248 decision-control output.

## FT option calibration
Chronology-safe adjacent transfer-count counterfactuals were deduplicated across C0240 batches.

Current GW4 calibration:
- unique adjacent samples: 9
- median gross marginal transfer value: 2.587 weighted points
- mean: 2.726
- P25: 2.140
- P75: 4.134
- min: -1.494
- max: 5.851
- latest lineage 4→5 / 5→6 / 6→7 marginals: 2.587 / 2.140 / 2.861

This distribution is sensitivity evidence only. It is not converted into `1 FT = X points` in production.

## Wildcard terminal sensitivity
Current exact-window Wildcard edge vs best normal root: +15.659 weighted points.
Best normal root: C0240_LEGACY.
Terminal FT gap: normal +4 FTs.
Terminal bank: normal £0.3m vs Wildcard £0.6m.
FT-only break-even: 3.915 points per extra FT, around the 67th percentile of observed marginal transfer values.

Unused Wildcard option value and future information remain positive/non-zero and are not assigned fake precision. Therefore current Wildcard interpretation remains `HOLD_NO_ROBUST_EDGE`.

## Future-information optionality
Completed-GW calibration prior uses only GW2–GW3 rolling frozen snapshots:
- 47 chronology-safe transitions
- mean absolute XI projection revision: 0.196
- P75: 0.211
- no XI-composition or captain changes in that small completed prior
- sample explicitly classified insufficient for a numeric information-value point estimate

Current GW4 state is assessed separately:
- 13 PRE_FINAL publications
- 4 distinct transfer plans
- 3 distinct scenarios
- T−2 refresh remains pending
- all 4 current price-timing roots are `WAIT_FOR_INFORMATION`
- zero material next-update affordability loss detected

Result: `HIGH_PRESERVE_OPTIONALITY` and operational guidance `WAIT_UNTIL_T_MINUS_2_UNLESS_MATERIAL_PRICE_OR_INJURY_EVENT`.

## Canonical runtime
- `private.c0248_ft_option_calibration_v01`
- `private.c0248_terminal_state_sensitivity_v02`
- `private.c0248_future_information_optionality_v02`
- `private.c0248_c0245_option_value_status_v03`
- integrated into `private.c0248_decision_control_status_v01`
- exposed through existing public C0248 decision-control bridge

## Governance principles
- historical forecasts append-only;
- realized outcomes excluded from option-value calibration;
- duplicate adversarial cycles deduplicated;
- FT value remains state-dependent;
- information option value affects timing/robustness, not player xPts;
- price signal may accelerate an already-robust move only when affordability is materially threatened;
- C0245 recalibrates every Gameweek rather than remaining a fixed parameter.

## Current GW4 decision effect
C0245 does not overturn C0240's current best normal root. It changes the timing interpretation: do not execute early because waiting currently has no material price cost and scheduled information remains.

No transfers or chips executed. No manager-plan mutation. No xPts rewrite.