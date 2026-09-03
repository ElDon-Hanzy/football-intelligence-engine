# C0197 Shootout Forward Shadow — 2026-09-04

Status: forward-only research shadow registered before GW3. No production model effect.

Run key: `C0197_SHOOTOUT_FORWARD_20260904_V01`

Parent research: `C0197_HIGHSCORE_RE_20260903_V01`.

## Purpose

The high-score reverse-engineering audit showed that 6+ goal fixtures should not be treated as one generic Chaos state. Approximately 72% of the six-season 6+ sample were two-way SHOOTOUTS (both teams at least 2 goals), while the remainder were DEMOLITIONS.

This forward branch tests the promising shootout-specific hypothesis without any further retrospective outcome tuning.

Target definition:

`SHOOTOUT = total goals >= 6 AND home goals >= 2 AND away goals >= 2`.

The branch emits relative rankings only. It does not emit a calibrated shootout probability yet.

## Frozen variants

### V01 Base

Equal-weight mean of four standardized pre-match components:

1. minimum of the two teams' rolling SOT generated;
2. minimum of the two teams' rolling goals scored;
3. average rolling BTTS rate of the two teams;
4. inverse pre-match favorite probability from the opening H2H market.

The first three are intended to represent the weaker-side attacking floor. The fourth prevents the score from simply selecting one-sided demolition candidates.

Base feature standardization is frozen from 2020/21–2022/23 EPL fixtures with full ten-match windows. It is not recalibrated after future results.

Frozen scalers:

| Feature | Mean | SD | Early-season team prior |
|---|---:|---:|---:|
| Min SOT | 3.767980 | 0.807958 | 4.403350 |
| Min goals scored | 1.063636 | 0.391222 | 1.389655 |
| BTTS rate | 0.497121 | 0.110584 | 0.498325 |
| Inverse favorite probability | 0.462185 | 0.132885 | n/a |

Training scope for match scalers: 990 full-window fixtures. Team prior scope: 2,030 rolling team observations.

### V02 Breadth

V02 is preregistered as a separate equal-weight six-component variant. It includes all four V01 components plus:

5. minimum rolling number of distinct players producing SOT;
6. minimum rolling xG generated outside each team's top two xG shooters.

These are designed to test the reverse-engineering clue that shootouts involved broad attacking participation rather than one concentrated finisher.

Breadth standardization is frozen from the 2025/26 C0197 eligible shot-event process distribution without conditioning on shootout outcomes.

| Feature | Mean | SD | Early-season team prior |
|---|---:|---:|---:|
| Min SOT contributors | 3.105051 | 0.447752 | 3.420807 |
| Min xG outside top two shooters | 0.456922 | 0.105019 | 0.537464 |

Breadth paired-match scope: 198; rolling-team scope: 471.

## Early-season continuity and promoted clubs

The score uses the most recent ten prior EPL matches from 2025/26 and 2026/27.

If fewer than ten prior EPL matches are available, missing positions are shrunk to the frozen league prior. There is no fabricated Championship-to-EPL equivalence.

Therefore Coventry City, Hull City and Ipswich Town are explicitly low-coverage early in 2026/27. Ipswich's older 2024/25 EPL season is intentionally not used to fill the immediately-prior-season window.

Confidence is recorded separately from score rank.

## Market policy

The only market input to the model is matchup balance:

- earliest captured pre-snapshot H2H quote for each bookmaker;
- each bookmaker's three-way market is de-vigged;
- de-vigged probabilities are averaged;
- `inverse_favorite_probability = 1 - max(P(home), P(away))`.

BTTS, Over/Under, SOT and correct-score markets are deliberately excluded from the model score.

For evaluation only, opening BTTS and Over 2.5 probabilities are frozen alongside the same snapshot so forward incremental lift versus bookmakers can be measured.

## GW3 preregistration

All ten GW3 fixtures were frozen before kickoff at:

`2026-09-03 21:11:10.877178+00`

The first GW3 kickoff is Ipswich Town vs Liverpool at `2026-09-04 19:00:00+00`.

### Frozen V02 ordering

| V02 rank | V01 rank | Fixture | V01 score | V02 score | Confidence |
|---:|---:|---|---:|---:|---|
| 1 | 1 | Everton vs Man Utd | 1.335 | 0.948 | MEDIUM |
| 2 | 3 | Ipswich Town vs Liverpool | 0.889 | 0.861 | LOW |
| 3 | 2 | Newcastle vs Bournemouth | 1.056 | 0.825 | MEDIUM |
| 4 | 6 | Brighton vs Leeds | 0.262 | 0.335 | MEDIUM |
| 5 | 4 | Hull City vs Aston Villa | 0.397 | 0.321 | LOW |
| 6 | 5 | Nott'm Forest vs Spurs | 0.349 | 0.086 | MEDIUM |
| 7 | 8 | Fulham vs Crystal Palace | -0.032 | -0.054 | MEDIUM |
| 8 | 7 | Brentford vs Sunderland | 0.228 | -0.277 | MEDIUM |
| 9 | 9 | Arsenal vs Chelsea | -0.085 | -0.288 | MEDIUM |
| 10 | 10 | Man City vs Coventry City | -0.457 | -0.344 | LOW |

The top forward candidate in both variants is therefore **Everton vs Man Utd**.

Ipswich vs Liverpool is deliberately marked LOW confidence because Ipswich has only two current EPL team observations and one clean current breadth observation in the defined continuity window.

Man City vs Coventry being last in the shootout ranking is not a contradiction with a potentially high total-goal game. It is the intended separation between shootout and demolition risk.

## Frozen bookmaker comparator

Opening comparator values at the same GW3 snapshot:

| V02 rank | Fixture | BTTS P | BTTS rank | O2.5 P | O2.5 rank |
|---:|---|---:|---:|---:|---:|
| 1 | Everton vs Man Utd | 0.596 | 2 | 0.567 | 4 |
| 2 | Ipswich Town vs Liverpool | 0.592 | 3 | 0.641 | 2 |
| 3 | Newcastle vs Bournemouth | 0.627 | 1 | 0.598 | 3 |
| 4 | Brighton vs Leeds | 0.541 | 6 | 0.504 | 8 |
| 5 | Hull City vs Aston Villa | 0.534 | 8 | 0.504 | 8 |
| 6 | Nott'm Forest vs Spurs | 0.543 | 5 | 0.493 | 10 |
| 7 | Fulham vs Crystal Palace | 0.557 | 4 | 0.512 | 7 |
| 8 | Brentford vs Sunderland | 0.519 | 9 | 0.524 | 6 |
| 9 | Arsenal vs Chelsea | 0.535 | 7 | 0.539 | 5 |
| 10 | Man City vs Coventry City | 0.483 | 10 | 0.716 | 1 |

Rank correlation on GW3:

- V02 vs BTTS: 0.794
- V02 vs Over 2.5: 0.050

This is consistent with the intended construction: a shootout score should overlap with BTTS, but it is not a generic total-goal ranking. Man City vs Coventry is the clearest example: market Over 2.5 rank #1, shootout rank #10.

## Forward evaluation protocol

1. Never modify or delete a stored snapshot.
2. Multiple pre-kickoff snapshots may accumulate only when inputs genuinely change; identical feature hashes are idempotent.
3. Formal evaluation always uses the **earliest stored pre-kickoff snapshot** for each match.
4. V01 and V02 are evaluated separately; V02 may not replace V01 merely because one future Gameweek performs better.
5. Compare top-10% shootout precision/recall versus frozen opening BTTS and Over-2.5 rankings.
6. Do not tune weights from individual Gameweeks.
7. No production promotion until a meaningful forward sample demonstrates robust incremental edge under the Noise-Control Gate.

## Automation

Supabase pg_cron job:

- name: `c0197-shootout-forward-shadow-v01`
- schedule: `50 */4 * * *`
- behavior: evaluate completed snapshotted Gameweeks, then capture the nearest unfinished Gameweek and its market comparators.

The scheduler is research-only. A dry rerun after GW3 registration inserted zero duplicate snapshots and zero duplicate market checks, confirming idempotency.

## Production isolation

All C0197 shootout-forward tables:

- have RLS enabled;
- revoke anon/authenticated access;
- are append-only;
- enforce `research_only=true`;
- enforce `model_effect_enabled=false`.

No production Poisson, correct-score, matchup, FPL or A0005/W0002 state is modified by this branch.

## Decision

`FORWARD_SHADOW_REGISTERED_NO_PRODUCTION_EFFECT`

The correct next evidence is forward 2026/27 outcomes. Do not retrospectively alter the frozen score based on GW3 results.