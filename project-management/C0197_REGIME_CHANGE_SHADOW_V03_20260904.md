# C0197 Regime-Change Shootout Shadow V03 — 2026-09-04

Status: research-only shadow experiment. No production model effect.

Run key: `C0197_REGIME_SHADOW_20260904_V03`

## Question

Can pre-match evidence of tactical/system change, attacking-unit personnel change and strong current attacking process tell us when the frozen last-10 shootout history is stale?

This experiment was motivated by the GW2 retrospective miss on Chelsea–Brighton (4–3). It is therefore **not independent validation**. It is a hypothesis-generation replay plus a genuine forward GW3 freeze.

## Base model

Base = frozen C0197 Shootout V02 score.

V01/V02 were not changed.

## Regime overlay

Five components are standardized across the ten fixtures in the Gameweek and equal-weighted:

1. weaker-side current attack-process index;
2. weaker-side attacking box-occupation score from the tactical profile layer;
3. weaker-side projected expected-XI MID/FWD xGI load;
4. larger-side share of projected attacking xGI contributed by players who were at a different/no EPL club in 2025/26;
5. either-side new head coach appointed after the end of 2025/26.

Overlay sensitivities are frozen at 25%, 50% and 75%. No weight is selected from GW2.

Coach-change source: PremierLeague.com, `Manager line-up complete for 2026/27 season`, published 2026-08-05. The source identifies summer changes including Marco Rose/Bournemouth, Xabi Alonso/Chelsea, Pierre Sage/Crystal Palace, Alvaro Arbeloa/Fulham, Gary O'Neil/Ipswich, Andoni Iraola/Liverpool, Enzo Maresca/Manchester City, Matthias Jaissle/Newcastle, Oliver Glasner/Nottingham Forest and Roberto De Zerbi/Tottenham.

## Personnel identity gate

`squad_members.acquired_at` was rejected as transfer evidence because it is an engine initialization timestamp (`GW1 initial squad`), not an actual transfer timestamp.

Instead, stable player identity is compared against C0197 2025/26 player-match evidence:

- determine each player's dominant 2025/26 source team code;
- map the current canonical team to its 2025/26 source team code where available;
- mark expected-XI MID/FWD attacking xGI as changed when the player was at a different EPL club, had no EPL prior, or belongs to a promoted team with no canonical prior code.

This also avoids the known 2026/27 normalized `source_team_code` gap.

## GW2 chronology-correct replay

Cutoff: `2026-08-28T18:59:59Z`, before the first GW2 kickoff.

Actual 7-goal shootouts:

| Fixture | V02 rank | V03 25% | V03 50% | V03 75% |
|---|---:|---:|---:|---:|
| Man Utd 5–2 Ipswich | 3 | 1 | 1 | 2 |
| Chelsea 4–3 Brighton | 10 | 9 | 5 | 3 |

Average rank of the two shootouts:

- V02: 6.50
- BTTS market: 5.50
- Over-2.5 market: 3.50
- V03 25%: 5.00
- V03 50%: 3.00
- V03 75%: 2.50

GW2 had three fixtures with 5+ total goals: Palace–Man City 1–4, Chelsea–Brighton 4–3 and Man Utd–Ipswich 5–2. V03 50% placed all three inside its top five.

This is encouraging but remains retrospective because feature design followed the Chelsea–Brighton miss.

## Why Chelsea–Brighton moved

Pre-GW2 current-process evidence was extreme:

- Brighton: attack-process index 1.60 after a 3.89 xG-equivalent current-state signal and 6 SOT in GW1;
- Chelsea: attack-process index about 1.40 and 6 SOT in GW1.

At the fixture level Chelsea–Brighton had:

- attack-floor z: +2.291
- box-occupation z: +0.323
- projected xGI-floor z: -0.258
- personnel-change z: -0.184
- coach-change z: +0.621

The rescue was therefore mainly **current attacking process**, not squad turnover.

## Why Man Utd–Ipswich moved

Man Utd–Ipswich had a different regime profile:

- attack-floor z: +0.678
- box-occupation z: +1.063
- projected xGI-floor z: -0.925
- personnel-change z: +1.766
- coach-change z: +0.621

The promoted Ipswich attack has no stable 2025/26 EPL team prior, so personnel discontinuity is high. This is a legitimate reason to distrust a historical EPL last-10 prior.

## Leave-one-component-out red team

Using the 50% overlay:

| Fixture | Full | No process | No tactical | No projected xGI | No personnel | No coach |
|---|---:|---:|---:|---:|---:|---:|
| Chelsea–Brighton 4–3 | 5 | 8 | 5 | 4 | 5 | 5 |
| Man Utd–Ipswich 5–2 | 1 | 1 | 1 | 1 | 2 | 1 |
| Palace–Man City 1–4 | 2 | 2 | 2 | 2 | 1 | 2 |

Interpretation:

- current attack-process shock is the only component whose removal materially damages the Chelsea–Brighton rescue;
- coach change alone does not provide meaningful ranking edge here;
- personnel change contributes to Man Utd–Ipswich but is not the sole reason it ranks highly;
- the overlay can detect high-score regimes that are not strict two-way shootouts, as shown by Palace–Man City.

## Genuine GW3 forward freeze

Snapshot: `2026-09-03T23:46:36.498520Z`, before any GW3 kickoff.

All three overlay strengths are frozen; no preferred weight is selected.

| Fixture | V02 | V03 25% | V03 50% | V03 75% | Confidence |
|---|---:|---:|---:|---:|---|
| Ipswich–Liverpool | 2 | 1 | 1 | 1 | LOW |
| Everton–Man Utd | 1 | 2 | 2 | 2 | MEDIUM |
| Newcastle–Bournemouth | 3 | 3 | 3 | 4 | MEDIUM |
| Arsenal–Chelsea | 9 | 8 | 4 | 3 | MEDIUM |
| Fulham–Crystal Palace | 7 | 7 | 5 | 5 | MEDIUM |
| Nott'm Forest–Spurs | 6 | 6 | 6 | 6 | MEDIUM |
| Hull–Aston Villa | 5 | 4 | 7 | 8 | LOW |
| Brighton–Leeds | 4 | 5 | 8 | 10 | MEDIUM |
| Man City–Coventry | 10 | 10 | 9 | 7 | LOW |
| Brentford–Sunderland | 8 | 9 | 10 | 9 | MEDIUM |

The weight sensitivity is real, especially Arsenal–Chelsea (V02 #9 -> V03 #8/#4/#3). Therefore no single V03 ranking should be treated as validated.

## Decision

`PROMISING_RETROSPECTIVE_WEIGHT_SENSITIVE_FORWARD_TEST_REQUIRED`

Keep:

- the regime-change concept;
- current attack-process shock as the strongest candidate mechanism;
- tactical box occupation as structural support;
- projected attacker xGI and personnel discontinuity as supporting evidence;
- coach change as a context/uncertainty flag, not a direct scoring edge.

Do not:

- change V01/V02;
- choose 25%, 50% or 75% based on GW2;
- promote V03 to production;
- add an automatic V03 scheduler yet;
- interpret squad turnover alone as positive attacking change.

Next gate: judge all three frozen V03 variants on GW3 outcomes. If the recommendation changes materially by overlay weight or the apparent lift disappears, classify as no robust edge.