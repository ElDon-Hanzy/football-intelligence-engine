# C0248 Checkpoint J — Cutover Readiness & Legacy Disposition

Date: 2026-09-11
Status: CUTOVER BLOCKED / SHADOW CONTINUES
Parent: C0248
Model effect: NONE

## Executive judgment

C0248 is **not ready for production-selector cutover**.

C0244 and C0245 are now mature controls inside C0248, and canonical C0248 decision-control is green for GW4. However, live V04 planner and C0234 final-gate source still fail the original C0248 cutover contract in several material ways.

Therefore:

- keep C0248 `In Progress / Implemented`;
- keep `shadow_only=true` and `production_selected=false`;
- do not retire C0231, C0233 or C0240 yet;
- preserve C0234 as final fail-closed authorization;
- preserve C0237 as publication;
- preserve C0242 as decision-consistency control;
- no GW4 transfer/chip action changes from this architecture checkpoint.

## Live V04 blockers

### 1. Chip actions are not in the planner state/action search

Live `fpl-sequential-planner:v4` declares:

- `bb_tc_fh_actions=false`

Bench Boost, Triple Captain and Free Hit are evaluated by C0248 supervisory status functions, but they are not explicit planner state-transition actions.

This violates the C0248 action-space contract for a canonical replacement. The supervisory design is sufficient to fail closed on current GW4 `NONE`; it is not sufficient for production-selector cutover when a chip-use branch becomes competitive.

### 2. Normal autosub formation legality is approximate

Live V04 declares:

- `formation_legality_approximate=true`

Autosub utility uses a `1 - p_start` proxy and bench expected points. It does not fully simulate legal FPL substitution ordering under all missing-starter combinations while preserving minimum formation constraints.

The original contract explicitly requires legal substitution formation constraints. This must be exact or conservatively bounded before cutover.

### 3. Generated future normal actions are capped at two transfers

Live V04 reports:

- `max_generated_normal_transfers_per_gw=2`

C0240 and named roots can inject larger immediate transfer paths, but subsequent simulated Gameweeks only generate ROLL/1FT/2FT actions.

A canonical state-transition planner must be capable of considering a paid 3+ transfer action when it is genuinely optimal, even if such branches are normally pruned aggressively.

### 4. Wildcard root is seeded from an external ensemble candidate

`WILDCARD_FRESH` is created from the first C0228 ensemble candidate rather than independently solving the fresh 15-player squad state within the sequential planner.

The root is a real Wildcard transition from the current squad, but the candidate-generation stage is not yet canonical or exhaustive enough to make C0248 the sole Wildcard authority.

### 5. Price timing is supervisory rather than path-state uncertainty

C0248 price control is useful and correctly forbids price signals from creating football transfers. The V04 search itself still reports:

- `price_assumption=STATIC_CURRENT_PRICES_NO_FORECAST`

Current price-risk supervision is enough for GW4 `WAIT_FOR_INFORMATION`, but future path affordability scenarios are not yet part of planner state transitions.

### 6. C0234 still selects the C0240 survivor for normal execution

The live `fpl-autonomous-gate:v5` requires C0248 readiness, but when all gates pass and current chip is `NONE`, its normal action is still built from the C0240 `survivor`, not from the C0248 selected sequential path.

Therefore C0248 is presently a mandatory supervisory gate, not the active production selector.

This is the clearest cutover blocker: changing tracker status alone would not change actual decision authority.

## C0244/C0245 are not blockers anymore

### C0244

Completed / Verified in Checkpoint I.

First-half structural chip opportunity is mature through GW19. GW9–GW19 numerical best-week ranks remain null by design until decision-grade player projections or authoritative fixture changes justify them.

### C0245

Completed / Verified.

Sequential FT/flexibility/future-information option value is consumed by canonical C0248 and recalibrates without a universal FT scalar or fake information bonus.

## Legacy disposition — current state

### C0231 Forward Management

**KEEP — cannot retire now.**

C0234 v5 still loads `fpl_forward_management_runs`, requires `FORWARD_MANAGEMENT_READY`, and verifies C0240 lineage against `forward_run_id`.

Target disposition after cutover: retire or reclassify as historical/supporting once all unique premium-access and future-burden responsibilities are proven subsumed by C0248.

### C0233 Red Team

**KEEP — cannot retire now.**

C0234 v5 still loads `fpl_red_team_runs`, requires an evaluated red-team state, and verifies C0240 lineage against `red_team_run_id`.

Target disposition after cutover: merge unique adversarial duties into the canonical C0248/Noise-Control path or retain only as a supporting adversarial evaluator if it still adds independent evidence.

### C0240 Final Adversarial Optimization

**KEEP — cannot retire now.**

It currently supplies:

- the active normal survivor used by C0234;
- mandatory final adversarial coverage/stability lineage;
- forced legacy root for C0248 shadow comparison;
- empirical counterfactual material used by C0245 FT option calibration.

Target disposition should be staged:

1. first stop using C0240 as the production selector after C0248 passes cutover;
2. retain temporarily as a shadow benchmark/adversarial evaluator and calibration source;
3. retire only after C0248 independently reproduces all unique search/red-team/calibration duties.

### C0242 Decision Consistency

**KEEP.**

Named-challenger persistence and captaincy-equivalence semantics remain unique fail-closed controls. They should not be removed merely because the planner becomes canonical.

### C0234 Final Gate

**KEEP.**

C0248 should replace upstream selector responsibilities, not the final authorization boundary.

### C0237 Publication

**KEEP.**

It remains the always-live serving/publication surface and should consume the selected C0248 path after cutover.

## Safe simplification today

No legacy component can be physically retired today without breaking a verified production dependency.

The safe simplification is architectural only:

- C0244 and C0245 are now explicitly sub-controls of C0248 rather than competing layers.
- Future work should reduce selector/adversarial duplication only after C0248 becomes the actual selected-path authority.

## Required cutover sequence

Before C0248 can be marked Complete / Verified as the production selector:

1. exact/conservative legal autosub simulation;
2. broaden legal normal-action generation to admit 3+ paid transfers when justified;
3. make WC/FH/BB/TC explicit planner actions with correct state transitions;
4. make the Wildcard candidate generator canonical rather than a single external seed;
5. integrate bounded price/affordability scenarios into path feasibility without adding price to xPts;
6. run deterministic regression/Noise-Control comparisons against C0240 and named challengers;
7. change C0234 normal action authority from C0240 survivor to the selected C0248 path;
8. update C0237 to publish the selected sequential path as canonical authority;
9. rerun C0213 consumption/governance and behavioral tests;
10. only then reclassify overlapping legacy components.

## GW4 operational effect

None.

Current production guidance remains:

- chip: `NONE`
- execution: `WAIT_FOR_T_MINUS_2`
- no transfer/chip execution before the final refresh unless verified material affordability or injury evidence creates a robust edge.
