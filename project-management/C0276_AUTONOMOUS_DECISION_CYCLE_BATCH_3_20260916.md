# C0276 — Autonomous Decision Cycle Control Plane — Batch 3

Date: 2026-09-16
Status: Production, bounded batch complete

## Scope
Added the first real downstream self-healing worker without changing model/noise gates, executing FPL actions, or changing C0240 concurrency.

## Production changes
- `private.c0276_projection_fixture_lineage_v01(cycle_id)` verifies that the cycle's primary prediction run consumed the current canonical fixture lineage.
- `private.c0276_recover_player_projection_v01(cycle_id)` is fail-closed and bounded to PLAYER_PROJECTION. If fixture lineage is stale it marks the node RUNNING, appends a fresh immutable projection through the existing governed generator, updates cycle lineage, invalidates descendants, and returns PLAYER_PROJECTION to READY. Generator failures/exceptions mark the node FAILED.
- Migrations: `c0276_batch3_projection_lineage_recovery`, `c0276_batch3_fix_prediction_run_array`.

## GW5 acceptance case
Cycle #2 primary run #1377 was correctly detected stale: canonical fixtures 10, run fixtures 10, mismatches 10. Recovery generated frozen prediction run #1379 with 604 prediction rows and decision readiness true. Post-recovery lineage: canonical fixtures 10, run fixtures 10, mismatches 0. PLAYER_PROJECTION is READY with artifact #1379; all descendants are STALE with reason `UPSTREAM_PROJECTION_REGENERATED`.

## Governance
- Historical forecasts rewritten: false.
- Existing forecast rows were not updated; recovery is append-only.
- No transfers or chips executed.
- No decision/noise gate weakened.
- C0240 concurrency unchanged; no 5-worker test attempted.

## Fault/recovery evidence
The live GW5 stale-lineage condition served as the production acceptance fault: stale projection lineage -> detection -> governed regeneration -> new immutable run -> descendant invalidation -> aligned lineage. Failure/exception paths are fail-closed to FAILED.

## Known remaining work
Retry counters/backoff and bounded convergence controller are not yet implemented. Candidate-plan storage remains independent work and publication remains stale. Deadline priority escalation and full end-to-end multi-node fault injection remain pending.

## Exact next batch
1. Add bounded per-node retry metadata/backoff and deadline-aware priority.
2. Implement a controller that advances only the first dependency-safe STALE node and never bypasses FAILED/BLOCKED ancestors.
3. Add candidate-plan artifact independent of final publication.
4. Exercise controlled fault injection across one downstream node and prove recovery/convergence.
5. Keep C0240 concurrency unchanged unless a separately bounded five-worker validation passes.
