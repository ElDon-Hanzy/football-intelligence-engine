# C0197 Chaos + eSOT Shadow — 2026-09-03

Status: completed as research-only shadow experiment. No production promotion. `model_effect_enabled=false`.

Run key: `C0197_ESOT_CHAOS_20260903_V01`

## Question

After the Chaos-only volatility trigger failed, test whether a structural expected-shots-on-target residual can identify matches where a mean-preserving high/low-tempo distribution improves high-score tail calibration.

This experiment does **not** retune the rejected Chaos-only volatility score. It keeps the same mean-preserving 50/50 low/high Poisson mixture and changes only the activation signal.

## eSOT definition

The frozen research eSOT benchmark is `XG_BIN_K100`.

Fixed xG bins:

- `< .03`
- `.03-.06`
- `.06-.10`
- `.10-.15`
- `.15-.25`
- `.25-.40`
- `.40-.60`
- `.60+`

For every historical shot, the expected SOT probability is calculated using **only earlier kickoffs**. The empirical SOT rate of the shot's xG bin is shrunk to the prior global SOT rate with `k=100`. A side is usable only when `private.c0197_shot_side_quality_v01.esot_training_eligible=true` and at least 1,000 eligible prior shots exist globally.

`xGOT` is not an eSOT input because it is post-shot/outcome-adjacent evidence.

## Matchup signal

For every eligible team-match:

`residual = actual SOT - eSOT`

For an upcoming fixture, four chronology-safe components are calculated from each team's prior matches:

1. home attacking residual
2. home defensive residual (opponent SOT-eSOT in home team's prior matches)
3. away attacking residual
4. away defensive residual

The components are centered by the last-100-side league residual known before kickoff, removing slow calibration drift in the eSOT model.

The matchup signal is the simple average of the four centered components.

Sensitivity windows:

- L3
- L5
- L10

## Split

Because shot-level data starts in 2025/26, this is a within-season walk-forward test rather than a fake six-season eSOT backtest.

- eSOT burn-in/calibration: early 2025/26, only prior kickoffs used
- validation: GW11-23
- test: GW24-38
- 2026/27 GW1-2: directional external check only; never used for tuning

## Process-persistence result

The signal does not robustly predict the next match's SOT-eSOT residual.

| Split | Window | N | corr(signal, next SOT-eSOT) | corr(signal, goals) |
|---|---|---:|---:|---:|
| Validation | L3 | 130 | -0.076 | -0.079 |
| Validation | L5 | 130 | -0.131 | -0.016 |
| Validation | L10 | 83 | +0.031 | +0.111 |
| Test | L3 | 150 | +0.016 | +0.061 |
| Test | L5 | 150 | -0.014 | +0.088 |
| Test | L10 | 150 | -0.001 | +0.089 |

This fails the structural persistence gate: the next-SOT-residual correlation is effectively zero and directionally unstable.

## Distribution grid

The same mean-preserving 50/50 Poisson mixture used in Chaos-only was tested.

For positive eSOT activation:

`d = min(0.50, scale * max(z_eSOT, 0))`

An inverse activation was also tested as a red-team placebo.

Scale grid: `0.000 ... 0.300` by `0.025`.

### L3

Positive eSOT activation worsened both validation and test.

- validation: 1.913177 at scale 0 -> 1.933072 at scale .300
- test: 1.841957 -> 1.866870

Inverse L3 did not improve validation; a test-only improvement around .175 is therefore not actionable.

### L5

Positive activation again worsened both periods.

- validation: 1.913177 -> 1.931063 at .300
- test: 1.841957 -> 1.863874

Inverse L5 slightly improved validation at .175 (1.910588) but worsened test (1.845860). This is a direct sign-instability failure.

### L10

L10 positive activation is the only apparently interesting result:

- validation: 1.907656 -> **1.889584** at .300
- test: 1.841957 -> **1.839733** at .300

However:

1. the recommendation changes completely across reasonable L3/L5/L10 horizons;
2. L10 process-persistence correlation remains essentially zero;
3. the best validation scale is at the upper edge of the tested grid rather than a stable interior optimum;
4. most importantly, high-score threshold scoring fails in the test.

Therefore the L10 total-goal improvement is not sufficient for promotion.

## High-score tail red-team

Fixed candidate: L10 positive, scale `.300`.

Negative deltas are improvements; positive deltas are worse.

### Validation

| Tail | Actual | Base P | Candidate P | Brier delta | Log-loss delta |
|---|---:|---:|---:|---:|---:|
| 4+ | 26.51% | 31.66% | 31.82% | +0.000067 | +0.000142 |
| 5+ | 14.46% | 16.04% | 16.91% | -0.001862 | -0.006197 |
| 6+ | 3.61% | 7.09% | 8.04% | +0.000203 | +0.003025 |
| 7+ | 2.41% | 2.77% | 3.48% | -0.000687 | -0.004002 |

Mixed rather than uniformly favorable.

### Test

| Tail | Actual | Base P | Candidate P | Brier delta | Log-loss delta |
|---|---:|---:|---:|---:|---:|
| 4+ | 28.67% | 33.61% | 33.61% | -0.000037 | -0.000053 |
| 5+ | 11.33% | 17.43% | 17.62% | **+0.000865** | **+0.002544** |
| 6+ | 3.33% | 7.88% | 8.13% | **+0.000589** | **+0.002807** |
| 7+ | 2.00% | 3.16% | 3.35% | **+0.000237** | **+0.002103** |

The candidate makes the exact high-score problem worse: the existing Poisson baseline already overpredicts the 5+/6+/7+ tails, and the eSOT-triggered dispersion adds more tail probability.

The apparent total-goal log-loss gain therefore cannot be interpreted as a high-score Chaos edge.

## 2026/27 directional check

Current C0197 rows expose a research-ingestion issue: `source_team_code` is NULL in normalized 2026/27 team evidence even though the raw source row retains the source codes. Canonical `team_id` mapping is correct, so the external check used `team_id` only.

Coverage is tiny:

- GW1: 6 fully continuous L10 matches; corr with next SOT-eSOT = -0.723
- GW2: 5 matches; corr = +0.084

This is too small for inference and is not used for tuning. The swing is directionally consistent with the historical instability rather than evidence of persistence.

## Decision

**NO_ROBUST_HIGH_TAIL_EDGE. Do not promote the eSOT residual as a Football Chaos/high-score trigger.**

This is intentionally narrower than rejecting eSOT itself.

Keep:

- shot-level `XG_BIN_K100` eSOT benchmark;
- eSOT as a research diagnostic / potential process or low-tail feature;
- existing shot-quality reconciliation gate.

Reject for now:

- eSOT residual -> high-score dispersion adjustment;
- L3/L5/L10 cherry-picking;
- any production correct-score or FPL adjustment from this experiment.

The next C0197 structural layer should test **Big Chances / Big Chances Missed and scorer concentration**, because those address chance quality and goal-allocation mechanisms that eSOT persistence did not capture.

## Production evidence

Migration: `20260903185532_c0197_esot_chaos_shadow_v01.sql`

Tables:

- `public.research_c0197_esot_chaos_runs`
- `public.research_c0197_esot_process_sensitivity`
- `public.research_c0197_esot_chaos_grid_results`
- `public.research_c0197_esot_tail_evaluations`
- `public.research_c0197_esot_external_checks`

Status function:

- `private.c0197_esot_chaos_status_v01()`

All evidence objects are append-only, inaccessible to `anon`/`authenticated`, and constrained to `model_effect_enabled=false`.
