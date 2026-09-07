# C0218 — GW4 Optimizer Repair and Current Manager Plan

Date: 2026-09-08 (Dubai)
Status: Executed; final verification pending CI

## Why C0218 was required

The first GW4 optimizer dispatch returned `CANDIDATE_POOL_INSUFFICIENT` even though GW4/GW5/GW6 each contained 604 complete projection rows. The root cause was a single PostgREST request across three prediction runs: 1,812 rows were subject to the API row limit, leaving no player with all three Gameweeks in memory.

A second audit found the optimizer was using nominal current list prices and a £100.0m budget. FPL transfer feasibility must instead use each retained player's selling price plus bank. With the user-confirmed unchanged GW3 squad, acquisition prices, and current prices, the current squad liquidation value is £99.7m and bank is £0.0m, so the legal optimizer budget is £99.7m.

Further audit found two additional reliability defects: transfer-hit cost could be subtracted twice when hits existed, and serialized transfer pairs could mismatch positions. The orchestration input signature also did not include the optimizer runtime contract, allowing a newer deployment to reuse an older result.

## Production repairs

- `fpl-full-pool-optimizer` v5 / `C0218_FULL_POOL_SCENARIO_V02`
- prediction rows loaded one run at a time; 1,812 rows verified
- FPL selling-price rule for retained assets; current-price rule for purchases
- manager-state liquidation value stored and cross-checked fail-closed
- explicit ROLL, max-1FT, max-2FT, max-3FT and max-4FT scenarios
- current squad retained in the viable candidate pool even if outside top-300 xMins
- transfer-hit cost subtracted exactly once
- transfer pairs serialized position-to-position
- optimizer runtime contract included in orchestration signature
- corrected optimizer result capture stores ROLL and scenario evidence
- read-only optimizer remains unable to write a manager plan directly

## Corrected GW4 optimizer evidence

Request: `3575`
Captured optimizer run: `3`
Manager state: `3`
Budget: £99.7m
Free transfers: 3
Horizon: GW4-GW6 with weights 1.00 / 0.82 / 0.68

Scenario objective versus ROLL:

| Scenario | Objective | Gain vs ROLL |
|---|---:|---:|
| ROLL | 147.097 | 0.000 |
| 1FT | 150.517 | +3.421 |
| 2FT | 154.254 | +7.157 |
| 3FT | 158.459 | +11.363 |

The raw 3FT result was **not** accepted automatically. Its third structural step required selling Palmer for Schade while replacing Calafiori with Gabriel. That extra edge was rejected by Decision-Control because it was not robust to external/current information: Chelsea host promoted Hull, official FPL identifies Palmer/João Pedro as major GW4 captain/Triple-Captain options, Chelsea's favourable run begins in GW4, Palmer remains the first listed Chelsea penalty taker, and selling Palmer creates premium re-entry/opportunity cost.

The first two moves do survive red-team analysis:

1. O'Reilly -> Guéhi
   - O'Reilly: 51.29 xMins, 63.25% start, unstable holding-midfielder realized role, recent back knock.
   - Guéhi: 86.56 xMins, 95.55% start, stable 3/3 centre-back role.
2. Mosquera -> Calafiori
   - Mosquera: 40.01 xMins, 50.11% start and absent from Arsenal's GW3 matchday squad.
   - Calafiori: 70.93 xMins, 86.69% start, stable 3/3 wide-back role.

## Current GW4 Manager Plan

Database plan id: `8`
Status: `CURRENT_GW4_PLAN_PENDING_FINAL_T_MINUS_2H_REFRESH`

Transfers:
- O'Reilly -> Guéhi
- Mosquera -> Calafiori
- retain one free transfer

Starting XI:
- Verbruggen
- Calafiori, Guéhi, N. Williams
- Bruno Fernandes, Mbeumo, Palmer, Semenyo, Tzolis
- João Pedro, Isak

Bench:
- Forster (GK)
- 1. Dalot
- 2. van Ewijk
- 3. Kusi-Asare

Captain: João Pedro
Vice-captain: Bruno Fernandes
Chip: NONE

The raw model difference between Bruno and João Pedro for GW4 is only about 0.20 expected points, inside normal model error. The structural tie-break is Chelsea at home to Hull versus Manchester United hosting Manchester City, plus João Pedro's central-striker role. Bruno remains vice because of high xGI, penalty duty and minutes security.

The event-distribution model does not explicitly distribute penalty-taking/penalty-miss events, so captaincy is deliberately not delegated to the raw optimizer score.

## Final-lock policy

This is the current plan, not an irreversible early lock. The engine must refresh approximately two hours before the GW4 deadline with latest press conferences, injuries, predicted lineups, prices/ownership and tactical news. Any change must pass Noise-Control against this plan and ROLL; otherwise the plan remains unchanged.

No frozen forecast was rewritten.
