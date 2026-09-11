# Football Intelligence Engine — Project State

_Last updated: 2026-09-11 (Dubai) — through C0248 sequential decision-control integration_

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

C0248 is **In Progress / Implemented**. It supervises C0240 but does not yet replace C0240 as the normal-transfer selector.

## 6. C0248 consolidated planner

C0243-C0246 were consolidated into one program rather than four independent layers.

Current C0248 capabilities:

- explicit state: squad + purchase prices + selling values + bank + FT inventory;
- +1 FT state transition each new GW, capped at 5;
- 0/1/2 normal-transfer actions per simulated future GW plus preserved named/legacy roots;
- exact hit accounting;
- dynamic XI/captain each GW;
- expected-autosub bench utility instead of a flat bench percentage;
- root preservation so ROLL, C0228 baseline, C0240 survivor, named 2FT challenger and Wildcard cannot be silently pruned against each other;
- first-party official FPL price-predictor capture and timing control;
- BB/TC/FH current-action evaluation;
- Wildcard as a true sequential root retaining banked FTs;
- terminal-state sensitivity so end-of-horizon FT inventory is not valued at zero;
- C0234/C0237 integration.

Detailed plan/checkpoints:

- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- `project-management/C0248_CHECKPOINT_B_SEQUENTIAL_CORE_20260911.md`
- `project-management/C0248_CHECKPOINT_D_PRICE_TIMING_20260911.md`
- `project-management/C0248_CHECKPOINT_E_CHIP_TIMING_20260911.md`
- `project-management/C0248_CHECKPOINT_F_WILDCARD_TERMINAL_AND_FINAL_GATE_20260911.md`

## 7. Current GW4 sequential evidence

Current projection lineage remains GW4 run 1356 with forward runs 1348/1350/1352/1353 until the next permitted cadence refresh.

C0248 V04 root-preserved exact-horizon utility:

- Wildcard fresh root: **248.519** raw
- C0240 4FT/-4 normal root: **232.860**
- C0228 2FT baseline: **227.528**
- named 2FT De Cuyper + Guéhi: **226.342**
- ROLL root: **222.330**

C0240 remains the best **normal-transfer** root under current assumptions.

The named 2FT De Cuyper + Guéhi path remains important because it was the architecture challenge that exposed static-horizon FT underpricing. C0242 exact fixed-squad evaluation resolves it at 221.104 versus 229.434 (`BEATEN`), while C0248 sequential evaluation narrows the gap materially.

## 8. Wildcard / terminal option value

The raw Wildcard edge over the best normal C0248 root is +15.659 over GW4–GW8.

That raw comparison is not robust enough to use because:

- Wildcard finishes GW8 with 1 FT;
- C0240 normal path finishes GW8 with 5 FTs;
- 11 first-half GWs remain after the exact horizon;
- the unused Wildcard itself still has option value.

Break-even value per extra terminal FT, ignoring bank and unused-Wildcard option: **3.915 points**.

At 4 points per extra terminal FT the Wildcard edge flips slightly negative. Therefore current Wildcard action is `HOLD_NO_ROBUST_EDGE`, not “best raw score = play Wildcard.”

## 9. Current chip state

Entry history confirms no first-half chips have been used.

Current C0248 decision:

- Bench Boost: **HOLD** — GW4 incremental EV 4.846; only two bench slots at 60+ xMins; better exact-window BB values already exist.
- Triple Captain: **HOLD** — GW4 incremental EV 6.174; GW6 is higher inside the exact horizon.
- Free Hit: **HOLD_NO_ROBUST_EDGE** — current same-utility gain +2.618; any future FH opportunity worth >2.618 reverses current use.
- Wildcard: **HOLD_NO_ROBUST_EDGE** — large raw five-GW edge, but terminal FT / retained-chip option value makes it non-robust.
- Current recommended chip: **NONE**.

The engine intentionally does not claim to know the optimal GW9–GW19 chip weeks yet. It does not need that knowledge to conclude that no chip is robust enough today.

## 10. Price timing

Official FPL `bootstrap-static` price-predictor fields are captured append-only in `public.fpl_price_predictor_snapshots`, joined through `players.fpl_player_id`.

Current preserved normal roots show no material next-update affordability/selling-value risk. Policy is `WAIT_FOR_INFORMATION`.

Price evidence may accelerate an already-robust football decision; it may not create a transfer.

## 11. Captaincy

Current C0242 class remains `NO_MEANINGFUL_EDGE` inside the 1.0-point mean-error band.

Nominal mean leader: Gabriel.
Haul-tail leader: Saka.
Bruno, Mbeumo and João Pedro are also inside the equivalence band.

Do not describe the nominal captain as having a meaningful edge unless the final refreshed evidence proves one.

## 12. Current C0234 / C0237 state

`fpl-autonomous-gate` v5 has 15 gates.

Current result:

- 14/15 pass;
- sole blocker: `FINAL_T_MINUS_2H_REFRESH`;
- current chip action: NONE;
- C0248 best normal root: C0240 survivor;
- final status: `DECISION_NOT_READY` until the scheduled refresh.

C0237 publication #14:

- PRE_FINAL;
- CONTESTED;
- execution unauthorized;
- C0240 survivor rendered;
- C0242 consistency rendered;
- C0248 sequential control rendered;
- current chip NONE.

No external transfer or chip has been executed. `public.fpl_manager_plans` remains untouched.

## 13. Final timing

GW4 deadline: 2026-09-12 12:30 UTC / 16:30 Dubai.
Final T−2h threshold: 2026-09-12 10:30 UTC / 14:30 Dubai.

Do not bypass the canonical projection cadence or final-information refresh.

## 14. Open C0248 work

Keep C0248 `In Progress` rather than claiming false completion. Remaining research/engineering:

1. calibrate terminal FT/flexibility option value without hard-coding a fake universal points-per-FT constant;
2. extend structural chip-opportunity planning beyond the exact projection horizon while failing closed on uncertain fixtures/DGWs;
3. validate whether future information value can be represented without look-ahead;
4. determine whether C0231/C0233/C0240 responsibilities can be simplified after C0248 proves stable;
5. run the full stack again after the daily and final permitted projection refreshes.

These are not reasons to add more independent production layers.

## 15. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0242_DECISION_CONSISTENCY_CORRECTION_20260911.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`
- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- C0248 checkpoint B/D/E/F documents.