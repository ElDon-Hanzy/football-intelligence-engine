# C0202 — Flank Matchup Shadow v0.1

## Objective
Build an auditable research layer for opponent flank weakness × predicted player side/role without changing production FPL xPts until an out-of-sample edge is demonstrated.

## Coordinate semantics
C0197 shot evidence contains `start_x` / `start_y`. The lateral axis was sanity-checked against known wide players:
- low-Y clusters with known attacking-left / left-back profiles (e.g. Doku, Gakpo, Grealish, Ait-Nouri, Kerkez, Robinson)
- high-Y clusters with known attacking-right / right-back profiles (e.g. Saka, White)

Therefore for normalized attacking coordinates:
- low-Y = attacking left = defending team's right flank
- high-Y = attacking right = defending team's left flank

This mapping is valid for shot location only. It must not be confused with chance-creation origin.

## Player-side inference v0.1
For each GW3 expected-XI player who passes the strict wide-role gate:
- primary role must be WIDE_BACK, WING_BACK, WIDE_ATTACKER or WIDE_FORWARD; or primary role UNRESOLVED with a wide secondary role
- use the latest 20 shots strictly before the GW3 deadline/evidence cutoff
- minimum five prior shots
- median Y <45 => ATT_LEFT
- median Y >55 => ATT_RIGHT
- 45–48 => LEFT_LEAN
- 52–55 => RIGHT_LEAN
- 48–52 => MIXED
- <5 prior shots => UNRESOLVED

No calibrated side-confidence probability is emitted yet. Generic role archetypes are not treated as exact tactical side assignments.

GW3 frozen snapshot: 63 strict wide-role candidates. O'Reilly = MIXED, 20 prior shots, median Y 48.25. Therefore historical shot geometry does not justify hard-labeling him left or right for GW3.

## Candidate defensive-flank signals tested
All tests used 2025/26 Premier League C0197 evidence with walk-forward chronology where specified.

### 1. Recent shot-xG concession by flank
Previous-five flank differential -> next-match flank differential:
- n = 660 team-matches
- correlation = -0.030
- direction accuracy = 48.9%

Decision: REJECT.

### 2. Raw xGI conceded to left/right attackers
Player side assigned from prior shot geometry:
- n = 660
- correlation = 0.050
- direction accuracy = 52.0%
- large-gap accuracy = 50.0%

Decision: REJECT.

### 3. Opponent-quality-adjusted excess xGI
Subtract each attacker's own prior-five-match xGI/90 baseline before aggregating by side:
- n = 591
- correlation = 0.042
- direction accuracy = 52.5%
- large-gap accuracy = 48.2%

Decision: REJECT.

### 4. Structural side indicators
Prior-five side differences in xA, accurate crosses, chances created and box touches were tested against next-match side xGI. None produced a robust directional edge. Box touches were closest at ~52.1% on the chosen large-gap threshold.

Decision: REJECT as standalone signals.

### 5. Side-level vulnerability × current attacking strength
Side-level recent excess xGI allowed showed a small full-sample relationship:
- n = 995 side-matches
- correlation = 0.081
- high-vulnerability future excess xGI = +0.071
- low-vulnerability future excess xGI = -0.083

However sensitivity/holdout testing showed collapse:
- train GW1–25: corr p3 0.153 / p5 0.127 / p8 0.159
- holdout GW26–38: corr p3 0.015 / p5 0.011 / p8 0.032
- holdout high-vulnerability p5 future excess xGI = +0.054, n=29

Decision: NO PRODUCTION EFFECT. Apparent in-sample persistence does not survive the late-season holdout.

## Coventry motivating case
The user's visual observation concerned chance creation from Coventry's right side. Shot-location evidence demonstrates why C0202 cannot substitute final-shot coordinates for chance origin:
- Arsenal vs Coventry: attacking-left shot xG 0.227; attacking-right shot xG 1.052; central 0.524
- Coventry vs Hull: attacking-left shot xG 0.019; attacking-right 0.116; central 0.588

Thus a goal can be created down one flank and finish centrally or on the opposite half-space. Future C0202 work must capture creation origin / exact player side rather than infer defensive weakness from final-shot location alone.

## Governance decision
C0202 remains research-only, append-only, `model_effect_enabled=false`.

Do not add a generic flank bonus to FPL xPts. Missing or uncertain side data is not zero. The next valid research path is to add reliable pre-kickoff exact-side / formation evidence and chance-origin evidence, then rerun chronology-safe ablation and holdout tests.
