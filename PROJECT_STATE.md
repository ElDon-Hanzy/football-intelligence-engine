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
- new intelligence families remain `model_effect_enabled=false` until validated out of sample;
- betting research quality is judged by calibration, EV and CLV, not raw hit rate alone.

## 2. FPL model/state architecture

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified.
- v0.1.2 — multiplicative matchup-strength recalibration and base `player_state`.
- v0.1.2b — starter minutes/P(start), penalties, latent BPS/bonus, opponent-adjusted Defensive Contributions.
- v0.1.3 — consumes v0.1.2 player state and overlays the older manually researched Player Role Intelligence table.

Historical GW1 forecasts remain frozen. The new automated Role/Tactical/Replacement layers are research-only and do not alter v0.1.3.

Permanent weekly rules: project all 15 players before XI/bench/captain decisions; include xMin, xPts, P(blank), P(5+), P(10+), P(15+), P(20+), Defensive Contributions and Captaincy Haul distributions.

Current official FPL player dimension: **604 players**, with zero missing team mappings and zero missing position mappings at latest verification.

## 3. Result pipeline / current-season state

`sync-gw-results`: **v4 ACTIVE**, production cron `*/15 * * * *`.
It preserves snapshot-safe actuals and factual fixture state without altering frozen predictions.

Official-FPL current-season team evidence currently contains 16 team-side rows from 8 completed GW1 matches. Goals are factual; unavailable xG remains NULL.

`refresh-current-player-state`: **v3 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`, cron `0 */4 * * *`.
Correct lineage remains v0.1.2 state consumed by v0.1.3. First successful refresh appended 600 rows; identical rerun inserted 0. No historical GW1 predictions were regenerated.

## 4. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Production storage: `player_fixture_availability_observations` with pre-kickoff guard, RLS, internal-only access and `model_effect_enabled=false`.

`refresh-availability-intelligence`: **v4 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`, cron `10 */4 * * *`.

Candidate shapes such as 4-5-1 are FPL-valid selection shapes only, not tactical formations.

Current Fulham–Chelsea snapshot remains 61 player observations with exactly 11 candidate-XI players per team and zero post-kickoff/model-effect contamination.

## 5. Dashboard / Market Intelligence state

Dashboard source remains `index.html`; GitHub Pages deploys repository root. Current UI supports fixture prediction-vs-actual, FPL actuals, bookmaker health, Correct Score odds, research edges, price tracking and CLV. Heavy UI polish remains deferred until core contracts stabilize.

Existing observational Mispricing families:
- Recent Performance / attacking xG trend;
- Recent Performance / defensive xGA trend;
- Schedule / Fatigue / rest-congestion.

Bookmaker Layer 1 remains PASSED. Correct Score Layer 2 remains research-only with proportional + power de-vig, offered-set conditional edge, unconditional wager EV, price history and CLV. `value_edge_available=false`.

## 6. Competitive rich-event ingestion — DEPLOYED + VERIFIED

`ingest-competitive-core-stats`: **v1 ACTIVE**.
It imports current-season FPL-Core-Insights rich events only after completed fixtures and accepts player-event evidence only when upstream marks `player_stats_processed=true`.

Initial GW1 run:
- 10 source matches;
- 8 completed matches represented;
- 16 team-side rows inserted;
- 1 match fully player-stat processed at that snapshot;
- 40 competitive player-event rows inserted;
- 200 unprocessed player rows skipped;
- 0 unmapped players.

Identical-source rerun inserted 0. Missing values are never converted to zero.

Production cron: `football_intelligence_competitive_core_ingest` = `0 8,18 * * *`.
Latest observed scheduled execution at 18:00 UTC returned HTTP 200.

## 7. Historical detailed role evidence — DEPLOYED + VERIFIED

New protected Edge Function: `ingest-historical-role-evidence` **v1 ACTIVE**, pinned to:
- `npm:@supabase/supabase-js@2.112.3`;
- `npm:papaparse@5.5.3`.

Source: FPL-Core-Insights 2025/26 EPL `playermatchstats.csv` for GW1–GW38, mapped old source player ID -> stable player code -> current canonical player.

Verified import:
- **12,754** source rows;
- **10,205** mapped current-player rows;
- **2,549** rows not mapping to current players;
- **419** current players represented;
- **38/38** gameweeks present;
- duplicate groups: **0**;
- model-effect rows: **0**.

Protected identical rerun returned HTTP 200 and inserted **0**.

This historical data is a role-learning prior only and never rewrites historical forecasts.

## 8. Role Intelligence v0.2 raw behavioral axes — DEPLOYED + VERIFIED

`refresh_player_role_profiles_v02()` builds source-capped behavioral profiles from:
- 2025/26 EPL detailed events: prior, max source mass 0.55;
- 2026 preseason: weak bridge, max mass 0.15;
- current 2026/27 competitive events: strongest, max mass 0.90 and progressively dominant.

Core behavioral axes:
- shot threat;
- box occupation;
- creation;
- width;
- defensive load;
- progression;
- aerial involvement.

Missing component metrics are ignored, not imputed to zero. FPL position remains only a broad role-family guardrail. Manual Bruno/Isak research is explicitly not used as training input.

Raw v0.2 produced 472 profiles. Its first absolute-score taxonomy overconcentrated defenders as CENTRE_BACK and midfielders as HOLDING_MIDFIELDER; that result was retained as evidence but **not accepted as the calibrated taxonomy**.

## 9. Role Intelligence v0.2.1 positional calibration — DEPLOYED + VERIFIED

`refresh_player_role_profiles_v021()` calibrates the raw v0.2 axes using **position-relative behavioral percentiles**.

Taxonomy:
- GKP: GOALKEEPER;
- DEF: CENTRE_BACK / WIDE_BACK / HYBRID_DEFENDER;
- MID: HOLDING_MIDFIELDER / BOX_TO_BOX / CREATOR_10 / WIDE_ATTACKER / WING_BACK;
- FWD: CENTRAL_STRIKER / LINK_FORWARD / WIDE_FORWARD / TARGET_FORWARD.

`UNRESOLVED` remains a valid output when evidence, coverage or separation is insufficient.

Current v0.2.1 audit:
- **472 profiles**;
- **162 UNRESOLVED**;
- average confidence **0.6253**;
- max confidence **0.92**;
- 31 profiles currently contain competitive 2026/27 evidence.

Current distribution:
- UNRESOLVED 162;
- CENTRE_BACK 62;
- WIDE_ATTACKER 58;
- HOLDING_MIDFIELDER 58;
- GOALKEEPER 46;
- WIDE_BACK 42;
- CREATOR_10 14;
- LINK_FORWARD 8;
- TARGET_FORWARD 8;
- WIDE_FORWARD 6;
- CENTRAL_STRIKER 3;
- WING_BACK 2;
- BOX_TO_BOX 2;
- HYBRID_DEFENDER 1.

Sanity examples:
- Bruno Fernandes = CREATOR_10 / WIDE_ATTACKER;
- Frimpong = WIDE_BACK / HYBRID_DEFENDER;
- Gabriel and Maguire = CENTRE_BACK;
- Mbeumo = WIDE_ATTACKER;
- Odegaard = CREATOR_10;
- White = WIDE_BACK;
- Havertz = LINK_FORWARD;
- Raya = GOALKEEPER.

Intentional ambiguities:
- Haaland = UNRESOLVED because CENTRAL_STRIKER vs TARGET_FORWARD scores are effectively tied;
- Isak = UNRESOLVED with CENTRAL_STRIKER as top candidate because evidence/margin does not yet clear the calibrated threshold;
- Chelsea Palmer = UNRESOLVED because top role scores are too close.

Do not lower thresholds merely to force familiar football labels.

## 10. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

Team style remains a multi-axis heuristic, not an asserted formation:
- possession control;
- directness;
- width/delivery;
- attacking box occupation;
- set-piece emphasis;
- defensive-block tendency.

Current taxonomy is `team_style_v0.1.1`; `HIGH_BOX_OCCUPATION` corrected the misleading earlier `HIGH_BOX_PRESSURE` wording. The physical `box_pressure_score` column remains for compatibility but explicitly means attacking box occupation, **not defensive pressing**.

Current team profiles: **19**. Defensive pressing intensity and defensive-line height remain unmodeled.

## 11. Fixture chronology — Role/Tactical/Replacement VERIFIED

All future-fixture role/tactical/replacement observations use database-level kickoff guards.

Latest audit:
- post-kickoff fixture-role rows: **0**;
- fixture-role evidence cutoff at/after kickoff: **0**;
- post-kickoff replacement v0.1.1 rows: **0**;
- role v0.2/v0.2.1 model-effect rows: **0**;
- replacement model-effect rows: **0**;
- validation model-effect rows: **0**.

The v0.2.1 lineage created 54 new Fulham–Chelsea fixture-role snapshots pre-kickoff because source profile lineage changed. No historical forecast was regenerated.

Direct forecast-immutability audit after this build:
- `fixture_prediction_snapshots` created after build start: **0**;
- `gameweek_prediction_runs`: **0**;
- `model_predictions`: **0**.

## 12. Replacement Quality proxy v0.1.1 — DEPLOYED + VERIFIED, OBSERVATIONAL ONLY

Replacement Quality is now **modeled as a research proxy**, but remains disabled as a model effect.

Production function: `refresh_replacement_quality_v011(gameweek)`.
Storage: `player_replacement_quality_observations` with pre-kickoff trigger and `model_effect_enabled=false` constraint.

Target gating:
- doubtful player requires meaningful current start probability;
- injured/suspended/unavailable player requires sample-size-scaled historical/preseason relevance;
- tiny historical samples cannot imply major absence importance.

Candidate pool:
- same team;
- available;
- non-XI candidate;
- same FPL position by default;
- only explicit cross-position bridges are allowed: WIDE_BACK <-> WING_BACK, WIDE_ATTACKER <-> WIDE_FORWARD, and HOLDING_MIDFIELDER -> HYBRID_DEFENDER;
- goalkeeper only matches goalkeeper.

Scoring:
- behavioral role-vector fit;
- role-specific production continuity proxy from current xG90/xA90/CBIRT90 where meaningful;
- composite = 72% role fit + 28% production continuity when both exist.

Statuses are intentionally cautious:
- `PROXY_NOT_VALIDATED`;
- `ROLE_FIT_ONLY`;
- `INSUFFICIENT_ROLE_EVIDENCE`;
- `NO_RELIABLE_MATCH`.

First v0.1.1 run inserted **26** rows. Current best-cover research examples:
- Chelsea Chalobah -> Tosin: composite 0.9525, confidence 0.6120;
- Chelsea Fofana -> Tosin: 0.9422, confidence 0.6120;
- Chelsea Henderson -> Lavia: 0.9429, confidence 0.5992;
- Fulham Andersen -> J.Cuenca: 0.9338, confidence 0.5358;
- Chelsea Welbeck -> Delap: ROLE_FIT_ONLY because the target role is unresolved;
- Fulham Cairney -> Reed: ROLE_FIT_ONLY, low confidence 0.3896.

These are **not claims of actual manager selections or validated tactical equivalence**. Ability, formation changes and full team tactical consequences are not yet modeled.

## 13. Forward Role Validation — DEPLOYED, WAITING FOR FORWARD SAMPLE

`refresh_role_forward_validation_v02()` compares a genuinely pre-match v0.2.x behavioral vector with the player's realized post-match competitive event vector for appearances >=30 minutes.

It stores `axis_similarity` in `player_role_validation_observations` and never writes model effects.

Current validation rows: **0**, as expected: no completed fixture yet has both a pre-match v0.2.x snapshot and processed realized player-event evidence. Do not backfill a fake validation sample with hindsight.

## 14. Role/Tactical production orchestration and cadence

`refresh-role-tactical-intelligence`: **v4 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Strict core path:
1. raw v0.2 player behavioral profiles;
2. v0.2.1 calibrated role profiles;
3. team tactical profiles v0.1.1;
4. pre-kickoff player fixture-role snapshots;
5. pre-kickoff team tactical snapshots.

Optional research hooks are isolated so they cannot invalidate the core refresh:
6. replacement quality v0.1.1;
7. forward role validation v0.2.

Protected v4 identical rerun returned HTTP 200 with **0 new rows in every component**.

Production crons remain:
- competitive ingest `0 8,18 * * *`;
- Role/Tactical refresh `20 8,18 * * *`.

Protected backend allowlist additionally includes `ingest-historical-role-evidence`. Vault token remains internal; no secret is committed.

## 15. Security / performance state

New Role/Tactical/Replacement tables are internal:
- RLS enabled;
- anon/authenticated revoked;
- service-role access only as required;
- current views use `security_invoker=true`.

Supabase security advisor reports INFO `RLS enabled, no policy` on internal service-only tables; this is expected with revoked client grants and is not a reason to create permissive public policies.

Known legacy ERROR findings remain on older exposed tables including `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables with RLS disabled. Do not blindly change these before mapping client dependencies.

Performance advisor flagged unindexed foreign keys on the new replacement/validation research storage; covering indexes were added in production and in the repository migration.

## 16. Repository parity — latest commits

Role v0.2 / Replacement pass:
- `025f3ad9cace17365041a328a2d1564a03367303` — v4 Role/Tactical orchestrator source;
- `061a77735b1789f9f9a27be5f64ba6ae8e870626` — historical role-ingest dependency config;
- `2dd666d24c1676a8c6db44d16bfc864fbf750bec` — historical role-ingest source;
- `f0d3b1353b2830e12cdd5d56095863ec786606d9` — v0.2 research storage / protected allowlist / FK indexes;
- `43375b3a8010f9be44d555a4b1e5468f95e82ab2` — raw multi-source behavioral role profiles v0.2;
- `254ee69b0705793aa00666460e02c9c14385d027` — position-relative archetype calibration v0.2.1;
- `f475a6e17a15237b915cf98ab7963e364a609d05` — forward validation + replacement proxy v0.1.1.

Earlier Role/Tactical v0.1 commits and all previous FPL/market migrations remain in history.

## 17. Exact next-action queue

1. Collect the first **forward role-validation sample** from fixtures whose v0.2.x role snapshot existed pre-kickoff; calibrate confidence/margins from realized axes.
2. Validate replacement proxy against actual starting lineups/substitution paths and realized player roles. Keep `model_effect_enabled=false`.
3. Add ability/quality and tactical-consequence dimensions only after replacement role-fit validation; do not equate a high vector-fit score with equal football quality.
4. Build true tactical interactions separately: defensive pressing vs buildup, defensive-line height vs pace, attack-channel mismatch, aerial/set-piece mismatch. Never reuse box occupation as pressing.
5. Validate Expected XI against actual lineups and calibrate P(start)/xMin strength.
6. Freeze main API contracts for Home / FPL / Fixtures / Market Intelligence / Performance, then rebuild UI/UX.
7. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
8. Only after forward validation define any live recommendation thresholds.
9. Map legacy direct client access and harden RLS/grants safely.

## 18. Operational instruction for future conversations

When resuming:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. inspect GitHub and Supabase independently;
3. preserve frozen forecasts and append-only observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless production state has advanced.
