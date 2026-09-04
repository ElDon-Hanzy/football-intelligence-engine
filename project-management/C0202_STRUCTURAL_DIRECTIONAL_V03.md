# C0202 — Structural Directional Matchup v0.3

## Scope
Build the next layer after C0202 V02 exact-side inference: test whether pre-kickoff structural same-flank evidence adds a robust FPL signal, then persist a clear directional evidence framework for forward shadow use.

Production xPts remains unchanged. All V03 evidence is append-only, research-only and `model_effect_enabled=false`.

## Historical benchmark design
Season: 2025/26 Premier League.

Target population:
- MID/FWD starters with >=60 minutes in the target match
- previous three starts unanimously resolve to the same exact side
- prior-three median average-position x >=55 to retain genuinely advanced/wide attackers

Target:
- next-match xGI/90 residual versus the player's own prior-five-start xGI/90 baseline

All predictors use only matches before the target kickoff.

Pre-kickoff structural features tested:
- opponent same-flank personnel instability across previous three matches
- opponent formation instability across previous three matches
- opposing flank defender average x position
- opposing flank defender dribbled-past/90
- opposing flank defender ground-duel vulnerability
- attacker dribble rate × defender dribbled-past interaction
- attacker dribble rate × defender ground-duel vulnerability
- opponent back-three rate

Primary opposing flank defender definition: FPL Defender, strict exact-side average position, most advanced average x in that team-match. For an ATT_LEFT attacker the faced defender is the opponent's right-sided defender, and vice versa.

## Train / holdout result
Train GW4–25: n=302.
Holdout GW26–38: n=163.

| Feature | Train corr with xGI residual | Holdout corr |
| --- | ---: | ---: |
| Personnel instability | -0.046 | -0.047 |
| Formation instability | +0.133 | +0.008 |
| Flank defender avg_x | -0.069 | -0.030 |
| Dribbled-past/90 | -0.050 | +0.082 |
| Ground-duel vulnerability | -0.143 | -0.041 |
| Dribble mismatch | -0.078 | -0.003 |
| Duel mismatch | -0.061 | -0.021 |
| Back-three rate | -0.060 | +0.069 |

No candidate demonstrates a robust, directionally stable positive attacking edge. Several apparent train effects collapse or flip in holdout.

## Oracle ceiling diagnostic
To test whether structural changes are worth predicting at all, V03 also ran a deliberately post-match-only oracle diagnostic using the *actual* target-match flank defender and formation. These labels are never eligible as forward predictors.

Actual same-flank defender change versus prior-three mode:
- Train: n=298; changed residual +0.092 vs same -0.015
- Holdout: n=156; changed residual -0.060 vs same -0.041

Actual formation change versus prior-three mode:
- Train: n=302; changed residual +0.080 vs same -0.014
- Holdout: n=163; changed residual -0.036 vs same -0.056

Conclusion: even the oracle target-match change does not show a stable attacking uplift. Therefore a generic rule such as “new full-back = winger boost” or “formation change = attack that flank” is rejected.

## Forward shadow framework
Decision:

`PROMOTE_STRUCTURED_DIRECTIONAL_EVIDENCE_TO_FORWARD_SHADOW; REJECT_GENERIC_PERSONNEL_FORMATION_XPTS_EFFECT`

V03 stores an explicit perspective for each resolved-side expected-XI wide player:
- attacking team
- defending team
- attacker
- attacker role
- ATT_LEFT / ATT_RIGHT
- faced DEF_RIGHT / DEF_LEFT
- expected exact-side opposing wide defender where resolvable
- side-confidence band and empirical side reliability
- mapping quality
- team-level wide-channel context
- defending-team personnel-disruption context
- explicit `effect_direction`

Crucially, `effect_direction` remains `UNRESOLVED` unless a specific future matchup archetype is independently validated. Team-level context is not silently converted into a left/right or player-level advantage.

## GW3 frozen forward snapshot
Evidence cutoff: `2026-09-04T17:30:00Z`.

Latest source observations used:
- role source: `2026-09-04T08:20:08.993806Z`
- tactical context source: `2026-09-04T08:20:12.953210Z`

Both are pre-deadline.

Snapshot:
- 33 resolved-side expected-XI wide players
- 11 paired to an exact-side expected opposing WIDE_BACK/WING_BACK
- 22 left `UNRESOLVED_EXACT_OPPONENT`
- 9 HIGH mapping-quality pairs
- 33/33 `effect_direction = UNRESOLVED`
- 0 chronology violations
- 0 model-effect violations
- 0 research-only violations

Examples:
- O'Reilly: ATT_LEFT / HIGH; faces Coventry DEF_RIGHT; exact opposing player unresolved; no effect claim.
- Semenyo: ATT_RIGHT / MEDIUM; faces Coventry DEF_LEFT; exact opposing player unresolved; no effect claim.
- Saka: ATT_RIGHT / HIGH; faces Chelsea DEF_LEFT; exact opposing player unresolved despite Chelsea team-level personnel disruption; no effect claim.
- Neto: ATT_RIGHT / HIGH; paired to Calafiori on Arsenal DEF_LEFT; mapping HIGH; effect still unresolved.
- Calafiori: ATT_LEFT / HIGH; paired to Gusto on Chelsea DEF_RIGHT; mapping HIGH; effect still unresolved.

## Semantics improvement
The older matchup output could show something like “Personnel Continuity — material disruption — 61% confidence” without saying who was disrupted or who benefited.

V03 fixes that structurally. A stored observation now always identifies the attacking perspective and defending side. A team-level disruption score is labeled as defending-team context. It cannot be read as an attacking boost unless `effect_direction` explicitly says so.

## Next valid research step
Do not fit another generic flank multiplier.

Accumulate forward outcomes by *specific matchup archetype* using V03 snapshots, for example:
- high-confidence winger versus high-confidence opposing full-back
- winger versus wing-back
- attacking full-back versus winger/wing-back
- same-side pair under team-level high/low wide pressure
- specific predicted personnel absence/replacement once trustworthy side-specific predicted-XI evidence exists

Require repeated forward samples and sensitivity stability before any xPts adjustment. Missing exact opponent remains unresolved rather than inferred from team-level disruption.