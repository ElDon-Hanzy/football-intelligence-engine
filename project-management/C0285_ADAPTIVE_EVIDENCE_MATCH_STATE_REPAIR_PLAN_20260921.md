# C0285 — Adaptive Evidence + Match-State Repair

Date: 2026-09-21 (Dubai)
Status: PLANNED / IMPLEMENTATION NOT AUTHORIZED IN THIS CHAT
Priority: Critical forecasting-quality program

## Objective
Repair a repeated forecasting behavior exposed by the GW5 forensic review: chronology-safe current/recent evidence is often present, but heavy shrinkage/caps can prevent it from moving the final forecast enough; when strong structural and current evidence conflict, the engine can convert genuine uncertainty into false confidence. Separately, a single-lambda / dominant-script representation can underrepresent low-event and high-event match-state tails.

Goal is not to fit GW5 scorelines. Goal is better out-of-sample probabilistic calibration and therefore better FPL player/CS/haul projections.

## Evidence that motivated the program
GW5 forensic examples, using pre-match information only:
- BHA–ARS: Brighton current/recent attack materially stronger than final ~1.07 lambda implied; Arsenal defensive/structural prior dominated; actual 3-0.
- BRE–CHE: Brentford current attack stronger and Chelsea current attack weaker than structural expectation; final forecast remained close; actual 3-0.
- FOR–COV: original close distribution; repaired logic would only modestly change direction. Important control against claiming every miss is structural.
- NEW–HUL: original engine predicted 2-1 and actual was 2-1. Any repair must preserve useful structural priors and must be allowed to perform slightly worse on individual matches.
- LEE–CRY: original combined lambda ~3.17 / O2.5 ~61%; actual 0-0. Indicates possible scoring-environment / scenario-family weakness separate from direction.
- BOU–LIV: original ~1.68–1.68 and high BTTS/O2.5; actual 0-1. Winless/result streak must not be used naively, but tight-game states need more mass.
- MCI–SUN: winner direction correct but Sunderland current/L5 attacking process was far above final ~0.95–1.13 lambda; actual 5-3. Strong example of favorite strength coexisting with opponent scoring/tail risk.

Repeated diagnostic clue in inspected C0166 reason manifests: `outcome_evidence_heavily_shrunk=true`. This is a hypothesis trigger, not proof of causality.

## Core hypothesis
H1: fixed/aggressive shrinkage and bounded evidence adjustments can pull forecasts too strongly toward structural priors when reliable current-season evidence disagrees.
H2: disagreement is often collapsed into a single confident forecast instead of increasing uncertainty/tail mass.
H3: independent team lambdas / dominant scripts do not sufficiently model match-state compatibility, tactical interaction and scoring-environment regimes.

Must attempt to falsify H1–H3 before production promotion.

## Non-goals / anti-overfit rules
- Do not simply increase recent-form weight.
- Do not use final GW5 scores, post-match xG or realized lineups to construct pre-match features.
- Do not tune per club or per highlighted fixture.
- Do not make W/D/L streaks direct strong predictors without process support.
- Do not rewrite historical snapshots.
- Do not bypass C0213, C0248, C0276, C0281 or C0284 governance.
- C0265 remains untouched.
- Current C0284 production lineage remains authoritative until C0285 passes promotion gates.

## Proposed architecture
Structural prior
→ chronology-safe Current Team State
→ expected-XI/personnel state
→ tactical matchup interactions
→ adaptive evidence reconciliation
→ contradiction/regime gate
→ match-state/scenario mixture
→ lambda / 1X2 / totals / BTTS / CS / scoreline tails
→ player projection distribution
→ existing FPL optimizer/governance.

### P0 — Baseline freeze and exact lineage
1. Identify exact canonical consumed pre-kickoff fixture snapshots for GW1–GW5 and resolve duplicate snapshot variants.
2. Freeze baseline metrics and definition hashes.
3. Confirm no target-match leakage.
4. Preserve C0284 as production control.
Acceptance: reproducible baseline dataset and exact lineage map.

### P1 — Falsification audit: shrinkage behavior
Across every chronology-safe fixture available GW1–GW5, calculate:
- structural lambda before current evidence;
- signed current/recent evidence;
- pre-cap/raw adjustment;
- applied adjustment;
- shrinkage ratio;
- final lambda;
- evidence disagreement magnitude/reliability.
Test whether heavy suppression improves or worsens held-out log score, Brier, lambda/goal calibration, totals, BTTS and CS calibration.
Segment by sample size, promoted/newly promoted teams, structural-current agreement/disagreement, home/away, favorite strength.
Acceptance: H1 survives only if repeated and statistically/materially harmful. Otherwise retire/limit C0285.

### P2 — Adaptive evidence reconciliation shadow
Replace fixed behavior in shadow only with reliability-dependent shrinkage. Reliability factors include sample size, recency, opponent adjustment, metric agreement, process consistency, personnel continuity and uncertainty. Structural prior remains strong when evidence is sparse/noisy.
Output posterior plus explicit contribution ledger.
Acceptance: chronological improvement versus baseline without material calibration regression in control cohorts such as NEW–HUL-type cases.

### P3 — Contradiction / uncertainty gate
Trigger when final forecast materially contradicts multiple reliable independent inputs. Gate does NOT force lambda toward recent form. It must require an explanation for suppression; absent strong justification, reduce confidence and widen distributions/scenario weights.
Persist: trigger reason, conflicting inputs, justification, confidence delta, tail delta.
Acceptance: deterministic, definition-hash bound, chronology safe.

### P4 — Team-State model shadow
Build process-based state, not result-form:
- opponent-adjusted xG/npxG/xGA trajectory;
- big chances and shots-in-box quality/volume where chronology-safe;
- attacking/defensive consistency and acceleration vs structural baseline;
- transition/territorial/box-entry signals only where source quality supports them;
- expected-XI/role/personnel continuity.
States: stable / improving / deteriorating / possible regime change / uncertain.
No direct numeric production effect until validated.

### P5 — Tactical matchup interaction shadow
Model weapon × vulnerability only for features supported by reliable data: transition attack vs space/high line, press vs build-up resistance, wide overload vs full-back exposure, aerial/physical striker vs CB profile, set-piece attack vs aerial/set-piece defence, central combination threat vs midfield structure.
Missing data stays unknown, never zero. Generic narrative tags cannot move production numbers.

### P6 — Scoring-environment + scenario-family model
Separate match environment from two independent lambdas. Candidate scenario families:
- controlled favorite;
- favorite + BTTS;
- open/high-event;
- competitive/draw;
- low-event/stalemate;
- upset.
Scenario probabilities must sum coherently and produce calibrated mixture distributions. Avoid double counting signals already embedded in lambdas.

### P7 — Chronological validation
Use rolling/forward validation, never random leakage-prone split. At minimum GW1→GW5 replay plus any earlier compatible historical seasons/data where definitions are identical and chronology-safe.
Primary metrics:
- 1X2 multiclass log loss and Brier;
- Poisson/deviance or proper goal-distribution score;
- O/U and BTTS log/Brier;
- CS calibration;
- probability calibration curves / ECE where sample permits;
- tail calibration P(team 2+/3+/4+ goals);
- exact-score metrics diagnostic only, not optimization target.
FPL downstream:
- player xPts calibration;
- blank/5+/10+/15+/20+ calibration;
- defender CS/DC/bonus consequences;
- captaincy distribution changes.
Report confidence intervals / bootstrap uncertainty where sample permits. If differences fall within model error: NO_MEANINGFUL_EDGE.

### P8 — Ablation and red-team
Compare:
A baseline C0284/current production;
B adaptive shrinkage only;
C B + contradiction gate;
D C + Team State;
E D + matchup;
F E + scenario model.
Promote the simplest variant with robust edge. If B/C capture most gain, do not build/promote unnecessary complexity.
Red-team for recency chasing, promoted-team sample artifacts, correlated feature double-counting, calibration deterioration, favorite underconfidence, and post-hoc GW5 fitting.

### P9 — Shadow prospective gate
Run chosen candidate prospectively with zero production effect for a bounded period (initially through the next settled GW; extend only with explicit statistical justification). Store forecasts before kickoff and adjudicate after settlement.
No threshold retuning during the prospective window.

### P10 — Promotion and integration
Only after C0213 behavioral proof + prospective evidence + no material regression:
- assign new model/version/definition hashes;
- integrate fixture probabilities upstream of player projections;
- rerun player/FPL calibration;
- confirm C0248 optimizer behavior, captaincy, chips and ROLL comparisons;
- canary/shadow deployment with rollback to C0284 lineage;
- publish only after existing C0276/C0281/C0284 gates pass.

## Promotion criteria
No single fixture can authorize promotion. Candidate must show robust aggregate improvement in proper probabilistic scores and no material degradation in key calibration cohorts. Directional accuracy/winner hit rate is secondary. Actual-score matching is not a target.

Promotion requires:
1. chronology-safe lineage and no leakage;
2. aggregate proper-score improvement outside normal model error;
3. calibration not materially worse;
4. improvement survives ablations/sensitivity ranges;
5. no dependence on one GW or highlighted fixtures;
6. downstream FPL projections improve or remain neutral after recalibration;
7. prospective shadow evidence supports historical result;
8. rollback tested.

## Failure / stop conditions
- H1 fails falsification → do not implement adaptive shrinkage broadly.
- Improvement disappears under reasonable parameter choices → NO_MEANINGFUL_EDGE.
- Scenario model adds complexity without proper-score gain → reject it.
- Tactical features are narrative/unreliable → keep diagnostic only.
- Any leakage or lineage ambiguity → fail closed.

## Required persistence
Supabase: register C0285 tracker/program record and phase/evidence records using existing tracker schema; store definition hashes, baseline/candidate metrics, ablations and prospective forecasts append-only. Do not create schema until existing tracker conventions are inspected.
GitHub: this canonical plan; update PROJECT_STATE.md, DECISIONS_AND_HISTORY.md and skills/fie/SKILL.md only with appropriate planned-state language. Implementation evidence and closeout added later.

## Implementation authorization state
Planning and persistence are authorized by user request. Production implementation is intentionally deferred to a new ChatGPT Work environment prompt after all planning records are saved. Work must inspect live GitHub/Supabase first and reconcile concurrent C0284 progress before changing anything.