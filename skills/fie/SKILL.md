# Football Intelligence Engine Operating Skill

## Purpose

Use this skill when resuming, auditing or changing the Football Intelligence Engine.

## Source-of-truth order

1. Live Supabase runtime, architecture registry and current data.
2. `public.change_tracker_working` and current governance functions.
3. Current GitHub source/migrations.
4. Canonical GitHub documentation.
5. Historical handovers and prior conversational summaries.

Never overwrite live evidence with stale documentation.

## Start-of-session checks

Before meaningful FPL implementation or recommendation:

- read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`;
- read the latest relevant project-management closeout/audit;
- inspect current manager state and current prediction/optimizer lineage;
- run tracker governance and C0213 consumption/behavioral status;
- verify that any required current-GW inputs are fresh.

## FPL decision rules

- Optimize the whole legal squad, but do not confuse XV strength with points actually entering the XI.
- Captaincy is separate from squad optimization.
- Always compare ROLL.
- Hits require robust incremental value after timing, FT inventory and future flexibility.
- Sequential transfer planning must account for +1 FT on each new Gameweek, bank, selling values, prices and future information.
- Bench value is state dependent: normal GW = expected autosub/resilience/option value; Bench Boost GW = full scoring value.
- Chip timing must compare current use against future option value and chip scarcity.
- Future chip opportunity may use structural BGW/DGW/fixture evidence without fabricating player-level numerical precision beyond the decision-grade projection horizon.
- Price prediction affects execution timing/feasibility, not player xPts, and cannot create a football transfer by itself.
- Keep serious prior challengers in the decision set until explicitly resolved on current lineage.
- Options within model error are `NO_MEANINGFUL_EDGE`.
- Research/shadow output cannot acquire numeric player-model production effect without its promotion contract.

## Anti-over-engineering gate

Before proposing a new layer ask:

1. What demonstrated decision failure does it fix?
2. Is its information already represented by another component?
3. Can its output be falsified and regression-tested?
4. Does it have one clear consumer?
5. Would merging it into an existing planner/gate be simpler?
6. Does expected decision value exceed complexity and maintenance risk?

If not, reject or consolidate it.

More gates are not automatically safer. Overlapping authorities can produce contradiction and false confidence.

## Current architecture directive

C0243-C0246 were consolidated into **C0248 — Sequential Multi-GW Decision Planner**. Do not revive them as independent production stacks unless new evidence proves separation is necessary.

C0244 and C0245 are mature sub-controls of C0248:

- **C0244 Completed / Verified** — first-half chip opportunity control through GW19, exact numerical evidence where available and structural-only fail-closed evidence where it is not.
- **C0245 Completed / Verified** — FT/flexibility/future-information option value, recalibrated rather than hard-coded as a universal points-per-FT constant.

C0248 is currently **In Progress / Implemented** as mandatory decision control. Its live responsibilities include:

- preserved-root sequential FT planning across the exact horizon;
- FT accrual/carry and hit accounting;
- XI-first scoring with expected-autosub bench value;
- named-challenger preservation;
- first-party FPL price timing;
- mature current-chip/first-half structural opportunity control;
- mature terminal FT/flexibility/information option control;
- Wildcard terminal-state sensitivity;
- supervision of C0240 inside C0234/C0237.

### Same-lineage invariant

All current C0248 chip/price evidence used together in a decision must come from the same canonical planner run.

Current runtime enforces this across:

- BB/TC normal-root timing;
- Wildcard terminal sensitivity;
- normal-root price timing;
- Free Hit current candidate evidence.

If planner run IDs disagree, current chip control must fail closed with `C0248_CURRENT_CHIP_LINEAGE_MISMATCH` rather than combine generations.

Do not reintroduce support functions pinned to an older planner version after the canonical planner advances.

Free Hit must not use a frozen edge constant. Current FH evidence is recomputed from current V04 lineage. The V04 Wildcard root first-GW squad can be reused as a **legal FH candidate lower bound**, but it must not be described as the exhaustive optimal one-GW FH squad unless an explicit one-GW search proves that.

C0248 does **not** currently replace C0240 as the normal-transfer selector. The live V04 planner remains `shadow_only=true` and `production_selected=false`.

Do not mark C0248 complete or cut it over while any of these material blockers remain:

- autosub formation legality is approximate;
- generated future normal actions are capped at 2 transfers/GW;
- BB/TC/FH are not explicit planner actions;
- the Wildcard fresh root is externally seeded rather than canonically generated inside C0248;
- price/affordability scenarios remain supervisory rather than path-state scenarios;
- C0234 still constructs normal-transfer action authority from the C0240 survivor.

No C0231/C0233/C0240 runtime may be retired before verified C0248 selector cutover because C0234/C0240 still consume their lineage. After cutover, retire/simplify only after unique responsibilities are proven replaced.

Do not use raw Wildcard horizon edge without terminal FT / retained-chip / information-option sensitivity. Do not require a fabricated globally optimal future chip week before concluding robustly that `NO CHIP` is correct today.

## GW4 current-control state

Current chip action is `NONE` and current execution guidance is `WAIT_FOR_T_MINUS_2` unless verified material price or injury evidence creates a robust reason to act earlier.

C0244 currently shows GW4 BB and TC each 5th of 5 inside the exact GW4-GW8 numerical window. GW9-GW19 are structural-only until decision-grade numerical evidence exists.

Current FH evidence is dynamically bound to V04 planner run 4: legal fresh-squad candidate utility 67.542 versus 61.204 for the best normal sequential root, a +6.338 lower-bound candidate edge. It remains `HOLD_NO_ROBUST_EDGE` because current optimality and future FH opportunity cost are unresolved.

Captaincy remains a separate equivalence problem. If candidates are inside the mean-error band, do not describe the nominal optimizer captain as having a meaningful edge.

At T−2, rerun the complete final process: fresh data ingestion, full-pool optimization, all 15 players, xMins/roles, captaincy distributions, Defensive Contributions, chips, sequential transfer paths, ROLL, named challengers, price/timing, uncertainty sensitivity, red-team and Noise-Control Gate.

## Communication

Keep chat responses concise. Store detailed technical plans, test cases and audit evidence in GitHub/Supabase. Clearly state when an older recommendation is invalidated by new evidence or a repaired defect.
