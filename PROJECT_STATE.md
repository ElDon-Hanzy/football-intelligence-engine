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

## 2. FPL model state

Model evolution:
- v0.1.1 — initial engine; fixture-strength compression defect identified.
- v0.1.2 — multiplicative matchup-strength recalibration.
- v0.1.2b — starter minutes/P(start), penalty-event treatment, latent BPS/bonus simulation, opponent-adjusted Defensive Contributions.
- v0.1.3 — Player Role Intelligence for strong current-role evidence.

Historical GW1 forecasts remain frozen.

Permanent weekly rules:
- project the full 15-man squad before XI/bench/captain decisions;
- xMins, xPts, P(blank), P(5+), P(10+), P(15+), P(20+);
- include Defensive Contributions;
- use Captaincy Haul Model rather than mean xPts alone;
- anti-anchor to prior XI/bench/captain.

Current official FPL player dimension: **604 players**, with zero missing team mappings and zero missing position mappings at latest verification.

## 3. Result pipeline and current-season evidence

Supabase project: `knooiwezzsxcwhtjtdap`.

### `sync-gw-results`
Current deployed version: **v4 ACTIVE**.

Key behavior:
- reads official FPL live player data and GW fixtures;
- writes append-only `gameweek_result_runs` and `player_gameweek_actuals`;
- every result snapshot records the exact `finished_fixture_ids` finished at that snapshot;
- reconciles mutable factual result state in `matches` without altering frozen predictions;
- invokes `refresh_current_season_team_intelligence()` after fixture reconciliation;
- hash-idempotent when the result payload is unchanged.

Production cron `football_intelligence_result_sync`: **every 15 minutes** (`*/15 * * * *`).

Latest verification returned HTTP 200 with:
- GW1;
- 10 fixtures reconciled;
- 8 finished fixture IDs at that moment;
- 604 player actual rows in the newest run;
- current-season team evidence hook inserted 0 because the existing finished-match evidence was already present.

### Current-season team evidence
Production function: `public.refresh_current_season_team_intelligence()`.

Current verified storage:
- source `official_fpl_results`;
- **16 team-side rows** = 8 completed GW1 matches × 2 teams;
- final goals for/against retained;
- official FPL does not provide the team xG fields required here, therefore all 16 current-season rows have xG **NULL, not zero**;
- uniqueness `(source, source_match_id, team_id)` makes reruns idempotent.

This evidence may inform future fixtures only; it does not rewrite any GW1 forecast.

## 4. Snapshot-safe FPL API and fixture actuals

Current deployed `fpl-api`: **v8 ACTIVE**.

Snapshot-safe actual semantics:
- player actual finality is evaluated against the same result snapshot's `finished_fixture_ids`, not a newer live fixture state;
- mutable current result facts and frozen prediction facts are exposed separately;
- `fixture_results` includes actual score/status plus the frozen pre-kickoff fixture prediction where one genuinely exists.

Verified example:
- Man City vs Bournemouth actual: **2-1**;
- frozen model top scoreline: **2-1**;
- frozen lambdas: **2.157 – 1.452**.

Never reconstruct a missing historical expected score after the result is known. Show `—` if no valid frozen pre-kickoff fixture prediction exists.

## 5. Dashboard / UI state

Repository: `ElDon-Hanzy/football-intelligence-engine`.
Main page: `index.html`.
GitHub Pages workflow deploys repository root on pushes to `main`.

Latest dashboard contract repair commit:
`aab8189426c51716eae48a4a99443a7e600a7998`.

Current dashboard can render:
- fixture predictions vs actuals;
- player prediction vs actual FPL points;
- current bookmaker feed health;
- Correct Score odds;
- robust research-edge rows;
- price tracking and CLV research.

The interface is acknowledged as structurally messy. Planned information architecture after the next foundational intelligence work:
- Home;
- FPL;
- Fixtures;
- Market Intelligence;
- Performance.

Do not spend heavily polishing the present table-oriented UI before the remaining foundational data contracts stabilize.

Independent browser/runtime verification of the exact public Pages URL is still unavailable from the current tool environment. Repository source/API state is verified; browser rendering must not be claimed independently verified until actually observed.

## 6. Historical team intelligence / existing Mispricing base

Production objects include:
- `team_match_intelligence`;
- `fixture_intelligence_signals`;
- `team_intelligence_features`;
- `generate_observational_intelligence(gameweek)`.

Existing observational families:
- Recent Performance / attacking xG trend;
- Recent Performance / defensive xGA trend;
- Schedule / Fatigue / rest-congestion.

All remain `model_effect_enabled=false`.

Historical adapters remain production-verified:
- Football-Data: 932 source matches parsed, 784 current-team historical rows, all 20 current teams, xG correctly NULL;
- Understat: 380 EPL source matches, 646 current-team xG rows, 17 teams; promoted teams without prior EPL xG remain missing, not zero;
- canonical reconciliation: 784 team-dates, 646 provider overlaps, 138 Football-Data-only promoted-team dates, zero duplicate source/match/team groups.

## 7. Expected XI / Availability Intelligence v0.1 — DEPLOYED + VERIFIED

### Storage
Production table:
`public.player_fixture_availability_observations`

Properties:
- append-only observational rows;
- tied to match/team/opponent/player/kickoff;
- stores official FPL status, chance of playing, news, latest known player-state P(start)/xMin, candidate-XI membership and confidence;
- observation hash prevents unchanged evidence from generating duplicate rows;
- RLS enabled;
- anon/authenticated revoked;
- service role has SELECT/INSERT only;
- `model_effect_enabled` is constrained to `false`.

Current view:
`public.current_player_fixture_availability` with `security_invoker=true`.

### Hard kickoff guard
Trigger:
`private.guard_player_fixture_availability_preko()`

It rejects:
- execution after fixture kickoff;
- `captured_at >= kickoff`;
- kickoff mismatches;
- team/opponent mismatches.

The guard was tested with a deliberate invalid post-kickoff insert attempt; zero test rows persisted.

### Edge Function
Production `refresh-availability-intelligence`: **v4 ACTIVE**.
Package import pinned to `npm:@supabase/supabase-js@2.112.3`.

Authentication:
- custom `x-engine-token`;
- compares against `FOOTBALL_ENGINE_ADMIN_TOKEN` obtained through the existing backend-secret RPC;
- protected SQL wrapper allowlist now includes `refresh-availability-intelligence`.

Behavior:
- processes only fixtures whose kickoff is still in the future;
- refreshes the complete official FPL player dimension before evaluating the fixture;
- official status mapping: AVAILABLE / DOUBTFUL / INJURED / SUSPENDED / UNAVAILABLE / UNKNOWN;
- hard unavailable statuses receive zero XI score;
- otherwise candidate XI score uses the latest pre-existing player-state start probability;
- chooses 11 candidate players under a legal FPL positional shape;
- stores the shape and ranks for auditability;
- does not alter xPts, lambdas or fixture probabilities.

### Candidate shape is NOT tactical formation
Current selection shapes are generated by maximizing summed P(start) under valid FPL formation constraints such as 4-5-1 or 5-4-1.

They are **not tactical formation predictions** and must not be presented as such. Evidence explicitly records:
`formation_is_candidate_shape_not_tactical_prediction=true`.

A separate Tactical / Formation Intelligence layer is required before tactical-shape claims are allowed.

### First live snapshot
For the only remaining pre-kickoff GW1 fixture at introduction time, Fulham vs Chelsea:
- 61 player observations inserted;
- Chelsea: 38 candidates, exactly 11 selected, candidate shape 4-5-1, 2 doubtful, 3 unavailable;
- Fulham: 23 candidates, exactly 11 selected, candidate shape 5-4-1, 0 doubtful, 2 unavailable;
- model-effect rows: 0.

Idempotency rerun: **0 new rows**.

Final contamination audit:
- total rows: 61;
- retrospective rows for already-started fixtures: **0**;
- rows captured at/after kickoff: **0**;
- `model_effect_enabled=true` rows: **0**.

Production cron:
`football_intelligence_availability_refresh` = `0 */4 * * *` (every four hours).
Unchanged evidence does not create duplicate observation rows.

## 8. Replacement quality — DELIBERATELY NOT MODELED YET

Do not infer replacement quality merely from FPL position or positional rank.

Current `player_role_intelligence` / player-state role/formation coverage is not reliable enough to identify true tactical replacements and their football consequences.

Every availability observation currently records:
`replacement_quality_status='NOT_MODELED_NO_RELIABLE_ROLE_MAP'`.

Replacement quality should be implemented only after a reliable role/tactical map exists.

## 9. Current player-state limitation

This is the most important immediate gap after the new availability layer.

The currently deployed player-state refresh logic still derives current P(start)/xMin primarily from:
- 2025/26 historical data;
- external season data;
- preseason `fpl_core_insights` friendlies;
- current availability metadata.

It **does not yet incorporate completed 2026/27 official FPL match minutes/starts from `player_gameweek_actuals` into future player-state priors**.

Therefore the new Expected-XI layer is useful and chronology-safe, but its base P(start)/xMin is not yet fully current-season-aware.

Next plumbing task must fix this before we treat Expected XI confidence as mature.

## 10. Protected ingestion path

`private.invoke_engine_ingest(p_function text, p_body jsonb)` remains the protected production wrapper.

Current allowlist:
- `ingest-team-history`;
- `ingest-understat-xg`;
- `ingest-bookmaker-odds`;
- `refresh-availability-intelligence`.

It retrieves `FOOTBALL_ENGINE_ADMIN_TOKEN` internally from Vault and never returns the secret. EXECUTE remains limited to trusted backend roles.

## 11. Bookmaker Layer 1 — PASSED

Primary provider: Odds-API.io.
Observed Correct Score bookmaker families: Bet365 and Unibet. `Bet365 (no latency)` is preserved as a raw provider source but canonicalized into the Bet365 family for counts.

Verified invariants:
- deterministic event mapping by teams + kickoff;
- append-only raw snapshots;
- latest-valid-pre-kickoff read semantics;
- complete paged normalized reads;
- missing current markets are not backfilled from stale older snapshots;
- missing data remains missing, not zero;
- zero validated post-kickoff raw/normalized/source-timestamp contamination.

## 12. Correct Score Layer 2 — de-vig / edge / EV

Production `betting_edge_observations` remains append-only, chronology-aware, `research_classification='UNVALIDATED'`, `model_effect_enabled=false`.

De-vig methods:
- `proportional_offered_set`;
- `power_offered_set`.

Correct Score semantics:
- bookmaker fair probability conditional on offered score set;
- model raw/unconditional probability retained;
- conditional model probability computed on same offered set;
- conditional edge compares like-for-like conditional probabilities;
- actual wager EV = raw model probability × decimal odds − 1.

Research status such as `ROBUST_POSITIVE_EV` is not a betting recommendation.
`value_edge_available` remains false.

## 13. Price history / CLV

Important semantics:
- `first_observed` is not claimed to be true market open;
- last valid pre-kickoff observation becomes a closing proxy after kickoff;
- exact capture gap is retained;
- CLV derives from immutable historical observations and never rewrites them.

For Newcastle vs Liverpool, final stored Bet365/Unibet capture was about **412 seconds before kickoff**. The scheduled ~90-second capture did not persist and must not be claimed as successful.

Post-kickoff Newcastle audit remained clean:
- raw post-KO: 0;
- normalized post-KO: 0;
- edge post-KO: 0;
- CLV research remains observational.

Current deployed `betting-api`: **v9 ACTIVE** with bookmaker, research edge, price tracking and CLV exposure.

## 14. Repository parity from this pass

New files/updates committed:
- migration `20260823185500_expected_xi_availability_v01.sql` — commit `de20ef96ee303f46d4cdae36bcbaaa98475faee4`;
- availability cron migration `20260823185600_schedule_availability_refresh.sql` — commit `1e00b2a959993c945b8303b1e9674b757420116b`;
- availability function import config — commit `b318db912f87181299a17b55d2182fdaf9cf6d3e`;
- availability function source — commit `a22678d08f7db352d5c4bc4f904394630b2f3198`;
- result-sync current-season evidence hook — commit `760935a68233b45aeac11c3b2d4d5f0ec9e9985e`.

Earlier important commits remain:
- dashboard audit/search fix `6115f3307895b49c80067affcaacd03f9e3550e7`;
- dashboard fixture/betting render repair `aab8189426c51716eae48a4a99443a7e600a7998`;
- optimized Correct Score edge generation `a62d4925f930b9a6ecae7ec951802352cd7daf64`;
- price/CLV migration evolution is present in current repository migrations.

## 15. Security state

The new availability table is RLS-enabled and internal; advisor reports `rls_enabled_no_policy`, which is intentional for a service-role-only internal table after anon/authenticated grants were revoked.

Known legacy security errors remain on several exposed public tables, including `player_role_intelligence`, `fixture_prediction_snapshots`, and legacy odds tables with RLS disabled. Do not blindly harden them before mapping dashboard/API dependencies.

Security cleanup remains a separate workstream from model validation.

## 16. Exact next-action queue

1. **Make player-state current-season-aware**: ingest completed 2026/27 player minutes/starts (and suitable official stats) into future P(start)/xMin priors, append-only and without changing frozen GW1 forecasts.
2. Re-run/validate Expected XI after that state refresh; measure how much candidate XI and P(start) change.
3. Build reliable role/tactical mapping; only then add replacement-quality intelligence.
4. Build Tactical / Formation Intelligence observationally: actual shape, pressing/build-up tendencies, attack channels and matchup interactions where evidence exists.
5. Freeze the main API contracts for Home / FPL / Fixtures / Market Intelligence / Performance.
6. Rebuild the UI/UX around those stable contracts.
7. Continue forward odds/edge/CLV sampling and add a third Correct Score source.
8. Only after forward validation define live betting recommendation thresholds.
9. Map legacy direct client access and harden RLS/grants safely.

## 17. Operational instruction for future conversations

When resuming:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. inspect current GitHub and Supabase state independently;
3. preserve frozen forecasts and append-only historical observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless live production state has advanced.
