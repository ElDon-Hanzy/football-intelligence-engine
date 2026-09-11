# C0251 — Captaincy Current-Lineage Gate Closeout

Date: 2026-09-12
Status: Completed / Verified

## Problem

The production captaincy equivalence gate consumed the `prediction_run_id` pinned to the latest live-plan publication. For GW4, publication 22 remained pinned to run 1357 even after a materially fresher immutable projection run 1362 had been generated from newer player state and canonical fixture predictions. This allowed captaincy to be evaluated on stale projection lineage while the rest of the system had newer evidence.

## Fix

Added `private.c0242_captaincy_equivalence_gate_v02(gameweek, mean_error_band)` and switched `private.c0242_consistency_status_v01()` to consume it.

For the current pre-deadline Gameweek, the gate now:

1. Selects the latest complete immutable pre-deadline projection run.
2. Uses the starting XI from the latest live-plan publication.
3. Requires every fixture cutoff embedded in the projection run to exactly match `public.current_production_fixture_prediction_v01`.
4. Requires the latest current-state timestamp for the XI to be no newer than the projection run.
5. Fails closed on stale fixture lineage, stale player-state lineage, or incomplete XI projection coverage.
6. Preserves publication-pinned frozen lineage for historical Gameweeks.

No historical forecasts are rewritten.

## GW4 verification

- Live publication: 22
- Publication projection run: 1357
- Fresh captaincy projection run: 1362
- Run 1362 generated: 2026-09-11 22:58:23 UTC
- Canonical fixture coverage: 10/10
- Fixture lineage mismatch: 0
- Latest XI player state: 2026-09-11 20:00:04 UTC
- Lineage mode: `LATEST_CURRENT_ALIGNED_PROJECTION`
- Captaincy decision class: `NO_MEANINGFUL_EDGE`
- Nominal mean leader: Bruno Fernandes
- Tail leader: Bryan Mbeumo
- Floor leader: Riccardo Calafiori

## Integrity policy

Current-GW captaincy may not silently consume a stale publication-pinned projection. If the latest current projection is not aligned with canonical fixture and XI player-state lineage, captaincy is not decision-ready.

Historical snapshots and forecasts remain immutable.
