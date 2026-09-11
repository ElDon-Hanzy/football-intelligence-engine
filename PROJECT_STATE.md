# Football Intelligence Engine — Project State

_Last updated: 2026-09-11 (Dubai) — through C0247 architecture audit_

## 1. Mission

Build one chronology-safe football intelligence engine with two linked products:

1. FPL decision intelligence with one objective: maximize the probability of finishing #1 Overall, or maximize expected final rank if #1 becomes unrealistic.
2. Football market-mispricing research that earns production use only through chronology-safe forward validation.

Canonical project description: `PROJECT_DESCRIPTION.md`.

## 2. Immutable rules

- Historical forecasts/decisions are append-only and never rewritten with hindsight.
- Completed-match evidence may update future decisions only.
- Missing data is unknown, never zero.
- Unvalidated research/shadow evidence has zero numeric production effect.
- Projection readiness is not decision readiness.
- Every meaningful FPL action compares with ROLL.
- Expected minutes, tactical role and fixture quality are structural gates.
- Ownership/EO has zero direct xPts effect.
- Statistically indistinguishable choices are `NO_MEANINGFUL_EDGE`.
- Captaincy is optimized separately from the squad.
- Serious prior challengers persist until explicitly resolved on current state/lineage.
- Live Supabase/runtime evidence outranks documentation when they disagree.
- More layers are not automatically better; prefer consolidation when responsibilities overlap.

## 3. Production sources of truth

- Supabase: `knooiwezzsxcwhtjtdap`
- GitHub: `ElDon-Hanzy/football-intelligence-engine`
- FPL Team ID: `3559923`
- Engineering ledger: `public.change_tracker_working`
- Architecture registry: C0213 machine-readable inventory/dependency/governance surfaces.

Current live governance at C0247 audit:

- tracker rows before C0247 closeout: 171
- production-effect components: 14
- behavioral consumption: 14/14 PASS
- required capabilities: 19/19, zero contradictions
- governed implemented rows requiring consumption contracts: 83/83 covered
- active duplicate cron targets: 0
- active retired external deployments: 0
- total registered components: 720

## 4. Canonical production forecast core

The live production-effect stack remains compact and behaviorally tested:

`RESULTS / FPL / FOOTBALL SOURCES`
→ canonical player/team/role/fixture state
→ C0159 fixture derivative
→ C0166 production fixture forecast
→ `private.fpl_adjusted_team_lambda_v01`
→ `private.fpl_fixture_goal_lambda_v03`
→ `private.fpl_fixture_assist_lambda_v03`
→ `private.fpl_current_event_distribution_v01`
→ `private.generate_upcoming_fpl_projection_core_v01`
→ full-pool optimizer.

Realized tactical roles are factual production state. Research/shadow families remain non-numeric unless separately promoted.

## 5. Current FPL decision architecture

Current live downstream sequence is approximately:

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 diverse structural ensemble/equivalence
→ C0229 structural robustness
→ C0230 shadow team-regime diagnostic (zero numeric effect)
→ C0231 forward-management approximation
→ C0232 OR/rank utility
→ C0233 adversarial red team
→ C0240 final adversarial optimization
→ C0234 fail-closed final authorization
→ C0237 live publication
→ final/execution ledger only if authorized.

C0241 enforces exact-horizon decision lineage and repeat-idempotency.

C0242 is **In Progress** and adds persistent named challengers plus captaincy equivalence. It is not yet fully integrated into C0234/C0237.

## 6. C0247 architecture finding

The forecast/model core is currently healthy. The main weakness is downstream decision architecture.

The current 5-GW optimizer evaluates a largely static XV across the horizon. C0240 searches immediate transfer counts (current FTs, +1 hit, +2 hits) but does not simulate the weekly state transition in which a new FT arrives each Gameweek and the squad can be re-optimized after new information/prices.

C0231 approximates one-/two-transfer premium access but does not solve the sequential transfer path.

The optimizer already discounts bench points (default bench weight 0.12), so it does **not** value XI and bench equally. The remaining issue is a fixed generic bench weight inside a static-XV horizon; normal-GW bench value should differ materially from Bench Boost scoring value.

Detailed evidence: `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`.

## 7. Pending architecture requirements — NOT AUTHORIZED FOR IMPLEMENTATION

- C0243 — Price Movement & Transfer Timing Control
- C0244 — Chip Timing & Opportunity-Cost Optimizer
- C0245 — Sequential FT Utilization & Ideal-Squad Path Planner
- C0246 — XI Priority, Bench Leakage & Hit Penalty Recalibration

C0247 recommendation: do **not** implement these as four independent production layers. Consolidate the valid requirements into the minimum multi-GW state-transition decision planner after explicit user authorization.

## 8. Multi-GW target design

The future planner should model state explicitly:

`Squad + bank + purchase/selling prices + FT inventory + chip inventory + current information`
→ legal action (ROLL / transfers / hits / chip)
→ GW scoring (XI-first, captaincy separate, state-dependent bench value)
→ price/information update
→ +1 FT at next Gameweek
→ re-optimization.

It should compare reachable normal-transfer paths with Wildcard, Bench Boost, Triple Captain and Free Hit timing while preserving chip scarcity and future option value.

Price predictions affect execution timing/feasibility, not xPts.

## 9. Current GW4 decision state

No external transfer or chip has been executed by the engine.

Current manager state remains 3 FTs, £0.0m ITB and £99.6m liquidation value unless superseded by a newer authoritative manager-state snapshot.

The current C0240 5-GW adversarial survivor is a 4-transfer / -4 structure, but it is **not final authorization** and its strategic superiority is contested by the newly identified sequential-FT/static-XV architecture gap.

A serious current challenger is the 2FT path:

- O'Reilly → De Cuyper
- Mosquera → Guéhi
- roll one FT

Its exact constrained static-horizon objective is lower than the C0240 survivor, but that comparison does not yet price the extra FT entering GW5, extra liquidity or future re-optimization correctly.

The older 3FT Guéhi + De Cuyper + Barry challenger is currently infeasible by £0.1m after O'Reilly's price fall; it was not defeated on football merit.

Captaincy current formal class: `NO_MEANINGFUL_EDGE` among the leading candidates inside the production error band. A nominal optimizer captain must not be presented as having a meaningful edge.

## 10. Chip state

C0234 currently contains only partial Wildcard logic and hard-codes the season-level chip opportunity model as unavailable when a Wildcard candidate appears.

There is no complete BB/TC/FH timing optimizer yet. Do not infer that chip availability equals chip desirability.

## 11. Documentation / source-control state

C0247 added:

- `PROJECT_DESCRIPTION.md`
- `skills/fie/SKILL.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`

GitHub repository metadata currently has no repository-description field set. `PROJECT_DESCRIPTION.md` is the canonical written description until repository metadata / product Project settings are separately updated through their supported UI/API.

One active research-only orphan remains: `EDGE_FUNCTION:c0120-historical-correct-score` is present in the live registry but absent from current repository source. It has zero production model effect and should be reconciled separately, not silently deleted.

## 12. Immediate sequence

1. Complete/document C0247 governance closeout.
2. Complete C0242 integration/regression verification before adding another downstream runtime.
3. Keep C0243-C0246 design-only until explicit user authorization.
4. When authorized, first consolidate their requirements into one minimum multi-GW planner rather than blindly implementing four layers.
5. Preserve the Sep 12 14:30 Dubai T−2 final-information refresh requirement for GW4.
6. Do not execute external FPL transfers/chips or mutate a final manager plan without final authorization.

## 13. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0242_DECISION_CONSISTENCY_CORRECTION_20260911.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`