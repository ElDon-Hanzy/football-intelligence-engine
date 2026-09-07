# Football Intelligence Engine — System Architecture

_Last updated: 2026-09-07 — C0213 canonical architecture_

## 1. Purpose

The Football Intelligence Engine has two linked products:

1. **FPL decision intelligence** — maximize future season-long FPL points and rank through projected minutes, player/event distributions, fixture intelligence, full-pool squad optimization, captaincy/bench logic and fail-closed decision readiness.
2. **Betting / market-mispricing research** — test whether football context creates forecast or market value that survives chronology-safe holdout and genuine forward validation.

Historical forecasts are immutable. Completed-match evidence may update only future projections. Missing data is never converted to zero. Research output cannot acquire production effect merely because it exists in the codebase.

## 2. Sources of truth

Production truth is reconciled in this order:

1. live Supabase runtime and `public.change_tracker_working`;
2. C0213 machine-readable architecture registry and dependency graph;
3. GitHub implementation artifacts and migrations;
4. this architecture package and `PROJECT_STATE.md`;
5. historical handovers / legacy registries.

The legacy `public.engine_component_versions` and `public.research_experiment_registry` remain historical references and are **not authoritative**.

## 3. Component lifecycle contract

Every architecture component has exactly one lifecycle:

- `PRODUCTION` — active runtime path or state with genuine production effect;
- `SHADOW` — runs prospectively but cannot affect production decisions;
- `RESEARCH` — offline/diagnostic/evaluator work;
- `UI_ONLY` — presentation without model effect;
- `INFRASTRUCTURE` — orchestration, storage, API, diagnostics, governance or ingestion plumbing;
- `RETIRED` — preserved historical component with no live production consumer.

Lifecycle is separate from `canonical_status`, which can be `CANONICAL`, `SUPPORTING`, `DUPLICATE`, `LEGACY_ROLLBACK`, `ORPHANED`, `CANDIDATE` or `REJECTED`.

Primary machine-readable surfaces:

- `private.c0213_component_inventory_v01`
- `private.c0213_component_dependency_graph_v01`
- `private.c0213_required_capabilities`
- `private.c0213_architecture_registry_status_v01()`

## 4. Production FPL architecture

Canonical path:

```text
FPL / RESULTS / FOOTBALL SOURCES
        ↓
INGESTION
        ↓
CANONICAL PLAYER + TEAM + ROLE + FIXTURE STATE
        ↓
FIXTURE PROJECTION (C0159 → C0166)
        ↓
PLAYER PROJECTION CORE
        ↓
POINT DISTRIBUTION
        ↓
3-GW FULL-POOL OPTIMIZER
        ↓
DECISION READINESS / NOISE-CONTROL GATE
        ↓
SAVED MANAGER PLAN
        ↓
FPL APIs / UI
```

### 4.1 Canonical ingestion / state

- Results: `EDGE_FUNCTION:sync-gw-results`
- FPL source data/prices: `EDGE_FUNCTION:sync-fpl-data`
- Player state: `EDGE_FUNCTION:refresh-current-player-state`
- Realized tactical roles: `EDGE_FUNCTION:ingest-realized-player-roles`
- Role/tactical fixture state: `EDGE_FUNCTION:refresh-role-tactical-intelligence`
- Current-season team state: `private.refresh_current_season_team_performance_v01`

Realized roles are factual categorical state. C0212/C0213 deliberately do **not** add a new ad-hoc numeric realized-role coefficient. The current role overlay retains the canonical quantitative base profile and changes tactical categorization only.

### 4.2 Fixture projection

The structural fixture path is layered rather than one opaque model:

```text
structural forward fixture baseline
        ↓
C0147 matchup evidence (SHADOW family)
        ↓ bounded production derivative
C0159 production fixture forecast
        ↓ bounded symmetric evidence
C0166 production fixture forecast
        ↓
public.current_production_fixture_prediction_v01
```

C0147 itself remains shadow/research. C0159 consumes a bounded derivative; C0166 adds season-aware symmetric evidence capped at `|0.04|` log-lambda per team. The current fixture selector must surface C0166 rows for decision-grade use.

### 4.3 Player projection and distribution

Canonical production components:

- `private.fpl_adjusted_team_lambda_v01`
- `private.fpl_fixture_goal_lambda_v02`
- `private.fpl_fixture_assist_lambda_v02`
- `private.fpl_current_event_distribution_v01`
- `private.generate_upcoming_fpl_projection_core_v01`
- wrapper/orchestrator: `private.generate_upcoming_fpl_snapshot_v01`

The projection core writes append-only `gameweek_prediction_runs`, `model_predictions` and eligible automated decision snapshots. The outer wrapper enforces C0204 projection-coverage reconciliation before allowing generation.

### 4.4 Two decision systems — intentionally separate

There are two distinct selection layers:

1. **Automated current-15 selector** inside `generate_upcoming_fpl_projection_core_v01`.
2. **Full-pool optimizer + manager decision process** using `fpl-full-pool-optimizer`, Noise-Control and `public.fpl_manager_plans`.

The full-pool optimizer is canonical but **read-only**:

- top ~300 players by expected minutes;
- separate explosive-exception bucket;
- position-specific candidate pools;
- legal 2/5/5/3 squad, max three players per club, ≤ £100m;
- 3–5 GW weighted horizon;
- bench leakage and transfer-cost accounting;
- model-error/no-meaningful-edge classification.

It cannot authorize or save a manager decision. `public.fpl_manager_plans` is authoritative only after decision readiness is green.

## 5. Decision readiness is separate from projection readiness

A successful projection refresh does **not** imply a valid FPL decision.

C0213 P2 formalized the lineage:

1. RESULTS
2. FPL_CURRENT_DATA
3. REALIZED_ROLES
4. PLAYER_STATE
5. TEAM_STATE
6. TACTICAL_FIXTURE_STATE
7. FIXTURE_PROJECTION
8. PLAYER_PROJECTION
9. POINT_DISTRIBUTION
10. MANAGER_STATE
11. FULL_POOL_OPTIMIZER
12. DECISION_READINESS
13. AUTOMATED_CURRENT15_DECISION
14. SAVED_MANAGER_PLAN

Canonical status surface:

- `private.c0213_p2_current_lineage_v03(gw)`
- `private.c0213_decision_readiness_v01(gw)`
- `private.c0213_p2_optimizer_status_v01(gw, horizon)`

Fail-closed guards block automated decision snapshots and future manager-plan inserts when required evidence is not ready. Numerical projections may continue to refresh.

## 6. Prediction-level effect provenance

C0213 P4 adds `private.c0213_prediction_effect_provenance_v01`.

For each saved FPL prediction it exposes:

- baseline prediction ID and baseline xPts;
- net xPts delta from baseline;
- team and opponent lambdas;
- player goal and assist lambdas;
- DC and bonus probabilities;
- event-distribution version;
- current fixture generator;
- parent C0159 snapshot;
- signed C0166 home/away adjustments;
- explicit missing-data and realized-role numeric-effect semantics.

Coverage audit:

`private.c0213_prediction_effect_provenance_status_v01(gw)`

At C0213 closure, GW4 run 1325 has 604/604 baseline, lambda and event-distribution lineage rows; 514/604 differ numerically from their historical baseline.

## 7. Behavioral consumption proof

Static dependencies are not enough. Every component marked `production_effect_enabled=true` must have a current behavioral PASS in `private.c0213_behavioral_consumption_tests`.

Tests are one of:

- `NUMERIC_PERTURBATION`
- `STATE_SELECTION`
- `OUTPUT_LINEAGE`
- `RUNTIME_PROBE`

PASS evidence is bound to the current component definition hash. A function/view/runtime change invalidates prior proof automatically until the audit is rerun.

Canonical controls:

- `private.c0213_component_definition_hash_v01(component_key)`
- `private.run_c0213_behavioral_consumption_tests_v01(gw)`
- `private.c0213_behavioral_consumption_status_v01()`

`system_consolidation_ok` is fail-closed against this behavioral gate.

## 8. Research architecture

Research follows a separate path:

```text
SOURCE
  ↓
FEATURE / MODEL
  ↓
SHADOW OUTPUT
  ↓
EVALUATOR / ABLATION
  ↓
PROMOTION OR REJECTION GATE
```

Research is never promoted by code presence or one good outcome. Implemented model-effect work must have one explicit consumption pathway in `private.c0213_change_consumption_contracts`:

- production consumer;
- research evaluator/promotion gate;
- research infrastructure;
- blocked external source;
- program umbrella;
- reconciled legacy evidence.

`private.c0213_tracker_consumption_governance_v01()` and the global tracker audit fail if governed implemented model-effect work has no contract.

## 9. APIs and UI

Canonical boundaries include:

- `fpl-api` — projections / historical frozen automated snapshots;
- `fpl-manager-plan-api` — manager plan/state boundary;
- fixture intelligence/facts APIs — fixture projection/evidence surfaces;
- `engine-diagnostics-api` — readiness/governance diagnostics;
- `frontend-v2` — preferred UI.

Legacy UI remains rollback-only until the separate controlled-cutover item C0176 is explicitly completed.

## 10. Scheduling

The live production schedule is documented in `WEEKLY_DATA_PIPELINE.md`. Important cadence classes include:

- results: every 15 minutes;
- player/source state: hourly or 4-hourly;
- C0166 fixture cycle: four times per hour;
- upcoming FPL projection wrapper: every five minutes;
- realized roles: hourly;
- full-pool optimizer orchestration: four times per hour;
- lineage capture: hourly;
- research near-close/evaluators on their registered independent schedules.

## 11. Security / integrity principles

- No secrets in GitHub or public clients.
- Internal privileged DB functions live in private schema with explicit ACLs and fixed search paths.
- Exposed public tables use RLS/explicit grants where applicable.
- Historical predictions and registered forward cohorts are append-only.
- Missing data is not zero.
- Target-fixture actuals may not enter pre-kickoff state.
- Post-kickoff evidence can update future decisions only.
- `system_consolidation_ok=true` requires no missing/contradictory required capability, no active duplicate cron target, no active retired external deployment, 100% current behavioral proof and green tracker-consumption governance.

## 12. Current architecture state at C0213 closure

- registry integrity: green
- system consolidation: green
- components: 632
- production-effect components: 14
- current behavioral PASS: 14/14
- required capabilities: 19, zero missing/contradictions
- active duplicate cron targets: zero
- active retired external deployments: zero
- implemented governed tracker rows requiring consumption contracts: 61/61 covered
- GW4 prediction-effect provenance: 604/604

This document defines the canonical architecture; detailed model lifecycle is in `MODEL_REGISTRY.md`, scheduling in `WEEKLY_DATA_PIPELINE.md`, and C0213 proof/results in `MODEL_CONSUMPTION_AUDIT.md`.
