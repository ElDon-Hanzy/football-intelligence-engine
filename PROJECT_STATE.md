# Football Intelligence Engine — Project State

_Last updated: 2026-08-23_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Non-negotiable production rules:
- historical FPL and betting forecasts are append-only;
- never rewrite a forecast after results are known;
- fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff;
- research/shadow reruns after kickoff must never replace the original decision-state forecast;
- missing data is not zero;
- preserve raw source/provenance and known-at timestamps;
- never commit secrets/API keys;
- all new Mispricing Intelligence families remain `model_effect_enabled=false` until validated out of sample;
- betting research quality must eventually be judged by calibration, EV and CLV, not raw hit rate alone.

## 2. FPL model/state architecture

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified.
- v0.1.2 — multiplicative matchup-strength recalibration and the base `player_state` layer consumed by later models.
- v0.1.2b — starter minutes/P(start), penalty-event treatment, latent BPS/bonus simulation, opponent-adjusted Defensive Contributions.
- v0.1.3 — consumes the v0.1.2 player-state layer and overlays the older manually researched Player Role Intelligence table.

Historical GW1 forecasts remain frozen.

Permanent weekly rules:
- project the full 15-man squad before XI/bench/captain decisions;
- xMins, xPts, P(blank), P(5+), P(10+), P(15+), P(20+);
- include Defensive Contributions;
- use Captaincy Haul Model rather than mean xPts alone;
- anti-anchor to prior XI/bench/captain.

Current official FPL player dimension: **604 players**, with zero missing team mappings and zero missing position mappings at latest verification.

## 3. Result pipeline and current-season evidence

### `sync-gw-results`
Current deployed version: **v4 ACTIVE**.

It:
- reads official FPL live player data and GW fixtures;
- writes append-only `gameweek_result_runs` and `player_gameweek_actuals`;
- records the exact `finished_fixture_ids` for every result snapshot;
- reconciles mutable factual result state in `matches` without altering frozen predictions;
- invokes `refresh_current_season_team_intelligence()` after fixture reconciliation;
- is hash-idempotent when the official result payload is unchanged.

Production result cron: `*/15 * * * *`.

Current-season team evidence from official FPL currently contains **16 team-side rows** from 8 completed GW1 matches. Goals are factual; unavailable team xG remains NULL, never fabricated zero.

## 4. Snapshot-safe FPL actuals / fixtures

Current deployed `fpl-api`: **v8 ACTIVE**.
Player actual finality is evaluated against the same stored result snapshot's `finished_fixture_ids`, never a newer live fixture state.

`fixture_results` exposes mutable factual results separately from frozen pre-kickoff predictions.

Historical expected scores must never be reconstructed after results are known. Missing valid pre-kickoff prediction = `—`.

## 5. Dashboard / UI state

Repository: `ElDon-Hanzy/football-intelligence-engine`.
Main page: `index.html`.
GitHub Pages workflow deploys repository root on pushes to `main`.

Latest dashboard contract repair before this intelligence pass:
`aab8189426c51716eae48a4a99443a7e600a7998`.

Current dashboard can render fixture prediction-vs-actual, FPL actuals, bookmaker feed health, Correct Score odds, research edges, price tracking and CLV.

Planned information architecture after foundational intelligence contracts stabilize:
- Home;
- FPL;
- Fixtures;
- Market Intelligence;
- Performance.

Do not heavily polish the table-oriented UI before remaining data contracts stabilize.

## 6. Existing Mispricing Intelligence base

Existing observational families:
- Recent Performance / attacking xG trend;
- Recent Performance / defensive xGA trend;
- Schedule / Fatigue / rest-congestion.

All remain `model_effect_enabled=false`.

Historical adapters remain verified:
- Football-Data: 932 source matches, 784 current-team historical rows, all 20 teams, xG correctly NULL;
- Understat: 380 EPL matches, 646 current-team xG rows, 17 teams;
- canonical reconciliation: 784 team-dates, 646 overlaps, 138 Football-Data-only promoted-team dates, zero source/match/team duplicate groups.

## 7. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Production table:
`public.player_fixture_availability_observations`.

Stores append-only fixture/player observations with official FPL status/news/chance of playing, latest base P(start)/xMin, candidate-XI membership, candidate positional shape, confidence/provenance and observation hash.

Safeguards:
- RLS enabled;
- anon/authenticated revoked;
- service role only;
- hard pre-kickoff trigger;
- `model_effect_enabled=false` enforced.

`refresh-availability-intelligence`: **v4 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Important semantic rule: labels such as 4-5-1 / 5-4-1 are **selection-constrained candidate shapes, not tactical formations**.

Fulham–Chelsea validation:
- 61 player observations per current snapshot;
- 11 candidate XI players per team;
- zero post-kickoff rows;
- zero model-effect rows.

Production availability cron: `10 */4 * * *`.

## 8. Current-season player-state refresh — DEPLOYED + VERIFIED

`refresh-current-player-state`: **v3 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Correct lineage:
- v0.1.3 consumes v0.1.2 `player_state` plus manual role intelligence;
- current-season future-state updates therefore append under v0.1.2;
- they do not regenerate historical predictions.

First successful production run:
- 600 state rows appended;
- 4 new FPL players explicitly reported with no base state rather than fabricated priors;
- identical rerun: 0 inserts / 600 unchanged;
- 0 GW1 predictions generated after the state refresh.

Production state cron: `0 */4 * * *`.

## 9. Competitive rich-event ingestion — DEPLOYED + VERIFIED

New Edge Function:
`ingest-competitive-core-stats` **v1 ACTIVE**.

Source adapter: current-season Premier League files from FPL-Core-Insights. It maps source team codes/FPL player IDs into canonical fixtures and imports richer event features for Role/Tactical research.

Strict completeness rule:
- team evidence may ingest from completed source matches;
- player-event evidence is accepted only when the upstream match explicitly has `player_stats_processed=true`;
- partial/unprocessed player rows are skipped, not treated as zero;
- missing components remain NULL.

First GW1 execution:
- source matches: 10;
- completed matches represented: 8;
- team-side candidates/inserted: **16 / 16**;
- matches with fully processed player stats: **1**;
- competitive player-event candidates/inserted: **40 / 40**;
- skipped unprocessed player rows: 200;
- unmapped players: 0.

Identical-source rerun inserted **0 team rows / 0 player rows**.

## 10. Role Intelligence v0.1 — DEPLOYED + VERIFIED

New append-only production objects:
- `player_role_profile_observations`;
- `player_fixture_role_observations`;
- `current_player_role_profiles`;
- `current_player_fixture_roles`.

Automated role taxonomy is an **event-profile archetype taxonomy**, not an exact positional-tracking system.

Current archetypes:
- GKP: GOALKEEPER;
- DEF: CENTRE_BACK, WIDE_BACK, HYBRID_DEFENDER;
- MID: HOLDING_MIDFIELDER, BOX_TO_BOX, CREATOR_10, WIDE_ATTACKER;
- FWD: CENTRAL_STRIKER, LINK_FORWARD, WIDE_FORWARD, TARGET_FORWARD.

Evidence uses weighted event rates including crosses, final-third passes, chances created, box touches, shots/xG/xA, dribbles, tackles/interceptions/recoveries/clearances, aerials, long balls and offsides.

Source weights:
- competitive Premier League event evidence = 1.0;
- preseason/friendlies = 0.3.

Conservative resolution rule:
- thin or weak evidence => `UNRESOLVED`;
- `UNRESOLVED` is a valid result, not a failure;
- no role is promoted to certainty merely because the player has an FPL position.

Latest current profile audit:
- **406 player profiles**;
- **371 UNRESOLVED**;
- **31 players with competitive event evidence**;
- **0 profiles at confidence >= 0.75**;
- average confidence about 0.378.

Directionally sensible resolved examples include Raya = GOALKEEPER, Gabriel/Maguire = CENTRE_BACK, White/Frimpong = WIDE_BACK, Odegaard = CREATOR_10, Mbeumo = WIDE_ATTACKER, Havertz = TARGET_FORWARD.

Critical limitation:
FPL position is currently only a broad guardrail. Players listed unusually by FPL—for example a tactical wing-back listed as MID—can still be forced into the wrong role family. This must be improved with stronger historical/zone/positional evidence before replacement-quality effects are enabled.

The existing manually researched `player_role_intelligence` rows remain separate and untouched; this automated layer does **not** overwrite them and does not alter v0.1.3 today.

## 11. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

New append-only production objects:
- `team_tactical_profile_observations`;
- `team_fixture_tactical_observations`;
- `current_team_tactical_profiles`;
- `current_team_fixture_tactics`.

The model stores orthogonal style axes rather than pretending to know a single exact formation:
- possession control;
- directness;
- width/delivery;
- **attacking box occupation**;
- set-piece emphasis;
- defensive-block tendency.

Dominant research labels currently include:
- POSSESSION_CONTROL;
- DIRECT_TRANSITION;
- WIDE_DELIVERY;
- HIGH_BOX_OCCUPATION;
- SET_PIECE_EMPHASIS;
- DEEP_DEFENSIVE_BLOCK;
- BALANCED.

### Semantic correction
The initial implementation called the attacking-box axis `HIGH_BOX_PRESSURE`. That could be confused with defensive pressing intensity. It was corrected append-only to taxonomy **`team_style_v0.1.1`** with label `HIGH_BOX_OCCUPATION`.

The physical column name `box_pressure_score` remains for compatibility, but evidence explicitly states that it means attacking box occupation/pressure and **does not measure defensive pressing**.

Defensive pressing intensity is **not modeled yet**.

Latest audit:
- **19 current team tactical profiles**;
- one team remains without sufficient mapped/rich evidence rather than receiving fake zeroes;
- current Fulham and Chelsea dominant label: WIDE_DELIVERY;
- all labels remain research heuristics, not tactical truth or asserted formations.

## 12. Fixture Role/Tactical chronology — VERIFIED

Fulham–Chelsea current fixture state:
- **61 current player-fixture role rows**;
- **2 current team-fixture tactical rows**.

Database safeguards and audit:
- post-kickoff player-role rows: **0**;
- post-kickoff team-tactical rows: **0**;
- role model-effect rows: **0**;
- tactical model-effect rows: **0**;
- fixture role snapshots whose source evidence cutoff is at/after kickoff: **0**;
- fixture tactical snapshots whose source evidence cutoff is at/after kickoff: **0**.

A deliberate post-kickoff `guard_test` insert persisted **0 rows**.

The protected v3 Role/Tactical orchestrator was then run twice on identical evidence. Second execution returned HTTP 200 with:
- player profiles inserted 0;
- team profiles inserted 0;
- player fixture roles inserted 0;
- team fixture tactics inserted 0.

Thus the current path is end-to-end idempotent.

## 13. Role/Tactical production functions and cadence

`refresh-role-tactical-intelligence`: **v3 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.
It is a thin authenticated orchestrator over database RPCs:
1. `refresh_player_role_profiles()`;
2. `refresh_team_tactical_profiles_v011()`;
3. `refresh_player_fixture_role_snapshots(gameweek)`;
4. `refresh_team_fixture_tactical_snapshots(gameweek)`.

Production cron:
- `football_intelligence_competitive_core_ingest`: `0 8,18 * * *`;
- `football_intelligence_role_tactical_refresh`: `20 8,18 * * *`.

This lets the rich-event adapter ingest after the upstream twice-daily update window, then rebuilds profiles twenty minutes later.

Protected backend allowlist now includes:
- `ingest-team-history`;
- `ingest-understat-xg`;
- `ingest-bookmaker-odds`;
- `refresh-availability-intelligence`;
- `refresh-current-player-state`;
- `ingest-competitive-core-stats`;
- `refresh-role-tactical-intelligence`.

Vault token remains internal and no secret is committed.

## 14. Replacement quality — STILL DELIBERATELY NOT MODELED

Do **not** enable replacement quality yet.

We now have a useful observational role layer, but it is not sufficiently calibrated to identify all true tactical substitutes, especially cross-listed roles and unusual FPL positions.

Replacement quality requires:
1. stronger role priors / positional-zone evidence;
2. forward validation against actual lineups and observed roles;
3. role-distance mapping between absent player and replacement;
4. then football-quality and tactical-consequence estimates.

Until then availability continues to expose:
`replacement_quality_status='NOT_MODELED_NO_RELIABLE_ROLE_MAP'`.

## 15. Bookmaker / Correct Score research state

Layer 1 remains PASSED and append-only.
Layer 2 remains observational with proportional + power de-vig, offered-set conditional comparisons, raw/unconditional wager EV and `value_edge_available=false`.

Price/CLV semantics remain:
- first observed != asserted true opening;
- closing = last-valid-pre-kickoff proxy;
- exact capture gap retained;
- original observations never rewritten.

Current deployed `betting-api`: **v9 ACTIVE**.

## 16. Repository parity — latest Role/Tactical commits

Role/Tactical source/config/migrations committed this pass:
- `7c9aac83fb4808b29581dd1775109742f87cfd63` — competitive ingestion import config;
- `84b28613d6313c7f04f3020b0c2ab54b970a9edc` — competitive rich-stat ingestion source;
- `17b46bf5547cd4e5836fd4657a60753147af75de` — Role/Tactical orchestrator import config;
- `43bd1893ff744266eaa8e02d257155fecb788093` — Role/Tactical v3 orchestrator source;
- `9ffdf8d1e555f58c097432671a00c9f3f87b47ed` — Role/Tactical storage, guards and protected backend allowlist;
- `f553da6fd6c1712f238cdbb84dfbc448a0cb5162` — final Role/Tactical refresh RPCs;
- `ebd7a17395052c00d7f6fb92a9fb9e3d499ce826` — competitive/Role-Tactical cron schedule.

Previous current-season evidence commits remain in repository history.

## 17. Security state

New Role/Tactical tables are internal:
- RLS enabled;
- anon/authenticated revoked;
- service-role read/write only as required;
- current views use `security_invoker=true`.

Known legacy security issues remain on older exposed objects including `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables. Do not blindly change them before mapping direct client dependencies.

Security cleanup remains separate from model validation.

## 18. Exact next-action queue

1. **Improve Role Intelligence evidence and calibration**: add historical/current positional-zone evidence so FPL-listed position is not the dominant role-family guardrail.
2. Validate automated role classifications against actual lineups/roles across forward fixtures and calibrate confidence thresholds.
3. Only then build **replacement-quality intelligence** using role distance + replacement player quality.
4. Build true tactical interaction features separately: defensive pressing vs buildup, defensive-line height vs pace, attack-channel mismatches, aerial/set-piece mismatch, etc. Do not misuse attacking box occupation as pressing.
5. Validate Expected XI against actual lineups and calibrate P(start)/xMin update strength.
6. Freeze main API contracts for Home / FPL / Fixtures / Market Intelligence / Performance, then rebuild UI/UX.
7. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
8. Only after forward validation define live betting recommendation thresholds.
9. Map legacy direct client access and harden RLS/grants safely.

## 19. Operational instruction for future conversations

When resuming:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. inspect current GitHub and Supabase state independently;
3. preserve frozen forecasts and append-only historical observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless live production state has advanced.
