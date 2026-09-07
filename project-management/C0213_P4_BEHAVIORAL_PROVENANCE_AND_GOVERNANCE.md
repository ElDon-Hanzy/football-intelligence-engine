# C0213 P4 — Behavioral Consumption, Effect Provenance & Governance

_Date: 2026-09-07_

## Scope

P4 closes the remaining C0213 acceptance gaps after architecture inventory, dependency graph, orchestration/readiness consolidation and retired-runtime reconciliation.

No FPL manager decision, historical prediction, registered forward cohort or model coefficient was changed.

## Delivered

### 1. Definition-bound behavioral consumption audit

Created:

- `private.c0213_behavioral_consumption_tests`
- `private.c0213_component_definition_hash_v01(text)`
- `private.c0213_behavioral_consumption_status_v01()`
- `private.run_c0213_behavioral_consumption_tests_v01(integer)`

The test ledger is append-only. A PASS is valid only while its stored component-definition hash equals the current live function/view/runtime definition.

The rerunnable audit classifies evidence as numeric perturbation, state selection, output lineage or runtime probe rather than forcing all production components into the same test shape.

Closure result: **14/14 current production-effect components PASS; zero missing/stale proof.**

The canonical rerun on GW4 used prediction run 1325 and produced 14 fresh PASS rows.

### 2. Prediction-level effect provenance

Created:

- `private.c0213_prediction_effect_provenance_v01`
- `private.c0213_prediction_effect_provenance_status_v01(integer)`

GW4 run 1325:

- 604 predictions
- 604 baseline lineage rows
- 604 team/opponent lambda lineage rows
- 604 event-distribution rows
- 604 fixture-generator rows
- 514 non-zero net xPts deltas vs baseline

The view explicitly exposes C0159/C0166 fixture lineage and the policy that realized tactical role has no new numeric uplift.

### 3. Tracker consumption governance

Created:

- `private.c0213_change_consumption_contracts`
- `private.c0213_tracker_consumption_governance_v01()`

Extended:

- `private.audit_change_tracker_governance_v01()`
- `private.c0213_architecture_registry_status_v01()`

Implemented model-effect work must resolve to a production consumer, research evaluator/gate, research infrastructure, blocked external source, program umbrella or reconciled legacy contract. Genuine presentation/audit/no-direct-effect work is outside this requirement.

Closure result:

- 128 Executed/Verified tracker rows scanned
- 61 require a consumption contract
- 61/61 covered
- zero violations

### 4. Architecture fail-closed gate

`system_consolidation_ok` now also requires:

- 100% current behavioral proof for `production_effect_enabled=true` components;
- green tracker consumption governance.

A future production-definition change invalidates its old behavioral PASS through the definition hash and returns architecture consolidation to red until deliberately reproven.

## Behavioral examples

Read-only perturbation probe on the current GW4 production stack:

- team lambda base 1.5 vs 1.2 produced a material adjusted-lambda delta;
- -20% team lambda reduced both the selected player goal and assist lambdas;
- halving the selected player goal lambda reduced P10+ from 0.201441 to 0.135675;
- C0159 current fixture rows contain explicit bounded signed change reasons;
- C0166 current fixture rows contain explicit signed home/away evidence adjustments;
- current tactical selector resolves audited GW4 rows to calibrated v0.1.1;
- current role profiles adopt realized categorical roles while retaining quantitative base-profile semantics;
- full-pool optimizer evidence remains `OPTIMIZED_READ_ONLY`, `decisioning=false`, `writes_manager_plan=false`.

These are engineering proofs only, not player/squad recommendations.

## Production migrations

- `20260907202317_c0213_p4_behavioral_provenance_and_consumption_governance_v01`
- `20260907202359_c0213_p4_tracker_consumption_scope_refinement_v02`
- `20260907202942_c0213_p4_rerunnable_behavioral_audit_and_contract_seed_v03`

## Canonical documentation

P4 completes the C0213 architecture package:

- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`

## Final technical state before C0213 tracker closure

- registry integrity: green
- system consolidation: green
- required capability gaps/contradictions: 0
- active duplicate cron targets: 0
- active retired external deployments: 0
- behavioral production proof: 14/14
- tracker consumption contracts: 61/61
- global tracker governance: green
- GW4 manager plan: not authorized by C0213 itself; current decision readiness remains a separate next-step gate.
