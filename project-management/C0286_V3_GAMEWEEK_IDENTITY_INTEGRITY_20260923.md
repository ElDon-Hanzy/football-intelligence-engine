# C0286 — V3 Gameweek Identity Integrity

Status: implemented; protected deployment pending.

## Incident

V3 could show a selected GW6 interface with an older GW5 API payload. Production APIs returned distinct GW5 and GW6 contracts, but client adapters accepted any numeric `gameweek`; current views also used unqualified endpoints and could reuse a stale session response after a transient failure.

## Minimal repair

1. Resolve the catalog before rendering a data page.
2. Request the catalog-resolved current gameweek explicitly (`?gw=N`) for Home, FPL and Insights.
3. Enforce `requestedGameweek === payload.gameweek` in every V3 payload adapter.
4. Validate non-empty fixture identity (positive, unique match IDs) and retain match/facts alignment checks.
5. Fail closed on mismatch. A verified prior-GW submitted team remains an explicitly labelled baseline only; it is not used as a same-GW result, prediction or manager decision.

## Coverage

- Contract tests: matching and mismatching GW payloads; invalid fixture identity.
- Browser matrix: GW5 and GW6 across Home, FPL, Matches, Markets, Insights and History; every request is asserted to carry the selected GW.
- Negative browser case: a GW6 Matches response carrying GW5 is rejected and never rendered.

## Production audit evidence (23 Sep 2026)

| Requested GW | `fpl-api` payload | prediction run | first fixture IDs | workspace lifecycle |
|---|---:|---:|---|---|
| 5 | 5 | 1458 | 41, 42, 44 | GW_COMPLETE |
| 6 | 6 | 1461 | 51, 52, 53 | PRE_DEADLINE |

`human-insights-api`, `fpl-v3-workspace-api` and `fpl-v3-actual-live-api` also returned the requested GW for both audit requests. GW6 has no verified submitted actual or authorized manager decision; that remains expected pre-deadline behavior.

## Non-goals

- No new backend dependency or cross-page data store.
- No inference of GW6 actuals from GW5 or from model output.
- No change to the V2 rollback root or V3 deployment topology.
