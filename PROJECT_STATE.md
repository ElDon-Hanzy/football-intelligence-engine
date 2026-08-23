# Football Intelligence Engine — Project State

_Last updated: 2026-08-24_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Non-negotiable rules:
- historical FPL and betting forecasts are append-only and never rewritten after results;
- genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff;
- retrospective replay/shadow work is stored separately and can never masquerade as a historical prediction;
- missing data is not zero;
- preserve source/provenance and known-at/evidence-cutoff timestamps;
- never commit secrets/API keys;
- new intelligence remains `model_effect_enabled=false` until validated out of sample;
- distinguish planned / coded / committed / deployed / executed / verified;
- betting quality is judged by calibration, EV and closing-line behaviour, not raw hit rate alone.

## 2. Active FPL model/state architecture

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified;
- v0.1.2 — multiplicative matchup-strength recalibration and base player state;
- v0.1.2b — starter minutes/P(start), penalties, latent BPS/bonus, opponent-adjusted Defensive Contributions;
- v0.1.3 — consumes v0.1.2 player state and overlays older manual role research.

Historical GW1 forecasts remain frozen. None of the newer Role/Tactical/Replacement/Matchup/Replay research alters v0.1.3 today.

Permanent weekly FPL rule: project all 15 players before XI/bench/captain decisions, including xMin, xPts, P(blank), P(5+), P(10+), P(15+), P(20+), Defensive Contributions and Captaincy Haul distributions.

Current player dimension: 604 players, zero missing team/position mappings at latest verification.

## 3. Results and evidence ingestion

- `sync-gw-results` v4 ACTIVE, cron `*/15 * * * *`.
- Latest GW1 state at shadow-run evaluation: 9 finished fixtures; Fulham–Chelsea still future.
- `refresh-current-player-state` v3 ACTIVE, cron `0 */4 * * *`.
- `ingest-competitive-core-stats` v1 ACTIVE, cron `0 8,18 * * *`.
- Upstream recognized 9 finished GW1 matches, but only Arsenal–Coventry had fully processed detailed player stats at the last forced ingest; 40 competitive player-event rows were available.
- `ingest-historical-role-evidence` v1 ACTIVE: 10,205 mapped 2025/26 detailed player-event rows, 419 current players, 38/38 GWs, zero duplicate groups, zero model-effect rows.

Completed-match evidence may influence future forecasts only. It may not rewrite prior decision state.

## 4. Expected XI / Availability v0.1 — DEPLOYED + VERIFIED

Storage: `player_fixture_availability_observations`, pre-kickoff guarded, RLS/internal, model-effect false.

`refresh-availability-intelligence` v4 ACTIVE, cron `10 */4 * * *`.

Candidate shapes are FPL-valid selection constraints, not claimed tactical formations.

Fulham–Chelsea has a genuine pre-kickoff Expected XI snapshot and is the first clean forward cohort for the newer stack.

## 5. Role Intelligence v0.2 / v0.2.1 — DEPLOYED + VERIFIED

Raw behavioral axes: shot threat, box occupation, creation, width, defensive load, progression, aerial involvement.

v0.2.1 uses position-relative calibration. `UNRESOLVED` remains valid when evidence or role separation is weak.

Latest audit:
- 472 profiles;
- 162 unresolved;
- average confidence 0.6253;
- max confidence 0.92;
- 31 profiles with current competitive evidence.

Manual Bruno/Isak role research remains separate from automated role training.

## 6. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

Axes:
- possession control;
- directness;
- width/delivery;
- attacking box occupation;
- set-piece emphasis;
- defensive-block tendency.

Current team profiles: 19.

`box_pressure_score` physically means attacking box occupation, not defensive pressing. True pressing, defensive line height and exact formation are not modeled.

## 7. Replacement Quality v0.1.1 — RESEARCH ONLY

Storage: `player_replacement_quality_observations`, pre-kickoff guarded, model-effect false.

Same FPL position is default with explicit role bridges only. Absence relevance is sample-size aware. A high score means behavioral role-cover continuity under the proxy, not manager selection or equal player ability.

## 8. Tactical Matchup Intelligence v0.1.1 — RESEARCH ONLY

Storage: `fixture_tactical_matchup_observations`; current view uses `security_invoker=true`.

Signal families:
1. wide attacking threat;
2. aerial/set-piece matchup;
3. central creativity vs defensive block;
4. counter-attacking opportunity — not high-line-vs-pace;
5. personnel disruption / continuity.

Score types remain distinct: ADVANTAGE, OPPORTUNITY, DISRUPTION. UI translates backend enums into plain football language.

Limitations:
- no left/right flank assignment;
- no defensive pressing intensity;
- no defensive line height;
- no validated replacement-ability effect;
- missing components ignored rather than zero-filled;
- model-effect false.

## 9. Role/Tactical orchestration

`refresh-role-tactical-intelligence` v5 ACTIVE, pinned Supabase JS 2.112.3.

Order:
1. raw Role v0.2;
2. calibrated Role v0.2.1;
3. Team Tactical v0.1.1;
4. player fixture-role snapshots;
5. team fixture-tactical snapshots;
6. Replacement Quality v0.1.1;
7. Tactical Matchups v0.1.1;
8. forward role validation v0.2.

Production cadence: competitive ingest `0 8,18 * * *`; role/tactical refresh `20 8,18 * * *`.

## 10. Genuine forward validation

`refresh_role_forward_validation_v02()` requires a role vector genuinely captured before kickoff and subsequent realized detailed events.

Latest forward-validation rows: 0. This is correct. Do not manufacture hindsight rows.

Fulham–Chelsea is the first clean forward cohort when post-match rich events become available.

## 11. Blind GW1 Context Replay v0.1 — DEPLOYED + EXECUTED

Purpose: reconstruct current contextual signals for every GW1 match from pre-kickoff-safe evidence, without claiming the newer layers existed historically.

Storage:
- `blind_fixture_replay_runs`;
- `blind_fixture_replay_matches`;
- `blind_fixture_replay_signals`;
- `blind_fixture_replay_evaluations`.

RPCs:
- `generate_blind_gw_replay_v01(gameweek)`;
- `evaluate_blind_gw_replay_v01(run_id)`.

GW1 run id 1:
- 10/10 fixture rows;
- 100 side-level signals;
- actual data used during generation: 0;
- evidence-cutoff violations: 0;
- model-effect false;
- forward-valid false.

Historical base coverage was improved after the initial replay:
- matches 3–10: genuine saved pre-kickoff fixture snapshots;
- match 2 Hull–Man Utd: reconstructed exactly from a genuine pre-kickoff player-prediction batch using the original fixture Poisson generator; lambdas 1.035 / 2.037, origin `RECONSTRUCTED_FROM_PREKICKOFF_PLAYER_PREDICTIONS`;
- match 1 Arsenal–Coventry: no defensible original model-state archive exists before kickoff, so no original-comparison claim is allowed.

The earlier Blind Replay remains context/calibration research, not a rerun that changes outcome probabilities.

## 12. Enriched Shadow Outcome Replay v0.1 — DEPLOYED + EXECUTED + EVALUATED

This is the experiment requested by the product vision: run GW1 as though each match were still future, let the **current added intelligence layers actually move the outcome forecast**, freeze that separate shadow forecast, then reveal the result and compare:

**Original GW1 → Enriched Shadow → Actual**.

Storage:
- `enriched_shadow_runs`;
- `enriched_shadow_predictions`;
- `enriched_shadow_evaluations`.

Functions:
- `private.shadow_poisson_bundle(home_lambda, away_lambda)`;
- `generate_enriched_shadow_gw_v01(gameweek)`;
- `evaluate_enriched_shadow_gw_v01(run_id)`.

GW1 shadow run: **id 2**, version `enriched_shadow_v0.1`.

Generation integrity:
- 10/10 fixtures generated;
- `actual_data_used=false` on run and every prediction;
- `model_effect_enabled=false` throughout;
- `forward_valid=false` by design;
- input-cutoff violations: 0;
- new real `fixture_prediction_snapshots`: 0;
- new real `model_predictions`: 0;
- new real `gameweek_prediction_runs`: 0.

### Fixed integration policy

Coefficients were fixed before shadow generation and were not tuned after viewing the evaluation:
- wide matchup: max log-lambda effect 0.04;
- aerial/set-piece: 0.035;
- central creation/block: 0.05;
- recent attacking xG trend: 0.05;
- opponent defensive xGA trend: 0.04;
- positive transition opportunity: 0.025, upside-only;
- schedule/fatigue: 0.03;
- own personnel/role-continuity attack effect: 0.05;
- opponent personnel defensive-continuity effect: 0.04;
- total log-lambda adjustment capped at ±0.12.

Effects are confidence/coverage weighted where available. Low transition opportunity does not penalize possession attacks. Personnel is position-aware and remains a continuity proxy, not ability. Missing contribution applies no shadow adjustment and remains explicitly unavailable; missing is not interpreted as football weakness.

### Match 1 limitation

Arsenal–Coventry has no genuine pre-kickoff original state archive. Present Elo/team metadata was refreshed after kickoff and was therefore rejected for reconstruction.

To keep all 10 fixtures in the shadow experiment, match 1 uses a lower-confidence `SAFE_PREMATCH_PRIOR_RECONSTRUCTION_NO_ELO` built from prior-season semantics plus friendlies before kickoff. Approximate safe baseline: Arsenal 1.895 / Coventry 0.853. It is **not scored as an original-vs-shadow comparison**.

### Shadow movement before outcome reveal

The shadow engine numerically changed all fixtures. Most changes were deliberately small. The only 1X2 leader flip among the comparable fixtures was Newcastle–Liverpool:
- original lambdas 1.489 / 1.565, original lean Liverpool;
- shadow lambdas 1.527 / 1.487, shadow lean Newcastle;
- top score remained 1-1.

Other notable lambda movement:
- Hull–Man Utd: 1.035 / 2.037 → 1.009 / 2.132;
- Everton–Palace: 1.394 / 1.592 → 1.440 / 1.581;
- Forest–Leeds: 1.384 / 1.478 → 1.462 / 1.486;
- Brentford–Spurs: 1.688 / 1.155 → 1.639 / 1.204;
- City–Bournemouth: 2.157 / 1.452 → 2.070 / 1.404;
- Fulham–Chelsea, still pre-match at evaluation time: 1.288 / 1.585 → 1.325 / 1.506.

### Evaluation after separate result reveal

9 finished fixtures were evaluated; **8** had a defensible original baseline for direct comparison.

Comparable finished matches:
- original result-direction hits: **5/8**;
- shadow result-direction hits: **5/8**;
- original exact top-score hits: **1/8**;
- shadow exact top-score hits: **1/8**;
- average original 1X2 Brier: **0.617461**;
- average shadow 1X2 Brier: **0.628945**;
- average delta shadow-minus-original: **+0.011484** (worse);
- average original actual-score log loss: **3.013640**;
- average shadow actual-score log loss: **3.042677** (worse);
- status counts using ±0.01 Brier threshold: **1 better / 3 similar / 4 worse**.

Per-fixture calibration status:
- Hull–Man Utd: SHADOW_WORSE; enriched layer strengthened United, but Hull won 2-0;
- Everton–Crystal Palace: SHADOW_BETTER; shifted toward Everton but did not flip the result leader; Everton won 2-0;
- Ipswich–Sunderland: SIMILAR;
- Forest–Leeds: SHADOW_WORSE; shifted strongly toward Forest, but Leeds won 1-0;
- Brentford–Spurs: SHADOW_WORSE; narrowed Brentford's edge, but Brentford won 3-0;
- Brighton–Villa: SIMILAR with a small Brier improvement;
- Man City–Bournemouth: SHADOW_WORSE by the ±0.01 threshold despite retaining the correct 2-1 top score;
- Newcastle–Liverpool: SIMILAR; outcome leader flipped Liverpool→Newcastle but actual was 2-2;
- Arsenal–Coventry: shadow-only, not original-comparable.

**Conclusion of v0.1:** the added intelligence demonstrably changes the model opinion, but this first conservative integration did **not** improve GW1 aggregate calibration. Do not promote these coefficients into the active model. Preserve run 2 as the fixed negative/neutral calibration result and learn from it.

Major diagnostic: recent xG trend currently drives much more of the lambda movement than the new tactical matchup axes. Examples include United/Hull, Forest/Leeds and Brentford/Spurs. This weighting deserves investigation on broader pre-match samples before any active effect.

## 13. Read API contracts

Current UI read boundaries:
- `fpl-api` v8 ACTIVE;
- `fixture-intelligence-api` v1 ACTIVE;
- `betting-api` v10 ACTIVE;
- `research-replay-api` **v2 ACTIVE**.

`research-replay-api` v2 preserves the Blind Replay contract and additively exposes `enriched_shadow` with:
- run/policy metadata;
- Original/Shadow lambdas, 1X2, score matrices and top score;
- adjustment evidence/reasons;
- separate evaluation;
- aggregate summary.

Verified HTTP 200 for GW1 after deployment: enriched shadow available=true, run=2, 10 fixtures, 8 comparable finished matches.

`betting-api` v10 fixes the intermittent `JWT issued at future` Market failure and returns actual-result pre-match correct-score prices where genuinely captured.

## 14. UI/UX v3 — CODED + COMMITTED; LIVE VISUAL QA STILL REQUIRED

Static GitHub Pages remains the frontend; data stays live through Supabase Edge APIs.

Current information architecture: Home / FPL / Fixtures / Market Intelligence / Performance.

Existing v2 improvements remain: human football wording, explanatory matchup text, FPL pitch, pagination over 20, actual-result pre-match odds, blind replay.

v3 adds a separate **Original → Enriched Shadow → Actual** Performance section showing:
- original/safe baseline opinion;
- enriched shadow opinion;
- actual score when finished;
- original and shadow lambdas;
- percentage lambda movement;
- strongest human-readable reasons for each team's movement;
- Brier original→shadow where a genuine original comparison exists;
- explicit match-1 warning that the original forecast is unavailable;
- pending state for unfinished Fulham–Chelsea.

Backend/API paths are verified. Browser/device visual QA remains user-side/current-browser work; do not claim independent rendered verification.

## 15. Security / performance

New blind and enriched-shadow tables are internal: RLS enabled, anon/authenticated revoked, service-role only.

Security advisor reports expected `RLS enabled, no policy` INFO for these service-only tables. Legacy ERROR findings remain on older exposed objects and are not part of this experiment.

Performance advisor reports no unindexed foreign-key warning on the enriched-shadow tables. New covering indexes appear only as unused INFO, expected on a tiny new dataset.

## 16. Repository parity — latest relevant commits

Enriched shadow/UI pass:
- `0a178eb6abb35e2a4b99b16cacfc9b386ddf848e` — enriched shadow Performance UI;
- `ef94afc7bfdd268c25c586abeae2081db5723c99` — enriched shadow UI styles;
- `3e64567f6949fc2e57a9b37f9dfbd5dd073b6181` — activate UI v3 assets;
- `551a90760cfa11a815525532a3091e3e5dfbd134` — research-replay API v2 source;
- `031e1f80d28903779c51da51e58cab0ef3a3e531` — enriched shadow storage/generation/evaluation migration.

Earlier key baseline commits remain in history for Tactical Matchups, fixture-intelligence API, betting API v10, Blind Replay and UI v2.

## 17. Exact next-action queue

1. Visually inspect the new **Original → Enriched Shadow → Actual** section in deployed Performance UI and fix any rendered/mobile issues found.
2. Do **not** tune enriched-shadow coefficients to fit GW1. Preserve run 2 as fixed evidence.
3. Diagnose why recent xG trend dominated shadow movement and why it worsened Hull–United, Forest–Leeds and Brentford–Spurs; test coefficient families separately on a broader chronological sample.
4. After Fulham–Chelsea, run the separate shadow evaluation again for match 10 only through the idempotent evaluator and, independently, perform the first genuine forward role/XI/replacement/tactical validation when rich events arrive.
5. Design Enriched Shadow v0.2 only after component-ablation analysis: base + form only, base + tactics only, base + personnel only, and combinations. Compare incremental Brier/log-loss; do not choose coefficients by GW1 hit rate.
6. Continue Correct Score forward sampling and add a third source.
7. Only after sufficient forward/out-of-sample evidence promote any tactical/form/personnel effect into active lambdas/xPts or recommendations.
8. Later add true left/right channel evidence, pressing and defensive-line height as separate validated feature families.
9. Map legacy direct client dependencies and then harden older RLS/grants safely.

## 18. Resume instruction

In any fresh conversation:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. independently inspect GitHub and Supabase production state;
3. preserve frozen forecasts and append-only observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. distinguish genuine forward validation, blind context replay, and enriched outcome shadow replay;
7. never tune a retrospective shadow model after viewing its evaluation and then report it as unbiased evidence;
8. continue from the first unresolved queue item unless production has advanced.
