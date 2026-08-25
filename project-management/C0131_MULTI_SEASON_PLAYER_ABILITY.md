# C0131 — 2024/25 player evidence ingestion & multi-season ability prior

Status: Verified in production on 2026-08-25.
Parent: C0092.
Model effect: disabled (research only).

## Purpose

Close the single-season limitation in C0092 without fabricating historical player ability. Add a genuine second EPL player season, preserve source provenance, and create an append-only multi-season current-player prior.

## Sources

Primary historical event source:
- `olbauday/FPL-Core-Insights`
- `data/2024-2025/players/players.csv`
- `data/2024-2025/teams/teams.csv`
- `data/2024-2025/playermatchstats/GW1..GW38/playermatchstats.csv`

The match-level files contain xG, xA, tackles, interceptions, blocks, clearances, recoveries, minutes and source match IDs. Season-specific `player_id` is mapped to stable FPL `player_code`; only current-player overlaps are inserted. Display-name-only joins are forbidden.

## Ingestion

Edge Function: `ingest-historical-player-evidence` v1.
Protected DB invoker: `private.invoke_historical_player_evidence_v01(text)`.

Verified 2024/25 ingestion:
- 38/38 gameweeks found;
- 11,567 source player-match rows;
- 7,583 mapped current-player rows inserted;
- 3,984 intentionally unmapped historical-only players;
- zero missing gameweeks;
- raw source payload preserved in `historical_player_event_evidence`;
- `model_effect_enabled=false`.

## Cross-season persistence

Persistence is measured on players with >=450 event minutes in both 2024/25 and 2025/26, within current FPL position. Position correlations are shrunk toward the median position correlation using pseudo-n=30, then clipped to 0.35..0.80.

Stored in `player_ability_cross_season_persistence`:

| Position | n | raw attack corr | raw defence corr | attack persistence | defence persistence |
|---|---:|---:|---:|---:|---:|
| DEF | 77 | 0.606298 | 0.590158 | 0.606298 | 0.628660 |
| FWD | 20 | 0.373178 | 0.727483 | 0.513050 | 0.727483 |
| MID | 104 | 0.783669 | 0.788084 | 0.743959 | 0.774516 |

## Older-season process

2024/25 event rates use the same attack/defence families as C0117:
- attack = xG + xA per 90;
- defence = tackles + interceptions + blocks + clearances + recoveries per 90.

Historical Elo covers 2024/25. Source team identity is preserved in each raw row. Opponent adjustment is applied only where source team context reconciles with the match ID and where:
- team-context ratio >=0.80;
- opponent-Elo minute coverage >=0.60.

Rows that do not reconcile are not guessed. Missing component rows are excluded rather than zero-filled.

## v3 blend

Table: `player_ability_prior_v3_observations`.
Function: `public.refresh_player_ability_priors_v3_multiseason()`.
Target season: `2026-2027`.
Method: `player_ability_v0.3_multiseason_persistence_blend`.

Recent reliability and older reliability use `minutes/(minutes+900)`.
The older season enters the blend only when it has >=450 minutes and both attack and defence components are available.

For each component:
- recent effective weight = recent reliability;
- older effective weight = older reliability * position persistence factor;
- weights are normalized to one.

No arbitrary cap is applied: a full older season can dominate when the latest season contains only ~100 minutes. This is intentional sample-size behavior, not recency neglect.

## Production result

- 341 v3 outfield priors;
- 216 genuinely two-season priors;
- 125 one-season priors retained because older EPL evidence is absent or below the 450-minute floor;
- 227 players have sufficient older context for opponent adjustment, including some whose older minutes are below the blend floor;
- average older weight among two-season priors: ~0.419 attack / ~0.436 defence;
- average confidence: ~0.694;
- rerun inserted 0;
- append-only mutation guard passed;
- bad two-season weights: 0;
- bad one-season weights: 0;
- bad weight sums: 0;
- bad actual-data/model-effect flags: 0.

## Integrity

A0005 remained 140 frozen predictions / 20 fixtures / 0 evaluations / 0 integrity violations.
W0002 remained 20 fixtures / 0 evaluations / 0 integrity violations.
No frozen forecast, E0007 rule, or active model coefficient was modified.

## Decision

C0092 can be considered implemented: the player ability prior is now genuinely multi-season where historical EPL evidence exists and conservatively single-season where it does not. Multi-season availability is a per-player evidence property, not a requirement that every current player must have played in the Premier League two seasons ago.
