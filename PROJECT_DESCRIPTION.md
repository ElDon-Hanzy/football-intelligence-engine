# Football Intelligence Engine — Project Description

_Last reconciled: 2026-09-17 (Dubai) — C0278 whole-engine closeout_

## Mission

Build a chronology-safe football intelligence and decision system with two linked products:

1. **Fantasy Premier League decision intelligence** — maximize the probability of finishing #1 Overall by optimizing future points, captaincy, transfers, chips, squad structure and risk under uncertainty.
2. **Football market research** — identify football-context mispricing only when it survives chronology-safe validation and forward evidence.

## FPL operating doctrine

- Optimize future decisions, not past outcomes.
- Optimize the whole XV and reachable future squad states, not players independently.
- Expected minutes, tactical role and fixture quality are structural gates.
- Evaluate xPts with blank/haul distributions, Defensive Contributions, bonus, clean-sheet probability, set pieces and rotation risk.
- Always compare ROLL/no transfer.
- Treat hits, FT inventory, bank, selling values, future flexibility, club slots, bench leakage and premium access as opportunity costs.
- Captaincy is a separate optimization problem.
- Ownership/EO has zero direct xPts effect; it is downstream rank/leverage context only.
- Research/shadow intelligence has zero numeric production effect until its registered validation gate passes.
- If plausible assumptions make the recommendation flip or the edge sits inside normal model error, classify it as `NO_MEANINGFUL_EDGE` and do not force action.
- Historical forecasts and decisions are append-only; hindsight never rewrites them.

## Source-of-truth and architecture principle

Authority order:

1. live Supabase runtime/data and architecture registry;
2. tracker/C0213 governance evidence;
3. current GitHub source and migrations;
4. canonical documentation;
5. historical handovers/summaries.

The forecasting core remains small, auditable and behaviorally tested. Downstream FPL decisions converge through one canonical sequential selected-path authority and one fail-closed authorization boundary rather than overlapping independent selectors.

## Current canonical decision architecture

```text
FULL-POOL OPTIMIZER
→ C0227 uncertainty
→ C0228 ensemble/equivalence
→ C0229 structural robustness
→ C0231 forward-management evidence
→ C0232 OR/rank utility
→ C0233 red-team evidence
→ C0240 adversarial benchmark
→ captaincy / named-challenger consistency
→ C0248 canonical sequential selected-path authority
→ C0234 / C0276 fail-closed final authorization
→ C0237 publication
→ external execution only if separately authorized
```

C0230 is advisory/nonblocking and has zero numeric production effect. C0240 is an adversarial benchmark, not the selected-path authority. C0248 is the sole selected-path authority. C0276 is the bounded autonomous control plane around this chain; it is not another optimizer.

## Current engineering state

C0278 whole-engine reconciliation is **Completed / Verified**. Current live C0213 evidence at reconciliation shows:

- architecture registry integrity: green;
- system consolidation: green;
- production-effect components: 14;
- behavioral consumption: 14/14 current PASS;
- required capabilities: 19/19;
- tracker consumption governance: 99/99 covered;
- active duplicate cron targets: 0;
- active retired external deployments: 0.

C0276 remains **In Progress** as the bounded autonomous decision-cycle controller. Current GW5 lineage has reconverged through projection 1401 and C0248 sequential candidate run 38. FINAL_GATE remains governed by the T−2 timing/authorization contract; no transfer or chip execution is implied.

C0277 Seasonal Chip Option-Value Optimizer is **In Progress**. It exists because short-horizon chip roots do not by themselves establish the best season-level chip week. Until reservation value and broader first-half chip timing survive the C0277 uncertainty, Noise-Control and red-team gates, chip authorization remains fail-closed where evidence is incomplete.

## Protected governance states

- **C0265:** Open / Planned / Critical. The xMins hard-anchor bug remains deliberately unchanged pending separate authorization.
- **C0270:** shadow prospective coincidence diagnostics remain frozen; no causal inference from numerical coincidence.
- **C0240 concurrency:** unchanged unless separately validated/authorized.
- **C0230:** advisory/nonblocking.
- Actual submitted team, recommendation, frozen decision evidence and realized outcome remain separate semantic lanes.
- `FINAL` or publication never means external FPL execution was authorized.

## Anti-over-engineering rule

Do not add a production layer merely because a useful concept exists. A component must fix a demonstrated failure, add unique information, have a falsifiable output and explicit consumption contract, and justify maintenance cost. Prefer consolidation over parallel authorities. Preserve rejected research and negative evidence without allowing it to accumulate production effect.

## Canonical sources

- `PROJECT_STATE.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`
- `project-management/C0277_SEASONAL_CHIP_OPTION_VALUE_OPTIMIZER_PLAN_20260916.md`
- live `public.change_tracker_working`
- live C0213 architecture and behavioral-consumption registries
