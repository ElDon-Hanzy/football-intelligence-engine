# Football Intelligence Engine — Project State

_Last updated: 2026-08-23_

## 1. Purpose

Build a continuously learning football intelligence engine for two linked use cases:

1. **FPL** — optimize the full 15-man squad, XI, bench order, captain and vice-captain across the season.
2. **Betting intelligence** — identify market mispricing, especially **Correct Score**, by comparing frozen/timestamped model probabilities against genuinely available pre-kickoff bookmaker prices.

The objective is not to imitate a bookmaker. The desired edge is better evidence processing, contextual intelligence, disciplined probability comparison and long-run validation.

---

## 2. Non-negotiable rules

### Forecast integrity
- Historical FPL and betting forecasts are append-only.
- Never rewrite a forecast after the result is known.
- Fixture/model intelligence may update only pre-kickoff and **hard-freezes at kickoff**.
- Research/shadow reruns after kickoff must be explicitly labelled and never replace the original decision-state forecast.
- Evidence must carry captured/known-at timestamps.

### Data integrity
- Missing data is not zero.
- Never fabricate unavailable xG or bookmaker prices.
- Preserve raw source records and provenance.
- Canonical feature calculations must not double-count the same real match from multiple historical providers.
- Never commit secrets/API keys.

### Mispricing intelligence
- New signal families begin observationally with `model_effect_enabled=false`.
- No signal may alter lambdas/xPts until validated out of sample.
- A high-probability outcome is not automatically a value bet.
- Long-run betting evaluation must include Closing Line Value (CLV), not only hit rate.

---

## 3. FPL model state

Model evolution remains:
- v0.1.1 — initial engine; fixture-strength compression defect identified.
- v0.1.2 — multiplicative matchup-strength recalibration.
- v0.1.2b — starter minutes, P(start), penalty event treatment, latent BPS/bonus simulation, opponent-adjusted DC.
- v0.1.3 — Player Role Intelligence to override stale/injury-distorted priors when strong current-role evidence exists.

Historical GW1 forecast remains frozen. Newer model versions may be evaluated as shadow research only.

Permanent weekly rules:
- project all 15 players;
- xMins, xPts, P(blank), P(5+), P(10+), P(15+), P(20+);
- include Defensive Contributions;
- use Captaincy Haul Model rather than mean xPts alone;
- anti-anchor to previous XI/bench/captain.

---

## 4. Dashboard state

Repository: `ElDon-Hanzy/football-intelligence-engine`
Main page: `index.html`
GitHub Pages is enabled and the repository contains a Pages deployment workflow.

### Coded + committed
Dashboard patch commit:
`6115f3307895b49c80067affcaacd03f9e3550e7`

Implemented:
- audit downside tolerance = `max(1, roundHalfUp(0.20 * xPts))`;
- `.5` rounds upward;
- unexpected upside remains green;
- restored search on **All Predictions vs Actuals**;
- search filters the complete GW dataset before 20-row pagination;
- search change resets to page 1;
- missing betting values render `—` / `No data`, never fake zero.

### Verification status
- Repository source: verified.
- Pages workflow: present; repository reports `has_pages=true`.
- Independent browser/runtime fetch of the Pages URL is still pending because the current tool environment could not resolve/fetch the Pages endpoint directly.

Do not describe the dashboard patch as browser-verified until that final check is completed.

---

## 5. Mispricing Intelligence v0.1 — production state

### Production migration
Applied successfully.

Objects include:
- `team_match_intelligence`
- `fixture_intelligence_signals`
- `team_intelligence_features`
- `generate_observational_intelligence(gameweek)`

Security was hardened beyond the original draft:
- RLS enabled on new internal tables;
- anon/authenticated access revoked;
- service-role access only;
- `security_invoker` view;
- generator restricted to service role.

### Kickoff protection
The signal generator was patched to operate only while `kickoff_time > now()`.
No new fixture-intelligence snapshot may be generated after kickoff.

### First signal families
- Recent Performance
- Schedule / Fatigue

Both remain observational:
`model_effect_enabled=false`

A live evidence-quality inspection found that an offseason gap of ~91 days was being treated as positive rest. This was corrected so very long/offseason gaps are neutral. The earlier observational snapshot was preserved; a corrected snapshot was appended rather than rewriting history.

No lambda/xPts changes have been made from these signals.

---

## 6. Historical team intelligence — production verified

### `ingest-team-history`
- committed
- deployed ACTIVE
- protected by Vault-backed internal engine token
- unauthorized request verified as 401
- executed successfully
- idempotency verified

Football-Data coverage:
- 932 source matches parsed
  - 380 EPL
  - 552 Championship
- 784 current-team historical rows
  - 646 EPL-side rows
  - 138 Championship-side rows
- all 20 current Premier League teams covered
- shots coverage: 784 rows
- xG remains NULL because the source does not provide it

Promotion/relegation identity logic was corrected: a historical match is no longer discarded merely because the opponent is not in the current 20-team dimension. Each current team side is ingested independently.

### `ingest-understat-xg`
- committed
- deployed ACTIVE
- executed successfully
- idempotency verified

Understat coverage:
- 380 source EPL matches
- 646 current-team xG rows
- 17 current teams covered
- Coventry, Hull and Ipswich correctly have no prior-season EPL Understat xG rather than fabricated zero
- invalid xG rows accepted: 0

### Canonical duplicate handling
Current production reconciliation:
- 784 canonical team-dates
- 646 team-dates overlap Football-Data + Understat
- 138 Football-Data-only promoted-club team-dates
- current source/match/team duplicate groups: 0

The earlier intermediate count of 786 canonical dates / two possible date mismatches is stale and is not present in current production state.

---

## 7. Protected backend invocation

Supabase contains:
`private.invoke_engine_ingest(p_function text, p_body jsonb)`

Properties:
- `SECURITY DEFINER`
- allowed function slugs limited to:
  - `ingest-team-history`
  - `ingest-understat-xg`
  - `ingest-bookmaker-odds`
- retrieves `FOOTBALL_ENGINE_ADMIN_TOKEN` internally from Vault
- token is never returned to the caller
- EXECUTE granted only to postgres/service_role

Use this wrapper for controlled production ingestion from SQL tooling. Never expose the token in chat, source control or ad-hoc outbound SQL headers.

---

## 8. Bookmaker Layer 1 — PASSED

Primary provider: Odds-API.io.
Current directly observed Correct Score bookmaker families include Bet365 and Unibet.

### Defects found and fixed
1. The deployed normalizer inserted obsolete column names and silently ignored insert errors. Raw snapshots existed but normalized rows were zero.
2. `betting-api` queried obsolete normalized columns and could therefore show no data despite valid storage.
3. `betting-api` preferred a stale service-role credential that produced a misleading `JWT issued at future` error. It now follows the working `fpl-api` credential path.
4. The read API hit PostgREST's default 1,000-row limit and under-counted odds. It now pages the complete normalized dataset.
5. Read semantics now use the **latest valid pre-kickoff raw snapshot per fixture/bookmaker source**; older snapshots cannot silently fill a market that disappeared later.
6. `Bet365 (no latency)` remains preserved as a distinct provider source but canonicalizes to the Bet365 bookmaker family for bookmaker counts.

### Historical normalization
- immutable pre-kickoff raw snapshots normalized successfully;
- rerun produced 0 new rows (idempotent).

### Live Layer-1 execution
For the still-valid GW1 fixtures at execution time:
- Newcastle United vs Liverpool
- Fulham vs Chelsea

Provider-event mapping was exact by teams + kickoff.
Correct Score was captured from:
- Newcastle–Liverpool: Bet365 + Unibet
- Fulham–Chelsea: Bet365; Unibet returned explicit `NO_DATA`

Missing Unibet data is preserved as missing, never zero.

### Final Layer-1 contamination invariants
Verified zero:
- raw snapshots captured at/after kickoff
- normalized captures at/after kickoff
- bookmaker source timestamps at/after kickoff

### `betting-api`
Current deployed version: **v7 ACTIVE**.

It returns:
- complete paged latest odds;
- Correct Score rows;
- canonical bookmaker count;
- provider-source count;
- market count;
- raw bookmaker source names;
- null for genuine missing data;
- frozen status.

Layer 1 is considered **PASSED** on storage, normalization, event mapping, read API, Correct Score coverage and kickoff contamination protection.

---

## 9. Correct Score Layer 2 — de-vig / edge / EV

Layer 2 began only after Layer 1 passed.
It remains **research-only** and does not alter fixture probabilities.

### Storage
Production table:
`betting_edge_observations`

Properties:
- append-only observations tied to raw odds selection + model snapshot;
- RLS enabled;
- anon/authenticated revoked;
- service-role only;
- chronology stored explicitly;
- `research_classification='UNVALIDATED'`;
- `model_effect_enabled=false`.

### Chronology
For a valid edge observation:
- odds snapshot must be pre-kickoff;
- bookmaker source timestamp must be pre-kickoff;
- model prediction snapshot must have existed at or before the odds snapshot;
- model snapshot must itself be pre-kickoff;
- generator refuses newly generated observations after fixture kickoff.

### Correct Score market-scope treatment
Correct Score books may omit extreme scorelines. Therefore two probabilities are stored separately:

1. **Bookmaker fair probability conditional on the bookmaker's offered exact-score set**.
2. **Model probability**:
   - raw/unconditional probability from the model score matrix;
   - conditional model probability on the same bookmaker-offered set.

`conditional_edge` compares like-for-like conditional probabilities.

Actual bet EV uses the model's raw/unconditional probability:

`EV = model_probability * decimal_odds - 1`

This prevents omitted bookmaker scorelines from falsely inflating actual EV.

### De-vig methods
Two methods are stored independently:
- `proportional_offered_set`
- `power_offered_set`

Power de-vig was added because Correct Score is a high-margin many-outcome market where proportional de-vig can retain favorite/longshot bias.

A research edge is considered method-robust only when its sign survives both methods.

### Consensus view
Production view:
`correct_score_edge_consensus`

Research statuses:
- `ROBUST_POSITIVE_EV`
- `POSITIVE_EV_METHOD_SENSITIVE`
- `DEVIG_EDGE_BUT_NEGATIVE_EV`
- `NO_POSITIVE_EV`

These are **research statuses, not betting recommendations**.
Do not yet map them to NO BET / WATCH / EDGE / STRONG EDGE.

Evidence quality currently considers:
- both de-vig methods available;
- model mass covered by offered score set;
- bookmaker overround.

### Generator performance defect and fix
The first automatic post-ingestion edge call timed out. Layer 1 correctly stayed successful and surfaced the edge failure separately.

Root issue: the GW-wide generator repeated expensive power calculations and processed more scope than necessary.

Fix:
- `generate_correct_score_edge_observations_for_snapshots(bigint[])`
- materialized intermediate sets;
- solve the power exponent once per bookmaker snapshot;
- GW wrapper selects only snapshots missing edge observations.

Optimized migration commit:
`a62d4925f930b9a6ecae7ec951802352cd7daf64`

### Verified live automatic execution
Latest production odds ingestion run at verification:
- run id: 5
- raw snapshots: 5
- normalized selections: 1,684
- edge generation: **success**
- edge rows: 228
  - 114 proportional
  - 114 power
- bad chronology: 0
- model-effect rows: 0
- raw post-kickoff: 0
- normalized/source-timestamp post-kickoff: 0

The exact-snapshot generator rerun inserted **0**, proving idempotency.

### Current research observations
Latest snapshots showed several positive-EV Correct Score observations robust to both de-vig methods. Examples include Bet365 scorelines in Newcastle–Liverpool and Fulham–Chelsea.

Important: these are **not recommendations**. Sample size, model calibration and CLV validation are not yet sufficient to promote them.

---

## 10. Betting read API — research edge exposure

`betting-api` v7 exposes research edges without promoting them:

Top-level:
- `research_edge_available=true/false`
- `value_edge_available=false`

Per fixture:
`edge_research` includes:
- `status: 'UNVALIDATED'`
- `model_effect_enabled:false`
- observation count
- robust-positive-EV count
- top research observations

This separation is deliberate. Dashboard/API consumers must not interpret research observations as final bet signals.

Commit:
`3a29d88595e83e5b6e7cb0bd1865b5eda74dccb1`

---

## 11. Repository migrations added during this production pass

Key migration files now include:
- `20260823160500_mispricing_intelligence_v01.sql`
- `20260823160600_fix_tmi_upsert_index.sql`
- `20260823173500_correct_score_devig_edge_v01.sql`
- `20260823173600_correct_score_power_devig_v01.sql`
- `20260823173700_correct_score_edge_consensus_v01.sql`
- `20260823175100_optimize_correct_score_edge_generation_v01.sql`

Do not assume repository migration presence alone means production application; the items above were also applied and verified during this production session.

---

## 12. Known security hardening item

Live inspection found legacy/public tables with overly broad anon/authenticated DML grants and/or RLS disabled, including bookmaker/prediction tables.

This is a real security concern but **has not been silently changed** because current dashboard/API dependencies must be mapped before revoking access.

New Mispricing and Edge tables are already internal/hardened.

Next security work should:
1. identify every direct client-side table dependency;
2. move writes behind trusted Edge Functions where appropriate;
3. reduce anon/authenticated privileges;
4. enable/verify RLS without breaking the dashboard.

---

## 13. Current betting roadmap

### Completed
1. Layer 1 raw bookmaker ingestion.
2. Deterministic event mapping.
3. Correct Score normalization.
4. Kickoff contamination protection.
5. Read-side bookmaker/market counts.
6. Proportional de-vig.
7. Power de-vig.
8. Model-vs-market conditional edge.
9. Unconditional model EV.
10. Multi-method research consensus.
11. Automatic edge generation after live odds ingestion.

### Not yet promoted
Do **not** yet create live recommendation states:
- NO BET
- WATCH
- EDGE
- STRONG EDGE

Those require validation first.

### Next executable betting work
1. Build explicit opening/current/closing price history semantics from append-only raw snapshots.
2. Add Closing Line Value storage/audit.
3. Track price movement for each bookmaker/market/selection.
4. Collect a larger pre-kickoff sample across fixtures/gameweeks.
5. Validate model calibration and research-edge buckets out of sample.
6. Measure whether robust-positive-EV observations beat the closing line.
7. Add a third independent Correct Score source for robustness where feasible.
8. Only then define recommendation thresholds.

---

## 14. Next Mispricing Intelligence work

After the observational Recent Performance + Schedule/Fatigue base:
1. current-season evidence refresh after completed fixtures;
2. expected-XI / availability intelligence;
3. injuries/suspensions and replacement quality;
4. tactics / formation;
5. attack-channel matchup interactions;
6. European/cup priority, travel and congestion;
7. forecast-change attribution.

Every new family remains `model_effect_enabled=false` until validated.

---

## 15. Exact next-action queue

1. Verify GitHub Pages dashboard in a real browser/runtime when the endpoint is accessible; repository code/workflow are already verified.
2. Implement append-only bookmaker price-history semantics: opening/current/closing.
3. Add CLV audit tables/functions without rewriting historical odds.
4. Validate research edge distributions by bookmaker, scoreline probability bucket, overround and de-vig-method agreement.
5. Collect enough forward pre-kickoff samples before defining betting recommendation labels.
6. Add/validate a third Correct Score source.
7. Continue Mispricing Intelligence with expected-XI/availability and tactical signal families.
8. Map legacy direct table access and then harden RLS/grants safely.

---

## 16. Operational instruction for future conversations

When resuming:
1. Read this file and `DECISIONS_AND_HISTORY.md`.
2. Inspect current GitHub and Supabase state independently; do not blindly trust the handover.
3. Preserve frozen forecasts and append-only historical data.
4. Never commit secrets.
5. Distinguish planned / coded / committed / deployed / executed / verified.
6. Continue from the first unresolved item in the exact queue unless live state has advanced.
