# C0126 — Non-linear signal curve benchmark v0.1

Date: 2026-08-25
Parent: C0069
Experiment: E0010
Status: Completed / Verified

## Question
Do saturating response curves make the small residual form package more stable than a straight linear response?

## Fixed candidates
Using the same coverage/recency scaling and the same expert-set max magnitudes (own form 0.05 log effect, opponent-defence trend 0.04), compare:
- linear unclipped;
- clipped linear at ±1 normalized trend;
- tanh saturation;
- softsign saturation;
- zero residual baseline.

No candidate was retuned inside a window.

## Chronology-separated windows
1. W1 Aug–Oct 2025: 120 team-side rows.
2. W2 Nov 2025–Jan 30 2026: 200 rows.
3. W3 Feb–May 2026: 210 rows.
The Jan-31 temporal-gap rows remain excluded.

## Results
Every non-baseline curve showed the same regime pattern:
- W1: MAE improved but RMSE worsened slightly;
- W2: both MAE and RMSE worsened;
- W3: both MAE and RMSE improved.

Example clipped-linear metrics:
- W1: 0.623483 MAE / 0.780480 RMSE vs baseline 0.626689 / 0.779443;
- W2: 0.677615 / 0.813827 vs 0.668900 / 0.806557;
- W3: 0.637791 / 0.817136 vs 0.639759 / 0.817821.

Linear-unclipped, tanh and softsign each also produced one PASS window, one MIXED window and one FAIL window.

## Decision
`REJECT_NO_CROSS_WINDOW_STABILITY`.

The nonlinear hypothesis is considered tested and rejected for now. No curve receives model effect. The existing small manual form package may remain a research comparator under C0124/C0125, but nonlinear shaping is not justified.

Production evidence:
- `nonlinear_signal_curve_benchmarks`
- `private.nonlinear_signal_curve_status_v01()`
- E0010

Append-only mutation guard was negative-tested successfully. A0005 remained unchanged and integrity-clean.
