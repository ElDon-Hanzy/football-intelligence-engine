# C0263 — V3 Performance & Gameweek Routing — Working Closeout

## Root causes
- App shell booted full FPL workspace plus human-insights data on every first page load.
- Matches and Markets serialized their own contracts behind the FPL workspace contract.
- Match cards waited for optional fixture facts.
- Repeated V3 navigation re-fetched the same large contracts with `no-store` and no in-memory dedupe.
- Current FPL fetched actual-live only after workspace resolved.
- Current-GW History received `gw=0`; `fpl-api` then resolved to the deepest frozen planning run (GW8), not the selected live GW4.
- Frozen planning runs currently extend through GW8; those are internal planning horizon data, not consumer-ready Gameweeks.

## Repair
- Use lightweight `gameweek-status-api` catalog for shell navigation.
- Expose only live GW plus immediate next GW when frozen intelligence exists; preserve deeper planning horizon separately.
- Pass explicit visible GW to Matches, Markets and History.
- Prevent History from mounting with unresolved GW0.
- Remove FPL workspace dependency from Matches/Markets.
- Render Match predictions before optional fixture facts; load facts in background.
- Add bounded in-memory request dedupe: actual-live 10s, workspace 15s, fpl-api/matches 30s, human-insights 60s, fixture facts 120s.
- Prefetch current actual-live when current FPL is active so it overlaps workspace loading.
- Preserve model, chronology, actual-team fail-closed semantics and V2.

Acceptance remains gated on full PR CI and production Pages verification.
