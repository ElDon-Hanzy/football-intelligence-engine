# C0276 Batch 11 — Projection Lineage Recovery

Date: 2026-09-16

## Scope
Recover Cycle #2 after the production PLAYER_STATE_CHANGED / fixture-lineage invalidation without resuming superseded C0240 batch #231.

## Discovery
The prior projection #1387 was generated after the observed player-state cutoff, but a fresh canonical fixture-lineage check subsequently showed 10/10 fixture mismatches. It was therefore not safe to reconcile #1387.

An initial reconciliation helper migration contained a reference to a non-existent run-table column. Runtime verification caught the error before any state mutation. A corrective migration replaced the helper before recovery proceeded.

## Changes
Migrations:
- `c0276_batch11_projection_player_state_reconcile`
- `c0276_batch11_projection_player_state_reconcile_fix`

`private.c0276_reconcile_projection_lineage_v01` now fails closed unless:
- the Cycle has an attached projection artifact;
- that run exists for the Cycle gameweek;
- projection fixture lineage exactly matches the current canonical 10-fixture state;
- projection generation is not earlier than the current player-state cutoff.

Only after those checks does it update the Cycle's observed fixture/player-state lineage, mark PLAYER_PROJECTION READY, and mark matching state-change events handled. It does not rewrite historical forecasts.

## Production recovery
The helper correctly blocked #1387 because the live fixture check had 10 mismatches. Existing `c0276_recover_player_projection_v01` then appended projection #1388 at 2026-09-16 12:18:45.747787+00. Run #1388 passed C0220/C0223 integrity, produced 604 projection rows, had zero ungoverned missing players, and reported historical_forecasts_rewritten=false.

A second reconciliation against #1388 passed:
- canonical fixtures: 10;
- run fixtures: 10;
- mismatches: 0;
- player-state cutoff: 2026-09-16 08:37:03.519+00;
- projection generated after cutoff;
- current fixture signature captured into Cycle #2.

C0227 uncertainty v02 was regenerated for projection #1388: 604 rows, model_effect_enabled=false, historical_forecasts_rewritten=false. UNCERTAINTY is READY on artifact #1388.

A final event-detection pass returned zero new events. All later nodes remain STALE due to `UPSTREAM_PROJECTION_REGENERATED`.

## Safety
- Superseded C0240 batch #231 was not resumed.
- No transfers/chips executed.
- No publication.
- No historical forecast rewrite.
- No decision/noise gate weakening.
- C0240 concurrency unchanged; no 5-worker test.
- C0265 unchanged.

## Exact next batch
Re-enter convergence at OPTIMIZER only. Verify GW5 #1388 plus the valid GW6/GW7 horizon baselines, dispatch a new optimizer artifact, and stop at the next dependency boundary. Do not reuse optimizer #35 or any downstream artifact from the #1387 lineage.