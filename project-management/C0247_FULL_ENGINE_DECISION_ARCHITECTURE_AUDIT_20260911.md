# C0247 — Full Engine Decision-Architecture & Over-Engineering Audit

Date: 2026-09-11
Status: AUDIT COMPLETE / DOCUMENTATION CLOSEOUT PENDING
Parent: C0213
Model effect: NONE

## Executive judgment

The production forecasting core is currently structurally healthy. The main risk has moved downstream into FPL decision architecture: too many partially overlapping decision-control stages are operating around a static multi-GW squad objective that does not yet model the true weekly transfer state transition.

The next improvement should therefore be consolidation, not another independent layer.

## Evidence reviewed

- Live Supabase C0213 architecture registry, component inventory, dependency graph status and governance audits.
- Live change tracker through C0246.
- Current C0228/C0229/C0231/C0232/C0233/C0240 GW4 horizon-5 outputs.
- Current C0234 autonomous final gate source.
- Current full-pool optimizer source.
- C0242 contradiction-control implementation and open integration work.
- GitHub PROJECT_STATE, SYSTEM_ARCHITECTURE, MODEL_REGISTRY, WEEKLY_DATA_PIPELINE, DECISIONS_AND_HISTORY and project-management closeouts.
- Repository metadata and source layout.

## 1. Forecast/model core — GREEN

Current live registry:

- 720 registered components total.
- 14 production-effect components.
- 14/14 current behavioral-consumption PASS.
- 19/19 required capabilities present with zero contradictions.
- 83/83 governed implemented rows have explicit consumption contracts.
- zero active duplicate cron targets.
- zero active retired external deployments.
- historical/forward integrity rules remain fail-closed.

The live production player stack uses `private.fpl_fixture_goal_lambda_v03` and `private.fpl_fixture_assist_lambda_v03`; older v02 functions are retired rollback artifacts.

Conclusion: there is no evidence that uncontrolled research models are numerically contaminating current xPts. The present weakness is decision optimization, not forecast-stack sprawl.

## 2. Architecture size / over-engineering warning — AMBER

Live lifecycle counts:

- INFRASTRUCTURE: 467
- PRODUCTION: 14
- RESEARCH: 127
- SHADOW: 89
- RETIRED: 21
- UI_ONLY: 2

The numerical core is small, but the machinery surrounding it is large. Complexity is acceptable only when a component provides a unique auditable function. New controls should not be created as separate production stages when they are naturally part of one state-transition decision problem.

## 3. Static 5-GW optimizer gap — RED

The current optimizer evaluates a candidate XV across the horizon using fixed weights `[1,.82,.68,.56,.46]`. It does not simulate the real weekly state transition:

`GW t squad + bank + FT inventory -> action -> points -> price/information update -> +1 FT -> GW t+1 state`.

C0240 currently tests only immediate transfer-count paths:

- current FT allowance;
- current FT + one hit;
- current FT + two hits.

It does not compare, for example, four transfers now against two transfers now plus two free transfers available next Gameweek.

Therefore the 5-GW objective is not a complete strategy objective. A static XV can appear superior because upgrades are assumed to exist for all five GWs even when an alternative can acquire similar assets later for free.

## 4. XI versus XV weighting — AMBER/RED

The engine does not value XI and bench equally: the full-pool optimizer currently uses a default bench weight of 0.12. That is directionally correct.

The remaining defect is that one generic bench weight is used inside a static-XV horizon. In a normal Gameweek, bench value should primarily reflect expected autosub contribution, resilience and future option value. In a Bench Boost Gameweek, all four bench players receive 100% scoring value.

A fixed generic bench weight can still make early bench strengthening look more valuable than waiting for future free transfers, especially when a hit is involved.

## 5. Forward-management layer is only an approximation — RED

C0231 currently models premium access through budget/position/club-slot checks and explicitly labels its two-transfer logic a conservative approximation. It counts changes required but does not optimize the sequence and timing of those changes across future weekly FT accrual.

This means C0231 should not coexist indefinitely with a separate C0245 sequential planner as two competing notions of forward management. C0245 should replace/subsume the approximation once validated.

## 6. Chip architecture is incomplete — RED

C0234 currently checks Wildcard availability and blocks Wildcard when season-level opportunity cost is unavailable. `seasonChipOpportunityModelReady=false` is hard-coded.

There is no equivalent timing optimizer for Bench Boost, Triple Captain or Free Hit, and no comparison of chip timing across the remaining first-half windows.

Chip timing belongs inside the same multi-GW state-transition planner because chips change both scoring and future state. It should not become a disconnected scoring layer.

## 7. Price movement — AMBER

Price history and exact selling-price rules exist, and C0242 can detect when a named challenger becomes infeasible after a price move. However, the engine currently reacts after the state changes; it does not evaluate predicted overnight price movement as execution-timing risk.

Price movement should affect feasibility and timing, not player xPts.

## 8. Decision-layer overlap — AMBER/RED

Current downstream stack contains:

- C0227 uncertainty
- C0228 diverse ensemble
- C0229 structural control
- C0230 shadow team-regime diagnostic
- C0231 forward management
- C0232 OR/rank utility
- C0233 adversarial red team
- C0234 final gate
- C0237 live publication
- C0240 final adversarial optimization
- C0242 contradiction control

C0233 and C0240 both perform adversarial/challenger functions. C0231 overlaps the intended sequential planning problem. C0234 contains incomplete chip logic that overlaps planned C0244. C0242 contains price-sensitive legality that overlaps part of planned C0243.

These are not all useless, but the boundaries are no longer minimal.

## 9. C0242 — valuable control, incomplete integration

C0242 fixes a real failure mode: serious challengers disappearing across reruns and nominal captaincy being mistaken for a meaningful edge.

It remains In Progress because it is not yet integrated into C0234 final authorization or C0237 publication, and its legal dispatch/capture path still requires deterministic verification.

Complete C0242 before creating another decision-control runtime.

## 10. Documentation drift — RED

Before C0247:

- `PROJECT_STATE.md` stopped at C0237/C0238 and contained an obsolete GW4 publication.
- `SYSTEM_ARCHITECTURE.md` still described the C0213-era 3-GW decision path.
- `MODEL_REGISTRY.md` still referenced retired v02 player goal/assist lambdas.
- `WEEKLY_DATA_PIPELINE.md` still described the primary prospective state as three Gameweeks.
- `DECISIONS_AND_HISTORY.md` did not contain C0240-C0246 decisions.
- GitHub repository metadata had no description.
- No repository `skills/` operating skill existed.

Live Supabase/runtime remains authoritative when documentation disagrees.

## 11. Orphan / traceability finding — AMBER

`EDGE_FUNCTION:c0120-historical-correct-score` remains an active research-only component but is not represented in the current repository. It has zero production model effect, so this is not an FPL xPts risk, but it is a source-control/traceability defect and should be reconciled separately rather than silently deleted.

## 12. Recommended target architecture

Do **not** implement C0243-C0246 as four independent production layers.

Consolidate their requirements into one minimum **Multi-GW Decision Planner** that owns:

1. current squad, bank, purchase/selling prices and FT inventory;
2. weekly +1 FT accrual and roll limits;
3. legal transfers/hits and staged transfer sequences;
4. XI-first scoring with state-dependent bench value;
5. price-movement feasibility/timing risk;
6. Wildcard/BB/TC/FH as alternative state-transition actions;
7. comparison to ROLL and to future information value;
8. exact reachable path to high-value/ideal structures;
9. uncertainty/no-meaningful-edge classification.

Then retain one final fail-closed authorization gate. Existing C0227/C0229/C0232 diagnostics can feed the planner/gate where they add unique information. C0233/C0240/C0231 responsibilities should be reviewed for consolidation rather than preserved merely because they exist.

## 13. Over-engineering admission rule

A proposed layer should be rejected or merged unless it passes all of:

- fixes a demonstrated decision error or material blind spot;
- adds information not already represented elsewhere;
- has a falsifiable/inspectable output;
- changes decisions only through an explicit consumption contract;
- can be regression-tested;
- expected decision value exceeds added architecture/maintenance risk.

More gates are not automatically safer. Redundant gates can create contradictory authorities and make the engine harder to reason about.

## 14. Pending-item disposition

C0243-C0246 remain Planned / Design Pending and must not be implemented without explicit user authorization. Their requirements are valid, but C0247 recommends consolidating them before coding.

## 15. Integrity

C0247 changes no player projection, fixture forecast, model coefficient, historical record, manager plan, transfer or chip state. It is architecture audit/documentation/governance only.