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
- Bench value is state dependent: normal GW = autosub/resilience/option value; Bench Boost GW = full scoring value.
- Chip timing must compare current use against future remaining windows and chip scarcity.
- Price prediction affects execution timing/feasibility, not player xPts.
- Keep serious prior challengers in the decision set until explicitly resolved on current lineage.
- Options within model error are `NO_MEANINGFUL_EDGE`.
- Research/shadow output cannot acquire numeric production effect without its promotion contract.

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

C0243-C0246 are pending requirements, not implementation authorization. Per C0247, prefer one consolidated multi-GW state-transition decision planner over four new independent production layers.

C0242 must be completed/integrated before additional downstream decision-control runtime is introduced.

## Communication

Keep chat responses concise. Store detailed technical plans, test cases and audit evidence in GitHub/Supabase. Clearly state when an older recommendation is invalidated by new evidence or a repaired defect.