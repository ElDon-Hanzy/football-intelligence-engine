# C0279 — Season-State, Score-Family & Player-Upside Integration Program

**Status:** In Progress  
**Delivery stage:** P7 completed / P8 pending  
**Priority:** Critical  
**Date:** 2026-09-17  
**Parent architecture:** C0213, C0166, C0248, C0276  
**Production effect:** None until shadow validation, consumption proof and explicit promotion  
**Protected state:** historical forecasts append-only; C0265 unchanged; C0240 concurrency unchanged; no external FPL execution

## 1. Demonstrated failures

C0279 responds to material live defects, not a speculative model expansion:

1. Leeds–Crystal Palace displayed mirrored tactical statements: each team was described as suppressed in favor of the other. The underlying signed effects were different in magnitude, but the modal hid scope, magnitude and net effect.
2. Legacy C0147/C0159 cross-season L10 inputs remain active production inputs and can bypass the intended current-season team-state hierarchy.
3. Brentford–Chelsea had a high-event forecast (3.31 total lambda, 64.3% over 2.5, 65.4% BTTS), but the single largest Poisson cell, 1–1, became the headline and obscured the more representative high-scoring family.
4. Fixture scoring environments do not propagate explicitly into player conditional returns, captaincy nominations and chip opportunity-cost evaluation.
5. The viewer cannot reliably reconstruct the engine decision from the matchup modal because material inputs, conflicts and net contributions are not consistently reconciled.

Diagnostic fixtures: GW5 Leeds–Crystal Palace (match 45) and Brentford–Chelsea (match 41).

## 2. Objective

Create one canonical, auditable calculation chain:

```text
canonical season-weighted team state
→ orthogonal structural / tactical / availability modifiers
→ fixture lambda and probability distribution
→ primary scoring environment
→ score-family / match-script distribution
→ team goal-state probabilities
→ conditional player return distributions
→ captaincy nomination / selection
→ chip opportunity-cost gates
→ calculation-faithful matchup modal
```

This program changes calculations across the engine and their presentation. It is not a display-only repair and must not create a parallel decision authority.

## 3. Canonical season-state policy

Only current-season versus previous-season **performance evidence** receives a blend weight.

| Completed current-season league matches | Current season | Previous season |
|---:|---:|---:|
| 1 | 40% | 60% |
| 2 | 55% | 45% |
| 3 | 65% | 35% |
| 4–5 | 75% | 25% |
| 6 | 80% | 20% |
| 7 | 85% | 15% |
| 8 | 90% | 10% |
| 9+ | 100% | 0% |

Rules:

- Previous-season performance is capped at 25% from four completed current-season matches.
- Previous-season performance becomes exactly 0% from nine completed current-season matches.
- Structural and matchup variables are orthogonal modifiers and do not consume the season-blend allocation: venue, opponent strength, squad changes, manager/system changes, availability, congestion and tactical interaction.
- Stable non-performance metadata is not mislabeled as previous-season performance.
- Current-season inputs should be opponent-adjusted where the data supports it: xG/xGA, non-penalty xG, shots, shots in the box, big chances, chance quality and goals as a bounded finishing/residual signal.
- Missing evidence is unknown, never zero.

### L10/L20 prohibition and audit scope

- L20 is searched only to identify, document and remove/neutralize inherited consumers. **L20 must not be introduced or restored as an input.**
- Cross-season L10 must not remain an independent production input.
- Before ten current-season matches, a label such as “L10” is prohibited. The engine must expose the actual current-season sample and the explicit prior-season blend.
- At nine or more current-season matches, prior-season performance contribution is 0%.
- Legacy C0147/C0159/C0166 reason manifests cannot bypass this contract.
- The active-consumer audit must map L5/L10/L20 dependencies solely to eliminate opaque cross-season leakage, not to regress the engine to longer rolling windows.

## 4. Recent acceleration / regime detection

Add a bounded, falsifiable acceleration layer comparing the last two matches with the current-season baseline while controlling for opponent quality, chance creation, shot quality, tactical/personnel changes and finishing variance.

Classify observed acceleration as:

- process improvement;
- finishing-only spike;
- tactical regime change;
- weak-opponent inflation;
- unexplained noise.

A two-match sequence may adjust uncertainty and distribution tails, but cannot replace the canonical baseline by itself.

## 5. Scoring environment and score-family hierarchy

Every fixture first receives a **primary scoring environment**:

- LOW_SCORING
- NORMAL_SCORING
- HIGH_SCORING

It then receives one or more match-script subtypes:

| Primary environment | Subtypes |
|---|---|
| Low scoring | stalemate, narrow win, defensive control |
| Normal scoring | balanced draw, conventional narrow win |
| High scoring | high-scoring draw, shootout, attacking dominance, demolition |

Shootout and demolition are explicitly high-scoring subtypes; they are not peer categories outside the low/normal/high hierarchy.

Classification consumes the full probability distribution, including total expected goals, BTTS, goal bands, both-team scoring tails, tactical compatibility, defensive weakness, availability and game-state volatility.

## 6. Score-family selector

Exact-score cells must be aggregated into representative football families before a headline is selected:

- low-scoring parity;
- high-scoring parity;
- narrow home win;
- narrow away win;
- comfortable home win;
- comfortable away win;
- shootout;
- demolition.

The raw modal cell remains visible as a statistical reference but does not automatically become the headline.

A headline score must:

1. belong to a representative leading family;
2. reflect the primary scoring environment;
3. remain coherent with the directional call;
4. disclose uncertainty when direction and score family conflict.

For Brentford–Chelsea, a high-scoring environment with a weak Brentford edge must not be summarized solely as 1–1 merely because it is the largest isolated Poisson cell.

## 7. Conditional player-return bridge

For every projected player, calculate returns conditional on team goal state:

- P(return | team goals = 0, 1, 2, 3, 4+);
- conditional goal and assist involvement;
- P(blank), P(5+), P(10+), P(15+), P(20+);
- bonus and Defensive Contributions interaction;
- expected minutes, start probability and substitution risk;
- penalties, set pieces and tactical role.

Team and player distributions must reconcile: allocated player scoring and assist probabilities cannot imply more attacking events than the fixture/team distribution.

High-scoring fixture families increase priority for high-involvement players, but do not automatically select them.

## 8. Captaincy and chip integration

A player enters the captaincy shortlist when:

- the fixture has a favorable scoring family;
- conditional involvement is high;
- xMins/start and role gates pass;
- haul probabilities are competitive;
- the nomination survives uncertainty and Noise-Control.

Captain selection must compare the full XV and all named challengers. Triple Captain requires the existing C0277 opportunity-cost and reservation-value contract, strong minutes security, robust superiority across plausible match scripts and a material incremental edge over ordinary captaincy and future chip windows.

A high-scoring Chelsea family can nominate João Pedro, but cannot automatically award captaincy or Triple Captain.

## 9. Decision-Evidence Contract

The matchup modal must allow a knowledgeable viewer to assess the engine decision from the facts provided.

### 9.1 Modal order

1. **Engine conclusion:** scoring environment, direction/strength, expected-goal range, BTTS/goal-band probabilities, representative score family, confidence and uncertainty.
2. **Why the engine reached it:** only material, chronology-safe inputs actually consumed by production.
3. **Counterpoints / risks:** genuine evidence that weakens or could invalidate the conclusion.
4. **Evidence reconciliation:** plain-language explanation of how conflicting inputs were weighted and why the net conclusion survived.
5. **Player implications:** which player profiles benefit, subject to xMins/role/involvement gates.
6. **Additional context:** research-only information, explicitly labeled as zero production effect.

### 9.2 Evidence gates

Every displayed decision fact must be:

- chronology-safe;
- calculation-linked;
- material;
- current under the season-state policy;
- distinct rather than duplicated;
- directionally correct;
- written in clear football language;
- traceable to value, sample, source, weight and signed contribution.

### 9.3 Contradiction and materiality control

The evidence auditor must reject:

- mirrored same-family claims that appear to favor both teams;
- opposite wording generated from identical inputs;
- support that mathematically weakens the selected conclusion;
- risk that mathematically strengthens it;
- opaque cross-season L10/L20 claims;
- facts inconsistent with the scoring environment;
- material calculations omitted from the explanation;
- immaterial adjustments promoted into headline evidence;
- research-only context presented as a production reason.

When both teams have signed adjustments, show the net effect and material magnitudes. Example:

> The tactical layer reduced both teams’ scoring estimates, but Crystal Palace’s reduction was larger; the net effect marginally favored Leeds.

If the net effect is below the registered materiality threshold, omit it from decision evidence.

### 9.4 Viewer-assessment acceptance test

From the modal alone, the viewer must be able to answer:

- What does the engine expect?
- Is the fixture low, normal or high scoring?
- Which side, if any, has the advantage?
- What are the strongest supporting facts?
- What could make the prediction wrong?
- How recent and reliable is the evidence?
- How were conflicts resolved?
- Why was this score family selected?
- Which players benefit and why?

A decision-ready forecast fails closed if the explanation is incomplete, contradictory or unfaithful to the active calculation.

## 10. Implementation phases and gates

### P0 — Freeze and active-consumer audit — COMPLETED / VERIFIED

- Freeze current GW5 fixture predictions, player projections and FPL recommendations.
- Preserve the two diagnostic fixtures.
- Map every consumer of team state, L5/L10/L20, lambda, scorelines, player distributions, captaincy and chips.
- Identify duplicate/inherited C0147/C0159/C0166 paths.
- No production behavior change.

**Gate:** complete behavioral consumption map; no unidentified production path.

### P1 — Canonical season-state contract — COMPLETED / VERIFIED

- Implement the explicit weight schedule.
- Separate orthogonal structural modifiers.
- Block cross-season L10/L20 bypasses.
- Expose actual samples, season weights and lineage.

**Gate:** one versioned state consumed everywhere; chronology and missing-data tests pass.

### P2 — Acceleration/regime shadow — COMPLETED / VERIFIED

- Add bounded two-match acceleration classification.
- Run perturbation, opponent-quality and finishing-regression tests.

**Gate:** isolated results cannot dominate; persistent process changes are detectable.

### P3 — Scoring-environment shadow — COMPLETED / VERIFIED

- Produce low/normal/high classification and subtype probabilities.

**Gate:** chronology-safe calibration for total-goal bands and BTTS without unacceptable 1X2 degradation.

### P4 — Score-family shadow selector — COMPLETED / VERIFIED

- Aggregate exact scores by family.
- Select representative headline and preserve raw modal cell.

**Gate:** improved family/goal-band calibration and coherent headline behavior.

### P5 — Conditional player-return bridge — COMPLETED / VERIFIED

- Propagate team-goal states into reconciled player outcome distributions.

**Gate:** team/player probability conservation, xMins/role gates and tail calibration pass.

### P6 — Captaincy/chip consumption — COMPLETED / VERIFIED

- Add score-family-aware nominations to the existing captaincy process.
- Feed TC evidence into C0277 without creating a new chip authority.

**Gate:** whole-XV comparison, named challengers, opportunity cost, red-team and Noise-Control remain binding.

### P7 — Matchup modal and Decision-Evidence Contract — COMPLETED / VERIFIED

- Implement conclusion → support → risk → reconciliation → player implications.
- Add automated contradiction, materiality and traceability audits.

**Gate:** diagnostic fixtures and full current-GW suite pass viewer-assessment tests.

### P8 — Shadow evaluation

- Chronological prior-season backtest.
- Leakage-free GW1–GW4 replay.
- Frozen prospective GW5+ shadow evaluation.
- Compare 1X2 Brier/log loss, total-goal and BTTS calibration, score-family accuracy, exact-score probability, player error, haul-tail calibration, captaincy regret and chip false positives.

**Gate:** stable value beyond uncertainty; negative evidence retained.

### P9 — Promotion and reconciliation

Promotion requires:

- no leakage;
- no broken or parallel consumers;
- definition-hash-bound behavioral proof;
- green C0213 architecture/tracker governance;
- no material degradation in core prediction;
- improved scoring-environment and player-tail performance;
- complete rollback path;
- explicit promotion authorization.

After promotion reconcile Supabase registry/tracker, GitHub canonical docs, FIE skill and consumer UI. Historical predictions remain unchanged.

## 11. Anti-over-engineering and authority

C0279 consolidates demonstrated defects into the existing forecast/player/captaincy chain. It does not create:

- a second fixture authority;
- a second player projection core;
- a second captaincy selector;
- a second chip selector;
- an external execution path.

C0248 remains the sole sequential selected-path authority. C0277 remains the chip opportunity-cost supporting gate. C0234/C0276 remain fail-closed final authorization. Research/shadow output has zero production effect before promotion.

## 12. Initial acceptance artifacts

- Active-consumer and dependency map.
- Canonical season-state specification and test vectors.
- L5/L10/L20 leakage inventory with disposition.
- Diagnostic fixture golden tests for matches 41 and 45.
- Scoring-environment and score-family taxonomy.
- Player/team probability reconciliation suite.
- Captaincy/TC consumption proof.
- Decision-Evidence Contract audit suite.
- Chronological shadow evaluation report.
- Promotion/rollback closeout.

## 13. Progress ledger

- **P0 completed 2026-09-17:** GW5 fixture/player/team-fact evidence frozen by immutable IDs and hashes; canonical C0159 cross-season L10 production bypass identified; C0166 cross-season L5 path identified; L20 confirmed zero direct production effect; forecast-to-player/captaincy chain mapped; no production behavior changed. Closeout: `project-management/C0279_P0_FREEZE_AND_ACTIVE_CONSUMER_AUDIT_CLOSEOUT_20260917.md`.
- **P1 completed 2026-09-17:** implemented private versioned chronology-safe shadow season-state functions with the approved 0–10 sample weight schedule, explicit sample/weight/lineage exposure, missing-data fail-closed behavior, orthogonal modifier separation and L5/L10/L20 exclusion. Both diagnostic fixtures passed; C0159/C0166 remained unchanged; zero production effect. Closeout: `project-management/C0279_P1_CANONICAL_SEASON_STATE_CLOSEOUT_20260917.md`.

- **P2 completed 2026-09-17:** implemented chronology-safe opponent-adjusted two-match acceleration classification with finishing-residual, weak-opponent, persistence, uncertainty and tail-only controls. Leeds classified as process improvement; Palace as finishing-only; all perturbation tests passed; baseline replacement prohibited; zero production effect. Closeout: `project-management/C0279_P2_BOUNDED_ACCELERATION_REGIME_CLOSEOUT_20260917.md`.

- **P3 completed 2026-09-17:** implemented full-matrix LOW/NORMAL/HIGH scoring-environment shadow with normalized memberships, goal bands and subtype probabilities. Shootout/demolition are HIGH children; missing matrices fail closed; raw modal scores are diagnostic. Brentford–Chelsea and Leeds–Palace classify HIGH/SHOOTOUT despite raw 1–1 modes. Closeout: `project-management/C0279_P3_SCORING_ENVIRONMENT_SHADOW_CLOSEOUT_20260917.md`.

- **P4 completed 2026-09-17:** implemented a fail-closed full-matrix score-family selector that preserves the raw modal cell, enforces LOW/NORMAL/HIGH environment eligibility, selects a direction-aware representative headline and discloses weak/conflicting direction. Brentford–Chelsea and Leeds–Palace both resolve to SHOOTOUT / 3–2 while retaining raw 1–1 references; family probabilities reconcile; full GW5 and boundary suites passed; zero production effect. Closeout: `project-management/C0279_P4_SCORE_FAMILY_SHADOW_SELECTOR_CLOSEOUT_20260917.md`.

- **P5 completed 2026-09-17:** implemented a private shadow conditional player-return bridge for team goal states 0/1/2/3/4+, using canonical event lambdas, haul tails, xMins/start and current roles. Player scoring/assist shares conserve team events; weighted conditional states exactly reconstruct canonical xPts and P(10+) in diagnostic fixtures; all 604 frozen GW5 player rows passed conservation, monotonicity and chronology/effect checks. João Pedro leads eligible Chelsea P(10+) in the 4+ goal state but receives no automatic captaincy/TC authorization. Zero production effect. Closeout: `project-management/C0279_P5_CONDITIONAL_PLAYER_RETURN_BRIDGE_CLOSEOUT_20260917.md`.

- **P6 completed 2026-09-18:** implemented a private full-XV plus named-challenger captaincy/chip evidence adapter consuming P5 conditional upside and the binding C0277 gate. Mbeumo remains C0248 incumbent and shadow rank 1; Bruno is equivalent under the one-point Noise-Control margin; João Pedro ranks seventh across the XV despite leading Chelsea’s conditional upside. C0277 remains RESERVE_FOR_FUTURE / NONE / PLAY_NOW=false, so TC is blocked. Zero captain/chip authority and zero production effect. Closeout: `project-management/C0279_P6_CAPTAINCY_CHIP_SHADOW_CONSUMPTION_CLOSEOUT_20260918.md`.

- **P7 completed 2026-09-18:** implemented the private shadow Decision-Evidence modal contract in conclusion → support → risk → reconciliation → player implications → additional-context order. Calculation-linked support and genuine uncertainty risks are structurally separated; the raw modal cell is disclosed; shootout is audited as HIGH_SCORING; direction/family tensions are explicitly reconciled; tactical observations with disabled model effect are excluded from support/risk and labeled research-only. Brentford–Chelsea and Leeds–Palace resolve to HIGH/SHOOTOUT / 3–2 while retaining raw 1–1 references. All 10 GW5 fixtures passed decision-ready, chronology, deterministic-hash and zero-effect gates; opaque L10/L20 and mirrored suppression mentions were zero. João Pedro leads eligible Chelsea high-tail upside without captaincy/TC authority. Closeout: `project-management/C0279_P7_MATCHUP_MODAL_DECISION_EVIDENCE_CLOSEOUT_20260918.md`.
