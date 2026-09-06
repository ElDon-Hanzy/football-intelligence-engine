# C0213 P2 — Orchestration & Readiness Lineage

Date: 2026-09-06
Status: Executed / verification in progress
Change: C0213

## Purpose

Separate numerical projection readiness from decision readiness and make the complete FPL production chain observable and fail-closed.

Canonical decision chain:

`RESULTS → FPL CURRENT DATA → REALIZED ROLES → PLAYER STATE → TEAM STATE → TACTICAL FIXTURE STATE → C0166 FIXTURE PROJECTION → PLAYER PROJECTION → POINT DISTRIBUTION → MANAGER STATE → FULL-POOL OPTIMIZER → DECISION READINESS → SAVED MANAGER PLAN`

Projection readiness does not imply decision readiness.

## Three-Gameweek production horizon

Five upstream production crons previously maintained only the first two future Gameweeks. P2 changes their canonical commands to maintain the first three future Gameweeks:

- role/tactical refresh
- forward fixture forecast refresh
- fixture team feature snapshots
- forward enriched refresh
- C0159/C0166 production fixture refresh

This matches the minimum 3–5 GW decision horizon instead of creating an optimizer that silently depends on missing GW+2 inputs.

## Strict C0166 horizon gate

`private.c0213_p2_horizon_readiness_v02(gw,horizon)` requires, for every horizon Gameweek:

- all future FPL fixtures present,
- an exact current `production_fixture_v0.3_c0166` forecast for every fixture,
- 10 tactical signals per fixture,
- 2 team feature rows per fixture,
- a current active-model FPL prediction run newer than the C0166 inputs and current player state,
- complete point distributions,
- projectable row count equal to generated projection rows,
- zero ungoverned missing players.

Structural `forward_fixture_v0.1.3` rows cannot satisfy this gate.

## Optimizer input identity

The decision-grade full-pool optimizer is tied to an immutable input signature including:

- target Gameweek,
- horizon,
- active model id,
- exact prediction run ids across the horizon,
- manager-state snapshot id,
- free transfers,
- budget,
- transfer cost,
- bench weight,
- model-error margin,
- horizon weights.

A later projection or manager-state refresh changes the signature and invalidates the older optimizer result for decision readiness.

## Single-step projection reconciliation

The legacy C0160 projection core uses transaction-scoped temporary tables and cannot be invoked twice in the same database transaction without a temp-table collision. P2 preserves the model implementation and reconciles at most one stale horizon Gameweek per orchestration transaction. The scheduled orchestrator advances until the complete horizon is current.

Behavioral proof on 2026-09-06:

- GW4: run 1295 — 604 projections / 604 distributions
- GW5: run 1298 — 604 projections / 604 distributions
- GW6: run 1299 — 604 projections / 604 distributions
- all three aligned to exact C0166 production inputs
- horizon projection readiness = true
- no decision snapshot was saved for GW5 or GW6 because decision readiness was red

## Manager-state and manager-plan boundary

Missing manager state is not interpreted as zero.

For GW4 there is currently no authoritative manager-state snapshot because GW3 is not final. Therefore the optimizer orchestrator stops at `WAITING_FOR_MANAGER_STATE` and does not dispatch a decision-grade optimizer run.

`private.c0213_guard_manager_plan_insert_v01()` is a BEFORE INSERT trigger on `public.fpl_manager_plans` for future/pre-deadline Gameweeks. It requires the composite P2 decision gate to be green.

Behavioral probe:

- attempted synthetic GW4 manager-plan write,
- inserted rows: 0,
- block ledger: `MANAGER_PLAN_READINESS_BLOCKED`,
- surviving GW4 manager plans: 0.

Historical/post-deadline records remain append-only and are not blocked by this future-decision gate.

## Current GW4 state

Numerical projection horizon: READY.
Decision pipeline: BLOCKED.

Current legitimate blockers:

1. `PRIOR_GAMEWEEK_NOT_FINAL` — GW3 is still in progress.
2. `C0166_C0167_NOT_READY` — decision-evidence/fact-card gate is red.
3. `MANAGER_STATE_NOT_READY` — no authoritative GW4 FT/bank snapshot yet.
4. `FULL_POOL_OPTIMIZER_NOT_CURRENT` — decision-grade optimizer cannot run until manager state exists and therefore has no current immutable input signature.

No GW4 transfer, captaincy, XI, chip or manager plan was created.

## API / UI exposure

`public.engine_diagnostics_status_v01(gw)` now exposes P2 lineage and optimizer orchestration and is service-role-only.

Edge Functions:

- `engine-diagnostics-api` v3 exposes `orchestration_readiness` and `optimizer_orchestration`.
- `fpl-manager-plan-api` v4 exposes `readiness` and `optimizer_orchestration` alongside the saved plan/state/actual action.

Frontend v2:

- Engine page displays Projection READY/BLOCKED independently from Decision READY/BLOCKED and lists blockers.
- FPL workspace displays a fail-closed decision-pipeline state and blocker list when no saved plan is allowed, instead of implying a recommendation from current projections.

## Invariants

- Missing data is not zero.
- Historical forecasts are not rewritten.
- Research state is not production effect.
- Current projections can exist while decision writes are blocked.
- Full-pool optimizer is read-only and cannot create a manager plan.
- A saved manager plan remains a downstream authoritative artifact and cannot be written before the P2 decision gate is green.
