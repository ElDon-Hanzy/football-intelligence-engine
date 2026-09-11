# Football Intelligence Engine — Project State

_Last updated: 2026-09-11 (Dubai) — through C0248 Checkpoint L_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts are append-only; completed evidence may change future decisions only; missing data is unknown; unpromoted research has zero numeric production effect; every meaningful FPL action compares with ROLL; xMins/role/fixture are structural gates; ownership has zero direct xPts effect; choices inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; serious challengers persist until resolved; live Supabase/runtime evidence outranks documentation; avoid overlapping layers.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; engineering ledger `public.change_tracker_working`; C0213 architecture/governance surfaces.

Forecast core remains 14 production-effect components and is behaviorally tested.

## 2. Current decision architecture

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 structural ensemble/equivalence
→ C0229 robustness
→ C0230 shadow team-regime diagnostic
→ C0231 forward-management supporting evaluator
→ C0232 OR/rank utility
→ C0233 red-team supporting evaluator
→ C0240 adversarial supporting benchmark
→ C0242 named-challenger + captaincy consistency
→ **C0248 canonical sequential selected-path authority**
→ C0234 fail-closed final authorization
→ C0237 live publication
→ external execution only if separately authorized.

C0244, C0245 and C0248 are **Completed / Verified**.

C0240 is no longer the normal-transfer selector. It remains a required supporting adversarial benchmark and regression root. C0231/C0233 are still required supporting gates and are not physically retired yet.

## 3. C0248 production selector

Production planner row: **7**.

Planner version: `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`.

Promotion contract: `C0248_VERIFIED_CANDIDATE_PROMOTION_V01`.

A planner run cannot self-promote. Fresh candidate lineage starts `shadow_only=true / production_selected=false`; cross-beam deterministic validation and hardening checks are required before an append-only production-selected row is created. If fresh data creates a newer unpromoted candidate, decision readiness fails closed until promotion. This applies at T−2.

Verified C0248 capabilities:

- squad, acquisition/selling values, bank and FT state;
- FT carry/accrual to cap 5 and exact hit accounting;
- ROLL plus normal actions through 5 transfers/GW, with serious larger preserved roots;
- conservative legal autosub EV with formation legality enforced where a complete legal substitution set exists; unfillable multi-absence states receive zero fabricated autosub value;
- dynamic XI / captain / vice / bench order;
- explicit Wildcard, Free Hit, Bench Boost and Triple Captain action roots;
- BB/TC transfer+chip combinations on preserved normal roots;
- Wildcard canonical role-safe full-pool fresh squad over exact horizon;
- Free Hit independent one-GW role-safe fresh squad and squad reversion after the GW;
- Wildcard/Free Hit retain banked FTs under 2026/27 rules;
- exact current-price feasibility and path bank-headroom diagnostics; price does not modify xPts;
- ROLL, C0228, C0240 and named challengers preserved for regression / Noise-Control;
- same-run lineage across chip, price and terminal controls;
- C0234 action authority and C0237 publication authority cut over to C0248.

Cross-beam validation: candidate runs 5 (beam 6) and 6 (beam 8) produced identical selected normal root, best root, best utility and ROLL utility. Candidate run 6 was promoted append-only to production run 7.

Detailed closeout: `project-management/C0248_CHECKPOINT_L_PRODUCTION_SELECTOR_CUTOVER_20260911.md`.

## 4. Current manager / projection lineage

Manager state before any GW4 action:

- entry `3559923`;
- 3 free transfers;
- £0.0m bank;
- acquisition cost £100.0m;
- latest stored liquidation snapshot £99.6m;
- no GW4 transfer/chip has been executed by the engine.

Current frozen prospective prediction lineage:

- GW4 run 1356
- GW5 run 1348
- GW6 run 1350
- GW7 run 1352
- GW8 run 1353.

## 5. Current GW4 pre-final sequential evidence

Selected no-chip normal root: `C0240_LEGACY`, selected by C0248 after root-preserved regression.

Five-GW selected normal utility: **232.617**.

ROLL utility: **221.610**.

Selected edge vs ROLL: **+11.007 weighted utility**.

Current first action represented by that pre-final root:

- O'Reilly → Gabriel
- Palmer → Saka
- Semenyo → Schade
- Mosquera → Guéhi
- 4 transfers with 3 FTs, therefore -4 hit
- bank after: £0.3m.

This is pre-final evidence only. It is not an instruction to execute before T−2.

Exact/conservative autosub hardening did not create a new normal winner; C0240 remained the best normal preserved path.

## 6. Chip control

C0244 remains the mature first-half opportunity control. GW4-GW8 are exact numerical; GW9-GW19 are structural-only until decision-grade player projections exist. No BGW/DGW is currently confirmed through GW19; that means none confirmed yet, not none will occur.

Current chip state:

- Bench Boost: **HOLD**, current incremental EV +4.849; GW4 5/5 inside exact GW4-GW8 window.
- Triple Captain: **HOLD**, current incremental EV +6.174; GW4 5/5 inside exact window.
- Free Hit: **HOLD_NO_ROBUST_EDGE**, canonical one-GW fresh-squad candidate +2.599 versus selected normal current-GW utility; future FH option value unresolved.
- Wildcard: **HOLD_NO_ROBUST_EDGE**, raw exact-horizon edge +12.498; terminal normal-minus-WC FT gap 4; FT-only break-even 3.125 points per extra FT; retained-chip and future-information option value unresolved.
- recommended current chip: **NONE**.

## 7. Price timing

Official FPL price-predictor fields are captured append-only. Price timing is scoped to no-chip normal roots and reports path affordability/headroom only. Price evidence may accelerate an already-robust football decision; it cannot create a transfer or alter xPts.

Current preserved roots show no material next-update risk sufficient to justify early action. Guidance remains `WAIT_FOR_T_MINUS_2`.

## 8. Captaincy

C0242 captaincy remains an equivalence problem. Current class is `NO_MEANINGFUL_EDGE` inside model error. Do not describe the nominal captain as having a robust edge before refreshed T−2 evidence survives distribution/tail sensitivity.

## 9. C0234 / C0237 after cutover

`fpl-autonomous-gate` v6: `C0234_AUTONOMOUS_FINAL_GATE_V06_C0248_SELECTOR_AUTHORITY`.

Latest verification against production planner run 7:

- 14 / 15 gates pass;
- only blocker = `FINAL_T_MINUS_2H_REFRESH`;
- `final_status=DECISION_NOT_READY`;
- action `NONE`;
- selector `C0248`;
- authorized false.

C0237 publication 20:

- source `C0237_ALWAYS_LIVE_PLAN_V07`;
- C0248 selected path rendered;
- C0240 supporting benchmark rendered;
- `PRE_FINAL / CONTESTED`;
- chip NONE;
- execution authorized false.

No external transfer or chip has been executed.

## 10. Legacy disposition

Do not physically retire these yet:

- C0231 — supporting forward-management gate still consumed by C0234.
- C0233 — supporting red-team gate still consumed by C0234.
- C0240 — supporting adversarial benchmark / regression evidence / C0245 calibration source.
- C0242 — unique named-challenger and captaincy-consistency gate.
- C0234 — final fail-closed authorization boundary.
- C0237 — serving/publication boundary.

Any further simplification must be a separate evidence-driven consolidation that proves unique responsibilities are absorbed before removal.

## 11. Governance verification

After Checkpoint L:

- C0248 tracker: **Completed / Verified**.
- C0213 behavioral consumption: **14/14 PASS** on GW4 prediction run 1356.
- tracker governance: PASS; 0 violations; 0 completed-not-verified; 0 completed-without-refs.
- consumption governance: PASS; **87/87** covered; 0 violations.
- production planner: run 7, `shadow_only=false`, `production_selected=true`.
- current chip NONE; historical forecasts rewritten false.

## 12. Final timing

GW4 deadline: 2026-09-12 12:30 UTC / 16:30 Dubai.

Final T−2 threshold: 2026-09-12 10:30 UTC / 14:30 Dubai.

At T−2: fresh ingestion → full-pool projections/roles → generate new C0248 candidate → cross-beam validation → promote only if acceptance is green → C0242/C0240 supporting checks → C0234 final gate → C0237 final publication. A new unpromoted C0248 lineage must fail closed.

## 13. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0245_MATURE_OPTION_VALUE_CLOSEOUT_20260911.md`
- `project-management/C0247_FULL_ENGINE_DECISION_ARCHITECTURE_AUDIT_20260911.md`
- `project-management/C0248_SEQUENTIAL_MULTI_GW_DECISION_PLANNER_PLAN_20260911.md`
- `project-management/C0248_CHECKPOINT_K_SAME_LINEAGE_CHIP_PRICE_FH_REPAIR_20260911.md`
- `project-management/C0248_CHECKPOINT_L_PRODUCTION_SELECTOR_CUTOVER_20260911.md`
