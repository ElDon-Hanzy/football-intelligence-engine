# C0197 Chaos-Only Shadow — 2026-09-03

Status: completed as research-only shadow experiment. No model promotion. `model_effect_enabled=false`.

Run key: `C0197_CHAOS_ONLY_20260903_V01`

## Objective

Test whether a Football Chaos layer improves the shape/tail of pre-match goal distributions before adding eSOT, xGOT, Big Chances Missed or scorer-concentration features.

The experiment uses the complete six-season EPL foundation (2020/21 through 2025/26): **2,280 matches**.

## Split

- Train / feature standardisation: 2020/21–2023/24
- Validation: 2024/25
- Test: 2025/26

All 2,280 fixtures receive a baseline shadow snapshot. Chaos features require at least 8 prior matches for both teams, leaving **2,136 feature-eligible fixtures**. Ineligible fixtures retain the baseline unchanged.

## Baselines

### Primary

Opening O/U 2.5 prices from Football-Data are de-vigged to obtain a pre-match probability of over 2.5 goals. A Poisson total-goal mean is then numerically inverted from that probability.

This deliberately gives the Chaos test a strong mean anchor. The question is whether the distribution needs extra dispersion, not whether a separate model can estimate mean goals better.

### Sensitivity

A bookmaker-free baseline uses the mean of each team's previous 10 total-goal environments.

## Chaos features

Only chronology-safe prior-match evidence is used:

1. recent total-goal variance
2. recent total-shot variance
3. recent SOT variance
4. recent goals-per-SOT variance

Each feature is `log(1+x)` transformed, standardised using the 2020/21–2023/24 train block, winsorised to ±3 z and combined with equal weights.

No recent single match, final score, xG, xGOT, BCM, current-match actual or post-kickoff evidence enters the score.

## Candidate distribution

The Chaos candidate is a **mean-preserving 50/50 low/high-tempo Poisson mixture**.

For baseline mean `mu` and dispersion `d`:

- low state mean = `mu * (1-d)`
- high state mean = `mu * (1+d)`

The two states have equal weight, so expected goals remain `mu` while variance/tail mass increases.

Primary activation tested:

`d = min(0.50, scale * max(chaos_z, 0))`

Validation grid: `scale = 0.000 ... 0.300` in 0.025 steps.

Red-team variants:

- constant dispersion independent of Chaos
- inverse-Chaos placebo
- top-10%-only activation
- top-20%-only activation
- bookmaker-free rolling-goal baseline

## Primary result

**No positive dispersion setting improved total-goal log loss. The best scale is exactly 0.**

### Market-Poisson baseline

| Season | Activation | Best scale | Log loss |
|---|---|---:|---:|
| 2024/25 validation | continuous positive Chaos | 0.000 | 1.871375 |
| 2025/26 test | continuous positive Chaos | 0.000 | 1.856960 |
| 2024/25 validation | top 10% only | 0.000 | 1.871375 |
| 2025/26 test | top 10% only | 0.000 | 1.856960 |
| 2024/25 validation | top 20% only | 0.000 | 1.871375 |
| 2025/26 test | top 20% only | 0.000 | 1.856960 |
| 2024/25 validation | constant dispersion | 0.000 | 1.871375 |
| 2025/26 test | constant dispersion | 0.000 | 1.856960 |
| 2024/25 validation | inverse-Chaos placebo | 0.000 | 1.871375 |
| 2025/26 test | inverse-Chaos placebo | 0.000 | 1.856960 |

Even small non-zero dispersion worsened the primary metric. Example continuous-Chaos `scale=0.100`:

- 2024/25: 1.871375 -> 1.871967
- 2025/26: 1.856960 -> 1.857172

### Bookmaker-free sensitivity

The independent rolling-goal baseline reaches the same conclusion:

| Season | scale 0 | scale .025 | scale .100 | scale .200 |
|---|---:|---:|---:|---:|
| 2024/25 | 1.887974 | 1.887989 | 1.888247 | 1.889400 |
| 2025/26 | 1.876046 | 1.876053 | 1.876189 | 1.876877 |

Again, scale 0 is best.

## Tail calibration

The recent seasons do not show a stable pattern of Poisson tail underestimation.

### 2024/25 overall

- Actual P(4+) 34.21% vs Poisson 37.10%
- Actual P(5+) 15.53% vs Poisson 20.15%
- Actual P(6+) 6.32% vs Poisson 9.60%
- Actual P(7+) 2.63% vs Poisson 4.07%

### 2025/26 overall

- Actual P(4+) 28.42% vs Poisson 32.17%
- Actual P(5+) 12.89% vs Poisson 16.39%
- Actual P(6+) 4.21% vs Poisson 7.29%
- Actual P(7+) 1.84% vs Poisson 2.86%

So broadly increasing tail mass is directionally wrong in both validation and test seasons.

## Highest-Chaos quintile sign flip

The most important Noise-Control result is the lack of stable direction.

### 2024/25 Q5

- Actual P(4+) 33.33% vs Poisson 37.59%
- Actual P(5+) 13.04% vs Poisson 20.53%
- Actual P(6+) 1.45% vs Poisson 9.84%
- Actual P(7+) 0.00% vs Poisson 4.19%

High-Chaos matches were **less** tail-heavy than the baseline expected.

### 2025/26 Q5

- Actual P(4+) 38.98% vs Poisson 32.69%
- Actual P(5+) 23.73% vs Poisson 16.68%
- Actual P(6+) 3.39% vs Poisson 7.40%
- Actual P(7+) 1.69% vs Poisson 2.90%

Here high-Chaos matches were heavier at 4+/5+ but still lighter at 6+/7+.

This season-to-season sign instability fails the project's Noise-Control Gate.

## Decision

**REJECT Chaos-only distribution adjustment. NO MEANINGFUL EDGE.**

Selected dispersion scale: **0**.

Do not alter production Poisson, correct-score selection, FPL forecasts or matchup forecasts from this experiment.

The result does not prove that football has no contextual tail regimes. It shows that this zero-cost Chaos-only signal built from historical goals/shots/SOT volatility does not identify them robustly enough.

The next C0197 layer should therefore test whether richer, more structural information changes the conclusion—specifically the already validated eSOT divergence layer and then BCM/xGOT/player concentration—not retune the rejected Chaos-only score.

## Production evidence objects

Migration: `20260903171817_c0197_chaos_only_shadow_v01.sql`

Tables:

- `public.research_c0197_chaos_shadow_runs`
- `public.research_c0197_chaos_shadow_predictions`
- `public.research_c0197_chaos_shadow_grid_results`
- `public.research_c0197_chaos_shadow_tail_calibration`

Status function:

- `private.c0197_chaos_shadow_status_v01()`

All evidence is append-only, inaccessible to anon/authenticated roles and constrained to `model_effect_enabled=false`.
