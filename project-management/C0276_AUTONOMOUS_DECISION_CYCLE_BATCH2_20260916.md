# C0276 — Autonomous Decision Cycle Control Plane — Batch 2

Date: 2026-09-16
Status: production control-plane increment; no FPL execution authority.

## Scope
This batch continues the A-to-Z autonomy program without changing model semantics, decision/noise gates, chip policy, or historical forecasts.

## Production changes
Migration: `c0276_gw5_cycle_instantiation_and_event_detector_v02`.

Added:
- append-only `public.fpl_decision_cycle_events` event ledger;
- `private.c0276_fixture_signature_v01(gameweek)` canonical fixture-lineage signature;
- `private.c0276_player_state_cutoff_v01()` latest player-state cutoff;
- `private.c0276_open_cycle_v01(gameweek,horizon)` authoritative cycle instantiation from latest manager state, latest frozen pre-deadline projection runs, fixture signature and player-state cutoff;
- `private.c0276_detect_events_v01(cycle_id)` event detector that compares observed fixture/player state against the cycle snapshot and invokes the existing DAG invalidation primitive.

## First real cycle
GW5 / horizon 3 instantiated as Decision Cycle `2`.
- Manager state: latest canonical GW5 state.
- Source nodes FIXTURE_STATE and PLAYER_STATE: READY.
- Descendants: STALE by construction until dependency-safe regeneration occurs.
- Cycle state: RUNNING.
- Historical forecasts rewritten: false.

Immediate no-change detector test returned `events_detected=0`, proving the cycle snapshot is internally aligned at creation.

## Governance
- Control-plane functions are private/security-definer and public execution privileges revoked.
- Event detection only invalidates descendants; it does not mutate historical forecast rows.
- No transfer or chip execution capability was introduced.
- C0240 concurrency is unchanged; five-worker testing remains deferred.

## Known blocker / next dependency
The cycle currently records latest frozen projection runs but does not yet prove that those runs consume the same canonical fixture snapshots represented by the cycle fixture signature. The previously observed GW5 C0242 mismatch (prediction run 1377 vs newer canonical fixture snapshots) therefore remains the first real recovery target.

## Exact next batch
1. Add projection-consumption lineage comparison to Decision Cycle health/event detection.
2. Detect the GW5 stale projection lineage automatically (rather than relying on C0242 to discover it).
3. Add one bounded dependency-safe recovery step for PLAYER_PROJECTION that appends a fresh projection run from current canonical fixture lineage.
4. Re-snapshot/update cycle lineage only after successful append and verify descendants remain stale.
5. Add retry accounting and BLOCKED/FAILED transition for the recovery step.
6. Fault-injection test fixture drift -> projection regeneration -> downstream invalidation, with zero historical rewrites.

No downstream optimizer/ensemble/C0240 regeneration should be automated until the projection recovery primitive passes this acceptance test.