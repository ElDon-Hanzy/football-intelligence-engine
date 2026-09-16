# C0278 — C0274 Runtime Provenance Reconciliation — 2026-09-16

## Finding
Live C0274 was not an unexplained ad-hoc function family. Supabase migration history proves three deployed migrations on 2026-09-15:

- `20260915140013_c0274_hard_availability_forward_projection_invalidation_v2`
- `20260915141504_c0274_projection_multi_gw_temp_table_reentrancy_fix_v2`
- `20260915141855_c0274_bounded_hard_event_reprojection_worker`

The first migration created `private.c0274_hard_event_invalidation_count_v01` and `private.c0274_hard_event_invalidations_v01`, introduced `private.c0213_p2_horizon_readiness_v03`, rewired optimizer/publication readiness to V03, and updated `private.c0217_projection_horizon_cycle_v01` so post-snapshot hard zero-availability events invalidate otherwise cadence-valid projection snapshots. The worker migration added `private.c0274_regenerate_hard_invalidated_gw_v01`.

Hard-event policy is narrow: post-snapshot status in `SUSPENDED|INJURED|UNAVAILABLE`, `chance_of_playing=0`, and prior snapshot expected minutes > 0.5. Replacement is append-only; historical forecasts are not rewritten.

## Governance repair
C0274 had no tracker row despite being production-consumed. C0278 registered C0274 as Completed/Verified and added a C0213 production-consumer contract bound to `c0213_p2_horizon_readiness_v03` + `c0217_projection_horizon_cycle_v01`.

After registration, C0213 tracker governance is 99/99 covered with zero violations.

## Orphan cron adjudication
Cron job 39 `c0274-gw6-hard-reprojection` was created separately from the recorded migrations and ran every minute. Runtime history showed 1,677/1,677 successful executions from 2026-09-15 14:23 UTC through 2026-09-16 18:19 UTC. No evidence was found that the one-minute cadence was an intentional durable contract.

The job was redundant with active `football_intelligence_fpl_upcoming_snapshot`, which calls `private.c0217_projection_horizon_cycle_v01()` every 15 minutes and already evaluates C0274 hard-event invalidation. The every-minute worker therefore did not own unique safety semantics; it only repeated the same check between upstream availability changes.

C0278 safely unscheduled job 39 while preserving all C0274 functions and the integrated C0217/C0213 hard-invalidation path. Active cron count moved 31 -> 30; duplicate active targets remain zero.

## Verification
After reconciliation:

- C0213 behavioral proof re-run on GW5 / prediction run 1393: 14/14 PASS.
- `system_consolidation_ok=true`.
- required capabilities 19/19.
- tracker consumption governance 99/99, zero violations.
- production-effect components remain 14.
- historical forecast rewrite audit remains false.
- C0265 unchanged.
- no external FPL execution.

## Follow-up
The live migration-history SQL is authoritative forensic evidence for the C0274 database source. C0278 canonical documentation must reference this recovery. No C0274 function should be removed merely because the redundant cron was retired.