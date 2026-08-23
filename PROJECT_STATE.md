# Football Intelligence Engine — Project State

_Last updated: 2026-08-23_

## 1. Purpose

Build a continuously learning football intelligence engine serving two linked use cases:

1. **Fantasy Premier League (FPL)** — optimize the full 15-man squad, XI, bench order, captain and vice-captain across an entire season.
2. **Betting intelligence** — identify mispriced markets, especially **Correct Score**, by combining baseline probabilities with information and matchup factors that may not yet be fully priced by bookmakers.

The engine is not intended to imitate a bookmaker. Its edge should come from systematically processing more relevant evidence, interactions and updates than a human can reliably process at scale.

---

## 2. Core principles / non-negotiable rules

### FPL
- Always evaluate the **full 15-man squad** before XI, bench, captain or vice decisions.
- For every player model: xMins, xPts, P(blank), P(5+), P(10+), P(15+), P(20+).
- Include **Defensive Contributions (DC)** in expected-points and haul models.
- Captaincy uses a dedicated **Captaincy Haul Model**, not mean xPts alone.
- High-upside bench players must be considered for promotion into the XI.
- Do not anchor to a prior XI or prior recommendation.
- Historical forecasts are **frozen** and never rewritten after kickoff/results. Improved models may create shadow reruns for research, but never overwrite the original decision-state forecast.

### Betting
- Every fixture forecast is timestamped and append-only.
- A fixture is **hard-frozen at kickoff**. No post-kickoff information may alter the pre-match forecast.
- Distinguish:
  - **Probability pick** = our most likely outcome.
  - **Value bet** = our probability materially exceeds de-vigged bookmaker probability at an available price.
- Raw odds must be stored with bookmaker, market, selection, price and timestamp.
- Evidence must record **when we knew it** to prevent hindsight contamination.
- Long-term evaluation must include **Closing Line Value (CLV)**, not just win rate.
- Mispricing signals must start observationally. Do **not** let them alter team lambda / probabilities until validated.

---

## 3. FPL model evolution

### v0.1.1
Initial simulation engine. Main defect discovered: elite/easy fixtures were overly compressed toward league average by the fixture-strength transform.

### v0.1.2
Fixture-strength calibration changed from over-compressed geometric/square-root treatment toward normalized multiplicative matchup strength.

Same frozen GW1 XI changed from roughly **42.92 xPts** under v0.1.1 to roughly **46.50 xPts** under v0.1.2, versus an external benchmark consensus around **47.96** for the same XI.

### v0.1.2b
Added/improved:
- conditional starter minutes
- player-specific P(start) evidence
- explicit penalty-event treatment
- latent BPS-style bonus simulation
- opponent-adjusted DC workload

Benchmark improved approximately:
- MAE: **0.769 → 0.599**
- bias: **-0.378 → -0.090**
- correlation: **0.743 → 0.751**

### v0.1.3
Added **Player Role Intelligence** so strong current-role evidence can override stale/injury-distorted historical priors.

Key examples:
- Bruno historical/role assumptions were too conservative.
- Isak was heavily distorted by a low-minute injury season sample.

Shadow benchmark improved approximately:
- MAE: **0.599 → 0.572**
- correlation: **0.751 → 0.767**
- bias: **-0.090 → -0.077**

GW1 v0.1.3 shadow figures discussed:
- 15-man squad xPts: **59.68**
- frozen GW1 XI under v0.1.3 shadow: **50.64**
- best legal XI under v0.1.3: **51.45**
- best XI + captain doubling: **57.26**

Historical GW1 forecast remains frozen; these are shadow/research values.

---

## 4. Projection benchmarking architecture

External projections are used as **calibration references**, not truth.

Current benchmark concept includes:
- Solio Analytics (used in Opta Analyst FPL work)
- KnightManagers

Important rule: never apply a blanket uplift merely because an external source is higher. Source disagreement must be tracked. Example: Tzolis showed large disagreement from only one source, so the model should not automatically calibrate downward.

Permanent modules created conceptually/previously in Supabase:
- projection benchmark storage
- disagreement monitor
- player role intelligence

---

## 5. Dashboard current state

Repository: `ElDon-Hanzy/football-intelligence-engine`

Main page: `index.html`

Current tabs:
- **Overview**
- **Betting**
- **All Predictions vs Actuals**

Overview currently includes:
- frozen XI xPts
- frozen squad xPts
- captain / vice
- current model version
- top 10 double-digit-return candidates across league
- squad prediction vs actual
- frozen bench
- 2 Correct Score recommendation cards when fixture data is available

Player detail modal includes projection metrics and actuals.

Fixture detail modal includes predicted xG/lambdas, top correct scores, bookmaker correct-score prices when present, confidence and frozen/pre-kickoff status.

### Audit / actual-vs-prediction logic
The intended current rule is:

`acceptable_downside_tolerance = max(1, round(0.20 * xPts))`

Use normal whole-point rounding, with `.5` rounded upward.

- Any actual result **above prediction is green**.
- Actual below prediction is still green if within the tolerance.
- Red only when actual materially underperforms by more than tolerance.

Examples:
- 4.88 predicted, 9 actual → green
- 4.88 predicted, 4 actual → green
- 4.88 predicted, 3 actual → red
- 7.50 predicted → tolerance 2 points

### Pending dashboard patch
The repo's current `index.html` still contains the older rule:

`max(2, 30% of xPts)`

and the Audit page currently paginates 20 rows but **search is missing**.

Pending UI actions:
1. Change tolerance system-wide to `max(1, round(20% of xPts))`.
2. Restore search above **All Predictions vs Actuals**.
3. Search must filter the full GW dataset first, then paginate filtered rows at 20/page.
4. Reset Audit page to page 1 whenever search changes.
5. Missing betting data must show `—` / `No data`, never numerical zero unless the actual modeled/measured value is truly zero.

---

## 6. Betting / fixture model architecture

Fixture-level model should output:
- home lambda / away lambda
- full correct-score probability matrix
- top scorelines
- 1X2
- BTTS
- O/U 2.5
- clean-sheet probabilities
- confidence

A forecast state is append-only and may update pre-kickoff when new evidence arrives.

Clicking a fixture/score should eventually show **forecast evolution and attribution**, e.g.:
- previous probability
- new probability
- lambda change
- evidence that caused change
- timestamp
- bookmaker movement

### Correct Score philosophy
Example target behavior:
If Coventry scoring probability is very small and Arsenal expected goals are high, the engine should rank scores such as 2-0 / 3-0 by actual modeled probability, then compare those probabilities against market prices to identify value.

---

## 7. Bookmaker Layer 1

Primary provider selected for direct correct-score prices: **Odds-API.io**.

A live test previously confirmed actual Correct Score markets from:
- Bet365
- Unibet

Example live payloads contained many markets and explicit score selections.

Provider API secret is stored outside this repository / should remain in Supabase Vault. **Never commit secrets to GitHub.**

Layer 1 design:
- provider event mapping
- deterministic team aliases
- match by teams + kickoff, not weak fuzzy names alone
- raw append-only odds snapshots
- normalized market / selection / decimal odds records
- bookmaker timestamp retention
- post-kickoff ingestion rejection
- ingestion health reporting / unmatched fixtures

### Layer 1 status
Code was deployed/iterated previously, but full GW1 verification was blocked by an unstable ChatGPT-Supabase connector runtime.

**Pending verification:**
1. Run v2 ingestion against all still-valid/pre-kickoff target fixtures (for historical testing use only data that was genuinely available pre-kickoff).
2. Verify event-match count.
3. Verify normalized odds count by bookmaker / market.
4. Verify Correct Score selections.
5. Verify no post-kickoff contamination.
6. Expose raw bookmaker odds cleanly on Betting tab.

No de-vig / EV / edge logic should be promoted until Layer 1 is verified.

---

## 8. Mispricing Intelligence v0.1

Goal: large-scale version of human value-bet research.

Future signal families include:
- recent underlying form
- home/away splits
- manager / tactics / formation
- injuries / suspensions / expected XI
- replacement-player quality
- fatigue / rest / congestion
- European/cup schedule and priority
- travel
- pressing / buildup mismatch
- high line vs pace
- wing-channel mismatch
- central progression mismatch
- aerial/set-piece mismatch
- goalkeeper shot-stopping
- weather / pitch where material

### First two families approved
1. **Recent Performance**
2. **Schedule / Fatigue**

Both remain observational only (`model_effect_enabled=false`) until validated.

---

## 9. Pending SQL migration already in repository

File:
`sql/mispricing_intelligence_v01.sql`

It defines:
- `team_match_intelligence`
- `fixture_intelligence_signals`
- `team_intelligence_features` view
- `generate_observational_intelligence(gameweek)` function

Recent Performance features include last-5/10 xG/xGA and supporting fields.
Schedule/Fatigue includes rest days and 7/14-day congestion counts.

### Important implementation note
The generator currently inserts Recent Performance and Schedule/Fatigue signal snapshots append-only and keeps model effects disabled.

### Pending action
Apply this SQL to Supabase and validate against current schema before promoting.

---

## 10. Historical data adapters already in repository

### A. Team history adapter
`supabase/functions/ingest-team-history/index.ts`

First structured source: Football-Data.co.uk.

Purpose:
- historical fixture dates
- home/away context
- goals
- shots
- raw source record
- provenance
- source-independent normalization

xG is intentionally not fabricated if absent.

### B. xG adapter
`supabase/functions/ingest-understat-xg/index.ts`

Primary idea: Understat-style free xG ingestion with schema validation / fallback handling.

Purpose:
- populate xG/xGA into historical team-match intelligence
- reject impossible values / bad dates
- normalize team aliases
- report unmatched teams
- preserve source provenance

### Pending actions
1. Apply mispricing SQL migration.
2. Deploy both ingestion functions to Supabase.
3. Run historical team ingestion.
4. Run xG ingestion.
5. Validate row counts, team mapping, date coverage and duplicate behavior.
6. Generate observational signals for target GW.
7. Inspect signal distributions manually before allowing any model effect.

---

## 11. Correct-score / market edge roadmap after Layer 1

Once odds ingestion is verified:

1. **De-vig** bookmaker probabilities.
2. Compare model fair probability vs market fair probability.
3. Compute edge and EV.
4. Add recommendation states:
   - NO BET
   - WATCH
   - EDGE
   - STRONG EDGE
5. Add price history / opening / current / closing line.
6. Add CLV audit after matches.
7. Only later allow validated mispricing intelligence signals to adjust team lambdas / score distributions.

---

## 12. Important rejected / avoided approaches

- Do **not** simply multiply all xPts upward to match external models.
- Do **not** calibrate a player down because one external model disagrees.
- Do **not** rewrite frozen historical forecasts after seeing outcomes.
- Do **not** treat positive FPL prediction error as failure; unexpected upside is acceptable/positive for selection purposes.
- Do **not** display missing data as `0`.
- Do **not** let raw mispricing signals alter probabilities before validation.
- Do **not** claim a market edge before bookmaker odds are ingested and de-vigged.
- Do **not** use H2H blindly; only when tactically/contextually relevant.
- Do **not** rely on simple last-5 W/D/L as form; prioritize underlying performance.

---

## 13. Known runtime/tool issue

A very long prior ChatGPT conversation developed a stale Supabase connector/runtime bug:
- tool discovery showed `execute_sql`
- invocation then disabled/faulted the connector

A fresh/branched conversation initially proved live SQL execution successfully with `select now()` on project `knooiwezzsxcwhtjtdap`.

However, connector instability should still be treated cautiously. If Supabase tools fail after discovery, test the same harmless SQL in a fresh conversation before assuming the database/project is broken.

---

## 14. Exact next-action queue

### Immediate
1. Patch dashboard tolerance + restore Audit search.
2. Apply `sql/mispricing_intelligence_v01.sql` to Supabase.
3. Deploy `ingest-team-history`.
4. Deploy `ingest-understat-xg`.
5. Run/validate both adapters.
6. Generate Recent Performance + Schedule/Fatigue signals.
7. Inspect signal quality and data coverage.
8. Finish Layer 1 bookmaker ingestion verification.
9. Only after Layer 1 passes: implement de-vig / edge / EV.

### Then
10. Squad availability / expected-XI intelligence.
11. Tactical / formation intelligence.
12. Matchup intelligence, especially attack-channel interactions.
13. Forecast-change attribution UI.
14. Closing-line / post-match learning loop.

---

## 15. Operational instruction for future ChatGPT conversations

When resuming work:

1. Read this file first.
2. Inspect current GitHub and Supabase state; do not blindly assume this document is still current.
3. Preserve frozen historical predictions and append-only data.
4. Never commit API keys, database passwords or secrets.
5. Continue from the first unresolved item in **Exact next-action queue**, unless newer verified state supersedes it.
