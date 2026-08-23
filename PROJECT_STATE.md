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

`sync-gw-results`: **v4 ACTIVE**, cron `*/15 * * * *`.

Latest GW1 factual state: **9 finished fixtures**. Current-season team evidence:
- official FPL results: **18 team-side rows / 9 matches**;
- FPL-Core-Insights Premier League: **18 team-side rows / 9 matches**.

`refresh-current-player-state`: **v3 ACTIVE**, cron `0 */4 * * *`. Correct lineage remains v0.1.2 state consumed by v0.1.3. No historical prediction regeneration is allowed.

## 4. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Storage: `player_fixture_availability_observations` with database pre-kickoff guard, RLS, internal access and `model_effect_enabled=false`.

`refresh-availability-intelligence`: **v4 ACTIVE**, cron `10 */4 * * *`.

Candidate shapes such as 4-5-1 are FPL-valid selection constraints only, **not tactical formation predictions**.

Fulham–Chelsea has a genuine pre-kickoff candidate-XI snapshot and is the first clean forward-validation fixture for the newer role/tactical stack.

## 5. Competitive + historical rich-event evidence

`ingest-competitive-core-stats`: **v1 ACTIVE**, cron `0 8,18 * * *`.

Current completeness state:
- upstream recognizes 9 finished GW1 fixtures;
- only Arsenal–Coventry is fully player-stat processed at latest forced ingest;
- competitive player-event evidence remains **40 rows**;
- later GW1 fixtures still await upstream player-stat processing.

`ingest-historical-role-evidence`: **v1 ACTIVE**. Verified 2025/26 prior:
- 12,754 source rows;
- 10,205 mapped rows;
- 419 current players;
- 38/38 EPL gameweeks;
- zero duplicate groups;
- zero model-effect rows.

Historical evidence is a future-role prior only and never rewrites old forecasts.

## 6. Role Intelligence v0.2 / v0.2.1 — DEPLOYED + VERIFIED

Raw v0.2 blends capped historical, weak preseason and strongly weighted current competitive evidence into behavioral axes: shot threat, box occupation, creation, width, defensive load, progression and aerial involvement.

The first absolute-role scorer collapsed too many defenders into CB and midfielders into holding-midfielder. It was rejected as the calibrated taxonomy.

v0.2.1 uses **position-relative behavioral percentiles**.

Current audit:
- 472 profiles;
- 162 UNRESOLVED;
- average confidence 0.6253;
- max confidence 0.92;
- 31 profiles currently contain competitive 2026/27 evidence.

Representative outputs: Bruno Fernandes = CREATOR_10; Frimpong/White = WIDE_BACK; Gabriel/Maguire = CENTRE_BACK; Mbeumo = WIDE_ATTACKER; Odegaard = CREATOR_10; Havertz = LINK_FORWARD; Raya = GOALKEEPER.

Haaland, Isak and Chelsea Palmer remain intentionally unresolved/ambiguous where evidence does not separate roles strongly enough.

## 7. Team Tactical Intelligence v0.1.1 — DEPLOYED + VERIFIED

Team style is stored as orthogonal heuristic axes, not guessed formation:
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

Storage: `player_replacement_quality_observations`, pre-kickoff guarded, `model_effect_enabled=false`.

Candidate compatibility is same FPL position by default with only explicit role bridges. Sample-size-aware absence relevance prevents tiny historical samples from being treated as major absences.

Current Fulham–Chelsea examples include Chalobah -> Tosin, Fofana -> Tosin, Henderson -> Lavia and Andersen -> J.Cuenca. These remain role-cover research, not manager-selection or equal-ability claims.

## 9. Tactical Matchup Intelligence v0.1.1 — DEPLOYED + VERIFIED, RESEARCH ONLY

Storage: `fixture_tactical_matchup_observations`.
Current view: `current_fixture_tactical_matchups` with `security_invoker=true`.

One append-only observation is stored per **fixture side × signal family** with explicit score semantics (`ADVANTAGE`, `OPPORTUNITY`, `DISRUPTION`).

Current signal keys:
1. `wide_channel_pressure`;
2. `aerial_set_piece_mismatch`;
3. `central_creation_vs_block`;
4. `direct_transition_opportunity` — explicitly **not** high-line-vs-pace;
5. `personnel_disruption` — continuity proxy, not player ability.

Direction calibration for ADVANTAGE signals:
- >=0.62 ATTACK_ADVANTAGE;
- >=0.55 ATTACK_LEAN;
- <=0.45 DEFENSIVE_LEAN;
- <=0.38 DEFENSIVE_RESISTANCE;
- otherwise BALANCED.

Important limitations are embedded in every observation:
- no left/right flank assignment;
- no defensive pressing intensity;
- no defensive line height;
- no validated replacement ability/tactical-consequence effect;
- missing components are ignored, never zero-filled;
- all outputs remain `model_effect_enabled=false`.

Current Fulham–Chelsea headline research:
- Fulham wide channel 0.5811 ATTACK_LEAN;
- Chelsea personnel disruption 0.4161 MATERIAL_DISRUPTION;
- remaining broad ADVANTAGE signals are currently balanced.

Final storage audit after evidence revision 2:
- total append-only matchup observations: 30;
- current revision-2 rows: 10;
- post-kickoff rows: 0;
- bad evidence cutoffs: 0;
- model-effect rows: 0.

## 10. Role/Tactical production orchestration

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

Protected request 139 returned HTTP 200; identical rerun inserted **0 rows in every component**.

Production cadence: competitive ingest `0 8,18 * * *`, Role/Tactical refresh `20 8,18 * * *`.

## 11. Forward validation status

`refresh_role_forward_validation_v02()` validates only a role vector genuinely captured before kickoff against subsequently processed realized competitive events.

Current validation rows: **0**. This is correct; no hindsight backfill is allowed.

Fulham–Chelsea is the first clean forward cohort for Role v0.2.1, Expected XI, replacement and Tactical Matchup validation once post-match rich events become available.

## 12. Public/read API contracts

`fpl-api`: **v8 ACTIVE** and remains unchanged.

`fixture-intelligence-api`: **v1 ACTIVE**, contract `fixture_intelligence_v0.1`, exposing factual fixture state, team tactical profile, tactical matchup signals, Expected XI + role labels, replacement research, research-only flags and limitations.

Historical fixtures without genuine pre-kickoff intelligence return empty/null intelligence rather than hindsight reconstruction.

`betting-api`: current Correct Score / odds / edge / movement / CLV read boundary.

These three APIs are the current UI read contracts. The UI does not query the research tables directly.

## 13. UI/UX v1 — CODED + COMMITTED, LIVE VISUAL QA PENDING

`index.html` has been replaced as an intelligence-product shell rather than a table-first engineering dashboard.

Commit:
- `2da7ec4af1f195058297bd7282c359136951c09e` — **Rebuild dashboard as intelligence product shell**.

Information architecture is now:
- **Home** — gameweek command center, next/latest fixture, FPL snapshot, intelligence pulse and market health;
- **FPL** — captain/vice, starting XI, bench and haul candidates;
- **Fixtures** — fixture board driven by `fixture-intelligence-api`, with drill-down tabs for Matchups / Team Style / Expected XI / Replacements;
- **Market Intelligence** — bookmaker coverage, Correct Score research, research edge, movement and CLV drill-down;
- **Performance** — fixture prediction-vs-actual and player projection audit.

Interaction / responsive design:
- desktop fixed sidebar;
- mobile bottom navigation;
- gameweek selector and refresh control shared across surfaces;
- cards and drill-down sheets replace dense first-level tables;
- research intelligence is visually marked amber/blue, not presented as validated green recommendations;
- historical fixtures with no pre-kickoff intelligence remain explicitly empty;
- old query tabs map forward (`overview -> home`, `betting -> market`, `audit -> performance`) to avoid breaking saved links.

Source isolation:
- FPL, fixture intelligence and market API requests fail independently;
- the header exposes how many of the three sources are live;
- one failed research API does not blank the entire product.

Status distinction:
- **coded:** yes;
- **committed:** yes;
- **backend contracts changed:** no;
- **browser/live visual QA independently verified:** not yet from the current tool environment.

Do not call UI/UX v1 fully verified until it has been visually exercised in the deployed browser on desktop and mobile.

## 14. Security / performance state

New Tactical Matchup storage remains internal: RLS enabled, anon/authenticated revoked, service-role only, current view `security_invoker=true`.

Security advisor reports expected `RLS enabled, no policy` INFO for service-only research tables. Known legacy ERROR findings remain on older exposed objects including `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables. Do not blindly harden them before mapping direct dependencies.

Performance advisor reports no unindexed foreign-key warning on the Tactical Matchup table.

## 15. Repository parity — latest relevant commits

Tactical / API pass:
- `376be6f2c4a6212bc98a9357b63564caaf7f7878` — Role/Tactical orchestrator v5;
- `93684bbddd4d4842b85ff3b46cd55fdd872cc01c` — fixture-intelligence API;
- `f4b8dc7e1dc1d3ff75a2fc438996075060b0cf52` — pinned fixture API dependency;
- `8c9ee48d1a836eff4d2f535300ca6ac0395d0c8f` — Tactical Matchup v0.1.1 migration.

UI pass:
- `2da7ec4af1f195058297bd7282c359136951c09e` — UI/UX v1 shell.

## 16. Exact next-action queue

1. **Visually QA UI/UX v1 on deployed desktop + mobile** and fix any runtime/layout issues found.
2. Refine visual hierarchy and information density based on real rendered data, especially Home and Fixtures.
3. After Fulham–Chelsea, ingest processed rich events when available and run first genuine forward validation for roles, Expected XI, replacement rank and tactical-matchup manifestation.
4. Calibrate confidence/thresholds from forward samples; keep all new intelligence `model_effect_enabled=false`.
5. Later add true left/right channel evidence, defensive pressing and defensive line height as separate validated families.
6. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
7. Only after sufficient validation define active betting/FPL effects or recommendation thresholds.
8. Map legacy client dependencies and then harden older RLS/grants safely.

## 17. Resume instruction

In any fresh conversation:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. independently inspect current GitHub and Supabase production state;
3. preserve frozen forecasts and append-only observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless production has advanced.