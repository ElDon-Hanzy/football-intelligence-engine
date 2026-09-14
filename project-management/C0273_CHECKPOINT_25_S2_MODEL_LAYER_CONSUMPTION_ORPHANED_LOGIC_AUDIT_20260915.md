# C0273 — Checkpoint 25: S2 Model/Layer Consumption & Orphaned-Logic Audit

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / AUDIT ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Perform the next bounded pre-VPS stabilization audit after Checkpoint 24. This batch distinguishes four different meanings that have repeatedly been conflated in the engine:

1. a layer is **computed**;
2. a layer is **stored/queryable**;
3. a layer is **displayed/advisory**;
4. a layer is **actually consumed by the authoritative decision path**.

The objective is to identify duplicated, bypassed, advisory-only, stale-governance and potentially orphaned logic before any new model or refactor is authorized.

No runtime code, schema, cron, Edge Function, model, frontend, deployment, publication, promotion, retirement or FPL-account behavior is changed by this checkpoint.

## 1. Baseline re-verification

The C0213 architecture registry currently reports:

- registry integrity: green;
- system consolidation: green;
- total components: 752;
- lifecycle split: 14 PRODUCTION, 85 SHADOW, 127 RESEARCH, 24 RETIRED, 2 UI_ONLY, 500 INFRASTRUCTURE;
- active crons: 29;
- dependency edges: 1,383;
- production-effect components: 14;
- behavioral consumption current passes: 14/14;
- tracker consumption-governance violations: 0;
- required capability contradictions: 0.

These results are useful and remain valid evidence for the scope they measure. However, the audit found an important scope limitation: the `production_effect_enabled=true` population primarily captures numerical/state forecast components. Several decision-control components that can materially allow, block or alter the selected recommendation are classified as `INFRASTRUCTURE` with `production_effect_enabled=false`.

Therefore:

> **“14/14 production-effect behavioral consumption PASS” does not mean every decision-control layer in the live recommendation chain has equivalent behavioral-consumption proof.**

This is a governance/discoverability gap, not proof that those layers are broken.

## 2. Current consumption map

### 2.1 xMins / start probability — genuinely consumed

`private.fpl_projection_player_state_v01` supplies the current player-state inputs used by `private.generate_upcoming_fpl_projection_core_v01`.

The projection core directly consumes:

- expected minutes;
- start probability;
- appearance probability;
- xG90;
- xA90;
- defensive-contribution probability.

It then writes these effects into immutable `model_predictions` rows and the current event distribution. xMins/start probability also affect team competition budgets, event probabilities, squad/bench utility, autosub expectations and chip diagnostics.

Judgment: **PRODUCTION-CONSUMED, not orphaned.**

### 2.2 Realized tactical player role — consumed, but through a bounded numeric bridge

The current role path is not simply decorative metadata.

`fpl_projection_player_state_v01` uses current fixture roles plus historical realized same-role evidence. A numeric role-regime adaptation is permitted only after bounded evidence conditions, including approximately:

- role mismatch across a material attacking/non-attacking boundary;
- at least 3 same-role appearances;
- at least 180 same-role minutes;
- role confidence at least 0.80;
- penalty-related confounding protection for xG.

When the gate passes, xG90/xA90/DC priors can be adjusted. The projection core records `role_regime_adjusted` and the reason in forecast lineage.

Judgment: **PRODUCTION-CONSUMED with bounded numeric effect.**

Important governance contradiction preserved: C0212's tracker text still says its realized-role state has “numeric role uplift disabled,” while C0220 later introduced a bounded material realized-role numeric adaptation. This appears to be chronological supersession rather than runtime contradiction, but the tracker wording can mislead an auditor unless C0220 is read with it.

### 2.3 Defensive Contributions — numerically consumed, weakly discoverable as a named layer

Defensive-contribution probability is directly used in the production projection core:

- `dc_probability` is part of player state;
- role-regime evidence may alter the DC prior under the bounded role-shift rule;
- `new_pdc` contributes directly to expected-points composition;
- it also influences bonus-probability scaling and the event distribution.

Judgment: **PRODUCTION-CONSUMED, not orphaned.**

However, no clearly named standalone change-tracker item titled as a Defensive Contributions model was found by the bounded tracker search. The logic exists inside player state/projection contracts rather than being easy to discover as a first-class model-family entry.

This is a documentation/governance gap: the user can reasonably believe DC is a dedicated permanent model requirement while the registry exposes it as embedded forecast logic.

### 2.4 Fixture/tactical layers — consumed indirectly through canonical fixture forecasts

C0213 registers both tactical matchup refresh layers, with `refresh_fixture_tactical_matchups_v011` canonical and the earlier v01 supporting. Current projection readiness requires calibrated tactical rows, current fixture team features and canonical production fixture forecasts.

The player projection core then consumes canonical fixture lambdas, which themselves are adjusted by production fixture layers before player goal/assist/clean-sheet distributions are calculated.

Judgment: **PRODUCTION-CONSUMED through the fixture-forecast chain.**

Open contradiction retained: both tactical v01 and v0.1.1 remain `PRODUCTION`-lifecycle components and both carry `known_selector_timestamp_contradiction=true`, even though v0.1.1 is canonical and v01 is supporting. This is not necessarily duplicate numeric application, but it is architectural ambiguity worth cleaning before VPS migration.

### 2.5 C0227 uncertainty — decision-control consumer, no xPts rewrite

C0227 explicitly does not alter xPts. It classifies minutes/role/evidence/regression uncertainty and is required by current publication logic.

`c0237_publish_current_fpl_plan_pre_c0248_v01` refuses publication when the C0227 uncertainty status is not ready.

Judgment: **DECISION-CONTROL CONSUMED, not projection-consumed.**

It should not be described as a numeric model effect, but it is also not merely decorative diagnostics because it can prevent publication.

### 2.6 Captaincy haul/tail logic — consumed, but separate from squad optimization

The production projection core computes full point-distribution tails (`P10+`, `P15+`, `P20+`, blank risk) and a captain score. C0242/C0251 later run a distinct captaincy equivalence gate over the current XI.

The latest captaincy gate:

- requires an aligned current projection lineage;
- fails closed on stale fixture lineage;
- fails closed on stale XI player-state lineage;
- compares mean, haul-tail and floor signals;
- identifies equivalent candidates inside a model-error band.

C0242 consistency is subsequently required by the publication path.

Judgment: **DECISION-CONTROL CONSUMED.**

Important semantic point: captaincy is intentionally separate from the squad optimizer. The optimizer/planner can create an XI and a nominal captain, while C0242/C0251 may classify the captaincy edge as non-robust. That is a designed second opinion, not necessarily duplication.

### 2.7 C0240 adversarial layer — consumed by current publication/control path

C0240 final adversarial evidence is consumed by C0237 publication logic. The publication checks exact C0240 ensemble/structural/forward/OR/red-team/manager lineage and renders the surviving plan only after consistency checks.

Judgment: **DECISION-CONTROL CONSUMED.**

It does not rewrite xPts; it challenges plan construction/selection.

### 2.8 C0230 team-regime diagnostic — explicitly advisory/shadow

C0230 is still marked shadow/advisory. Current C0237 code can include its run ID and advisory context but explicitly records:

- team regime advisory only;
- blocking = false;
- numeric projection effect = false;
- absence/staleness must not block publication/final authorization.

Judgment: **ADVISORY CONSUMED, NO AUTHORITY/Numeric effect.**

This is an example of a layer that should remain visible as research context without being mistaken for a production decision prerequisite.

## 3. Main architecture finding: numeric-effect registry != decision-authority registry

The C0213 status headline is currently strongest for numerical forecast consumption.

Examples of real decision-control components that are not in the 14 `production_effect_enabled=true` population include:

- C0242 captaincy-equivalence functions;
- C0234 autonomous-gate status/evidence tables;
- C0248 sequential-planner run storage/control functions;
- C0227 uncertainty-control functions;
- several publication/control-chain relations.

These are commonly classified as `INFRASTRUCTURE` because they do not numerically alter forecast xPts.

That classification is defensible for model-effect governance but insufficient for autonomous-product governance.

Required future distinction:

1. **NUMERIC_PRODUCTION_EFFECT** — can change forecast numbers;
2. **DECISION_CONTROL_EFFECT** — can select/reject/block/change actionable recommendation without changing forecast numbers;
3. **PUBLICATION_AUTHORITY_EFFECT** — can change what is allowed to claim current/actionable authority;
4. **ADVISORY_ONLY** — visible context only;
5. **RESEARCH/SHADOW_ONLY** — cannot affect production decision or publication authority.

A component can have zero numeric model effect while still being critical production logic.

## 4. Potential duplicated / legacy blocking layer: C0213 full-pool optimizer vs C0248 sequential planner

The live lineage deserves special scrutiny.

`c0213_p2_current_lineage_v03` still requires the `FULL_POOL_OPTIMIZER` stage to be READY for `decision_ready=true`. That optimizer is intentionally read-only and does not write the manager plan.

Separately, C0248 is now the canonical sequential multi-GW decision planner and is the explicit production-consumer path into the autonomous gate/publication chain.

This creates a possible dual-planner dependency:

- legacy/full-pool optimizer as a readiness prerequisite;
- C0248 as actual decision planner/selector.

This may be deliberate if the full-pool optimizer serves as an independent baseline/challenger sanity check. But that role is not obvious from the current C0213 lineage naming. If it is no longer a required independent control, keeping it as a hard readiness prerequisite creates avoidable fragility.

Judgment: **POTENTIAL DUPLICATE/BYPASS RISK — requires explicit classification, not removal.**

No retirement or change is authorized here.

## 5. Potential governance inconsistency: C0212 realized-role wording

C0212 remains `Verified` with model-effect text saying factual tactical-role state is enabled but numeric role uplift remains disabled.

C0220, implemented later, explicitly says `Penalty + realized-role numeric + competition-budget forecast repair` and its production consumer contract includes `fpl_projection_player_state_v01` and the projection core.

The runtime code confirms bounded realized-role numeric adaptation exists today.

Therefore C0212 is historically correct for its own delivery moment but misleading if read as a description of current system behavior.

Recommended future documentation treatment:

- preserve C0212 historical wording;
- add explicit `superseded_for_current_numeric_role_policy_by=C0220` lineage rather than rewriting C0212 history.

## 6. Orphaned-logic classification model

No layer should be called “orphaned” merely because it has `production_effect_enabled=false`.

Use these categories:

### A. PRODUCTION_NUMERIC
Changes forecast/player/fixture values consumed downstream.

Examples: xMins/start state, realized-role bounded adjustment, DC, fixture/team lambda effects.

### B. PRODUCTION_DECISION_CONTROL
Does not rewrite forecast values but materially changes eligibility, plan selection, captaincy interpretation, authorization or blocking.

Examples: C0227, C0240, C0242/C0251, C0248 control, C0234.

### C. PRODUCTION_PRESENTATION/AUTHORITY
Determines current publication/currentness without changing football forecast numbers.

Example: C0237/canonical publication contract.

### D. ADVISORY_VISIBLE
May be surfaced for explanation/research but cannot block or change authority.

Example: C0230 team regime diagnostic.

### E. SHADOW/RESEARCH EVALUATED
Has an explicit evaluator and no production authority.

### F. TRUE_ORPHAN_CANDIDATE
Computed/stored but with:

- no numeric consumer;
- no decision-control consumer;
- no publication consumer;
- no research evaluator;
- no UI/explanation contract;
- no explicit retention purpose.

Only category F should become a retirement candidate.

## 7. What this bounded audit did NOT prove

This checkpoint does not claim that every one of the 752 registered components has been individually classified.

It audits the high-value model/decision families relevant to the user's known engine requirements and exposes where the existing C0213 governance metric is incomplete for autonomous decision-control semantics.

A full 752-component retirement audit would be unnecessary and likely over-engineering at this stage. The existing registry already gives substantial structural coverage.

## 8. Red-team findings

### A. Green registry headline can hide decision-control gaps

14/14 behavioral tests can pass while a captaincy/gate/publication control path lacks equivalent behavioral proof because it is not in the numeric-effect population.

**Guard:** maintain separate numeric-effect and decision-authority consumption coverage.

### B. “No xPts effect” can be mistaken for “no production effect”

C0227/C0240/C0242 can materially change whether a plan is accepted/published while correctly having zero xPts rewrite.

**Guard:** introduce explicit decision-control effect semantics.

### C. Full-pool optimizer may be a hidden second mandatory planner

If C0213 readiness remains a hard dependency while C0248 is canonical, one stale auxiliary optimizer can block the final chain for no football reason.

**Guard:** decide whether the full-pool optimizer is REQUIRED_BASELINE_CONTROL, ADVISORY_CHALLENGER or LEGACY_DEPENDENCY before implementation cleanup.

### D. Historical tracker wording can be read as current behavior

C0212's “numeric role uplift disabled” is no longer a complete current-system statement after C0220.

**Guard:** preserve historical row but add supersession/current-policy lineage.

### E. Embedded DC logic is hard to audit as a first-class requirement

DC is materially consumed but not easily discoverable under a named permanent model-family contract.

**Guard:** document DC's exact production-consumer path without creating a duplicate new model.

### F. Advisory research can visually masquerade as authority

C0230 is correctly non-blocking in code, but product surfaces must continue marking it advisory/research-only.

**Guard:** UI/API semantics must expose authority class, not merely the existence of a layer/result.

## 9. Proposed stabilization work items — planning only

### S2-R6 — Decision-control consumption registry

Extend architecture governance conceptually so zero-xPts decision controls have explicit production-consumption evidence and behavioral tests.

### S2-R7 — Full-pool optimizer role classification

Decide and document whether the C0213 optimizer is:

- hard independent prerequisite;
- independent challenger/benchmark;
- fallback;
- legacy readiness dependency to be removed later.

No choice is made by this checkpoint.

### S2-R8 — Current role-policy supersession lineage

Preserve C0212 historical state while making C0220 the explicit current numeric realized-role policy.

### S2-R9 — Defensive-contribution consumption contract

Document DC as a first-class consumed forecast factor and its thresholds/provenance, without adding a second competing DC model.

### S2-R10 — Advisory/authority labeling contract

Ensure C0230 and any similar research/shadow signals are unambiguously marked advisory in controller/API/UI lineage.

## 10. Open questions preserved for user review

1. Should the C0213 full-pool optimizer remain a hard decision-readiness prerequisite now that C0248 is the canonical sequential planner, or should it become an independent challenger/benchmark only?
2. Which decision-control components should enter a new behavioral-consumption coverage metric without incorrectly labeling them as numeric model effects?
3. Should C0234, C0237 and C0248 each receive separate authority-effect classes, or should one generic `DECISION_CONTROL_EFFECT` class cover them?
4. Is C0202 attack-side metadata still intentionally non-numeric, or should a future research program revisit flank/side effects only after sufficient evidence?
5. C0207 transfer-driven teammate xMins redistribution remains planned. Is current team xMins competition budgeting already sufficient for the intended use, making C0207 partly redundant?
6. C0208 post-transfer set-piece/tactical hierarchy refresh remains planned. Which parts are already covered by current official/current-state refreshes versus genuinely absent?
7. Should DC become a named permanent architecture capability in C0213 required capabilities for discoverability, while leaving implementation unchanged?
8. Are both tactical refresh v01 and v0.1.1 still required operationally, given v0.1.1 is canonical and both retain a known selector timestamp contradiction marker?
9. Should C0227 uncertainty merely block publication/readiness, or should it eventually alter optimizer risk utility? No such numeric risk adjustment is authorized today.
10. Captaincy remains separate from squad optimizer by design. Should final authority use the C0242/C0251 equivalence result to override a nominal planner captain, or only classify confidence/equivalence around it? Existing behavior should not be changed without explicit approval.

## 11. Decision

S2.2 bounded audit is complete.

Current judgment:

- xMins/start probability: **production-consumed**;
- realized tactical role: **production-consumed through bounded numeric adaptation**;
- Defensive Contributions: **production-consumed but governance/discoverability is weak**;
- tactical/fixture intelligence: **production-consumed indirectly through canonical fixture forecasts**;
- C0227 uncertainty: **decision-control consumed, no xPts rewrite**;
- captaincy haul/equivalence: **decision-control consumed and intentionally separate from squad optimization**;
- C0240 adversarial layer: **decision-control consumed**;
- C0230 team regime: **advisory/shadow only by design**;
- C0213 full-pool optimizer versus C0248: **potential duplicated mandatory-dependency risk requiring explicit role classification**;
- C0213's current 14/14 production-effect behavioral green status is useful but **not a complete proof of all decision-control consumption**.

Recommended next bounded planning batch:

> **S2.3 — Decision-Control Registry & Duplicate-Dependency Closure Dossier:** define the minimum classification/acceptance tests needed for C0234/C0237/C0248/C0242/C0227 and resolve, at the planning level, the intended role of the older full-pool optimizer without changing production behavior.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT, DEPLOY, CHANGE SCHEMA/CRON/RUNTIME/MODELS, PROMOTE, RETIRE OR KILL ANYTHING under this checkpoint.**