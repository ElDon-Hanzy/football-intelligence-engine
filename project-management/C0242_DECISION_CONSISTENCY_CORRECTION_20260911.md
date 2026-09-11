# C0242 — Decision Consistency / Contradiction Control

Date: 2026-09-11
Status: IN PROGRESS
Parent: C0241

## Problem

GW4 PRE_FINAL outputs contradicted one another because serious prior challengers were not guaranteed to remain in the decision set across reruns, and nominal captaincy output from the squad optimizer could be presented as a meaningful edge even when candidate means were inside model error.

## Corrective controls implemented

1. `public.fpl_named_challenger_registry`
   - Persists serious manual/prior alternatives by exact 15-player squad.
   - Prevents a challenger from disappearing merely because a later optimizer did not regenerate it.

2. `public.fpl_named_challenger_evaluations`
   - Records current legality, budget state, exact-evaluation request/result and resolution state.
   - Resolution states include `INFEASIBLE_CURRENT_STATE`, `BEATEN`, `EQUIVALENT`, and future reattack-required states.

3. `private.c0242_precheck_named_challenger_v01()`
   - Recomputes exact legality from the latest manager state, current prices, purchase prices and FPL selling-value rules.
   - Missing/changed price state is not silently treated as the same decision state.

4. `private.c0242_dispatch_named_challenger_v01()` / `private.c0242_capture_named_challenger_v01()`
   - Legal named challengers can be forced through the canonical same-horizon full-pool optimizer.
   - Comparison uses the current C0240 survivor and the production model-error band.

5. `private.c0242_captaincy_equivalence_gate_v01()`
   - Captaincy is evaluated separately from the squad optimizer.
   - Candidates within the captaincy mean-error band are classified `NO_MEANINGFUL_EDGE`.
   - The output exposes nominal mean leader, haul-tail leader, floor leader and the full equivalent set.

6. `private.c0242_consistency_status_v01()` + service-role bridge
   - Re-runs named-challenger legality against current state every time.
   - A challenger becoming legal again cannot remain silently marked resolved from an older price state.

## GW4 finding that explains the apparent contradiction

Named challenger: O'Reilly→Guéhi, Mosquera→De Cuyper, Kusi-Asare→Barry; Palmer and Semenyo retained.

- Current liquidation budget: 996 tenths (£99.6m)
- Current exact squad cost: 997 tenths (£99.7m)
- Current result: `INFEASIBLE_CURRENT_STATE / OVER_BUDGET_1_TENTHS`
- O'Reilly price history: £6.5m through 2026-09-10 20:05 UTC, then £6.4m at 2026-09-11 00:05 UTC.
- Therefore the structure that was exactly affordable yesterday became £0.1m unaffordable today. This must be described as a price-state change, not as an optimizer reversing its football opinion.

## GW4 captaincy finding

Prediction run: 1356
Mean error band: 1.0 point
Decision class: `NO_MEANINGFUL_EDGE`

- Gabriel: nominal mean leader, 6.174 xPts; lowest blank probability in the candidate set.
- Saka: haul-tail leader.
- Bruno Fernandes, Mbeumo and João Pedro also sit inside the 1.0-point equivalence band.

Production communication must therefore not claim that Gabriel has a meaningful captaincy edge merely because he is the optimizer's nominal captain.

## Remaining closeout work

- Integrate C0242 consistency status into C0234 final authorization so unresolved legal named challengers fail closed.
- Surface captaincy equivalence and named-challenger resolution in C0237 live publication/UI.
- Add deterministic regression cases for price-state invalidation, challenger reactivation, exact same-horizon evaluation and captaincy equivalence.
- Re-run tracker/consumption/behavioral governance after integration.

## Integrity

- No xPts rewrite.
- No historical forecast rewrite.
- No manager-plan mutation.
- No external FPL transfer or chip execution.
- Ownership has zero direct xPts effect.
- Research/shadow models remain zero numeric production effect.
