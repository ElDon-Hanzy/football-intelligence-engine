# C0217 — Storage/Ingestion Hardening and Public FPL Manager Sync

Date: 2026-09-08 (Dubai)

## Production result

C0217 removes the two main runaway-growth paths without deleting useful model history.

### FPL projection cadence
- current decision GW: maximum one full immutable projection snapshot per 24 hours;
- one additional final snapshot beginning approximately two hours before the FPL deadline;
- next two Gameweeks: one baseline snapshot each until promoted into the current decision slot;
- the scheduler remains a cheap eligibility check and does not imply a full write every time it runs.

### Bookmaker odds scope
Only four currently consumed market families are retained:
- H2H / 1X2
- Totals
- Both Teams To Score
- Correct Score

The provider REST response may contain many markets; C0217 filters before any database write. The filtered payload is content-hashed and consecutive unchanged bookmaker/fixture states are skipped.

The redundant independent hourly bookmaker refresh was disabled; the adaptive current-GW scheduler remains.

### Historical cleanup
The approved four-market history was preserved. Previously stored unused market objects and normalized rows were removed.

Observed cleanup:
- raw market objects: 105,092 -> 7,444
- raw odds JSON content: about 30.0 MB -> 1.86 MB
- normalized odds rows: 86,348 -> 17,785
- normalized non-approved markets after cleanup: 0
- database size after VACUUM FULL: about 571.3 MB -> 517.2 MB

No frozen prediction history was deleted merely to reach the free-tier quota.

### Public FPL manager sync
`sync-fpl-manager-state` reads public FPL entry/history/picks/transfers and reconstructs the latest locked squad, opening free transfers and acquisition evidence. It fails closed when pre-deadline private state is hidden: public locked picks are never assumed to be current without either public transfer visibility or explicit user confirmation.

For entry 3559923, the public API established the GW3 locked 15-player squad, £0.0m bank, three free transfers at GW4 opening and exact £100.0m acquisition cost. The user then explicitly confirmed no transfers since GW3; C0218 subsequently added the correct £99.7m FPL liquidation value for optimizer feasibility.

## Production migrations
- 20260907225308 `c0217_projection_odds_scheduler_and_storage_monitor_v01`
- 20260907225639 `c0217_four_market_historical_cleanup_v01`
- 20260907225951 `c0217_manager_sync_invoker_allowlist_v01`
- 20260907230117 `c0217_public_fpl_manager_state_audit_v01`

## Edge functions
- `ingest-bookmaker-odds` v6 — four-market filtered/hash-deduped storage
- `sync-fpl-manager-state` v1 — public FPL manager evidence with fail-closed private-state semantics

Prediction-model coefficients were not changed.
