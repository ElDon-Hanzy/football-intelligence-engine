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

## 3. Current production APIs and result pipeline

Supabase project: `knooiwezzsxcwhtjtdap`.

### `sync-gw-results`
Current deployed version: **v3 ACTIVE**.
Source is now committed under `supabase/functions/sync-gw-results/`.

Key behavior:
- reads official FPL live player data and GW fixtures;
- writes append-only `gameweek_result_runs` and `player_gameweek_actuals`;
- every new result run records the exact `finished_fixture_ids` that were finished at that snapshot;
- reconciles mutable factual result state in `matches` (`home_score`, `away_score`, `finished`, raw source, updated_at);
- does not rewrite any frozen prediction;
- hash-idempotent when the FPL payload is unchanged.

Production cron `football_intelligence_result_sync` was changed from every six hours to **every 15 minutes** (`*/15 * * * *`).

Why: the old six-hour cadence left finished matches stale for hours. More importantly, the old read API combined a stale result snapshot with current live fixture completion, which could turn an old pre-match `0 points` row into a false final actual.

### `fpl-api`
Current deployed version: **v8 ACTIVE**.
Source is now committed under `supabase/functions/fpl-api/`.

Snapshot-safe actual semantics:
- when `gameweek_result_runs.metadata.finished_fixture_ids` exists, a player actual is final only if all of that row's fixture IDs were already finished in the same result snapshot;
- older result runs without this field use a conservative chronology fallback rather than current completion alone;
- live/current fixture facts are exposed separately from frozen prediction state.

New `fixture_results` response includes:
- fixture/team/kickoff identifiers;
- actual home/away score and finished state;
- whether the selected result snapshot had that fixture finished;
- frozen pre-kickoff model lambda, top scoreline, scoreline probability, markets and confidence.

### Verified GW1 repair
Fresh result run id **9** was executed and verified with:
- 600 player actual rows;
- 10 fixtures reconciled;
- 8 finished fixture IDs at that snapshot.

Man City vs Bournemouth is verified in the API as:
- actual: **2-1**;
- finished: true;
- frozen model top scoreline: **2-1**;
- frozen fixture lambdas: **2.157 – 1.452**.

Verified Man City examples from that snapshot include Haaland 2, O'Reilly 2, Guéhi 10, Gvardiol 9, Cherki 8 and Donnarumma 3. Genuine non-participants remain true zeroes.

## 4. Dashboard state

Repository: `ElDon-Hanzy/football-intelligence-engine`.
Main page: `index.html`.
Pages workflow: `.github/workflows/pages.yml`, deploys repository root on pushes to `main`.

Earlier audit/search fix commit:
`6115f3307895b49c80067affcaacd03f9e3550e7`.

Latest dashboard repair commit:
`aab8189426c51716eae48a4a99443a7e600a7998` — `Render fixture scores and betting research data`.

The latest dashboard now:
- displays a GW fixture Predictions vs Actuals table;
- shows frozen top expected score, probability, model lambdas/xG, actual score and fixture status;
- highlights an exact top-score hit;
- displays current squad/all-player actual FPL points from snapshot-safe `fpl-api` semantics;
- no longer depends on obsolete betting fields such as `market_picks.correct_score` / `homepage_correct_score`;
- displays bookmaker-feed health, odds/bookmaker counts, robust research edges, price tracking and CLV research;
- surfaces Betting API failures explicitly instead of silently showing an empty tab;
- keeps Mispricing Intelligence clearly labelled observational with `model_effect_enabled=false`.

Repository source and API contracts are verified. The exact public GitHub Pages URL still cannot be fetched from the current tool environment (safe-URL/indexing restriction), so **do not call the browser runtime independently verified yet**. A push to `main` has occurred and the Pages workflow is configured to deploy it.

## 5. Historical team intelligence / Mispricing base

Production Mispricing objects include:
- `team_match_intelligence`;
- `fixture_intelligence_signals`;
- `team_intelligence_features`;
- `generate_observational_intelligence(gameweek)`.

New tables/views are hardened with RLS/service-role-only access where designed.

Current observational families:
- Recent Performance;
- Schedule / Fatigue.

The offseason-rest bug was corrected by appending a corrected observation; no historical signal was rewritten. No lambda/xPts effect has been enabled.

Historical adapters remain production-verified:
- Football-Data: 932 source matches parsed, 784 current-team historical rows, all 20 current teams, xG correctly NULL;
- Understat: 380 EPL source matches, 646 current-team xG rows, 17 teams; promoted teams without prior EPL xG remain missing, not zero;
- canonical reconciliation: 784 team-dates, 646 provider overlaps, 138 Football-Data-only promoted-team dates, zero duplicate source/match/team groups.

## 6. Protected ingestion path

`private.invoke_engine_ingest(p_function text, p_body jsonb)` remains the protected production wrapper.

Allowlist:
- `ingest-team-history`;
- `ingest-understat-xg`;
- `ingest-bookmaker-odds`.

It retrieves `FOOTBALL_ENGINE_ADMIN_TOKEN` internally from Vault and never returns the secret. EXECUTE is limited to postgres/service_role.

## 7. Bookmaker Layer 1 — PASSED

Primary provider: Odds-API.io.
Observed Correct Score bookmaker families: Bet365 and Unibet. `Bet365 (no latency)` remains a raw provider source but canonicalizes into the Bet365 family for counts.

Verified safeguards/fixes:
- deterministic event mapping by teams + kickoff;
- append-only raw snapshots;
- corrected normalizer and insert-error handling;
- corrected betting read schema/credentials;
- paged reads beyond PostgREST's 1,000-row default;
- current API uses latest valid pre-kickoff raw snapshot per fixture/bookmaker source;
- missing current markets are not silently backfilled from stale older snapshots;
- missing bookmaker data remains missing, never zero;
- zero post-kickoff raw, normalized or source-timestamp contamination in validated Layer-1 data.

## 8. Correct Score Layer 2 — de-vig / edge / EV

Production table: `betting_edge_observations`.
It is append-only, internal, chronology-aware, `research_classification='UNVALIDATED'`, `model_effect_enabled=false`.

Two independent de-vig methods:
- `proportional_offered_set`;
- `power_offered_set`.

Correct Score semantics:
- bookmaker fair probability is conditional on the bookmaker's actually offered exact-score set;
- model raw/unconditional probability is retained;
- model conditional probability is computed on the same offered set;
- `conditional_edge` compares conditional vs conditional;
- actual wager EV is `model_probability_raw * decimal_odds - 1`.

Consensus view: `correct_score_edge_consensus`.
Research labels such as `ROBUST_POSITIVE_EV` are organizational research statuses only, not recommendations.

The optimized snapshot-scoped generator is production-verified and prevents the earlier GW-wide timeout. Automatic ingestion can generate Layer-2 observations without invalidating Layer-1 success if Layer 2 fails.

## 9. Price history and CLV research

Price-history / CLV views are now production-applied and exposed by the betting API.

Important semantics:
- all raw bookmaker snapshots remain immutable;
- `first_observed` is explicitly **not claimed to be the true market open**;
- pre-kickoff current price is the latest valid observed price;
- after kickoff, the final valid observed price becomes a **closing proxy**, not an asserted exact market close;
- the exact seconds-before-kickoff gap is retained;
- CLV research is derived from frozen historical entry observations and the later closing proxy;
- it never rewrites the original edge observation.

For Newcastle vs Liverpool (match 9), the final database capture currently present is approximately **412 seconds before kickoff** for Bet365 and Unibet. The separately scheduled ~90-second capture did not appear in raw storage and must **not** be claimed as successful.

Post-kickoff validation for match 9:
- raw post-kickoff contamination: 0;
- normalized/source-timestamp post-kickoff contamination: 0;
- edge observations captured post-kickoff: 0;
- CLV research exists and remains `model_effect_enabled=false`.

## 10. Betting read API

Current deployed `betting-api`: **v9 ACTIVE**.

Verified HTTP behavior:
- status 200;
- `odds_status='connected'`;
- 10 GW1 fixtures;
- `research_edge_available=true`;
- `value_edge_available=false`;
- `price_tracking_available=true`;
- `clv_research_available=true`.

Per fixture it exposes latest valid odds, Correct Score rows, canonical bookmaker/source counts, frozen prediction, `edge_research`, `price_tracking` and `clv_research`.

The dashboard must consume this current schema rather than old `market_picks` fields.

## 11. Key repository commits from this production pass

- Dashboard audit/search fix: `6115f3307895b49c80067affcaacd03f9e3550e7`
- Betting ingestion edge hook: `c2d7ad2e71cd9e53d6530b895216f61791b1d870`
- Betting API research exposure / later price-CLV source evolution is present in current repo source.
- Price/CLV migration commit: `4ab8668451a5e519719665b906aada2b9ad3398b`
- Result sync source: `2ba9621b782950cc0e5e7c75ca9a5785631c697a`
- Result sync import map: `8b0f74a3ad9ed127c192f120fb247aa0d8cf156b`
- FPL API v8 source: `1c7b666c983ab287066876f601fe584eadb01fc7`
- FPL API import map: `9f21fe6609d8ec926d2dbbf13595968bc3b34fde`
- Dashboard fixture/betting render repair: `aab8189426c51716eae48a4a99443a7e600a7998`

Key migrations committed include:
- `20260823160500_mispricing_intelligence_v01.sql`
- `20260823160600_fix_tmi_upsert_index.sql`
- `20260823173500_correct_score_devig_edge_v01.sql`
- `20260823173600_correct_score_power_devig_v01.sql`
- `20260823173700_correct_score_edge_consensus_v01.sql`
- `20260823175100_optimize_correct_score_edge_generation_v01.sql`
- price-history/CLV migrations added later in the same pass.

## 12. Regression safeguards learned today

1. **Never determine whether a stored player-actual row is final using a newer live fixture state.** Finality must be evaluated against the result snapshot that produced the row.
2. Every result snapshot should persist its exact finished-fixture set.
3. Mutable factual results (`matches` score/finished) may be reconciled from official FPL; frozen predictions remain immutable.
4. Frontend/API field contracts must be treated as explicit interfaces. Backend schema evolution must include a dashboard contract check.
5. A healthy backend is not evidence that the webpage renders it; source/API/deployment/runtime are separate verification states.
6. Result polling every six hours is too stale for an in-progress GW. Current cadence is every 15 minutes with hash-idempotent writes.

## 13. Known security hardening item

Legacy/public tables still have overly broad anon/authenticated grants and/or RLS disabled. Do not blindly revoke them before mapping direct client dependencies. New Mispricing/Edge objects are already hardened.

Future security sequence:
1. map direct client table dependencies;
2. move writes behind trusted Edge Functions where needed;
3. reduce anon/authenticated grants;
4. enable/verify RLS without breaking the application.

## 14. Exact next-action queue

1. Have the user/browser confirm the newly deployed Pages UI; independently browser-verify when the tool environment can access the Pages endpoint.
2. Audit the first Newcastle-Liverpool CLV cohort by original research status, bookmaker, probability bucket, overround and de-vig agreement; do not promote recommendations yet.
3. Ensure result-sync source/config remains aligned with the 15-minute production cron and add a repository migration/config record for that cron change if desired.
4. Collect a larger forward pre-kickoff odds/edge/CLV sample across fixtures and GWs.
5. Add/validate a third Correct Score source.
6. Continue observational Mispricing Intelligence with expected-XI / availability, injuries/suspensions, replacement quality and tactical signal families.
7. Only after forward validation define NO BET / WATCH / EDGE / STRONG EDGE thresholds.
8. Map legacy client access and harden RLS/grants safely.

## 15. Operational instruction for future conversations

When resuming:
1. read this file and `DECISIONS_AND_HISTORY.md`;
2. inspect current GitHub and Supabase state independently;
3. preserve frozen forecasts and append-only historical observations;
4. never commit secrets;
5. distinguish planned / coded / committed / deployed / executed / verified;
6. continue from the first unresolved queue item unless live production state has advanced.
