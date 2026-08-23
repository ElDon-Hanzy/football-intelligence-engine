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
- retrospective replay is allowed only as separately labelled research and can never be presented as a genuine historical prediction;
- betting research quality is judged by calibration, EV and closing-line behaviour, not raw hit rate alone.

## 2. Active FPL model/state architecture

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified;
- v0.1.2 — multiplicative matchup-strength recalibration and base `player_state`;
- v0.1.2b — starter minutes/P(start), penalties, latent BPS/bonus, opponent-adjusted Defensive Contributions;
- v0.1.3 — consumes v0.1.2 player state and overlays older manually researched Player Role Intelligence.

Historical GW1 forecasts remain frozen. Automated Role/Tactical/Replacement/Matchup/Replay research does **not** alter v0.1.3.

Permanent weekly FPL rule: project all 15 players before XI/bench/captain decisions, including xMin, xPts, P(blank), P(5+), P(10+), P(15+), P(20+), Defensive Contributions and Captaincy Haul distributions.

Current official FPL player dimension: **604 players** with zero missing team/position mappings at latest verification.

## 3. Results and current-season evidence

`sync-gw-results`: **v4 ACTIVE**, cron `*/15 * * * *`.

Latest GW1 factual state: **9 finished fixtures**, with Fulham–Chelsea still future at the latest check.

`refresh-current-player-state`: **v3 ACTIVE**, cron `0 */4 * * *`. Correct lineage remains v0.1.2 state consumed by v0.1.3. No historical prediction regeneration is allowed.

Competitive rich-event ingestion:
- `ingest-competitive-core-stats` **v1 ACTIVE**, cron `0 8,18 * * *`;
- upstream recognizes 9 finished GW1 fixtures;
- only Arsenal–Coventry was fully player-stat processed at the latest forced ingest;
- current competitive player-event evidence remains 40 rows until upstream completes the later fixtures.

Historical role prior:
- `ingest-historical-role-evidence` **v1 ACTIVE**;
- 10,205 mapped 2025/26 detailed player-event rows;
- 419 current players;
- 38/38 EPL gameweeks;
- zero duplicate groups and zero model-effect rows.

## 4. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Storage: `player_fixture_availability_observations`, database pre-kickoff guarded, RLS/internal access, `model_effect_enabled=false`.

`refresh-availability-intelligence`: **v4 ACTIVE**, cron `10 */4 * * *`.

Candidate shapes such as 4-5-1 are FPL-valid selection constraints only, **not tactical formation predictions**.

Fulham–Chelsea has a genuine pre-kickoff Expected XI snapshot and remains the first clean forward-validation fixture for the newer stack.

## 5. Role Intelligence v0.2 / v0.2.1 — DEPLOYED + VERIFIED

Raw v0.2 blends capped historical, weak preseason and strongly weighted current competitive evidence into behavioral axes: shot threat, box occupation, creation, width, defensive load, progression and aerial involvement.

v0.2.1 calibrates roles using position-relative behavioral percentiles. `UNRESOLVED` remains valid when evidence/margins are weak.

Current audit:
- 472 profiles;
- 162 unresolved;
- average confidence 0.6253;
- max confidence 0.92;
- 31 profiles contain current competitive evidence.

Do not force familiar players into expected labels simply to make the taxonomy look intuitive.

## 6. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

Team style axes:
- possession control;
- directness;
- width/delivery;
- attacking box occupation;
- set-piece emphasis;
- defensive-block tendency.

Current team profiles: **19**.

The physical `box_pressure_score` column means attacking box occupation, **not defensive pressing**. Defensive pressing intensity, exact defensive-line height and exact formations remain unmodeled.

## 7. Replacement Quality proxy v0.1.1 — DEPLOYED + VERIFIED, RESEARCH ONLY

Storage: `player_replacement_quality_observations`, pre-kickoff guarded, `model_effect_enabled=false`.

The proxy measures role-cover continuity, not manager selection or equal player ability. Candidate compatibility defaults to same FPL position with only explicit role bridges. Sample-size-aware absence relevance prevents tiny historical samples being overstated.

## 8. Tactical Matchup Intelligence v0.1.1 — DEPLOYED + VERIFIED, RESEARCH ONLY

Storage: `fixture_tactical_matchup_observations`.
Current view: `current_fixture_tactical_matchups` with `security_invoker=true`.

Signal families:
1. wide attacking threat;
2. aerial/set-piece matchup;
3. central creativity vs defensive block;
4. counter-attacking opportunity — **not** high-line-vs-pace;
5. personnel disruption / absence continuity.

Backend technical keys remain stable for research, but the UI must translate them into plain football language and explain what each signal means.

Important limitations:
- no left/right flank assignment;
- no defensive pressing intensity;
- no defensive line height;
- no validated replacement-ability effect;
- missing components ignored, never zero-filled;
- all outputs remain model-effect false.

Fulham–Chelsea current pre-match research remains the first genuinely forward-captured fixture for this layer.

## 9. Role/Tactical production orchestration

`refresh-role-tactical-intelligence`: **v5 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Order:
1. raw Role v0.2;
2. calibrated Role v0.2.1;
3. Team Tactical v0.1.1;
4. player fixture-role snapshots;
5. team fixture-tactical snapshots;
6. Replacement Quality v0.1.1;
7. Tactical Matchups v0.1.1;
8. forward role validation v0.2.

Protected identical rerun previously returned HTTP 200 with 0 new rows in every component.

## 10. Genuine forward validation status

`refresh_role_forward_validation_v02()` validates only a role vector genuinely captured before kickoff against subsequently processed realized competitive events.

Current forward validation rows: **0** at the latest check. This is correct; no hindsight backfill is allowed.

Fulham–Chelsea is the first clean forward cohort once post-match rich player events are available.

## 11. Blind GW1 replay v0.1 — DEPLOYED + EXECUTED, RETROSPECTIVE RESEARCH ONLY

Purpose: run the new contextual stack across every GW1 fixture without using the result during generation, while preserving the distinction from genuine forward predictions.

Storage:
- `blind_fixture_replay_runs`;
- `blind_fixture_replay_matches`;
- `blind_fixture_replay_signals`;
- `blind_fixture_replay_evaluations`.

RPCs:
- `generate_blind_gw_replay_v01(gameweek)`;
- `evaluate_blind_gw_replay_v01(run_id)`.

Generation rules:
- actual scores excluded;
- current-GW competitive match events excluded;
- team style reconstructed from friendlies that occurred before each kickoff;
- player roles limited to v0.2.1 profiles with zero current-competitive minutes and evidence cutoff before kickoff;
- Expected XI uses the latest player prediction batch generated before kickoff and an FPL-valid shape proxy;
- genuine fixture base probabilities are attached only where a true pre-kickoff `fixture_prediction_snapshot` existed;
- personnel disruption is used only where a genuine pre-match replacement observation existed;
- missing information is left missing.

GW1 run id **1**:
- 10/10 fixture replay rows generated;
- 100 side-level signal rows generated;
- `actual_data_used=false` throughout generation;
- `forward_valid=false` by design;
- `model_effect_enabled=false`;
- zero evidence-cutoff violations;
- zero real forecast rows regenerated.

Historical base-forecast coverage:
- genuine pre-kickoff fixture-level base forecasts exist for GW1 matches 3–10;
- matches 1–2 do not have saved fixture-level base forecasts and remain explicitly blank in replay evaluation;
- pre-kickoff player-prediction batches exist for matches 2–10.

Evaluation is a **separate post-generation step** that intentionally joins actual scores afterward.

Current evaluated finished fixtures: 9. Among the 7 finished fixtures with a genuine saved base forecast:
- result direction correct: **5/7**;
- exact top-scoreline hit: **1/7**;
- average 1X2 Brier score: **0.5525**;
- average actual-score log loss: **2.9161**.

Notable diagnostics:
- Newcastle–Liverpool was the weakest result-direction probability call among the evaluated saved base forecasts (Brier ~0.8658);
- Everton–Crystal Palace also showed a large direction error;
- Brighton–Aston Villa exposed the largest home-attacking underestimate: actual Brighton goals exceeded lambda by about 2.42;
- Forest–Leeds showed material overestimation of total goals (~1.86 above the actual total);
- City–Bournemouth was the only exact top-scoreline hit among the seven evaluated saved base forecasts.

Calibration warning discovered: `direct_transition_opportunity` appeared too often when ranking a single “strongest signal.” `OPPORTUNITY` and `ADVANTAGE` are different concepts and must not be ranked on the same raw scale. UI v2 now suppresses weak/moderate opportunity signals from outranking true matchup-edge signals.

This replay is useful for calibration, but it is **not forward validation** and must never be described as what the model actually predicted historically where the newer intelligence did not exist at the time.

## 12. Public/read API contracts

Current UI read boundaries:
- `fpl-api` **v8 ACTIVE** — frozen FPL decision/result contract;
- `fixture-intelligence-api` **v1 ACTIVE** — Expected XI, roles, team style, replacement and tactical matchup research;
- `betting-api` **v10 ACTIVE** — odds, Correct Score, movement, edge/CLV research and actual-result pre-match odds;
- `research-replay-api` **v1 ACTIVE** — latest blind retrospective replay and post-run evaluation.

All four were verified together with HTTP 200 for GW1. Fixture, market and replay APIs each returned 10 fixtures. Market warnings array was empty at verification.

### Betting API v10 reliability change

The prior Market failure `clv_research: JWT issued at future` was intermittent auth clock skew inside the Edge read path.

v10:
- pins Supabase JS 2.112.3;
- retries a `JWT issued at future` read once after a short delay;
- treats CLV/price/edge enrichment as non-critical so a temporary enrichment failure does not blank the entire Market page;
- returns a `warnings` array instead;
- adds `actual_result_pre_match_odds` for finished fixtures where a correct-score price was genuinely captured pre-kickoff.

Verified examples:
- Brighton 4-0 Aston Villa: Bet365 41.0, Unibet 30.0 from the captured pre-match snapshot;
- Newcastle 2-2 Liverpool: Bet365 12.0, Unibet 9.5 near kickoff;
- fixtures without a captured correct-score price for the eventual result explicitly return unavailable rather than inventing a price.

## 13. UI/UX v2 — CODED + COMMITTED; LIVE DEVICE VISUAL QA STILL REQUIRED

Static GitHub Pages shell remains appropriate: the frontend is static HTML/CSS/JS, while all data is live from Supabase APIs.

Information architecture:
- Home;
- FPL;
- Fixtures;
- Market Intelligence;
- Performance.

UI v2 changes:
- technical backend enums are translated into plain football language;
- fixture details explain what every tactical signal means;
- research signal colors remain blue/amber rather than recommendation-green;
- FPL now includes a football-pitch visualization of the frozen starting XI, clearly labelled as an FPL positional layout rather than a tactical formation prediction;
- Performance paginates player audit results at 20 per page;
- finished fixture detail / Performance can show the pre-match bookmaker price of the score that actually happened when captured;
- Performance includes the Blind GW1 Replay with explicit retrospective/not-forward-validation wording;
- the replay explains missing historical base forecasts instead of reconstructing them with hindsight.

Important implementation note: obsolete `ui-fixes.js` was removed from `index.html` because it redeclared a helper already owned by the newer `app.js`. `ui-fixes.css` remains for research-only signal colors; `ui-v2.js/css` contain the current UI overrides.

Browser/live visual QA is still not independently available from the current connector environment. Do not claim desktop/mobile visual verification until actually exercised in a browser.

## 14. Forecast/replay contamination audit — VERIFIED CLEAN

Since Blind Replay run 1 was created:
- new `fixture_prediction_snapshots`: **0**;
- new `gameweek_prediction_runs`: **0**;
- new `model_predictions`: **0**;
- blind replay match rows using actual data during generation: **0**;
- blind replay signal rows using actual data during generation: **0**;
- replay evidence cutoffs at/after kickoff: **0**.

Historical frozen predictions remain untouched.

## 15. Security / performance state

Replay tables are internal:
- RLS enabled;
- anon/authenticated grants revoked;
- service-role access only;
- replay current views use `security_invoker=true`.

Security advisor reports expected `RLS enabled, no policy` INFO on the replay/internal research tables. This is intentional with revoked client grants and is not a reason to add permissive policies.

All replay foreign-key index warnings were fixed. The performance advisor now lists the new covering indexes only as unused (expected immediately after creation); remaining unindexed-FK findings belong to older project tables.

Known legacy security ERROR findings remain on older exposed objects such as `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables. Do not harden them blindly before mapping direct dependencies.

Supabase linter reference for FK indexing:
https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys

## 16. Repository parity — latest relevant commits

Tactical/API baseline:
- `376be6f2c4a6212bc98a9357b63564caaf7f7878` — Role/Tactical orchestrator v5;
- `93684bbddd4d4842b85ff3b46cd55fdd872cc01c` — fixture-intelligence API;
- `8c9ee48d1a836eff4d2f535300ca6ac0395d0c8f` — Tactical Matchup v0.1.1 migration.

UI v2 / replay / market reliability:
- `aeebb38e96187267099ed99b4a69be032beed636` — humanized UI, pagination, pitch, actual-score odds and blind replay rendering;
- `07877db3b95919dad81733d89afaf0011f33a017` — pitch/pagination styles;
- `e000d42530e90c7b6e1b2e2185f6eb6888bf582a` — activate UI v2 assets;
- `50f369e2e34df31c5df1ea7b4b2343ef359f6720` — remove obsolete JS override;
- `12dc7300eb1bfde0df4919b5823a4a56795b762d` — betting API v10 source;
- `d51c438157afaf78bb1e349de83f93978c572138` — blind replay read API;
- `f43abb8df98de88489b683cb8d53932153c930e7` — blind replay storage/index migration;
- `9134899e26b650503bbb7a38dff23bcd82bc66b8` — blind replay generation/evaluation functions.

## 17. Exact next-action queue

1. **Visually QA UI/UX v2 on deployed desktop + mobile**, especially pitch layout, drawer explanations, pagination and Performance replay cards.
2. After Fulham–Chelsea, ingest rich events when upstream marks them processed and run the first genuine forward validation for roles, Expected XI, replacement rank and Tactical Matchup manifestation.
3. Use the Blind GW1 Replay to identify structural calibration problems, but keep it separate from forward-validation statistics.
4. Investigate the first replay findings: excessive 1-1 top-score concentration, under/over-dispersed goal lambdas in specific fixture types, and the transition-opportunity salience issue.
5. Continue Correct Score forward sampling and add a third source.
6. Only after sufficient forward evidence define active model effects or betting/FPL recommendation thresholds.
7. Later add true left/right channel evidence, defensive pressing and defensive-line height as separate validated families.
8. Map legacy direct client dependencies and then harden older RLS/grants safely.

## 18. Resume instruction

In any fresh conversation:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. independently inspect current GitHub and Supabase production state;
3. preserve frozen forecasts and append-only observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. distinguish genuine forward validation from retrospective blind replay;
7. continue from the first unresolved queue item unless production has advanced.
