# C0278 Runtime Authority Repair — 2026-09-17

## Scope
Repair two whole-engine reconciliation findings without weakening governance:
1. C0274 hard-event invalidation runtime existed without GitHub ownership documentation.
2. C0272 and C0276 both had active 5-minute schedulers near final-promotion authority.

## C0274 ownership reconciliation
Live runtime contains:
- `private.c0274_hard_event_invalidations_v01`
- `private.c0274_hard_event_invalidation_count_v01`
- `private.c0274_regenerate_hard_invalidated_gw_v01`

Policy: a post-snapshot hard zero-availability event (SUSPENDED / INJURED / UNAVAILABLE, chance_of_playing=0) invalidates a forward projection only where the frozen snapshot expected_minutes > 0.5. Regeneration creates a new snapshot; historical forecasts are not rewritten.

The former dedicated `c0274-gw6-hard-reprojection` cron is no longer active. C0274 remains a safety primitive available to governed callers; it is not a separate scheduled authority.

## Final-authority consolidation
Before repair:
- `c0272_fpl_final_promotion_watch` cron ran every 5 minutes and could call C0248 promotion, autonomous gate refresh and C0237 publication.
- `c0276-autonomous-decision-tick-v01` also ran every 5 minutes, but its FINAL_GATE called C0272 only in dry-run mode and therefore could not become the sole final authority.

This was an authority overlap.

### Repair
Migration `c0278_single_final_authority_repair_v2`:
- keeps C0272 as the governed final-promotion primitive;
- makes `private.c0276_dispatch_final_gate_v01` the sole scheduled entrypoint: chip opportunity gate first, then T-2/deadline governance, then C0272 execution only if those checks pass;
- unschedules `c0272_fpl_final_promotion_watch`;
- retains only C0276 job 40 as the autonomous decision-cycle scheduler.

## Verification
Post-repair:
- active crons: 29;
- C0272 scheduler absent;
- C0276 job 40 remains active every 5 minutes;
- C0213 registry integrity = true;
- C0213 system consolidation = true;
- behavioral production proofs = 14/14 current;
- duplicate active cron targets = 0;
- current Cycle 2 FINAL_GATE remains fail-closed outside T-2;
- current chip gate = RESERVE_FOR_FUTURE / NONE / play_now_authorized=false;
- no external FPL execution;
- no historical forecast rewrite;
- C0265 unchanged;
- C0240 concurrency unchanged.

## Authority rule after repair
C0276 is the single scheduled decision/final-gate authority. C0272 is a subordinate governed primitive, not an independent scheduler. C0248 remains the selected-path authority. C0237 remains publication only after the governed final path permits it.
