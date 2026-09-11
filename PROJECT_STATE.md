# Football Intelligence Engine — Project State

_Last updated: 2026-09-11 (Dubai) — through C0248 Checkpoints I/J_

## 1. Mission

Build one chronology-safe football intelligence engine with two linked products:

1. FPL decision intelligence with one objective: maximize the probability of finishing #1 Overall, or maximize expected final rank if #1 becomes unrealistic.
2. Football market-mispricing research that earns production use only through chronology-safe forward validation.

Canonical project description: `PROJECT_DESCRIPTION.md`.

## 2. Immutable rules

- Historical forecasts/decisions are append-only and never rewritten with hindsight.
- Completed-match evidence may update future decisions only.
- Missing data is unknown, never zero.
- Unvalidated research/shadow evidence has zero numeric player-model production effect.
- Projection readiness is not decision readiness.
- Every meaningful FPL action compares with ROLL.
- Expected minutes, tactical role and fixture quality are structural gates.
- Ownership/EO has zero direct xPts effect.
- Statistically indistinguishable choices are `NO_MEANINGFUL_EDGE`.
- Captaincy is optimized separately from the squad.
- Serious prior challengers persist until explicitly resolved on current state/lineage.
- Live Supabase/runtime evidence outranks documentation when they disagree.
- More layers are not automatically better; consolidate overlapping responsibilities.

## 3. Production sources of truth

- Supabase: `knooiwezzsxcwhtjtdap`
- GitHub: `ElDon-Hanzy/football-intelligence-engine`
- FPL Team ID: `3559923`
- Engineering ledger: `public.change_tracker_working`
- Architecture registry/governance: C0213 machine-readable surfaces.

The forecast core remains compact: 14 production-effect components, all behaviorally tested. C0242/C0248 are decision-control consumers and do not rewrite player xPts.

## 4. Canonical forecast core

`RESULTS / FPL / FOOTBALL SOURCES`
→ canonical player/team/role/fixture state
→ C0159 fixture derivative
→ C0166 production fixture forecast
→ player goal/assist/team lambdas
→ event distribution
→ `private.generate_upcoming_fpl_projection_core_v01`
→ full-pool optimizer.

Realized tactical roles are factual production state. Research/shadow families remain non-numeric unless separately promoted.

## 5. Current FPL decision architecture

Current live sequence:

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 structural ensemble/equivalence
→ C0229 structural robustness
→ C0230 shadow team-regime diagnostic
→ C0231 forward-management approximation
→ C0232 OR/rank utility
→ C0233 adversarial red team
→ C0240 final adversarial optimization
→ C0242 named-challenger + captaincy consistency
→ **C0248 sequential FT/chip/price supervisory control**
→ C0234 fail-closed final authorization
→ C0237 live publication
→ final/execution ledger only when authorized.

C0241 enforces exact-horizon lineage and repeat-idempotency.

C0242 is **Completed / Verified** and integrated into C0234/C0237.

C0244 is **Completed / Verified** as the mature first-half chip opportunity sub-control inside C0248.

C0245 is **Completed / Verified** as the mature FT/flexibility/future-information option-value sub-control inside C0248.

C0248 remains **In Progress / Implemented**. Its decision-control is mandatory and green for GW4, but its V04 planner remains shadow-only and does not yet replace C0240 as the normal-transfer selector.

## 6. C0248 consolidated planner

C0243-C0246 were consolidated into one program rather than independent production layers.

Current verified C0248 capabilities:

- explicit state: squad + purchase prices + selling values + bank + FT inventory;
- +1 FT state transition each new GW, capped at 5;
- ROLL / 1FT / 2FT generated future normal actions plus preserved larger named/legacy roots;
- exact hit accounting for represented transfer actions;
- dynamic XI/captain selection each GW;
- expected-autosub bench utility v1 instead of a flat bench percentage;
- root preservation for ROLL, C0228 baseline, C0240 survivor, named challenger and Wildcard;
- first-party official FPL price-predictor capture and timing control;
- mature C0244 current-chip + first-half structural opportunity control;
- mature C0245 terminal FT/flexibility + future-information option value;
- Wildcard as a sequential state transition retaining banked FT count;
- C0234/C0237 integration as supervisory decision-control.

Current V04 limitations that block production-selector cutover:

- BB/TC/FH are not planner state/action transitions (`bb_tc_fh_actions=false`);
- normal autosub formation legality is explicitly approximate;
- generated future normal actions are capped at 2 transfers per GW;
- Wildcard fresh root is seeded from an external ensemble candidate rather than independently optimized by the canonical sequential planner;
- planner search assumes static current prices while price/affordability uncertainty remains supervisory;
- C0234 still constructs an authorized normal action from the C0240 survivor, not a selected C0248 path.

Detailed plan/checkpoints:

- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- `project-management/C0248_CHECKPOINT_B_SEQUENTIAL_CORE_20260911.md`
- `project-management/C0248_CHECKPOINT_D_PRICE_TIMING_20260911.md`
- `project-management/C0248_CHECKPOINT_E_CHIP_TIMING_20260911.md`
- `project-management/C0248_CHECKPOINT_F_WILDCARD_TERMINAL_AND_FINAL_GATE_20260911.md`
- `project-management/C0248_CHECKPOINT_G_C0244_C0245_FUTURE_OPTION_GUARDS_20260911.md`
- `project-management/C0248_CHECKPOINT_H_EMPIRICAL_FT_OPTION_CALIBRATION_20260911.md`
- `project-management/C0248_CHECKPOINT_I_C0244_MATURE_FIRST_HALF_CHIP_CONTROL_20260911.md`
- `project-management/C0248_CHECKPOINT_J_CUTOVER_READINESS_AND_LEGACY_DISPOSITION_20260911.md`

## 7. Current GW4 manager and prediction lineage

Current manager state remains the user-confirmed GW4 state:

- FPL entry: `3559923`
- free transfers: 3
- bank: £0.0m
- acquisition squad cost: £100.0m
- latest stored liquidation value snapshot: £99.6m
- no GW4 transfer has been executed by the engine.

Current projection lineage:

- GW4: run 1356
- GW5: run 1348
- GW6: run 1350
- GW7: run 1352
- GW8: run 1353

All are frozen prospective pre-deadline snapshots and do not use actual target-GW results.

## 8. Current GW4 sequential evidence

C0248 V04 root-preserved exact-horizon utility:

- Wildcard fresh root: **248.519** raw
- C0240 4FT/-4 normal root: **232.860**
- C0228 2FT baseline: **227.528**
- named 2FT De Cuyper + Guéhi: **226.342**
- ROLL root: **222.330**

C0240 remains the best **normal-transfer** root under current assumptions.

The raw ordering is not execution authority. C0248 remains shadow/read-only and C0234 remains fail-closed until the final information refresh and all mandatory gates pass.

## 9. C0245 mature option value

C0245 is no longer open engineering work.

Current empirical decision-time FT-option calibration:

- median gross marginal transfer value: 2.587 weighted points
- P25: 2.140
- P75: 4.134

The calibration is sensitivity evidence, not a universal production scalar.

Current Wildcard exact-window raw edge over best normal C0248 root: +15.659.

Terminal state:

- Wildcard root finishes GW8 with 1 FT;
- C0240 normal path finishes GW8 with 5 FTs;
- FT-only break-even value per extra terminal FT: 3.915 points;
- unused Wildcard and future information retain positive unresolved option value.

Current C0245 interpretation remains fail-closed / preserve optionality.

## 10. C0244 mature chip opportunity control

C0244 is **Completed / Verified** inside C0248.

Live production now evaluates every GW through GW19 at an explicit evidence tier:

- GW4-GW8: `EXACT_NUMERICAL`
- GW9-GW19: `STRUCTURAL_ONLY`

Team-level fixture counting detects blanks/doubles even when total league match count remains 10.

A live official FPL fixture refresh on 2026-09-11 verified all 160 GW4-GW19 fixture IDs and Gameweek assignments against production. There were zero Gameweek-assignment mismatches. Twenty-five stale future kickoff times were refreshed. No BGW or DGW is currently confirmed through GW19; this is treated as `none confirmed yet`, not as evidence that none will emerge.

Current chip control:

- Bench Boost: **HOLD** — GW4 incremental EV 4.846; GW4 ranks 5/5 inside exact GW4-GW8 window.
- Triple Captain: **HOLD** — GW4 incremental EV 6.174; GW4 ranks 5/5 inside exact GW4-GW8 window.
- Free Hit: **HOLD_NO_ROBUST_EDGE** — current same-utility gain +2.618; future option value unresolved.
- Wildcard: **HOLD_NO_ROBUST_EDGE** — raw exact-window edge is not robust to terminal FT / retained-chip / information option value.
- recommended current chip: **NONE**.

Full first-half numerical best-week ranks remain null/fail-closed until decision-grade future player projections and fixture information exist. This is intended mature behavior, not an unfinished C0244 layer.

## 11. Price timing

Official FPL price-predictor fields are captured append-only in `public.fpl_price_predictor_snapshots` and joined through FPL player identity.

Current preserved normal roots show no material next-update affordability/selling-value risk. Policy remains `WAIT_FOR_INFORMATION` / `WAIT_FOR_T_MINUS_2`.

Price evidence may accelerate an already-robust football decision; it may not create a transfer.

## 12. Captaincy

Current C0242 class remains `NO_MEANINGFUL_EDGE` inside the model-error band.

Do not describe a nominal captain as having a meaningful edge unless refreshed evidence survives uncertainty/tail sensitivity and the Noise-Control Gate.

## 13. Current C0234 / C0237 state

C0234 v5 still requires the legacy C0231/C0233/C0240 lineage plus C0242 and C0248 readiness.

C0248 is currently a mandatory supervisory gate, not final selected-path authority.

The C0234 source still uses the C0240 survivor when constructing a normal-transfer action after all gates pass. This is a direct reason C0248 cannot be declared cut over yet.

C0237 remains the always-live publication surface. No external transfer or chip has been executed. `public.fpl_manager_plans` remains untouched.

## 14. Legacy disposition

No legacy downstream component can be physically retired today without breaking a verified production dependency.

- C0231: KEEP — still mandatory in C0234 and C0240 lineage.
- C0233: KEEP — still mandatory in C0234 and C0240 lineage.
- C0240: KEEP — active normal survivor, mandatory adversarial stability layer, C0248 comparison root and C0245 calibration evidence source.
- C0242: KEEP — unique named-challenger/captaincy consistency gate.
- C0234: KEEP — final fail-closed authorization boundary.
- C0237: KEEP — serving/publication boundary.

After verified C0248 production-selector cutover, C0231 is the clearest retirement candidate; C0233 may be collapsed into the canonical adversarial/Noise-Control path; C0240 should first be downgraded to shadow/supporting benchmark before any eventual retirement.

## 15. C0248 cutover status

**CUTOVER BLOCKED.**

Required hardening before C0248 can become the canonical selected-path authority:

1. exact/conservative legal autosub simulation;
2. generated paid-transfer action support beyond two transfers when justified;
3. explicit WC/FH/BB/TC planner actions with correct state transitions;
4. canonical Wildcard fresh-squad candidate generation;
5. bounded path-level affordability/price scenarios without price xPts effects;
6. deterministic regression and Noise-Control comparison versus C0240/named challengers;
7. C0234 normal-action authority changed from C0240 survivor to selected C0248 path;
8. C0237 publication changed to canonical selected C0248 path after cutover;
9. C0213 consumption/governance and behavioral tests rerun green.

Do not mark C0248 Completed merely because its supervisory decision-control currently evaluates green.

## 16. Governance verification

Latest verified state after C0244 maturity work:

- C0213 production behavioral consumption tests: 14/14 PASS on GW4 prediction run 1356.
- change-tracker governance: zero violations before C0244 closeout update; rerun required after final documentation/contract updates in the same checkpoint chain.
- historical forecasts rewritten: false.
- no transfer/chip execution.

## 17. Final timing

GW4 deadline: 2026-09-12 12:30 UTC / 16:30 Dubai.
Final T−2h threshold: 2026-09-12 10:30 UTC / 14:30 Dubai.

Current execution guidance: `WAIT_FOR_T_MINUS_2` unless a verified material price or injury event creates a robust reason to act earlier.

At T−2 perform the complete final process: fresh ingestion, full-pool optimization, all 15 players, xMins/roles, captaincy distributions, Defensive Contributions, chips, sequential transfer paths, ROLL, named challengers, price/timing, uncertainty sensitivity, red-team and Noise-Control Gate.

## 18. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0242_DECISION_CONSISTENCY_CORRECTION_20260911.md`
- `project-management/C0245_MATURE_OPTION_VALUE_CLOSEOUT_20260911.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`
- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- `project-management/C0248_CHECKPOINT_I_C0244_MATURE_FIRST_HALF_CHIP_CONTROL_20260911.md`
- `project-management/C0248_CHECKPOINT_J_CUTOVER_READINESS_AND_LEGACY_DISPOSITION_20260911.md`
