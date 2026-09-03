# C0197 High-Score Reverse Engineering — 2026-09-03

Status: research-only shadow hypothesis. No production model effect.

Run key: `C0197_HIGHSCORE_RE_20260903_V01`

## Objective

Reverse engineer EPL fixtures that actually reached 6+ total goals and identify pre-match characteristics that the rejected Chaos-only model missed.

Foundation: 2,280 EPL matches, 2020/21–2025/26.

Primary target: 6+ total goals. Secondary: 7+.

All predictors are pre-match only. Historical rich features are gated through `C0197_XSRC_V01`.

## Key discovery: 6+ is not one regime

Across the six-season foundation there are 158 matches with 6+ total goals:

- SHOOTOUT: 114 / 158 = 72.2%. Definition: both teams score at least 2.
- DEMOLITION: 44 / 158 = 27.8%. Definition: one team scores 5+ and the opponent scores 0–1.

The two archetypes have materially different pre-match structures and should not share one generic Chaos trigger.

## What the original Chaos model missed

The original volatility model emphasized recent goal/shot/SOT variance. Fixture-level auditing showed it missed most actual 6+/7+ matches and the direction was unstable by season.

Reverse engineering points instead toward attacking-floor structure.

### Long-history evidence

After controlling for market expected-goal level and favorite strength, the most stable six-season discriminator was rolling SOT generated, not defensive leak.

Raw recent defensive concession measures were unstable and often negative.

### Rich 2024/25–2025/26 evidence

649 fixtures have enough clean rich pre-match history; 35 of the 40 actual 6+ matches in those two seasons are eligible.

Coarse market-stratified comparison initially showed 6+ matches with higher:

- average xG: +0.87 SD
- average Big Chances: +0.55 SD
- average xGOT: +0.50 SD
- weaker-side xG: +0.47 SD
- weaker-side SOT: +0.44 SD

But nearest-neighbour matching on pre-match market Poisson mean and favorite strength narrowed the robust residual signal substantially.

The strongest residual clues were:

1. **Weaker-side SOT-player breadth**: the weaker side had more distinct players regularly putting shots on target in 23/35 six-plus matches versus matched controls. Mean matched-control delta was +0.2898 in 2024/25 and +0.1947 in 2025/26.
2. **Weaker-side SOT floor**: higher in 22/35 six-plus matches; mean matched-control delta +0.304 in 2024/25 and +0.124 in 2025/26.
3. Player concentration was directionally wrong: top-1/top-2 xG/SOT concentration was lower in six-plus matches in both rich seasons. Multiple credible threats mattered more than one concentrated scorer.

## Archetype signatures

### SHOOTOUT

Pre-match profile:

- more balanced matchup
- both teams carry a meaningful scoring/SOT floor
- higher weaker-side attack rate
- higher weaker-side SOT
- higher BTTS history
- richer attacking participation across multiple players

Long-history descriptive values among eligible fixtures:

- controls: min SOT 3.849, min attack 1.141 goals/game, BTTS rate 0.540, favorite probability 0.536
- shootouts: min SOT 4.134, min attack 1.323, BTTS rate 0.586, favorite probability 0.553

A simple shootout shadow score was built from equal-weight standardized:

- min rolling SOT
- min rolling goals scored
- average rolling BTTS rate
- inverse favorite probability

Scaling was frozen from 2020/21–2022/23.

Top-10% ranking performance:

| Season | Shootouts | Score hits | Precision | Recall | Market top-10 hits | Old Chaos top-10 hits |
|---|---:|---:|---:|---:|---:|---:|
| 2023/24 | 24 | 3 | 7.9% | 12.5% | 3 | 2 |
| 2024/25 | 18 | 3 | 7.9% | 16.7% | 2 | 0 |
| 2025/26 | 14 | 4 | 10.5% | 28.6% | 2 | 1 |

Across 2024/25–2025/26 combined, shootout-score top 10% precision was 9.3% versus 4.3% base rate. Market top 10% was 4.0%; old Chaos top 10% was 1.3%.

This is promising and same-direction across three seasons, but feature selection is exploratory and these later seasons are not a pristine untouched holdout. It remains shadow-only.

### DEMOLITION

Pre-match profile:

- stronger favorite
- larger strength gap
- stronger favorite attack
- higher favorite SOT
- underdog tends to allow more SOT

Descriptive eligible values:

- controls: favorite probability 0.536, favorite attack 1.649, favorite SOT 4.910, underdog SOT allowed 4.830
- demolitions: favorite probability 0.640, favorite attack 1.812, favorite SOT 5.563, underdog SOT allowed 5.086

However, the simple demolition score did **not** beat the market. Across 2024/25–2025/26, top-10% demolition precision was 2.7%, identical to market top-10% and with only 8 demolition outcomes in the eligible comparison window.

Do not promote or tune this branch yet.

## Decision

**PROMISING_SHOOTOUT_SHADOW_ONLY**

The reverse engineering supports a new architecture:

1. Keep rejected Chaos-only volatility branch frozen.
2. Model high-scoring fixtures as separate mechanisms, not one generic dispersion state.
3. Continue a SHOOTOUT branch based on two-sided attacking floor and participation breadth.
4. Keep DEMOLITION branch exploratory until a stronger structural discriminator is found.
5. Do not alter production Poisson, correct-score selection, matchup predictions or FPL forecasts yet.

## Noise-control caveat

The shootout ranking improvement is promising, not validated for promotion. Later-season data has already been inspected during feature discovery, so the next meaningful gate must use forward 2026/27 evidence or an untouched alternative historical source/sample. No retrospective weight-tuning against 2024/25–2025/26 should be allowed.
