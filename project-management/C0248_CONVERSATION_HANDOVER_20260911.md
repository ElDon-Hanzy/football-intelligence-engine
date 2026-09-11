# C0248 Conversation Handover — 2026-09-11

## Purpose
Clean handover to a fresh ChatGPT conversation before the GW4 T−2 decision cycle.

## Repository / runtime
- GitHub: `ElDon-Hanzy/football-intelligence-engine`
- Supabase: `knooiwezzsxcwhtjtdap`
- FPL Team ID: `3559923`
- Current target: GW4
- GW4 deadline: 2026-09-12 16:30 Dubai
- T−2 refresh: 2026-09-12 14:30 Dubai

## Authority order
Live runtime / registry / database evidence outranks this handover and all documentation if they disagree. Re-inspect production before implementation or final FPL recommendation.

## Current architecture state
### C0242 — Decision consistency
Completed / Verified. Named challengers are legality-checked, dispatched, captured and classified; captaincy equivalence is exposed; C0234/C0237 fail closed on unresolved consistency.

### C0245 — FT / flexibility / future-information option value
Completed / Verified on 2026-09-11.
Mature control is consumed by canonical C0248 decision-control.
Key rules:
- no universal FT point scalar;
- no hindsight realized-points calibration;
- no fake numeric information premium;
- recalibrate each GW;
- terminal FT/bank value expressed with sensitivity/break-even thresholds;
- preserve optionality when waiting is free and material information remains unresolved.
Current empirical FT calibration: median gross marginal transfer value 2.587 weighted points; P25 2.140; P75 4.134. Current WC terminal break-even is 3.915 points per extra terminal FT (~67th percentile of observed marginal samples).
Current future-information state: `HIGH_PRESERVE_OPTIONALITY`; operational action `WAIT_UNTIL_T_MINUS_2_UNLESS_MATERIAL_PRICE_OR_INJURY_EVENT`. All four current price branches are `WAIT_FOR_INFORMATION`; no numeric information premium is authorized because completed-history sample is small.
Closeout doc: `project-management/C0245_MATURE_OPTION_VALUE_CLOSEOUT_20260911.md`, commit `f3593ab9e44a100d32588db598057c1a87aa8ae2`.

### C0244 — Season-level chip timing
In Progress / Implemented, not mature.
Current-GW chip action is robustly `NONE`, but full first-half season timing remains unresolved because exact player projections currently cover GW4–GW8 while structural chip-window ranking through GW19 is not decision-grade. Do not create a separate chip layer; mature this inside C0248.
Current chip evidence from C0248:
- BB: HOLD; GW4 incremental EV 4.846; only 2 bench slots >=60 xMins.
- TC: HOLD; current incremental EV 6.174.
- FH: HOLD_NO_ROBUST_EDGE; current same-utility edge 2.618, but future FH option is unmodelled.
- WC: HOLD_NO_ROBUST_EDGE; raw exact-horizon edge +15.659, terminal FT gap 4, break-even FT value 3.915; unused WC option remains unmodelled.
- season-best chip weeks resolved = false.

### C0248 — Sequential multi-GW decision planner
In Progress / Implemented. It consolidates C0243–C0246 requirements rather than creating duplicate layers.
Current V04 planner has root-preserved sequential planning, exact selling values, FT accrual/cap, hits, expected-autosub bench utility, price timing, current-chip robustness, true Wildcard root, terminal sensitivity and C0234/C0237 integration.
Current canonical decision-control is green but shadow-only / not production-selected for planner authority. It does not execute transfers or chips and does not rewrite xPts.
Best normal root remains `C0240_LEGACY`; C0248 currently does not overturn C0240 on the normal-transfer path.
Current execution timing guidance is `WAIT_FOR_T_MINUS_2`.

## GW4 normal transfer paths still under consideration
### C0240 legacy normal survivor
4 moves / one -4 hit:
- O'Reilly -> Gabriel
- Palmer -> Saka
- Semenyo -> Schade
- Mosquera -> Guehi
£0.3m bank. Sequential V04 best normal root score 232.860; final FT 5; final bank £0.3m. This remains the best normal root in current C0248 but is not final execution authorization.

### 2FT named challenger
`GW4_2FT_GUEHI_DECUYPER_ROLL1`:
- O'Reilly -> De Cuyper
- Mosquera -> Guehi
- use 2 of 3 FTs; roll one
- £1.0m ITB after moves
- no hit
Retains Palmer and Semenyo. It must remain in the final T−2 comparison; do not discard merely because C0240 is current best normal root.

### C0228 baseline
- O'Reilly -> Guehi
- Mosquera -> Calafiori
No hit; currently another preserved root.

### ROLL
Always preserve as a root.

## Captaincy
Run lineage remains prediction run 1356 at handover.
C0242 captaincy gate previously classified the leading candidates as `NO_MEANINGFUL_EDGE` within the 1.0 xPts model-error band. Do not claim Gabriel has a meaningful captaincy edge merely because he has the highest mean. Attackers have stronger extreme tails. Re-run at T−2 after fresh projections / pressers / lineup evidence.

## Current timing / price state
C0248 price timing currently says all current roots `WAIT_FOR_INFORMATION`; next price update recorded at 2026-09-11 23:00 UTC. No material next-update affordability loss is expected for the preserved roots at handover. Re-check if a material price or injury event occurs.

## Governance at handover
`private.audit_change_tracker_governance_v01()` is green:
- total tracker rows 173
- decision rows 69
- completed_not_verified 0
- completed_without_refs 0
- consumption contracts 86/86 covered
- consumption violations 0
Behavioral production tests were 14/14 PASS on prediction run 1356.

## Immediate next work in fresh conversation
1. Read `PROJECT_STATE.md`, `DECISIONS_AND_HISTORY.md`, C0248 plan/checkpoint docs, C0245 closeout, and this handover.
2. Independently inspect live GitHub + Supabase; do not trust handover blindly.
3. Mature C0244 inside C0248: season-level chip timing / GW9–GW19 structural opportunity treatment without fake precision or a duplicate chip layer.
4. Keep C0248 In Progress until C0244 and remaining cutover criteria are mature.
5. At GW4 T−2 (14:30 Dubai on Sep 12), run the full refresh: prices/ownership, injuries/suspensions, press conferences, predicted lineups, xMins, tactical roles, fixtures, set pieces, congestion, full-pool candidate refresh, 15-man optimization, captaincy tails, DC, chip competition, named challengers, ROLL, red-team/noise-control and final fail-closed publication.
6. No transfer/chip execution before that refresh unless a material affordability or injury event creates a verified reason to act earlier.

## Required discipline
- Optimize the entire squad, not isolated moves.
- Always compare ROLL.
- Preserve named challengers.
- No final recommendation from a single model/stat/one-match observation.
- If differences are within normal model error or flip under plausible assumptions, classify `NO_MEANINGFUL_EDGE`.
- Explain any recommendation change by identifying the new evidence or defect that invalidated the old one.
- Historical forecasts/decisions remain append-only.
