# Football Intelligence Engine

Chronology-safe football intelligence for **Fantasy Premier League decision optimization** and **football market research**.

The FPL objective is to maximize the probability of finishing #1 Overall by optimizing future points, captaincy, transfers, chips, squad structure and risk under uncertainty. Research/shadow intelligence remains non-numeric until it passes its registered validation gate.

## Current architecture principle

The production forecast core is deliberately small and behaviorally audited. Downstream decision logic is being consolidated under C0247 so the system does not accumulate overlapping gates and optimizers.

Pending price timing, chip timing, sequential free-transfer planning and XI/bench weighting requirements are **not yet authorized for implementation**; the preferred target is one multi-Gameweek state-transition planner plus one fail-closed final authorization gate.

## Canonical references

- [`PROJECT_DESCRIPTION.md`](PROJECT_DESCRIPTION.md)
- [`PROJECT_STATE.md`](PROJECT_STATE.md)
- [`SYSTEM_ARCHITECTURE.md`](SYSTEM_ARCHITECTURE.md)
- [`MODEL_REGISTRY.md`](MODEL_REGISTRY.md)
- [`WEEKLY_DATA_PIPELINE.md`](WEEKLY_DATA_PIPELINE.md)
- [`DECISIONS_AND_HISTORY.md`](DECISIONS_AND_HISTORY.md)
- [`skills/fie/SKILL.md`](skills/fie/SKILL.md)
- [`project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`](project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md)

Live Supabase runtime/registry evidence outranks documentation when they disagree.