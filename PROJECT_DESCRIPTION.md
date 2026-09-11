# Football Intelligence Engine — Project Description

_Last reviewed: 2026-09-11 (Dubai)_

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

## Anti-over-engineering rule

Do not add a layer merely because a useful concept exists. A new production component must fix a demonstrated decision failure, provide unique information, have a falsifiable output, possess a clear consumption contract and justify its maintenance/complexity cost.

## Current engineering priority

C0247 is auditing and consolidating the decision architecture. C0243-C0246 are pending design requirements only; they are not authorized for implementation until explicitly approved.

Canonical sources:

- `PROJECT_STATE.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`
- live `public.change_tracker_working`
- live C0213 architecture and behavioral-consumption registries