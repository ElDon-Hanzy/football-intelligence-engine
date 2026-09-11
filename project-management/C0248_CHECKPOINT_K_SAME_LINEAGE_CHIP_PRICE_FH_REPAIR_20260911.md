# C0248 Checkpoint K — Same-Lineage Chip / Price / Free-Hit Repair

Date: 2026-09-11
Status: COMPLETED / VERIFIED
Parent: C0248
Scope: C0244/C0248 decision-control reliability only; no player xPts rewrite; no FPL execution

## Executive judgment

The late C0244 closeout caveat is repaired.

All canonical C0248 chip and price support surfaces now consume the same latest V04 sequential planner run. The stale V03 cross-run selectors were removed, and Free Hit no longer uses a hard-coded `+2.618` current-GW edge.

Current GW4 decision remains:

- chip: `NONE`
- execution timing: `WAIT_FOR_T_MINUS_2`
- no transfer executed
- no chip executed

C0244 may remain `Completed / Verified`.

## Defects repaired

### 1. Cross-run price lineage

`private.c0248_price_timing_status_v01()` selected a V03 planner run while canonical C0248 decision-control used V04 run 4.

The normal roots happened to align in GW4, but cross-run decision supervision was not acceptable.

Repair:

- selector now requires latest `C0248_SEQUENTIAL_PLANNER_V04%`;
- price timing is explicitly scoped to non-Wildcard normal roots;
- output carries `planner_run_id`, `planner_version`, and `root_scope`.

### 2. Cross-run BB / TC lineage

`private.c0248_chip_timing_status_v01()` also selected V03 because V03 predated the Wildcard root.

Blindly switching the old function to V04 would have been wrong because V04's overall best root is Wildcard and one chip cannot be evaluated as though another chip were already active.

Repair:

- selector now requires latest V04;
- BB/TC ranking explicitly excludes `WILDCARD_FRESH`;
- the current normal root is selected as the highest-scoring non-Wildcard V04 branch;
- current root remains `C0240_LEGACY`.

GW4 BB/TC values are unchanged:

- BB incremental EV: 4.846; HOLD; exact-window rank 5/5.
- TC incremental EV: 6.174; HOLD; exact-window rank 5/5.

### 3. Legacy Wildcard same-utility diagnostic

`private.c0248_wildcard_same_utility_benchmark_v01()` still selected V03.

Repair:

- now uses V04 lineage;
- compares diagnostic fixed fresh-squad candidates against the best non-Wildcard V04 root rather than the overall V04 summary root;
- explicitly marks itself diagnostic-only because a true V04 sequential Wildcard root now exists.

### 4. Static Free Hit edge

`private.c0248_current_chip_action_status_v01()` contained a hard-coded `v_fh_ev := 2.618` value originating from Checkpoint F.

That value would not refresh after new projections or at T-2, violating chronology-safe current-lineage decisioning.

Repair:

New supporting function:

`private.c0248_free_hit_same_utility_status_v01(gameweek,horizon)`

It dynamically compares:

- the V04 Wildcard root's first-GW legal fresh squad as a legal FH candidate;
- the first-GW utility of the best non-Wildcard sequential root.

Current GW4 values on planner run 4:

- fresh legal candidate utility: 67.542
- best normal-root current-GW utility: 61.204
- dynamic candidate edge: **+6.338**

Important: `+6.338` is explicitly a **lower-bound legal candidate edge**, not a claim that the engine has exhaustively solved the optimal one-GW Free Hit squad. The current V04 Wildcard squad was optimized across the multi-GW horizon, not specifically for one-GW FH ceiling.

Therefore Free Hit remains:

`HOLD_NO_ROBUST_EDGE`

because:

- the current candidate is not an exhaustive FH optimum;
- future FH opportunity value remains unresolved;
- first-half future structural information can still change;
- no current FH authorization is allowed from this candidate alone.

The stale `+2.618` constant is no longer used by runtime decision-control.

## Same-lineage fail-closed contract

`private.c0248_current_chip_action_status_v01()` now requires all four inputs to report the same planner run id:

- BB/TC chip timing;
- Wildcard terminal sensitivity;
- normal-root price timing;
- dynamic Free Hit candidate.

If their planner run IDs disagree, the function returns:

`C0248_CURRENT_CHIP_LINEAGE_MISMATCH`

rather than combining evidence across planner generations.

Current result:

- planner run: 4
- planner version: `C0248_SEQUENTIAL_PLANNER_V04_WILDCARD_ROOT`
- chip recommendation: `NONE`
- current-no-chip robust: true
- normal price branches all: `WAIT_FOR_INFORMATION`

## Policy semantic repair

The old JSON field `no_chip_can_be_authorized_without_knowing_future_best_chip_week=true` contradicted actual C0248 policy.

It is now false, with the positive invariant exposed as:

`current_no_chip_can_be_robust_without_global_best_week=true`

This matches the established doctrine: the engine does not need fabricated precision about the globally best future chip week to conclude that a chip lacks a robust edge today.

## Production migration

Supabase migration:

`20260911154010_c0248_same_lineage_chip_price_fh_repair`

Affected objects:

- `private.c0248_price_timing_status_v01`
- `private.c0248_chip_timing_status_v01`
- `private.c0248_wildcard_same_utility_benchmark_v01`
- `private.c0248_free_hit_same_utility_status_v01` (new supporting function inside C0248, not a new decision layer)
- `private.c0248_current_chip_action_status_v01`

A post-migration catalog scan finds **zero** remaining function definitions referencing `C0248_SEQUENTIAL_PLANNER_V03`.

## Regression / governance proof

Post-repair:

- C0248 decision-control: ready=true
- C0244 structural first-half control: mature=true
- C0245 option-value control: mature
- current chip: `NONE`
- execution guidance: `WAIT_FOR_T_MINUS_2`
- change-tracker governance: PASS, zero violations
- consumption governance: PASS, 87/87 governed implemented rows covered
- C0213 production behavioral tests: 14/14 PASS on GW4 prediction run 1356
- historical forecasts rewritten: false
- no transfer/chip execution

## C0244 closeout status

The caveat raised after Checkpoint I is resolved.

C0244 remains `Completed / Verified` because:

- first-half structural opportunity is mature through GW19;
- numerical ranking remains fail-closed outside decision-grade projections;
- all current chip support inputs now use the canonical V04 planner lineage;
- FH current evidence refreshes dynamically rather than relying on a frozen constant;
- canonical C0248 consumes the result.

This repair does **not** remove the broader C0248 production-selector cutover blockers documented in Checkpoint J.
