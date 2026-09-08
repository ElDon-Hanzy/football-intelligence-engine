# C0219 — Projection Cadence / Optimizer Reconciliation

Date: 2026-09-08 (Dubai)
Parent: C0217
Dependencies: C0213, C0217, C0218
Model effect: none — orchestration/readiness semantics only

## Problem discovered in production

C0217 intentionally changed FPL projection storage to a bounded cadence:

- current decision GW: at most one full daily snapshot;
- one final forced snapshot beginning about T−2h before the deadline;
- GW+1/GW+2: one frozen baseline each until promoted;
- cron executions are eligibility checks, not automatic writes.

A production preflight on 2026-09-08 found two immutable pre-deadline projection runs for each of GW4, GW5 and GW6. The C0217 cadence function itself was behaving correctly.

The conflicting writer was the older C0213 optimizer orchestrator. `private.c0213_p2_horizon_readiness_v02()` required each projection timestamp to be at least as new as frequently refreshed C0166 fixture/player-state timestamps. When that strict timestamp parity failed, `private.c0213_p2_orchestrate_optimizer_v01()` directly called `private.generate_upcoming_fpl_snapshot_v01()` one stale Gameweek per transaction.

That contract was correct for the pre-C0217 always-fresh architecture but incompatible with C0217's bounded-storage cadence. The optimizer orchestration therefore bypassed the new cadence and generated extra immutable snapshots.

## Decision

C0217 is the sole projection cadence controller.

Optimizer readiness now separates four concepts:

1. upstream completeness;
2. frozen projection completeness;
3. cadence validity;
4. upstream drift since the projection snapshot.

Live upstream drift remains exposed through `upstream_drifted_since_snapshot`, but it no longer independently forces a projection write.

Cadence validity is:

- current GW before the final window: latest complete frozen projection is within the last 24 hours;
- current GW from T−2h until deadline: latest complete frozen projection was captured in the final window;
- GW+1/GW+2: an existing complete frozen baseline remains valid until that GW is promoted.

Upstream completeness remains fail-closed. Missing data is still not zero.

## Implementation

Supabase migration:

`20260908090429_c0219_projection_cadence_optimizer_reconciliation_v01`

Changes:

- `private.c0213_p2_horizon_readiness_v02()` now evaluates cadence-valid snapshot readiness instead of requiring live upstream timestamp parity.
- `private.c0213_p2_orchestrate_optimizer_v01()` calls `private.c0217_projection_horizon_cycle_v01()` and no longer calls the raw projection generator directly.
- optimizer request/signature semantics remain unchanged when the underlying prediction run IDs are unchanged.
- orchestration remains read-only with respect to `fpl_manager_plans`.

## Verification

After deployment:

- GW4 readiness used frozen run 1334 and classified it `PRIMARY_DAILY_24H` / cadence-valid.
- GW5 readiness used run 1335 and classified it `FORWARD_BASELINE` / cadence-valid.
- GW6 readiness used run 1336 and classified it `FORWARD_BASELINE` / cadence-valid.
- all three projection snapshots remained complete at 604 rows with distribution/coverage integrity green.
- optimizer input signature remained `ebd72d6b64c38db63c9a0238c415ffc8`.
- optimizer orchestration returned existing request 3681 / optimizer run 5 instead of dispatching a new run.
- projection counts were 2/2/2 for GW4/GW5/GW6 before the verification orchestration and remained 2/2/2 afterward.
- the accidental duplicate frozen snapshots were preserved as immutable evidence; none were deleted or rewritten.
- Plan 10 was not changed.

## FPL consequence

None yet. C0219 is a reliability repair, not a new GW4 decision.

C0218 remains In Progress until the final GW4 T−2h refresh and deadline lock. Plan 10 remains the current provisional manager plan unless later evidence produces a robust edge after Noise-Control and Decision-Control.
