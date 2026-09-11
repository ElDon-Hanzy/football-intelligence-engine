# C0242 — Decision Consistency / Contradiction Control

Date: 2026-09-11
Status: COMPLETED / VERIFIED
Parent: C0241

## Problem

GW4 PRE_FINAL outputs contradicted one another because serious prior challengers were not guaranteed to remain in the decision set across reruns, and nominal captaincy output from the squad optimizer could be presented as a meaningful edge even when candidate means were inside model error.

## Production controls

1. `public.fpl_named_challenger_registry`
   - Persists serious manual/prior alternatives by exact 15-player squad.
   - Prevents a challenger from disappearing merely because a later optimizer did not regenerate it.

2. `public.fpl_named_challenger_evaluations`
   - Records current legality, budget state, exact-evaluation request/result and resolution state.
   - Resolution states include `INFEASIBLE_CURRENT_STATE`, `BEATEN`, `EQUIVALENT`, `SURVIVOR`, and reattack-required states.

3. `private.c0242_precheck_named_challenger_v01()`
   - Recomputes exact legality from latest manager state, current prices, purchase prices and FPL selling-value rules.
   - V02 contract now returns explicit manager-state and prediction-run lineage.

4. `private.c0242_dispatch_named_challenger_v01()` / `private.c0242_capture_named_challenger_v01()`
   - Legal named challengers are forced through the canonical same-horizon optimizer.
   - Capture V02 compares against the current exact-horizon C0240 survivor, uses the production model-error band and fails on stale prediction lineage.

5. `private.c0242_captaincy_equivalence_gate_v01()`
   - Captaincy is evaluated separately from squad selection.
   - Candidates within the mean-error band are classified `NO_MEANINGFUL_EDGE`.
   - Output exposes nominal mean leader, haul-tail leader, floor leader and the equivalent set.

6. `private.c0242_consistency_status_v01()` + `public.c0242_consistency_status_bridge_v01()`
   - Re-runs named-challenger legality every call.
   - Alias-collision bug discovered during closeout was repaired in `C0242_CONSISTENCY_V02`.

7. C0234 final authorization
   - `fpl-autonomous-gate` production version 4 adds mandatory `C0242_DECISION_CONSISTENCY`.
   - Any unresolved legal named challenger now fails closed.
   - `NO_MEANINGFUL_EDGE` captaincy is exposed but does not itself block a nominal captain choice.

8. C0237 live publication
   - `private.c0237_publish_current_fpl_plan_v01()` V05 publishes named-challenger status plus captaincy equivalence.
   - An unresolved C0242 state makes the live publication `CONTESTED`.
   - C0242 is required for both publication and final authorization.

## Deterministic regression proof

A temporary active challenger equal to the exact current C0240 survivor was dispatched through the canonical optimizer and captured against the same lineage.

- challenger objective: `229.434`
- reference objective: `229.434`
- gap: `0`
- classification: `EQUIVALENT`
- evaluation prediction run: `1356`
- reference prediction run: `1356`

The regression challenger was then deactivated and does not participate in live decisioning.

The standing user challenger remains:

- O'Reilly → Guéhi
- Mosquera → De Cuyper
- Kusi-Asare → Barry
- Palmer and Semenyo retained

Current classification remains `INFEASIBLE_CURRENT_STATE / OVER_BUDGET_1_TENTHS`, caused by O'Reilly's price fall rather than a football-opinion reversal.

## GW4 captaincy state

Prediction run: 1356
Mean error band: 1.0 point
Decision class: `NO_MEANINGFUL_EDGE`

- Gabriel: nominal mean leader / floor leader.
- Saka: haul-tail leader.
- Bruno Fernandes, Mbeumo and João Pedro are also inside the equivalence band.

Production communication must not describe Gabriel's nominal selection as a meaningful captaincy edge.

## Current publication proof

C0237 publication #11:

- stage: `PRE_FINAL`
- status: `CONTESTED`
- final status: `DECISION_NOT_READY`
- execution authorized: `false`
- C0240 survivor rendered: true
- C0242 consistency rendered: true
- captaincy class: `NO_MEANINGFUL_EDGE`

Current C0234 gate has 14 gates. C0242 passes; remaining GW4 blockers are final T−2h refresh and chip opportunity cost.

## Integrity

- No xPts rewrite.
- No historical forecast rewrite.
- No manager-plan mutation.
- No external FPL transfer or chip execution.
- Ownership has zero direct xPts effect.
- Research/shadow models retain zero numeric production effect unless separately promoted.
