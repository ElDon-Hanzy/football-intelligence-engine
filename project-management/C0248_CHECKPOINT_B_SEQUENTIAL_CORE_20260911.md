# C0248 — Checkpoint B: Sequential Normal-Transfer Core

Date: 2026-09-11
Status: SHADOW / IN PROGRESS
Parent program: C0248

## Scope completed

Checkpoint B implemented the first read-only sequential decision core without changing production decision authority.

Production objects now present:

- `public.fpl_sequential_planner_runs`
- `private.c0248_planner_status_v01()`
- `public.c0248_planner_status_bridge_v01()`
- Edge Function `fpl-sequential-planner` v2

GitHub source:

- `supabase/functions/fpl-sequential-planner/index.ts`

## Planner V02 behavior

Version: `C0248_SEQUENTIAL_PLANNER_V02_PAIR_ACTIONS`

Current capabilities:

- exact current manager squad / acquisition prices;
- exact current selling-value rule;
- current bank;
- stored free transfers;
- FT carry/accrual capped at 5;
- explicit -4 hit cost for transfers beyond available FT;
- ROLL action every simulated Gameweek;
- generated 1-transfer actions;
- generated 2-transfer actions;
- forced current C0228 2FT baseline;
- forced current C0240 survivor path;
- dynamic best XI by Gameweek;
- separate distribution-aware nominal captain selection;
- expected-autosub bench utility v1 instead of a universal 12% bench weight;
- 5-GW weighted beam search;
- state deduplication by exact squad + bank + FT inventory;
- append-only planner run lineage.

Still disabled / not yet modeled:

- chips;
- official price predictor / future price scenarios;
- press-conference information-value scenarios;
- exact autosub formation probability tree;
- more than two generated transfers in one future GW;
- seeded-branch preservation through the full horizon.

The last limitation is material: C0228 2FT and C0240 4FT are both injected at GW4, but global beam pruning may eliminate the 2FT branch before the end of the horizon. Therefore V02 is **not sufficient for final path comparison or production cutover**.

## Deterministic transition regression

FT / hit cases passed:

- 3 FT, use 0 → 4 FT next GW, 0 hit
- 3 FT, use 2 → 2 FT next GW, 0 hit
- 3 FT, use 4 → 1 FT next GW, -4
- 5 FT, use 0 → 5 FT next GW
- 1 FT, use 2 → 1 FT next GW, -4

Selling-value cases passed:

- Palmer 9.7 / bought 9.5 → sell 9.6
- Isak 9.1 / bought 9.0 → sell 9.0
- João Pedro 7.7 / bought 7.5 → sell 7.6
- Mbeumo 7.9 / bought 8.0 → sell 7.9
- O'Reilly 6.4 / bought 6.5 → sell 6.4

## GW4 shadow run #2

Lineage:

- manager state: 4
- prediction runs: `[1356, 1348, 1350, 1352, 1353]`
- horizon: GW4–GW8
- beam width: 24
- max generated actions/state: 110
- max generated normal transfers/GW: 2
- price assumption: static current prices, no forecast
- chip actions: disabled

Result:

- status: `SEQUENTIAL_PLANNER_SHADOW_READY`
- best weighted utility: 232.860
- ROLL weighted utility: 211.281
- shadow edge vs ROLL: +21.578
- first action selected by unrestricted beam: forced C0240 4FT route
- first action hit: -4
- resulting FT inventory after GW4: 1
- path then rolled GW5–GW8, finishing with 5 stored FTs

This is evidence only. It does **not** prove the 4FT route beats the 2FT route because the beam did not preserve each first-action family independently.

## Bench utility v1

Normal bench utility is no longer a flat 12% of all bench xPts in this planner.

V1 approximates expected autosub contribution from `1 - p_start` of selected starters and bench expected points. This is directionally better but still approximate because it does not yet compute the exact legal-substitution probability tree for every formation combination.

Bench Boost has not been activated; when implemented, bench points will be valued at full expected FPL points for that Gameweek.

## Integrity / governance

After run #2:

- tracker governance: green
- consumption governance: 84/84, zero violations
- production behavioral proof: 14/14 PASS
- C0248 remains shadow-only
- no player xPts rewrite
- no historical forecast rewrite
- no manager-plan mutation
- no external FPL transfer or chip execution

## Next isolated checkpoint

Checkpoint C must preserve separate root branches through the horizon and compare at least:

1. ROLL / no GW4 transfers
2. C0228 2FT baseline
3. C0240 4FT / -4 route
4. best generated legal 1FT / 2FT alternatives
5. named challenger if it becomes legal

Each root branch must receive its own downstream beam allocation so a lower immediate score cannot disappear before future FT/flexibility value is measured.

No production cutover is permitted until this seeded comparison is complete.
