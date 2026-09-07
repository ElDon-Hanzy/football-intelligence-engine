# Football Intelligence Engine — Model Consumption Audit

_Last updated: 2026-09-07 — C0213 closure audit_

## 1. Audit objective

C0213 was opened after a material realized-role consumer defect demonstrated that the engine had accumulated enough model families, wrappers, selectors and research layers that documentation alone could no longer prove what actually affected production.

The audit objective was to answer, from live code/runtime evidence:

- What exists?
- What is actually active?
- What affects production numerically or through state selection?
- What is research/shadow only?
- What is duplicated, obsolete or retired?
- What consumes every implemented intelligence layer?
- Can production behavior be proven, not merely inferred from static references?
- Can every individual prediction expose its main effect lineage?

No historical forecasts or registered forward cohorts were rewritten.

## 2. Architecture inventory and dependency graph

C0213 created a live-discovered registry covering DB objects, cron jobs and captured external runtime/repository components.

Canonical surfaces:

- `private.c0213_component_inventory_v01`
- `private.c0213_component_dependency_graph_v01`
- `private.c0213_required_capabilities`
- `private.c0213_architecture_registry_status_v01()`

At closure:

- total components: **632**
- DB-discovered components: **546**
- external captured components: **59**
- active crons: **27**
- dependency edges: **1,084**
- production-effect components: **14**
- required capabilities: **19**
- required capability missing: **0**
- required capability contradictions: **0**
- active duplicate cron targets: **0**

Lifecycle counts:

- PRODUCTION 14
- SHADOW 88
- RESEARCH 123
- UI_ONLY 2
- INFRASTRUCTURE 386
- RETIRED 19

The 19 RETIRED external components remain historical registry records but have **zero active external deployments**.

## 3. Major defects found and corrected

### 3.1 Realized-role consumer bridge

C0212 correctly created realized competitive role state, but role fixture snapshots persisted a virtual overlay timestamp/taxonomy that downstream tactical consumers attempted to resolve as a physical quantitative profile.

Pre-fix, nearly all realized overlays failed the physical-profile join. C0213 P0 repaired the bridge:

- realized categorical role remains visible;
- quantitative axes continue to reference the physical base role profile;
- physical observed-at/taxonomy identity is preserved;
- numeric realized-role uplift stays disabled;
- missing evidence is not neutralized as zero.

### 3.2 Continuous FPL projection coverage

A newly added FPL player exposed that the original C0204 coverage contract was effectively one-time. C0204 V02/V03 added continuous fail-closed reconciliation with strict scope guards, preventing new players from silently falling out of the projection universe while also preventing broad data regressions from being auto-excluded.

### 3.3 Duplicate competitive-core cron

An obsolete duplicate active ingestion schedule was removed. Current active cron-target duplication is zero.

### 3.4 Tactical selector timestamp race

The calibrated v0.1.1 wrapper called the base v0.1 generator, but timestamp ordering could cause raw v0.1 rows to win the current selector. The selector now deterministically prioritizes v0.1.1 for the same match/team/signal.

C0213 P4 behavioral proof confirmed audited current tactical rows are 100% v0.1.1.

### 3.5 Projection readiness vs decision readiness

Previously, successful numerical refresh could be mistaken for a valid decision state. C0213 separated them and installed fail-closed decision/manager-plan guards.

Projection refresh is allowed to continue while decision output is blocked.

### 3.6 Missing full-pool optimizer

The DB had an automated current-15 selector but no canonical full-£100m player-pool optimizer. C0213 deployed `fpl-full-pool-optimizer` with top-xMins + explosive exceptions, legal squad constraints, multi-GW weighting, transfer/bench/flexibility penalties and model-error classification.

The optimizer is intentionally read-only and cannot save a manager plan.

### 3.7 Misleading production-core naming

The active FPL core was named `generate_upcoming_fpl_snapshot_c0160_legacy_v01`. C0213 P3 renamed the same function object to `generate_upcoming_fpl_projection_core_v01`, preserving OID and behavior.

### 3.8 Retired deployed external surface

Nineteen external runtimes were lifecycle-RETIRED but still physically active. Static dependency proof found no live internal consumers. Exact rollback/runtime evidence was reconciled and all 19 were subsequently removed from active runtime.

Current counts:

- active retired external deployments: 0
- active retired Edge Functions: 0
- active retired APIs: 0

## 4. Behavioral proof — not just static dependency proof

C0213 P4 introduced `private.c0213_behavioral_consumption_tests` and a rerunnable suite:

`private.run_c0213_behavioral_consumption_tests_v01(gw)`

Each production-effect component is tested using the relevant effect type:

- numeric perturbation;
- state-selection proof;
- output-lineage proof;
- runtime behavior probe.

A test is bound to `private.c0213_component_definition_hash_v01(component_key)`. If the function/view/runtime changes, its historical PASS is stale and no longer satisfies architecture consolidation.

### Closure result

- production-effect components: **14**
- current behavioral PASS: **14/14**
- missing/stale PASS: **0**

The rerunnable suite was executed a second time after deployment and generated a fresh 14-row PASS set.

Representative numeric probes:

- team-lambda input 1.5 vs 1.2 changed adjusted lambda by ~0.3393;
- reducing team lambda 20% changed the selected player goal lambda by ~0.1214;
- reducing team lambda 20% changed assist lambda by ~0.0190;
- halving player goal lambda changed P10+ from 0.201441 to 0.135675 while the distribution retained its mean-calibration contract.

These are engineering probes, not FPL recommendations.

## 5. Prediction-level effect provenance

C0213 P4 created `private.c0213_prediction_effect_provenance_v01` and status RPC `private.c0213_prediction_effect_provenance_status_v01(gw)`.

For each FPL prediction the view exposes:

- baseline prediction link;
- baseline xPts and current xPts;
- net xPts delta;
- team/opponent lambda;
- player goal/assist lambda;
- DC/bonus probabilities;
- event-distribution version;
- current fixture prediction/generator;
- C0159 parent snapshot;
- signed C0166 adjustment;
- explicit realized-role numeric-uplift policy.

GW4 closure proof, run 1325:

- prediction rows: **604**
- baseline lineage: **604/604**
- team/opponent lambda lineage: **604/604**
- event-distribution lineage: **604/604**
- fixture generator lineage: **604/604**
- non-zero current-vs-baseline xPts delta: **514/604**

This proves what each current prediction consumed without rewriting its historical input data.

## 6. Tracker consumption governance

C0213 added `private.c0213_change_consumption_contracts` and `private.c0213_tracker_consumption_governance_v01()`.

Implemented model-effect work is required to resolve to one explicit pathway:

- `PRODUCTION_CONSUMER`
- `RESEARCH_EVALUATOR_OR_GATE`
- `RESEARCH_INFRASTRUCTURE`
- `BLOCKED_EXTERNAL_SOURCE`
- `PROGRAM_UMBRELLA`
- `LEGACY_RECONCILED`

The rule intentionally excludes genuine presentation-only, audit-only and no-direct-model-effect work.

Closure result:

- implemented Executed/Verified tracker rows scanned: **128**
- rows requiring a consumption contract: **61**
- covered: **61/61**
- violations: **0**

The global `private.audit_change_tracker_governance_v01()` now includes this contract and fails if a governed implemented model layer has no consumer/evaluator path.

## 7. Research-vs-production findings

Important distinctions preserved by C0213:

- C0147 raw matchup family: SHADOW; bounded derivative only enters production via C0159.
- C0197 high-score/shootout experiments: SHADOW/RESEARCH; no production effect.
- C0202 flank/side research: observational; generic xPts effect off.
- C0206 translation/new-player research: shadow until its registered evidence gate.
- C0120/E0007 Correct Score edge: research only.
- A0005 forward cohort: evaluation evidence, not automatic promotion.
- realized tactical role: factual production state, but no new numerical role uplift.

This prevents “we built it” from becoming “the model uses it” by assumption.

## 8. Canonical vs duplicate/orphan/retired conclusion

At closure:

- required canonical capabilities missing: 0
- required capability contradictions: 0
- active duplicate cron targets: 0
- active RETIRED external runtimes: 0
- misleading C0160 legacy core naming removed
- two decision layers explicitly documented rather than treated as one hidden optimizer
- old registries remain non-authoritative historical records.

`SAVED_MANAGER_PLAN` remains intentionally `SPLIT`: automated current-15 selection and the externally adjudicated full-pool manager plan are different products. This is a designed separation, not an unresolved architecture contradiction.

## 9. Fail-closed consolidation contract

`private.c0213_architecture_registry_status_v01()->system_consolidation_ok` requires all of:

- no missing/contradictory required capability;
- no duplicate active cron target;
- no active RETIRED external deployment;
- 100% current definition-bound behavioral proof for production-effect components;
- green tracker consumption governance.

At closure: **true**.

## 10. What C0213 did not do

C0213 did not:

- promote a new model family;
- retune historical forecasts;
- add a realized-role coefficient;
- use GW3 outcomes to rewrite frozen pre-GW3 experiments;
- declare any research family valuable merely from one model output;
- authorize a GW4 FPL transfer/manager plan.

## 11. Residual work after C0213

Architecture consolidation being green does not mean every project experiment is complete. The next sequence is deliberately separate:

1. clear current GW4 decision-readiness blockers;
2. formally adjudicate the completed A0005 GW2/GW3 forward cohort without retuning;
3. only after readiness is green, run the full GW4 FPL decision process;
4. continue W0002 and other research only under their registered forward gates.

C0213 therefore closes the **structural/consumption ambiguity problem**, not the season-long football-research program.
