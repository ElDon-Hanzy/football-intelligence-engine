# C0212 — Realized Competitive Player-Role Refresh

Date: 2026-09-05

## Problem

The automated role layer could remain anchored to preseason/historical behavioral archetypes even after current-season competitive matches. The FPL position family was also used as a hard role-candidate guardrail, which prevented a player classified as `DEF` in FPL from being represented as an actual `WIDE_ATTACKER` when deployed on the attacking line.

Maxim De Cuyper exposed the failure: the stale role profile said `WIDE_BACK / HYBRID_DEFENDER` with zero competitive minutes, while all three 2026/27 Premier League starts placed him on the attacking-midfield line of a 4-2-3-1.

## Production fix

C0212 separates two concepts:

1. **FPL position** remains the immutable scoring classification used for FPL rules.
2. **Realized tactical role** is a current competitive fact derived from the player’s actual lineup position and formation.

New append-only source layer:
- `public.realized_player_role_observations`
- `public.fotmob_player_identity_observations`
- `public.current_fotmob_player_identities`
- `public.current_realized_player_roles`

`public.current_player_role_profiles` now overlays realized competitive tactical role onto the behavioral profile for future fixture-role snapshots. `refresh-current-player-state` now consumes the same realized role and records it in `player_state.state.realized_role`.

No numeric role-uplift coefficient was invented. `model_effect_enabled=false` remains true for numeric role effects; C0212 changes the factual tactical-role state only. Historical forecasts are untouched.

## Source and derivation

Source: FotMob match-details lineup payload via the already-used FotMob API family.

For finished matches, the ingestion captures:
- team formation;
- starter coordinates (`verticalLayout` / `horizontalLayout`);
- FotMob player identity;
- usual playing-position id;
- realized formation line;
- wide vs central band;
- derived tactical role.

Current role bands:
- goalkeeper line -> `GOALKEEPER`
- defensive line -> `CENTRE_BACK` / `WIDE_BACK`
- midfield line -> `HOLDING_MIDFIELDER` / `WING_BACK`
- attacking-midfield line -> `CREATOR_10` / `WIDE_ATTACKER`
- forward line -> `CENTRAL_STRIKER` / `WIDE_FORWARD`

The raw coordinates and source starter object are retained so taxonomy can be refined without rewriting the original observation.

## Identity discipline

The initial 27-match backfill produced 594 starter observations. Direct name mapping resolved 555 rows; 39 were formatting/transfer-history mismatches. A persistent FotMob identity layer resolved those without mutating the source observations.

Verified post-resolution coverage:
- 594/594 starter observations resolved;
- 0 unresolved rows;
- 272 distinct resolved players;
- 27 finished matches with source coverage.

Identity observations are append-only and retain mapping method/evidence.

## Automation

Edge function: `ingest-realized-player-roles`.

Cron:
- `football_intelligence_realized_role_refresh`
- schedule `37 * * * *`

The job is idempotent. It scans finished FPL matches and only fetches matches without realized-role observations. If the upstream match/FotMob source is not yet present, the match remains unprocessed and is retried later. After new role rows are inserted, current player state is refreshed automatically.

This means role evidence is refreshed throughout a Gameweek and, critically, after the final matches complete when the normal end-of-GW data chain catches up.

## Verification evidence

Initial backfill request returned:
- 28 finished matches considered;
- 27 fetched/processed;
- 594 starter rows inserted;
- 0 fetch errors;
- 0 incomplete lineups;
- one finished match still awaiting upstream source linkage and therefore intentionally retried later.

Current-state refresh after identity resolution:
- 272 realized-role players;
- 21 new role overrides written for previously unresolved identities;
- 583 unchanged current-state rows;
- historical forecasts rewritten: false.

GW4 role/tactical refresh then wrote 271 fixture-role snapshots using the corrected current-role view.

### Four-player proof

- **De Cuyper (FPL DEF):** GW1/GW2/GW3 = `WIDE_ATTACKER`, attacking-midfield line, wide, 4-2-3-1; 3/3 stability; source confidence 0.98.
- **Tavernier (FPL MID):** GW1/GW2/GW3 = `WIDE_ATTACKER`; 3/3 stability; source confidence 0.98.
- **Gakpo (FPL MID):** GW1/GW2/GW3 = `WIDE_ATTACKER`; 3/3 stability; source confidence 0.98.
- **Cherki (FPL MID):** both league starts = `CREATOR_10` on the attacking-midfield line; 2/2 stability; source confidence 0.98.

## Integrity / limitations

- Historical predictions remain append-only and unchanged.
- FPL scoring position is never rewritten from tactical role.
- Missing source data is not treated as a defensive role or zero; missing matches retry.
- Source observations are append-only.
- Realized tactical role can influence factual future role state and matchup interpretation, but C0212 does **not** assign an unvalidated numerical xG/xA/xPts uplift merely because a player is deployed higher.
- Substitute roles without reliable lineup coordinates are not forced into a tactical band.
