# C0249 — Current-Plan Website Serving Compatibility Closeout

Date: 2026-09-11
Status: Completed / Verified pending final CI run
Parent: C0239 / C0237
Model effect: None
Historical forecast rewrite: None

## Trigger

GW4 live website QA found a serving split:

- `/v2/` consumed `fpl-manager-plan-api` and correctly used `current_fpl_live_plan_v01`.
- The legacy root FPL surface consumed `fpl-api.decision`, which still exposed the frozen per-run decision snapshot for the current pre-deadline Gameweek.
- After the O'Reilly availability refresh and the user's fully Noise-Controlled strategic preference, this caused the root FPL tab to remain on Dalot / van Ewijk / Semenyo while the live manager-plan contract had Calafiori / De Cuyper / Foden.

## Current GW4 strategic publication

Append-only publication `fpl_live_plan_publications.id=22` is the current live plan:

- Status: `CONTESTED`
- Final status: `DECISION_NOT_READY`
- Execution authorized: `false`
- Prediction run: `1357`
- Scenario: `GW4_3FT_KEEP_OREILLY_CALAFIORI_DECUYPER_FODEN`
- Transfers:
  - Mosquera -> Calafiori
  - van Ewijk -> De Cuyper
  - Semenyo -> Foden
- XI: Verbruggen; Calafiori, De Cuyper, N. Williams; B. Fernandes (C), Mbeumo (VC), Tzolis, Palmer, Foden; Joao Pedro, Isak
- Bench: Forster; Dalot; O'Reilly; Kusi-Asare
- No hit, no chip, post-move ITB £0.2m
- Sequential score: 231.501
- Closest Palmer-preserving comparator: 233.437
- Gap: -1.936 weighted points; user explicitly accepted the strategic trade-off
- T-2 revalidation remains mandatory

The publication rationale explicitly distinguishes current account bank (£0.0m before transfers) from planned post-transfer ITB (£0.2m).

## Production fix

Supabase Edge Function `fpl-api` was promoted to v14.

For a current pre-deadline Gameweek only, `fpl-api.decision` now overlays the latest current live plan when and only when:

1. the Gameweek is not historical;
2. a live plan exists; and
3. `current_fpl_live_plan_v01.prediction_run_id` exactly equals the prediction run being served.

If any condition fails, existing frozen-decision behavior remains in force.

Historical Gameweeks always continue using the frozen `decision_snapshots` contract. No historical decision or prediction row is modified.

New serving semantics expose:

- `current_predeadline_decision_source`
- `historical_decision_source=FROZEN_DECISION_SNAPSHOT_ONLY`
- `live_plan_prediction_alignment_required=true`
- `historical_forecasts_rewritten=false`

Source-control commit: `4e3ab4396bf291a9db9d4ec3d07bc7fd3fb08a91`.

## QA evidence

### Database/live publication

`current_fpl_live_plan_v01` resolves publication 22 with run 1357, exact XI 11/11, bench 4/4, 3 transfers, Bruno captain, Mbeumo vice, no chip, post-move ITB 2 tenths, execution unauthorized.

### Public APIs

Both `fpl-manager-plan-api?gw=4` and `fpl-api?gw=4` returned HTTP 200.

`fpl-manager-plan-api` resolved publication 22 and the exact current strategic plan.

`fpl-api` v14 returned:

- contract `fpl_api_v13_current_live_plan_compat`
- GW4 prediction run 1357
- exact strategic XI and bench
- current decision source `CURRENT_FPL_LIVE_PLAN_PUBLICATION`

All 15 selected/bench player IDs resolved against the same run-1357 `all_predictions` payload.

### Historical regression

`fpl-api?gw=3` returned HTTP 200, `HISTORICAL_FROZEN`, prediction run 1274, and the original frozen GW3 XI/bench/captain. The live-plan overlay did not activate.

### Website availability

Both GitHub Pages root and `/v2/` returned HTTP 200. Critical root JS and v2 JS/CSS assets returned HTTP 200 with no timeout/error.

## Integrity rules

- This publication is PRE-FINAL / CONTESTED, not final.
- No FPL action has been executed.
- C0234 remains final authority.
- T-2 refresh is still required.
- Strategic override status and the -1.936 weighted-point comparator gap remain visible; the website must not present this as an uncontested model winner.
