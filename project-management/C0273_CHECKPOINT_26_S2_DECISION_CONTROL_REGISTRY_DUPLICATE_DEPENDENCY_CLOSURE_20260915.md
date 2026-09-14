# C0273 — Checkpoint 26: S2 Decision-Control Registry & Duplicate-Dependency Closure

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue the bounded pre-VPS stabilization program after Checkpoint 25 by closing two architecture ambiguities in planning:

1. production governance currently distinguishes numerical model effect much better than decision-control/publication-authority effect;
2. the legacy C0213 full-pool optimizer remains a hard `decision_ready` dependency even though C0248 is now the canonical selected-path authority.

This checkpoint defines a target governance taxonomy, recommends the intended role of the C0213 full-pool optimizer, and specifies implementation-sized closure evidence. It does **not** alter C0213 readiness, C0248 selection, C0234 gating, C0237 publication, any model, any cron, any Edge Function, any schema, any API/UI behavior, or any FPL action.

## 1. Baseline re-read and live re-verification

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning` with model effect `None. Planning/documentation only; zero runtime/model effect.`

Checkpoint 25 established that the existing `14/14 production-effect behavioral consumption PASS` headline mainly proves numerical/state forecast consumption. It does not comprehensively prove all zero-xPts controls that can select, block, authorize or publish the final recommendation.

The live C0213 registry still classifies the canonical `fpl-full-pool-optimizer` Edge Function as:

- lifecycle: `PRODUCTION`;
- capability: `FPL_FULL_POOL_OPTIMIZER`;
- canonical status: `CANONICAL`;
- `production_effect_enabled=true`;
- read-only and unable to save manager decisions.

The live `private.c0213_p2_current_lineage_v03()` contract still computes:

`decision_ready = projection_ready AND results_ready AND realized_roles_ready AND evidence_ready AND manager_ready AND optimizer_ready`

and explicitly marks `FULL_POOL_OPTIMIZER` as `required_for_decision=true`.

Separately, C0248's verified tracker state says:

- `Production selector cutover complete — C0248 canonical selected-path authority`;
- C0248 is the canonical sequential multi-GW decision planner;
- C0234 consumes C0248 selected-path authority;
- C0240 remains a supporting adversarial benchmark.

Therefore the current architecture has two distinct optimization layers with different real roles but an incompletely explicit relationship:

- C0213 full-pool optimizer: read-only constrained-search primitive and legacy decision-readiness prerequisite;
- C0248: canonical multi-GW selected-path authority.

This is not automatically a runtime defect. It is a **governance and dependency-semantics ambiguity**.

## 2. Target production-effect taxonomy

One boolean `production_effect_enabled` cannot safely answer all autonomy-governance questions.

The target architecture should preserve numeric-effect governance while adding orthogonal effect classes.

### E1 — NUMERIC_FORECAST_EFFECT

A component can change canonical forecast/player/fixture numbers consumed downstream.

Examples:

- xMins/start probability state;
- role-regime numeric adaptations;
- defensive-contribution probability;
- canonical fixture forecast effects.

Required proof: definition-bound behavioral effect test plus downstream consumption lineage.

### E2 — DECISION_SELECTION_EFFECT

A component can change which legal squad/transfer/chip/captain path is selected without rewriting base forecast numbers.

Examples:

- C0248 sequential planner;
- potentially C0240 adversarial challenger when its result is mandatory for candidate survival.

Required proof: counterfactual selection test showing a material input/control change can alter selected output or candidate admissibility.

### E3 — DECISION_BLOCKING_EFFECT

A component may not choose the plan but can fail closed and prevent a recommendation from becoming actionable.

Examples:

- C0227 uncertainty readiness;
- C0242/C0251 captaincy consistency/equivalence controls where required;
- C0234 autonomous gate.

Required proof: deterministic fail-open/fail-closed behavioral tests and exact blocker provenance.

### E4 — PUBLICATION_AUTHORITY_EFFECT

A component determines whether an artifact may claim current/actionable/public authority.

Examples:

- C0237 publication path;
- future canonical publication pointer / `authority_revision` contract.

Required proof: supersession, hard-invalidation, stale-generation and deadline tests.

### E5 — INDEPENDENT_CHALLENGER_EFFECT

A component independently evaluates a canonical decision but does not itself own selection or publication authority.

Its failure may create an alert, degraded confidence or specifically governed blocker only if policy explicitly says so.

Candidate example: C0213 full-pool optimizer after duplicate-dependency closure.

Required proof: independence from canonical planner input/output implementation where intended, plus documented disagreement semantics.

### E6 — ADVISORY_ONLY

Visible/explainable evidence with no blocking, numeric, selection or authority effect.

Example: C0230 team-regime diagnostic under its current contract.

### E7 — RESEARCH_SHADOW_ONLY

Research/evaluation path that must not affect production authority.

### Important design rule

These classes are not mutually exclusive at the component-family level. A family may contain a numerical routine and separate authority-control routines. The registry should classify the exact production consumer path rather than assign one broad label to an entire research program.

`production_effect_enabled` may remain for backwards compatibility, but it must not continue to mean both “changes forecast numbers” and “matters to production decisions.”

## 3. Recommended role for the C0213 full-pool optimizer

### Recommendation: retain as an independent challenger / structural benchmark, not a permanent second authoritative planner

The full-pool optimizer remains valuable because it asks a different question from C0248:

- C0213 full-pool optimizer: “What is the best legal full-pool squad under this forecast state and budget/search policy?”
- C0248: “Given the actual manager state, FT/chip/price/path constraints and multi-GW optionality, what sequential action path should be selected?”

Those are useful independent perspectives.

However, keeping the full-pool optimizer as a **hard mandatory readiness blocker forever** creates three risks:

1. **Duplicate authority risk** — a user/operator can reasonably interpret two mandatory optimizers as two authoritative planners.
2. **Availability coupling** — failure/staleness of an auxiliary read-only benchmark can stop C0248 even when the canonical decision path is otherwise semantically complete.
3. **Semantic mismatch** — a fresh-squad global optimum is not the same optimization problem as a sequential manager-state path with FT/chip/path constraints.

Therefore the target role should be:

> **INDEPENDENT_CHALLENGER / STRUCTURAL_SANITY_BENCHMARK**

not:

> **SECOND CANONICAL DECISION AUTHORITY**.

This recommendation does **not** authorize removing its current blocker today.

## 4. Conditions before the legacy hard dependency can be relaxed

The C0213 full-pool optimizer must remain in its current live role until an explicitly approved implementation change proves all of the following.

### D1 — C0248 legal-universe completeness

C0248 must prove it can generate/evaluate every action family it claims authority over, including:

- 0-N transfers permitted by current FPL rules/policy and available FT/hit budget;
- legal squad composition;
- budget/current selling-price feasibility;
- bench/order/autosub legality where relevant;
- chip action semantics in the covered horizon;
- current-manager-state anchoring;
- multi-GW continuation/terminal state.

### D2 — Independent player-pool coverage

The candidate player universe must reconcile to the current governed FPL player universe, preserving the top-xMins plus explosive-exception protection where applicable.

Checkpoint 24's 604 projected + 54 governed exclusions = 658 registry reconciliation is strong evidence, but the final proof should use an independently versioned upstream player-universe observation.

### D3 — Benchmark disagreement semantics

The system needs an explicit rule for what happens when C0213 benchmark and C0248 materially disagree.

Recommended semantics:

- disagreement does not silently replace C0248;
- disagreement creates a structured challenger finding;
- severe disagreement can become `REVIEW_REQUIRED` or a bounded blocker only under a versioned policy;
- the reason must distinguish expected causes (sequential path constraints, retained FT value, chip timing, selling-price effects) from suspicious causes (candidate omission, legality mismatch, stale lineage, optimizer regression).

### D4 — Behavioral equivalence / divergence suite

Historical and synthetic cases should include:

- identical-state case where both should converge;
- sequential-path case where divergence is expected;
- constrained transfer-budget case;
- selling-price case;
- injury/xMins shock;
- explosive-exception player case;
- chip-window case;
- stale-input case;
- incomplete-player-universe case.

The goal is **not** to force identical outputs. The goal is to prove disagreement is explainable.

### D5 — C0234/C0237 do not depend on the benchmark as hidden authority

After any future relaxation, C0234/C0237 must consume exact C0248 authority lineage and any benchmark state only according to its explicit challenger policy.

## 5. Decision-control registry contract

Future architecture governance should report two separate coverage scores.

### A. Numeric consumption coverage

Retain the existing concept:

`NUMERIC_PRODUCTION_EFFECT components with current behavioral proof / all NUMERIC_PRODUCTION_EFFECT components`

This preserves the useful C0213 14/14 style metric.

### B. Decision-authority consumption coverage

Add:

`current behaviorally proven DECISION_SELECTION + DECISION_BLOCKING + PUBLICATION_AUTHORITY components / all required components in those classes`

The status must fail closed if a mandatory control lacks:

- exact consumer;
- current definition/version hash or equivalent immutable identity;
- behavior test;
- lineage exposure;
- explicit failure semantics.

### Challenger coverage should be reported separately

Independent challengers should not inflate the mandatory production-control denominator unless policy makes them blocking.

This avoids recreating the same ambiguity under a new name.

## 6. Specific current classification proposal — planning only

| Layer | Proposed effect class | Current authority interpretation |
|---|---|---|
| canonical player/fixture projection chain | E1 NUMERIC_FORECAST_EFFECT | numeric forecast authority |
| C0213 full-pool optimizer | E5 INDEPENDENT_CHALLENGER_EFFECT after closure; currently legacy hard prerequisite | benchmark/challenger, not future canonical selector |
| C0227 uncertainty | E3 DECISION_BLOCKING_EFFECT | fail-closed readiness/control |
| C0240 adversarial layer | E5 + bounded E3 where mandatory | supporting adversarial benchmark/control |
| C0242/C0251 captaincy | E3 and, where it chooses among equivalent captains, bounded E2 | captaincy decision-control |
| C0248 | E2 DECISION_SELECTION_EFFECT | canonical selected-path authority |
| C0234 | E3 DECISION_BLOCKING_EFFECT | final fail-closed authorization gate |
| C0237 | E4 PUBLICATION_AUTHORITY_EFFECT | publication/currentness surface, not forecast owner |
| C0230 | E6 ADVISORY_ONLY | visible research/advisory context only |

No current lifecycle or registry row is changed by this table.

## 7. Duplicate-dependency red-team

### Failure A — removing C0213 too early

C0248 could contain a candidate-generation omission that the independent full-pool search would have exposed.

**Guard:** retain challenger and parity/divergence testing before relaxing blocker status.

### Failure B — keeping C0213 mandatory forever

A stale benchmark can prevent a fully valid C0248 decision from progressing, creating operational fragility unrelated to the actual canonical decision problem.

**Guard:** separate challenger freshness from canonical readiness once evidence is sufficient.

### Failure C — treating challenger disagreement as proof C0248 is wrong

The two optimizers solve different problems. Sequential FT preservation or selling-price constraints may rationally produce different squads.

**Guard:** classify disagreement reason before blocking.

### Failure D — forcing optimizer convergence

Changing C0248 until it matches the full-pool optimizer would destroy the value of sequential planning.

**Guard:** validate semantics and legal coverage, not identical output.

### Failure E — effect-class explosion becomes over-engineering

Seven effect classes could become bureaucracy if every low-level helper receives manual policy metadata.

**Guard:** classify canonical capability/consumer nodes, not all 752 components individually. Low-level helpers inherit from canonical consumer lineage unless they hold independent authority.

### Failure F — numeric 14/14 headline remains the only dashboard status

Operators can miss a broken C0234/C0237/C0248 control while numeric forecast tests remain green.

**Guard:** show numeric-consumption and decision-authority coverage as separate first-class health signals.

## 8. Implementation-sized repair dossiers — NOT AUTHORIZED

### S2-R6 — Decision-control consumption registry

Future implementation would:

- add orthogonal effect-class metadata for canonical decision/control capabilities;
- register exact current consumers;
- bind mandatory controls to behavioral evidence;
- expose separate numeric and decision-authority coverage metrics;
- avoid relabeling zero-xPts controls as numeric model effects.

Acceptance:

- every canonical C0248/C0234/C0237/C0242/C0227 control path has explicit effect class and consumer;
- behavioral proof denominator is machine-queryable;
- research/advisory components cannot accidentally enter mandatory denominator.

### S2-R7 — Full-pool optimizer role closure

Future implementation, only after D1-D5 evidence, would:

- preserve the full-pool optimizer as independent benchmark/challenger;
- remove semantic wording that implies it is a second canonical planner;
- replace unconditional hard readiness dependency with explicit challenger policy;
- preserve disagreement evidence and regression tests.

Acceptance:

- C0248 remains sole selected-path authority;
- benchmark outage cannot silently replace C0248;
- benchmark disagreement is reason-coded;
- any blocking behavior is policy-versioned and auditable;
- no historical decision is rewritten.

### S2-R8 — Historical/current role-policy supersession lineage

Preserve C0212 historical truth and explicitly point current bounded numeric role policy to C0220.

### S2-R9 — Defensive-contribution capability discoverability

Expose DC as a named consumed capability in architecture documentation/registry without introducing a duplicate numerical model.

### S2-R10 — Advisory/authority labeling

Ensure C0230 and similar research outputs cannot be mistaken by API/UI/controller consumers for blocking or production-authoritative evidence.

## 9. What should NOT be done

Do not:

- retire/delete the C0213 optimizer now;
- remove its live readiness dependency under this planning checkpoint;
- promote any shadow/research layer;
- change C0248 scoring/beam/FT/chip logic;
- change C0234 or C0237 behavior;
- rewrite old C0212/C0213/C0248 tracker history;
- classify every infrastructure helper manually;
- create a new competing optimizer merely to solve the classification problem.

## 10. Open questions / contradictions preserved

1. What exact disagreement threshold should make the full-pool challenger `REVIEW_REQUIRED` rather than informational only? This should be data-driven from historical/shadow divergence, not guessed now.
2. Should severe benchmark disagreement ever hard-block final authority, or only when it indicates an integrity class such as missing candidate universe/illegal plan/stale lineage?
3. C0213 currently marks the full-pool optimizer `production_effect_enabled=true`, even though it is read-only and does not save decisions. Under the new taxonomy, should backwards compatibility retain this boolean while adding `effect_class=INDEPENDENT_CHALLENGER`, or should the boolean eventually narrow to numeric production effects only?
4. C0240 is both an adversarial benchmark and currently mandatory before C0234. Should it be represented as E5 challenger plus E3 blocker, or one composite control capability?
5. Captaincy C0242/C0251 can classify equivalence and influence final captain interpretation. Where exactly does bounded selection responsibility end and blocking responsibility begin?
6. Exact current C0237 canonical-publication authority remains unresolved from S1-R3; E4 classification does not solve latest-row vs canonical-authority semantics by itself.
7. Exact current C0248 authority identity remains unresolved from S1-R5; multiple historical `production_selected=true` artifacts must not be retroactively rewritten.
8. Tactical v01/v0.1.1 duplicate/supporting classification and selector timestamp contradiction remain open from Checkpoint 25.
9. C0207 transfer-driven teammate xMins redistribution and C0208 post-transfer set-piece/tactical hierarchy refresh still require later redundancy/gap adjudication.
10. The registry should not be expanded into manual classification of all 752 components unless evidence shows that canonical-capability classification is insufficient.

## 11. Decision

C0273 adopts the following **planning recommendation**:

- keep C0248 as the sole intended canonical selected-path decision authority;
- preserve the C0213 full-pool optimizer because it is valuable as an independent full-pool challenger/structural sanity benchmark;
- do **not** remove its current live hard dependency until C0248 legal-universe completeness and divergence semantics are behaviorally proven;
- future governance should separately measure numeric-production consumption and decision-authority consumption;
- zero-xPts controls must no longer be treated as equivalent to “no production effect.”

This checkpoint records architecture intent only.

**Production changes remain explicitly approval-gated. DO NOT IMPLEMENT, DEPLOY, ALTER RUNTIME/MODEL BEHAVIOR, PROMOTE, RETIRE OR KILL ANYTHING under this checkpoint.**
