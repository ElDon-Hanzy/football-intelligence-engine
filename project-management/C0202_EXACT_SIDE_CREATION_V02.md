# C0202 — Exact Side + Chance Origin v0.2

## Scope
Build the next C0202 layer after the generic flank-vulnerability hypothesis failed: (1) reliable pre-kickoff player-side inference from historical realized positions, and (2) creator-side chance-origin labels using xA rather than final-shot location.

Production FPL xPts remains unchanged. All new evidence is research-only, append-only and `model_effect_enabled=false`.

## Pinned ground truth
Source: `olbauday/FPL-Core-Insights`, commit `4f9cdaad9c60f62f3c5106753ccdfb6a467dcf04` (2026-09-04 12:13:37Z).

Ingested 2025/26 Premier League:
- 38 lineup captures + 38 average-position captures
- 15,153 lineup rows
- 380/380 matches
- 8,360 starters = exactly 22 per match
- 11,448 average-position rows
- 9,352 rows mapped to a current player identity where possible
- zero research/model-effect violations

These are post-match labels. They may train/validate future inference but must never be used as same-fixture pre-kickoff evidence.

## Coordinate orientation
Average-position `y` is stable across home/away and is not mirrored by venue. It uses a different convention from C0197 shot `start_y`:
- `avg_y <= 35`: attacking RIGHT
- `avg_y >= 65`: attacking LEFT
- middle band: central/mixed, not forced to a flank

Sanity anchors are stable by venue: Saka/B. White cluster near y 16–21 (right), while Doku/Gakpo/Kerkez/Robinson cluster near y 72–86 (left).

## Walk-forward exact-side inference
Target: realized strict LEFT/RIGHT side in a player's next start.
Predictor: median of previous three realized starts only.

Overall resolved cases: 3,037; accuracy 94.5%.

Train GW1–25:
- resolved 1,967; accuracy 94.6%
- previous-three unanimous: n=1,198; accuracy 97.5%

Holdout GW26–38:
- resolved 1,070; accuracy 94.2%
- HIGH confidence (previous three unanimous): n=768; accuracy 97.0%
- MEDIUM confidence (median resolves but not unanimous): n=302; accuracy 87.1%
- formation-change subset: n=333; accuracy 94.0%

Decision: exact-side inference clears the research robustness gate for **forward shadow use**, not production xPts impact.

Forward rule:
- HIGH: previous three starts unanimously LEFT or RIGHT; empirical holdout reliability 97.0%
- MEDIUM: previous-three median resolves to a strict side but is not unanimous; empirical holdout reliability 87.1%
- otherwise UNRESOLVED

Bucket reliability is not an individual calibrated probability.

GW3 post-lock reconstruction across the same 63 strict wide-role candidates:
- 42 resolved
- 30 HIGH confidence
- O'Reilly: ATT_LEFT / HIGH, previous-three median y 79.8, all previous three starts left-sided

O'Reilly's full 2025/26 mapped average-position history: 34 appearances, median y 80.8, 32/34 strict left, 0/34 strict right. This corrects the weaker prior-shot-geometry result that labeled him MIXED; shot location is not player position.

## Chance-origin label
Player xA is attributed to the player's realized strict average-position side. Central/mixed creators are excluded rather than forced to a flank.

Coverage:
- total 2025/26 xA among players with minutes: 680.051
- xA from strict LEFT/RIGHT realized-side players: 388.416
- strict side share: 57.1%

This is a better chance-origin proxy than final-shot coordinates because a chance can be created down one flank and finish centrally or in the opposite half-space.

## Does recent creator-side weakness persist?
No.

Side-specific xA allowed, using previous 3/5/8 matches:

Train GW1–25:
- n=440 team-matches
- corr p3 = +0.081
- corr p5 = +0.073
- corr p8 = +0.060
- strong p5 directional accuracy = 52.4%, n=309

Holdout GW26–38:
- n=260
- corr p3 = -0.018
- corr p5 = -0.047
- corr p8 = -0.127
- strong p5 directional accuracy = 46.9%, n=179

Decision: **REJECT generic recent creator-side vulnerability as a standalone FPL adjustment.**

## Current-season limitation
The pinned 2026/27 GW2 source directory does not yet provide `lineups.csv` or `average_positions.csv`. Therefore current forward exact-side inference must use a hierarchy rather than fabricated current labels:
1. stable historical exact-side prior;
2. current-season observed geometry/role evidence where available;
3. fresh predicted-XI positional evidence when trustworthy;
4. otherwise UNRESOLVED.

## Governance decision
`PROMOTE_EXACT_SIDE_INFERENCE_TO_FORWARD_SHADOW_ONLY; KEEP_FLANK_XPTS_EFFECT_OFF`.

Next valid research step: combine the robust side prior with **structural, pre-kickoff directional evidence** (predicted formation/position, personnel change, and specific matchup observations) rather than recent-flank concessions. Any xPts effect still requires chronology-safe ablation and holdout validation.