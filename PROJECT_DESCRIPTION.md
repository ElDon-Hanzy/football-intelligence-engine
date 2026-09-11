# Football Intelligence Engine — Project Description

_Last reviewed: 2026-09-11 (Dubai) — through C0248 Checkpoint J_

## Mission

Build a chronology-safe football intelligence and decision system with two linked products:

1. **Fantasy Premier League decision intelligence** — maximize the probability of finishing #1 Overall by optimizing future points, captaincy, transfers, chips, squad structure and risk under uncertainty.
2. **Football market research** — identify football-context mispricing only when it survives chronology-safe validation and forward evidence.

## FPL operating doctrine

- Optimize future decisions, not past outcomes.
- Use the full available player pool, but value the starting XI and captaincy correctly relative to bench assets.
- Expected minutes, tactical role and fixture quality are structural gates.
- Evaluate xPts together with blank/haul distributions, Defensive Contributions, bonus, clean-sheet probability, set pieces and rotation risk.
- Always compare ROLL/no transfer.
- Treat hits, free-transfer inventory, bank, selling values, future flexibility, club slots and access to premiums as real opportunity costs.
- Captaincy is a separate optimization problem.
- Ownership/EO does not directly change xPts; it is downstream rank/leverage context only.
- Research/shadow intelligence has zero production numeric effect until its registered validation gate passes.
- If plausible assumptions make the recommendation flip, classify it as no meaningful edge.
- Preserve serious prior challengers until they are explicitly resolved against the same current state.
- Historical forecasts and decisions are append-only; hindsight never rewrites them.

## Architecture principle

Production truth is live Supabase runtime/registry evidence. GitHub documents explain the system but never outrank live production evidence when they disagree.

The forecasting core should remain small, auditable and behaviorally tested. Downstream FPL decisions should converge toward one multi-Gameweek state-transition planner plus one fail-closed authorization gate, rather than accumulating overlapping independent decision layers.

C0243-C0246 have been consolidated into C0248 rather than implemented as separate production stacks. C0244 chip opportunity cost and C0245 FT/flexibility option value are now sub-controls of C0248.

## Anti-over-engineering rule

Do not add a layer merely because a useful concept exists. A new production component must fix a demonstrated decision failure, provide unique information, have a falsifiable output, possess a clear consumption contract and justify its maintenance/complexity cost.

Consolidation is preferred over parallel decision surfaces. Legacy components may be retired only after live dependency evidence proves their unique responsibilities have been replaced.

## Current engineering priority

C0248 is the active architecture-consolidation program.

Current state:

- C0244 first-half chip opportunity control: **Completed / Verified** inside C0248.
- C0245 sequential FT/flexibility/future-information option value: **Completed / Verified** inside C0248.
- C0248 canonical decision-control: live and mandatory as a supervisory gate.
- C0248 sequential planner: still **shadow-only / not production-selected**.
- C0234 remains the fail-closed final authorization gate.
- C0237 remains the always-live publication surface.
- C0240 remains the active normal-transfer survivor/benchmark until C0248 satisfies its original cutover contract.

Current C0248 cutover blockers are concrete rather than conceptual: exact/conservative legal autosub simulation, broader paid-transfer action generation, explicit WC/FH/BB/TC planner transitions, canonical Wildcard candidate generation, path-level affordability scenarios, and changing C0234 normal-action authority from the C0240 survivor to the selected C0248 path.

No legacy decision component should be physically retired before that verified cutover.

Canonical sources:

- `PROJECT_STATE.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`
- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- `project-management/C0248_CHECKPOINT_I_C0244_MATURE_FIRST_HALF_CHIP_CONTROL_20260911.md`
- `project-management/C0248_CHECKPOINT_J_CUTOVER_READINESS_AND_LEGACY_DISPOSITION_20260911.md`
- live `public.change_tracker_working`
- live C0213 architecture and behavioral-consumption registries
