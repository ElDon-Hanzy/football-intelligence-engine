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

## 2. Active FPL model/state architecture

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified;
- v0.1.2 — multiplicative matchup-strength recalibration and base `player_state`;
- v0.1.2b — starter minutes/P(start), penalties, latent BPS/bonus, opponent-adjusted Defensive Contributions;
- v0.1.3 — consumes v0.1.2 player state and overlays the older manually researched Player Role Intelligence table.

Historical GW1 forecasts remain frozen. Automated Role/Tactical/Replacement/Matchup research does **not** alter v0.1.3 today.

Permanent weekly FPL rule: project all 15 players before XI/bench/captain decisions, including xMin, xPts, P(blank), P(5+), P(10+), P(15+), P(20+), Defensive Contributions and Captaincy Haul distributions.

Current official FPL player dimension: **604 players** with zero missing team/position mappings at latest verification.

## 3. Results and current-season evidence

`sync-gw-results`: **v4 ACTIVE**, production cron `*/15 * * * *`.

It preserves snapshot-safe actuals, reconciles mutable factual scores/finished state, and never rewrites frozen forecasts.

Latest GW1 factual state: **9 finished fixtures**. Current-season team evidence now contains:
- official FPL results: **18 team-side rows / 9 matches**;
- FPL-Core-Insights Premier League team evidence: **18 team-side rows / 9 matches**.

Unavailable xG is NULL, never synthetic zero.

`refresh-current-player-state`: **v3 ACTIVE**, cron `0 */4 * * *`. Correct lineage remains v0.1.2 state consumed by v0.1.3. No historical prediction regeneration is allowed.

## 4. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Storage: `player_fixture_availability_observations` with database pre-kickoff guard, RLS, internal access and `model_effect_enabled=false`.

`refresh-availability-intelligence`: **v4 ACTIVE**, cron `10 */4 * * *`.

Candidate shapes such as 4-5-1 are FPL-valid selection constraints only, **not tactical formation predictions**.

Fulham–Chelsea has a genuine pre-kickoff candidate-XI snapshot and is the first clean forward-validation fixture for the newer role/tactical stack.

## 5. Competitive + historical rich-event evidence

`ingest-competitive-core-stats`: **v1 ACTIVE**, cron `0 8,18 * * *`.

Strict completeness rule: current player-event rows are accepted only when upstream sets `player_stats_processed=true`. Partial match/player rows are skipped, never interpreted as zero.

At the latest forced GW1 ingest:
- upstream recognizes 9 finished fixtures;
- only Arsenal–Coventry is fully player-stat processed;
- competitive player-event evidence remains **40 rows**;
- later GW1 fixtures still await upstream player-stat processing.

`ingest-historical-role-evidence`: **v1 ACTIVE**. Verified 2025/26 role-learning prior:
- 12,754 source rows;
- 10,205 mapped rows;
- 419 current players;
- all 38 EPL gameweeks;
- zero duplicate groups;
- zero model-effect rows.

Historical event evidence is a prior only and never rewrites historical forecasts.

## 6. Role Intelligence v0.2 / v0.2.1 — DEPLOYED + VERIFIED

Raw v0.2 blends capped historical, weak preseason and strongly weighted current competitive evidence into behavioral axes:
- shot threat;
- box occupation;
- creation;
- width;
- defensive load;
- progression;
- aerial involvement.

The first absolute-role scoring collapsed too many defenders into CB and midfielders into holding-midfielder. That output was retained as evidence but rejected as the calibrated taxonomy.

v0.2.1 uses **position-relative behavioral percentiles**.

Current audit:
- 472 profiles;
- 162 UNRESOLVED;
- average confidence 0.6253;
- max confidence 0.92;
- 31 currently contain competitive 2026/27 evidence.

Representative outputs: Bruno Fernandes = CREATOR_10; Frimpong/White = WIDE_BACK; Gabriel/Maguire = CENTRE_BACK; Mbeumo = WIDE_ATTACKER; Odegaard = CREATOR_10; Havertz = LINK_FORWARD; Raya = GOALKEEPER.

Haaland, Isak and Chelsea Palmer remain intentionally unresolved/ambiguous where the automated evidence does not separate roles strongly enough. Do not force familiar labels.

## 7. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

Team style is stored as orthogonal heuristic axes, not a guessed formation:
- possession control;
- directness;
- width/delivery;
- attacking box occupation;
- set-piece emphasis;
- defensive-block tendency.

Current team profiles: **19**.

`HIGH_BOX_OCCUPATION` is the correct semantic label. The legacy physical `box_pressure_score` column means attacking box occupation, **not defensive pressing**.

Defensive pressing intensity, exact line height and exact formations remain unmodeled.

## 8. Replacement Quality proxy v0.1.1 — DEPLOYED + VERIFIED, RESEARCH ONLY

Storage: `player_replacement_quality_observations` with pre-kickoff guard and `model_effect_enabled=false`.

The proxy measures likely role-cover suitability, not manager selection or equal football quality.

Candidate rules:
- available, same-team, non-XI candidate;
- same FPL position by default;
- only explicit cross-position role bridges;
- goalkeeper only to goalkeeper.

Scoring uses behavioral role-vector fit plus production continuity where meaningful. Sample-size-aware absence relevance prevents tiny historical samples from being treated as major absences.

Current Fulham–Chelsea examples include Chalobah -> Tosin, Fofana -> Tosin, Henderson -> Lavia and Andersen -> J.Cuenca. All remain `PROXY_NOT_VALIDATED` / `ROLE_FIT_ONLY` research.

## 9. Tactical Matchup Intelligence v0.1.1 — DEPLOYED + VERIFIED, RESEARCH ONLY

New storage: `fixture_tactical_matchup_observations`.
Current view: `current_fixture_tactical_matchups` with `security_invoker=true`.

One append-only observation is stored per **fixture side × signal family**. Score semantics are explicit rather than compressed into one opaque tactical number:
- `ADVANTAGE`;
- `OPPORTUNITY`;
- `DISRUPTION`.

Current signal keys:
1. `wide_channel_pressure` — width/delivery + expected-XI wide/creative role evidence versus opponent block/defensive role evidence;
2. `aerial_set_piece_mismatch` — set-piece/width/aerial attack versus opponent aerial/defensive resistance;
3. `central_creation_vs_block` — possession/creation/progression versus defensive block/load;
4. `direct_transition_opportunity` — directness + shot/box threat against opponent control/block; **not** high-line-vs-pace;
5. `personnel_disruption` — absence relevance + replacement-cover continuity; not a player-ability claim.

Important limitations are embedded in every observation:
- no left/right flank assignment yet;
- no defensive pressing intensity;
- no defensive line height;
- no validated replacement ability/tactical-consequence effect;
- missing components are ignored, never zero-filled;
- all outputs remain `model_effect_enabled=false`.

Direction calibration v0.1.1:
- >= 0.62 ATTACK_ADVANTAGE;
- >= 0.55 ATTACK_LEAN;
- <= 0.45 DEFENSIVE_LEAN;
- <= 0.38 DEFENSIVE_RESISTANCE;
- otherwise BALANCED for ADVANTAGE signals.

A provenance correction was appended as `evidence_revision=2` so outer direction and nested technical evidence always agree.

### First live fixture: Fulham–Chelsea

Current side-level signals:

Chelsea:
- wide channel 0.5300 BALANCED;
- aerial/set-piece 0.4779 BALANCED;
- central creation 0.5033 BALANCED;
- direct-transition opportunity 0.3871 MODERATE;
- personnel disruption 0.4161 MATERIAL_DISRUPTION.

Fulham:
- wide channel 0.5811 ATTACK_LEAN;
- aerial/set-piece 0.5361 BALANCED;
- central creation 0.5039 BALANCED;
- direct-transition opportunity 0.3469 LOW;
- personnel disruption 0.1540 LOW_DISRUPTION.

These are **research descriptors, not betting/FPL adjustments**.

## 10. Tactical Matchup chronology / invariants — VERIFIED

Final storage audit after v0.1.1 evidence revision 2:
- total append-only matchup observations: **30** (raw v0.1 + earlier calibrated snapshots + final revision-2 snapshots);
- current revision-2 rows: **10**;
- post-kickoff rows: **0**;
- evidence-cutoff-at/after-kickoff rows: **0**;
- model-effect rows: **0**.

A deliberate post-kickoff insert test persisted **0 rows**.

No fixture predictions or model predictions were regenerated by this build.

## 11. Role/Tactical production orchestrator — v5 ACTIVE

`refresh-role-tactical-intelligence`: **v5 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Execution order:
1. raw v0.2 player profiles;
2. calibrated v0.2.1 roles;
3. team tactical profiles v0.1.1;
4. pre-kickoff player fixture-role snapshots;
5. pre-kickoff team tactical snapshots;
6. replacement quality v0.1.1;
7. tactical matchup v0.1.1;
8. forward role validation v0.2.

The matchup step runs after replacement refresh so personnel disruption uses the latest valid pre-kickoff replacement evidence.

Protected production request **139** returned HTTP 200 and an identical rerun inserted **0 rows in every component**, including Tactical Matchups revision 2.

Production cadence remains Role/Tactical refresh `20 8,18 * * *`, following competitive ingest at `0 8,18 * * *`.

## 12. Forward validation status

`refresh_role_forward_validation_v02()` only validates a role vector that genuinely existed before kickoff against subsequently processed competitive player events.

Current validation rows remain **0**. This is correct: today's completed matches did not have genuine pre-match v0.2.x snapshots, and the source has not yet processed their player events anyway. No hindsight backfill is allowed.

Fulham–Chelsea has genuine pre-kickoff v0.2.1 role/replacement/tactical-matchup snapshots and is therefore the first clean forward cohort once post-match rich events become available.

## 13. Public/read API contracts

`fpl-api`: **v8 ACTIVE** and intentionally left unchanged during Tactical Matchup work to avoid destabilizing the frozen FPL snapshot contract.

New additive `fixture-intelligence-api`: **v1 ACTIVE**, dependency pinned to `npm:@supabase/supabase-js@2.112.3`.

Contract version: `fixture_intelligence_v0.1`.

Per fixture it exposes:
- factual fixture state;
- each side's tactical profile;
- tactical matchup signals;
- Expected XI + role labels;
- replacement research;
- explicit research-only/model-effect flags and limitations.

Historical fixtures that lacked genuine pre-kickoff intelligence return empty/null intelligence; the API does **not** retrospectively reconstruct it.

Verified `fixture-intelligence-api?gw=1` HTTP 200.

This additive API is the preferred data contract for the upcoming Fixtures UI.

## 14. Dashboard / UI architecture

Existing `index.html` remains the old table-oriented dashboard. GitHub Pages deploys repo root.

Approved target information architecture after this foundational layer:
- Home;
- FPL;
- Fixtures;
- Market Intelligence;
- Performance.

The next implementation phase should freeze the main read contracts and rebuild UI/UX around these surfaces rather than adding more foundational layers first.

## 15. Market Intelligence state

Bookmaker Layer 1 remains PASSED. Correct Score research remains observational with proportional + power de-vig, offered-set conditional comparison, raw/unconditional wager EV, price history and CLV. `value_edge_available=false`.

Existing observational feature families also include Recent Performance and Schedule/Fatigue. Continue forward odds/edge/CLV sampling; do not enable live recommendation thresholds before validation.

## 16. Security / performance state

New Tactical Matchup storage is internal:
- RLS enabled;
- anon/authenticated revoked;
- service-role access only;
- current view uses `security_invoker=true`.

Supabase security advisor reports `RLS enabled, no policy` INFO for this internal table, which is expected under the service-only design. It does **not** report a new RLS-disabled error for Tactical Matchups.

Performance advisor reports no unindexed foreign-key warning for the new matchup table. Its newly created indexes are currently listed as unused, expected immediately after creation.

Known legacy security ERROR findings remain on older exposed objects including `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables. Do not blindly harden them before mapping direct dependencies.

## 17. Repository parity — Tactical Matchup pass

New/updated repository commits from this pass include:
- `376be6f2c4a6212bc98a9357b63564caaf7f7878` — Role/Tactical orchestrator v5 source;
- `93684bbddd4d4842b85ff3b46cd55fdd872cc01c` — `fixture-intelligence-api` source;
- `f4b8dc7e1dc1d3ff75a2fc438996075060b0cf52` — pinned API dependency config;
- `8c9ee48d1a836eff4d2f535300ca6ac0395d0c8f` — clean final-state Tactical Matchup v0.1.1 migration.

Earlier Role/Replacement/FPL/Betting migrations remain in history.

## 18. Exact next-action queue

1. **Freeze the core read contracts and rebuild UI/UX** around Home / FPL / Fixtures / Market Intelligence / Performance. Use `fixture-intelligence-api` for the Fixtures intelligence surface.
2. After Fulham–Chelsea, ingest processed rich events when available and run the first genuine forward validation for roles, Expected XI, replacement rank and tactical matchup manifestation.
3. Calibrate confidence/thresholds from forward samples; keep all new intelligence `model_effect_enabled=false`.
4. Later add true left/right channel evidence, defensive pressing and defensive line height as separate validated families; never infer them from current proxies.
5. Add replacement player ability and whole-team tactical consequence only after role-cover validation.
6. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
7. Only after sufficient forward validation define any active betting/FPL model effects or recommendation thresholds.
8. Map legacy client dependencies and then harden older RLS/grants safely.

## 19. Resume instruction

In any fresh conversation:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. independently inspect current GitHub and Supabase production state;
3. preserve frozen forecasts and append-only observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless production has advanced.