# C0124 — Manual-vs-learned signal-effect ablation v0.1

Date: 2026-08-25
Parent: C0072
Experiment: E0009
Status: Completed / Verified

## Design
All directly compared variants use the same chronology-safe Feb–May 2026 holdout (210 team-side rows) and the same team-strength baseline. The Jan-31 six-row temporal gap remains excluded. This is retrospective evidence, never independent forward validation.

## Results
| Variant | MAE | RMSE | Decision |
|---|---:|---:|---|
| BASE_ZERO | 0.639759 | 0.817821 | control |
| MANUAL_OWN_FORM | 0.638183 | 0.818176 | reject standalone: RMSE regressed |
| MANUAL_OPP_DEF | 0.638962 | 0.816760 | retain small research comparator |
| MANUAL_FORM_COMBINED | 0.637791 | 0.817136 | retain small research comparator |
| LEARNED_RSE0001 | 0.639759 | 0.817821 | shrink to zero |

The separate C0066 schedule/fatigue benchmark remains rejected because the manual schedule heuristic worsened both MAE (0.6422→0.6426) and RMSE (0.8203→0.8207).

## Family decisions
- **Recent-form package:** retain only as a small research comparator. The combined own-form + opponent-defence package improved both holdout metrics, but the own-form term alone did not.
- **Own attack form:** do not retain standalone.
- **Opponent-defence trend:** retain as a small research comparator.
- **Regularized learned main effects:** shrink to zero (RSE0001).
- **Schedule/fatigue:** reject / zero.

No retrospective result grants forward activation. `forward_activation_allowed=false` and `model_effect_enabled=false` for every family decision.

Production evidence:
- `signal_effect_ablation_results`
- `signal_effect_family_decisions`
- `private.signal_effect_ablation_status_v01()`
- experiment `E0009`

The append-only mutation guard was negative-tested successfully. A0005 and W0002 remained unchanged and integrity-clean.
