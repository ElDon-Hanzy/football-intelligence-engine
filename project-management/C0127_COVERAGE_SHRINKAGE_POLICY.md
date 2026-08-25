# C0127 — Coverage Shrinkage Policy v0.1

Date: 2026-08-25
Status: Verified

## Objective

Calibrate how historical short-form residual signals are weighted when their L10 evidence is incomplete, without treating missing/sparse evidence as full evidence and without activating any model effect.

## Evidence

A chronology-safe retrospective audit compared zero effect with linear, quadratic and cubic sample scaling. Coverage counts were:

- sample L10 1–4: 6 rows;
- sample L10 5–7: 42 rows;
- sample L10 8–9: 28 rows;
- sample L10 10: 828 rows.

For both the 5–7 and 8–9 bins, the zero-effect baseline beat linear, quadratic and cubic partial weighting on both MAE and RMSE. The 1–4 bin is too sparse to justify a non-zero residual effect.

## Decision

Policy `COVPOL0001` is conservative and deterministic:

- missing `sample_l10` remains `NULL`;
- `sample_l10 < 10` receives research weight `0`;
- `sample_l10 >= 10` receives research weight `1`;
- the function never increases an effect above 1.0;
- no forecast path is connected to this policy;
- `model_effect_enabled=false`.

This is a retrospective calibration result, not independent validation and not a promotion decision. Any future relaxation of the full-L10 floor requires a new Change ID and new evidence.

## Production objects

- `public.signal_coverage_policy_benchmarks`
- `private.signal_effect_coverage_weight_v01(integer)`
- `private.signal_coverage_policy_status_v01()`
- append-only mutation guard `private.block_signal_coverage_policy_mutation_v01()`
- migration `20260825065700_c0127_coverage_shrinkage_policy_v01.sql`

## Verification

- four coverage-bin benchmark rows persisted;
- all rows have `actual_data_used=false` and `model_effect_enabled=false`;
- mutation attempt was rejected by the append-only guard;
- A0005 remained 140 frozen predictions, 20 fixtures, 0 evaluations, zero integrity violations;
- W0002 remained 20 fixtures, 0 evaluations, zero integrity violations;
- governance audit was clean before implementation.
