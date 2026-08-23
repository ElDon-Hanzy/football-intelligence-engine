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
- v0.1.3 — consumes the v0.1.2 player-state layer and overlays Player Role Intelligence.

Historical GW1 forecasts remain frozen.

Permanent weekly rules:
- project the full 15-man squad before XI/bench/captain decisions;
- xMins, xPts, P(blank), P(5+), P(10+), P(15+), P(20+);
- include Defensive Contributions;
- use Captaincy Haul Model rather than mean xPts alone;
- anti-anchor to prior XI/bench/captain.

Current official FPL player dimension: **604 players**, with zero missing team mappings and zero missing position mappings at latest verification.

## 3. Result pipeline and current-season team evidence

### `sync-gw-results`
Current deployed version: **v4 ACTIVE**.

It:
- reads official FPL live player data and GW fixtures;
- writes append-only `gameweek_result_runs` and `player_gameweek_actuals`;
- records the exact `finished_fixture_ids` for every result snapshot;
- reconciles mutable factual result state in `matches` without altering frozen predictions;
- invokes `refresh_current_season_team_intelligence()` after fixture reconciliation;
- is hash-idempotent when the official result payload is unchanged.

Production cron `football_intelligence_result_sync`: **every 15 minutes** (`*/15 * * * *`).

Latest verified result execution:
- HTTP 200;
- GW1;
- 10 fixtures reconciled;
- 8 finished fixture IDs at that snapshot;
- 604 current player rows;
- team-evidence hook inserted 0 because completed-match evidence was already present.

### Current-season team evidence
Production function: `public.refresh_current_season_team_intelligence()`.

Verified storage:
- source `official_fpl_results`;
- **16 team-side rows** = 8 completed GW1 matches × 2 teams;
- final goals for/against retained;
- xG remains **NULL, not zero**, because this official result feed does not provide the required team-level xG fields;
- unique `(source, source_match_id, team_id)` makes reruns idempotent.

This evidence is for future-state learning only. It does not rewrite GW1 forecasts.

## 4. Snapshot-safe FPL actuals / fixtures

Current deployed `fpl-api`: **v8 ACTIVE**.

Player actual finality is evaluated against the same stored result snapshot's `finished_fixture_ids`, not a newer live fixture state.

`fixture_results` exposes mutable factual results separately from frozen pre-kickoff predictions.

Verified example:
- Man City vs Bournemouth actual: **2-1**;
- frozen model top scoreline: **2-1**;
- frozen lambdas: **2.157 – 1.452**.

Never reconstruct a missing historical expected score after the result is known. If no valid frozen pre-kickoff prediction exists, show `—`.

## 5. Dashboard / UI state

Repository: `ElDon-Hanzy/football-intelligence-engine`.
Main page: `index.html`.
GitHub Pages workflow deploys repository root on pushes to `main`.

Latest dashboard contract repair:
`aab8189426c51716eae48a4a99443a7e600a7998`.

Current dashboard can render fixture prediction-vs-actual, FPL actuals, bookmaker feed health, Correct Score odds, research edges, price tracking and CLV.

The interface is acknowledged as structurally messy. Planned information architecture after the next foundational intelligence layer:
- Home;
- FPL;
- Fixtures;
- Market Intelligence;
- Performance.

Do not heavily polish the current table-oriented UI before the remaining foundational data contracts stabilize.

Independent browser/runtime verification of the public Pages URL is still unavailable from the current tool environment. Repository/API source is verified; do not claim browser rendering independently verified until actually observed.

## 6. Existing Mispricing Intelligence base

Existing observational families:
- Recent Performance / attacking xG trend;
- Recent Performance / defensive xGA trend;
- Schedule / Fatigue / rest-congestion.

All remain `model_effect_enabled=false`.

Historical team adapters remain verified:
- Football-Data: 932 source matches parsed, 784 current-team rows, all 20 current teams, xG correctly NULL;
- Understat: 380 EPL matches, 646 current-team xG rows, 17 teams; promoted teams without prior EPL xG remain missing, not zero;
- canonical reconciliation: 784 team-dates, 646 provider overlaps, 138 Football-Data-only promoted-team dates, zero source/match/team duplicate groups.

## 7. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

Production table:
`public.player_fixture_availability_observations`.

It stores append-only fixture/player observations with:
- official FPL availability status, chance of playing and news;
- latest known base P(start)/xMin;
- candidate-XI membership;
- candidate positional shape;
- confidence/provenance;
- observation hash;
- `model_effect_enabled=false` enforced by constraint.

Security:
- RLS enabled;
- anon/authenticated revoked;
- service role SELECT/INSERT only;
- current view uses `security_invoker=true`.

### Kickoff protection
`private.guard_player_fixture_availability_preko()` rejects:
- execution at/after fixture kickoff;
- `captured_at >= kickoff`;
- kickoff mismatches;
- team/opponent mismatches.

A deliberate invalid post-kickoff insert test persisted zero rows.

### Edge Function
`refresh-availability-intelligence`: **v4 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

It:
- uses protected `x-engine-token` authentication;
- processes only future fixtures;
- refreshes the full official FPL player dimension first;
- maps AVAILABLE / DOUBTFUL / INJURED / SUSPENDED / UNAVAILABLE / UNKNOWN;
- gives hard-unavailable players zero XI score;
- otherwise uses latest base start probability;
- chooses 11 candidate players under legal FPL positional constraints;
- never changes xPts/lambdas/fixture forecasts.

### Candidate shape is NOT tactical formation
Labels such as 4-5-1 or 5-4-1 are constrained selection shapes, not tactical formation predictions.
Evidence explicitly records:
`formation_is_candidate_shape_not_tactical_prediction=true`.

### Live Fulham–Chelsea validation
Initial snapshot:
- 61 player observations;
- Chelsea: 38 candidates, 11 selected, 2 doubtful, 3 unavailable;
- Fulham: 23 candidates, 11 selected, 0 doubtful, 2 unavailable;
- model-effect rows: 0.

After current-season player-state refresh, a second append-only 61-row snapshot was created using the new state as-of `2026-08-23 17:04:51.492+00`.
Current view still returns exactly 11 candidate XI players per team.

Contamination safeguards at first audit:
- retrospective rows for already-started fixtures: 0;
- rows captured at/after kickoff: 0;
- model-effect rows: 0.

Production availability cron: `10 */4 * * *` — ten minutes after the player-state refresh cadence.

## 8. Current-season player-state refresh — DEPLOYED + VERIFIED

Production function:
`refresh-current-player-state` **v3 ACTIVE**, pinned to `npm:@supabase/supabase-js@2.112.3`.

Purpose: make future P(start), appearance probability, xMin and xG/xA rate priors responsive to completed 2026/27 official evidence while preserving all frozen forecasts.

### Correct lineage
Important architecture discovery:
- active prediction model v0.1.3 does **not** own a separate player-state dataset;
- v0.1.3 explicitly consumes the v0.1.2 `player_state` layer and overlays role intelligence;
- therefore current-season state updates are appended under model version **0.1.2**, not falsely relabelled v0.1.3.

The first overly-strict active-model attempt found zero base rows and inserted zero rows. That safe no-op exposed the lineage mismatch before any bad state was written.

### Evidence selection
The refresher:
- selects the latest official result snapshot per completed gameweek;
- accepts player actual rows only when every referenced fixture ID was already finished in that same result snapshot;
- therefore does not learn from unfinished fixture zeroes;
- aggregates current-season games, starts, appearances, minutes, xG and xA;
- keeps defensive-action rate priors unchanged because current FPL fields are not treated as equivalent to the historical CBIT/CBIRT inputs.

### Bayesian/state update
Current-season starts/appearances update latent probabilities against a six-game-equivalent prior rather than replacing history after one match.
Starter-minute and substitute-minute estimates are updated conservatively from single-fixture observations.
Current xG90/xA90 use a 450-minute prior before current-season evidence.
Current official availability is applied once after recovering the pre-existing latent probability where possible.

These are future state priors, not retrospective forecast edits.

### First successful production run
Verified:
- state model version: **0.1.2**;
- consumer note: v0.1.3 consumes v0.1.2 player state + role intelligence;
- finished gameweeks: 1;
- valid actual players: 482;
- base players considered: 600;
- **600 append-only current-season state rows inserted**;
- 4 new FPL players reported `no_base_state=4` rather than receiving fabricated priors;
- historical forecasts rewritten: false.

Idempotency rerun:
- inserted: **0**;
- unchanged: **600**.

Observed movement versus the previous base state:
- average absolute P(start) change: **0.0398**;
- maximum absolute P(start) change: **0.5695**;
- average absolute xMin change: **3.26 minutes**;
- maximum absolute xMin change: **53.97 minutes**.

Large movements are dominated by changed availability/return-to-fitness or strong first-match evidence and should be audited, not automatically assumed correct.

A direct database check found **0 GW1 model predictions generated after this state refresh**, confirming that the state update did not regenerate the frozen historical forecast.

Production current-player-state cron: `0 */4 * * *`.

## 9. Replacement quality — DELIBERATELY NOT MODELED YET

Do not infer replacement quality from FPL position or simple positional rank.

Current role/tactical mapping is not reliable enough to determine true tactical replacements and the football consequences of an absence.

Availability evidence records:
`replacement_quality_status='NOT_MODELED_NO_RELIABLE_ROLE_MAP'`.

Replacement quality comes only after a reliable role/tactical layer exists.

## 10. Protected backend invocation

`private.invoke_engine_ingest(p_function text, p_body jsonb)` allowlist now contains:
- `ingest-team-history`;
- `ingest-understat-xg`;
- `ingest-bookmaker-odds`;
- `refresh-availability-intelligence`;
- `refresh-current-player-state`.

It retrieves `FOOTBALL_ENGINE_ADMIN_TOKEN` internally and never exposes it. Backend functions compare the supplied internal token against the backend secret; no secret is committed.

## 11. Bookmaker / Correct Score research state

Layer 1 remains PASSED:
- append-only raw snapshots;
- deterministic mapping;
- latest-valid-pre-kickoff read semantics;
- complete paged normalized reads;
- missing data never treated as zero;
- no validated post-kickoff contamination.

Layer 2 remains observational:
- proportional and power de-vig;
- offered-set conditional fair probabilities;
- raw/unconditional model probability retained;
- actual wager EV = raw model probability × decimal odds − 1;
- `ROBUST_POSITIVE_EV` and similar statuses are research labels, not recommendations;
- `value_edge_available=false`.

Price/CLV semantics:
- `first_observed` is not asserted true opening price;
- closing price is a last-valid-pre-kickoff **proxy**;
- exact capture gap retained;
- CLV derived without rewriting original observations.

Newcastle–Liverpool final stored Bet365/Unibet capture was about 412 seconds before kickoff. The attempted ~90-second capture did not persist and must not be claimed successful.

Current deployed `betting-api`: **v9 ACTIVE**.

## 12. Repository parity — latest commits

Availability/current-season evidence:
- `de20ef96ee303f46d4cdae36bcbaaa98475faee4` — Expected XI/availability migration;
- `1e00b2a959993c945b8303b1e9674b757420116b` — availability cron migration;
- `b318db912f87181299a17b55d2182fdaf9cf6d3e` — availability import config;
- `a22678d08f7db352d5c4bc4f904394630b2f3198` — availability function source;
- `760935a68233b45aeac11c3b2d4d5f0ec9e9985e` — result-sync current-season team-evidence hook.

Current-season player state:
- `d69b62dbb5851cafc7bd9ae9d5308de5d4439f17` — current-state refresh plumbing/schedule migration;
- `3b239ea0de18105842bfad1efbada449870dc28d` — v0.1.2 state-lineage correction;
- `2d9e91ac6ebfb40d9aa9e2723078dddc8a6080c4` — current-state function import config;
- `b342429ec92c2793258a9020470998c3f125d92e` — current-state function source.

Earlier important commits:
- dashboard audit/search fix `6115f3307895b49c80067affcaacd03f9e3550e7`;
- dashboard fixture/betting repair `aab8189426c51716eae48a4a99443a7e600a7998`;
- optimized Correct Score edge generation `a62d4925f930b9a6ecae7ec951802352cd7daf64`.

## 13. Security state

New availability/state helper views use `security_invoker=true`; new availability storage is RLS-enabled and internal.

Known legacy security errors remain on exposed public objects including `player_role_intelligence`, `fixture_prediction_snapshots` and legacy odds tables with RLS disabled. Do not blindly change these before mapping direct dashboard/API dependencies.

Security cleanup remains a separate workstream from model validation.

## 14. Exact next-action queue

1. **Build reliable Role / Tactical Intelligence observationally.** Establish actual player roles and team shapes from evidence rather than FPL positions.
2. Use that role map to implement **replacement-quality intelligence** for injuries/suspensions/rotation.
3. Add tactical interactions: pressing vs buildup, defensive-line height vs pace, attack-channel mismatches, aerial/set-piece mismatch and other evidence-backed interactions.
4. Validate Expected XI against actual lineups over forward fixtures and calibrate P(start)/xMin update strength.
5. Freeze the main API contracts for Home / FPL / Fixtures / Market Intelligence / Performance.
6. Rebuild the UI/UX around those stable contracts.
7. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
8. Only after forward validation define live betting recommendation thresholds.
9. Map legacy direct client access and harden RLS/grants safely.

## 15. Operational instruction for future conversations

When resuming:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. inspect current GitHub and Supabase state independently;
3. preserve frozen forecasts and append-only historical observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless live production state has advanced.
