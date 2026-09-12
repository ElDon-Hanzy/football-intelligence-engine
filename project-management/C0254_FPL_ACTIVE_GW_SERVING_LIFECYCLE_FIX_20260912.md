# C0254 — FPL Active-Gameweek Serving Lifecycle Fix

Date: 2026-09-12

## Problem

The public FPL page showed outdated GW4 decision data after the deadline even though `current_fpl_live_plan_v01` correctly contained publication #34 (`FINAL_POST_DEADLINE_CLOSURE`, prediction run 1365).

Root cause was in the `fpl-api` serving lifecycle. The API classified a Gameweek as `HISTORICAL_FROZEN` immediately when the deadline passed. That same state disabled the C0237 live-plan overlay (`livePlanAligned = !isHistorical ...`). The frontend then correctly treated the response as historical and discarded the current manager-plan publication in favor of the older frozen decision snapshot.

This was not a browser-cache issue. The API already serves `Cache-Control: no-store`.

## Reanalysis

A naive rule such as "latest unfinished gameweek" is unsafe because future fixtures through GW38 are already stored as unfinished.

The lifecycle must be evaluated for the requested Gameweek itself:

- before deadline: active pre-deadline state;
- after deadline while at least one fixture remains unfinished: active/frozen current Gameweek;
- only after deadline and all fixtures are finished: historical frozen state.

At repair time GW4 had 10 fixtures, 5 finished, deadline passed, so it must remain active rather than historical.

## Production Fix

Deployed `fpl-api` version 17 with contract version:

`fpl_api_v14_active_gw_lifecycle_fix`

Key rule:

`isHistorical = deadlinePassed && allFinished`

For a deadline-passed but incomplete Gameweek the API now serves `snapshot_stage = FINAL_WINDOW`, keeps the current frozen projection lineage, and allows the aligned C0237 live-plan publication to overlay the decision layer.

The current live publication remains:

- publication id: 34
- prediction run: 1365
- publication status: FINAL
- final status: FINAL_POST_DEADLINE_CLOSURE
- execution authorized: false
- selected path: `NAMED:GW4_3FT_GUEHI_GABRIEL_SCHADE`
- chip: NONE

## Verification

Post-deploy SQL verification for GW4:

- total fixtures: 10
- finished fixtures: 5
- deadline passed: true
- all finished: false
- historical case under new rule: false
- live publication id: 34
- live publication prediction run: 1365
- frozen projection run: 1365
- lineage aligned: true
- publication status: FINAL

Historical forecasts were not rewritten.

## Intended Transition

When all GW4 fixtures are finished, the same endpoint will automatically transition GW4 to `HISTORICAL_FROZEN`, preserving the frozen pre-deadline projection/decision record rather than continuing to present a live-current workspace.
