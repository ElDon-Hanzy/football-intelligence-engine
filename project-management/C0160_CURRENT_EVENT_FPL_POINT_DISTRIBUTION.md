# C0160 — Current-event FPL point distribution and genuine haul tails

Date: 2026-09-01
Status: Production verified
Parent: C0150

## Decision

The user approved replacing inherited/shifted haul probabilities with quantities calculated from the current target fixture.

C0160 therefore stops deriving `P5+`, `P10+`, `P15+`, `P20+` and ceiling/floor by shifting frozen historical tail outputs. Instead it constructs a normalized discrete FPL point distribution from current event quantities, then derives the tails and quantiles from that distribution.

## Current-event distribution

For each player and target fixture the distribution uses:

- current expected minutes, start probability and appearance probability;
- target-fixture goal lambda from C0150 event conditioning using the current team fixture lambda;
- target-fixture assist lambda;
- opponent goal lambda / clean-sheet probability;
- Defensive Contributions probability;
- bonus probability;
- position-specific FPL scoring.

Minutes are represented as three states: no appearance, under 60, and 60-plus. The 60-plus representative minutes are calibrated from current xMin; the under-60 state uses a 20-minute representative appearance.

Goals are Poisson-distributed with 4+ collapsed into the 4-goal bucket. Assists are Poisson-distributed with 3+ collapsed into the 3-assist bucket. Clean-sheet points are available only in the 60-plus state. DC is represented as a +2 Bernoulli event conditional on appearance. Any-bonus probability is split across 1/2/3 bonus points using the existing 50%/40%/10% conditional assumption.

The current implementation still omits explicit card, own-goal, penalty-miss/save, goalkeeper save-point variance and exact goals-conceded deduction distributions. Their expected contribution is therefore carried by a transparent, appearance-conditional discrete residual so that the distribution mean reconciles to current expected points. This limitation is recorded in every player's `point_distribution.assumptions` field and is not treated as observed zero.

## Derived quantities

Directly from the normalized distribution:

- `P(blank)` = probability of **3 FPL points or fewer**;
- `P(5+)`;
- `P(10+)`;
- `P(15+)`;
- `P(20+)`;
- q25 / q50 / q75 / q90 / q95;
- modal FPL score;
- conditional mean if 5+;
- conditional mean if 10+.

`ceiling_score` is now q90 and `floor_score` is q25. The full probability mass function is persisted under `features.point_distribution` with `tail_semantics=direct_current_fixture_event_distribution`.

The blank definition was explicitly corrected during QA. The first generated test run treated blank as <5, which made `P(blank)+P(5+)=1`. That run was not accepted as verified. The production definition is now <=3, leaving a legitimate 4-point middle state.

## Fixture dependency

C0160 consumes the latest chronology-valid fixture prediction snapshot. For GW3, all 10 latest fixture snapshots were C0159 production snapshots at verification time, so C0160's goal/assist/clean-sheet event quantities inherit the newly promoted pre-match fixture intelligence rather than the stale structural-only lambda.

## GW3 production verification

Verified run: `gameweek_prediction_runs.id=1250`
Generated: 2026-09-01 01:28:43 UTC
Rows: 600
Formation from the mechanical optimizer: 3-5-2
Mechanical captain: Mbeumo
Mechanical vice: Bruno Fernandes

QA across all 600 player rows:

- invalid probability rows: 0;
- non-monotone haul-tail rows: 0;
- blank/5+ overlap rows: 0;
- all 600 rows use distribution version `current_fixture_event_distribution_v0.3_blank_le3`;
- maximum absolute difference between distribution mean and expected points: < 0.0000005;
- target-gameweek actual-data rows: 0;
- historical forecasts rewritten: false.

Selected GW3 outputs from run 1250:

| Player | xPts | P(blank) | P5+ | P10+ | P15+ | P20+ | q90 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Mbeumo | 6.735 | 0.3295 | 0.5919 | 0.2319 | 0.0637 | 0.0132 | 13 |
| Bruno Fernandes | 6.585 | 0.2876 | 0.6264 | 0.2252 | 0.0517 | 0.0084 | 12 |
| Haaland | 6.556 | 0.2856 | 0.6277 | 0.2245 | 0.0442 | 0.0047 | 12 |
| O'Reilly | 6.319 | 0.2665 | 0.6697 | 0.1544 | 0.0273 | 0.0034 | 12 |
| Tzolis | 4.775 | 0.4774 | 0.4276 | 0.0856 | 0.0104 | 0.0009 | 9 |
| João Pedro | 4.171 | 0.5641 | 0.3535 | 0.0577 | 0.0043 | 0.0002 | 8 |
| Palmer | 3.541 | 0.6748 | 0.2509 | 0.0314 | 0.0025 | 0.0001 | 7 |

These are model outputs, not a final manager-plan recommendation. The mechanical captain/vice result must still pass the normal Decision-Control and Noise-Control adjudication before replacing an authoritative manager plan.

## Integrity

- Prospective GW3+ only.
- Frozen historical FPL projections remain immutable.
- C0150's stable nonrolling event anchor is retained for calibration, but old tail probabilities are not inherited.
- Missing event families are explicitly documented.
- Full distribution and assumptions are auditable per player.
