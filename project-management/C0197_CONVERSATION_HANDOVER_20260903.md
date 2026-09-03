# C0197 Conversation Handover — 2026-09-03

Repository: `ElDon-Hanzy/football-intelligence-engine`
Supabase project: `knooiwezzsxcwhtjtdap`

## Immediate instruction for the next conversation

Before any implementation or FPL recommendation:
1. Read `PROJECT_STATE.md`.
2. Read `DECISIONS_AND_HISTORY.md`.
3. Read this handover file.
4. Query `public.change_tracker_working` for C0194–C0198 and all Open/In Progress items.
5. Run `private.audit_change_tracker_governance_v01()`.
6. Independently inspect current GitHub/Supabase production state rather than trusting this handover blindly.
7. Do not touch C0176 root cutover without explicit user approval.

---

## 1. Verified UI state before the latest C0196 patch

C0194 and C0195 are Completed / Verified.

### C0194
Historical FPL pages use preserved frozen decision snapshots rather than reconstructing old manager plans. Actual manager actions remain separate overlays and never rewrite the frozen model decision.

Performance no longer exposes internal `A0005` jargon in the human summary.

### C0195
Finished-event prediction settlement is now a global UI invariant:

> Any settleable prediction shown for a finished event must show an accessible green ✓ if correct or red × if wrong. Unfinished/unsettled events show no verdict.

Shared settlement logic covers:
- 1X2
- exact score
- O/U 2.5
- BTTS

It is already used by Fixtures and Betting/Markets.

Verified workflow before the new C0196 work: `33695133581` on documentation closure commit `a5d17d1e05700e3b1c6a62710d36cb2f37c90455`.
Tracker governance after closure: 122 rows, 53 decision rows, zero violations.

Permanent closure record:
`project-management/C0194_C0195_UI_AUDIT_CLOSURE_20260903.md`

---

## 2. C0196 — score-call display + exact-score/tail audit

Status: In Progress / Executing.

### User observation
GW2 matchup modal showed no Score Call / probability. User also questioned whether the score model was biased toward ~3 total goals and whether it failed to identify high-scoring matches despite two 7-goal games in GW2.

### Confirmed GW2 UI defect
The frozen GW2 prediction data already contains raw exact-score mode/probability, but older snapshots predate the newer `headline_score` / `headline_score_probability` fields.

The modal previously read only the headline fields and therefore rendered:
- Score call: `—`
- Probability unavailable

The correct fallback chain should be:
- score: `headline_score ?? raw_modal_score ?? top_scorelines[0].score`
- probability: `headline_score_probability ?? raw_modal_probability ?? top_scorelines[0].prob`

Code commit implementing the fallback:
`d64f9887680b8d2d30de1d9a6cd5081d561c47cc`

Regression-test commit:
`cca791db871b2c284595d73894d6aac4573ef51e`

### Current CI blocker — not deployed yet
Workflow run: `33698394585`
Job: `100472303832`

Typecheck: passed
Unit tests: 20/20 passed
Build: passed
Bundle budget: passed
E2E: failed
Deployment: skipped

Exact failure occurs on all four viewports in:
`tests/fixtures.spec.ts:160` — `historical matchup modal falls back to preserved raw exact-score data when headline fields are absent`

The modal successfully shows `1-2`, but the test expects exact text:
`9.14% exact-score probability`
which is not found. The likely issue is formatting/expected rounding, not missing product data. Inspect the rendered string / `precisePercent()` behavior and fix the deterministic assertion rather than weakening the product fallback.

Do not mark C0196 verified until a strict workflow reaches Pages deploy + live root and `/v2/` integrity checks.

### Exact-score selector audit findings
The underlying raw independent-Poisson mode is NOT generally biased toward 3-goal scorelines.

Frozen score distributions:
- GW1: raw 3-goal mode 12.5%; displayed/headline 12.5%
- GW2: raw 20%; displayed 20%
- GW3: raw 10%; displayed 50%
- GW4: raw 10%; displayed 40%
- GW5: raw 10%; displayed 10%

The GW3/GW4 distortion comes from `MATCH_SCRIPT_OVERRIDE_TIGHT_CELL`, which can replace a 1-1 raw modal cell with a nearby directional 2-1 / 1-2 score when aggregated 1X2 strongly favours one side and the cell probability gap is small.

Eight inspected GW3/GW4 overrides were identified; seven became 2-1 or 1-2. This is a real headline-selection bias, not a raw Poisson bias.

Do NOT alter production from this small sample. C0196 acceptance now explicitly requires selector audit and tail calibration before any model change.

### Tail audit findings
Across frozen GW1–GW2 fixtures:
- actual 4+ goal matches: 7 vs model expected 6.26
- actual 5+: 4 vs expected 3.31
- actual 6+: 2 vs expected 1.52
- actual 7+: 2 vs expected 0.63

GW2 alone:
- two 7+ goal matches vs expected 0.36
- model-implied probability of >=2 such matches that GW ≈ 4.7%

Across both GWs probability of >=2 such 7+ matches ≈ 12.7%.

Conclusion:
- no clear evidence that the model suppresses 4+ totals overall;
- extreme tail may be under-dispersed and deserves monitoring;
- a single modal score is a poor diagnostic of high-scoring risk.

The two GW2 seven-goal games had roughly:
- Chelsea–Brighton: P(7+) ≈ 4.0%; exact 4-3 ≈ 0.72%
- Man Utd–Ipswich: P(7+) ≈ 4.36%; exact 5-2 ≈ 0.85%

---

## 3. C0197 — approved research plan

Status: Open / Planned.
Title: `High-score chaos + SOT divergence + scorer concentration model`
Depends on: C0196
Model effect: None / research-only until validated.

User approved the plan and added one required feature:
**Big Chances Missed** must be included in the core data/feature set.

### Approved scope
C0197 is one integrated research stack with three selected components:

### A. Football Chaos Model
Predict match-level tail probabilities rather than one total-goals regression:
- P(4+ goals)
- P(5+)
- P(6+)
- P(7+)

Core candidate signals include:
- summed baseline λ / xG
- xG / xGA
- shots / shots allowed
- SOT / SOT allowed
- big chances created / conceded
- **big chances missed**
- xGOT / post-shot quality where obtainable
- goalkeeper quality
- clean-sheet / failed-to-score tendency
- home/away splits
- current-season process
- tactical matchup / transition vulnerability
- pressing vs press resistance
- defensive personnel continuity / absences
- physical load / congestion
- scorer concentration

Important interaction terms should be explicitly tested, e.g.:
- strong attack × weak transition defence
- high expected SOT × weak goalkeeper
- both teams attack well × both protect transitions poorly
- scorer concentration × weak opponent defence
- attacking fullbacks × opponent transition threat

Do not assume these effects; validate them with chronology-safe walk-forward tests.

### B. Expected SOT vs xG divergence
Build independent expected team SOT estimates rather than deriving SOT mechanically from xG.

Required outputs:
- expected home SOT
- expected away SOT
- expected total SOT
- expected SOT minus SOT implied by xG
- SOT/xG and xG/SOT style divergence features

Hypothesis:
Fixtures with similar xG but unusually high expected SOT may have fatter finishing/goalkeeper-variance tails.

Bookmaker SOT totals may be used as an independent benchmark/research feature, but the deferred full market-tail model must not be silently folded into C0197.

### C. Scorer Concentration Model
This is strategically important for both exact-score tail shape and FPL captain/vice-captain/haul modelling.

Estimate pre-match player share of team scoring intensity and derive:
- top scorer share
- top-two scorer share
- HHI / concentration
- scoring entropy
- P(player scores)
- P(player scores 2+)
- P(player scores 3+)

Core player inputs:
- expected minutes / start probability
- xG90
- shots90 / SOT90
- big chances
- **big chances missed**
- penalties
- position / tactical role
- predicted XI
- recent role changes
- opponent matchup
- finishing/post-shot indicators if available

Future FPL integration targets:
- P(goal)
- P(10+)
- P(15+)
- P(20+)
- captaincy haul probabilities

Do not activate in production FPL until it passes its own validation gate.

### Proposed modelling order
1. chronology-safe data foundation
2. scorer concentration
3. expected SOT model
4. Football Chaos classifier / ordinal tail model
5. shared-chaos / overdispersed joint exact-score distribution
6. shadow FPL integration
7. walk-forward ablation and promotion decision

Candidate final distribution concept:
retain existing team-strength means but allow a latent shared match-tempo/chaos variable, e.g. Gamma-Poisson / Negative-Binomial style mixture, so high-event fixtures receive fatter correlated score tails without ad-hoc 4-3 forcing.

### Validation requirements
Compare at least:
- current independent Poisson
- current headline selector
- Chaos-only
- Chaos + SOT divergence
- Chaos + SOT + scorer concentration

Primary evaluation:
- P4+/P5+/P6+/P7+ calibration
- exact-score log loss
- ranked probability score
- top-3/top-5 scoreline capture
- high-score recall/precision
- player goal/brace/hat-trick calibration
- FPL P10+/P15+/P20+ calibration

Red-team gate:
If tail detection improves but normal 0–3 goal calibration deteriorates enough to offset the gain, do not promote.

All C0197 work starts with `model_effect_enabled=false`.

---

## 4. Existing data inventory relevant to C0197

Production/research tables already identified:
- `historical_prematch_feature_archive`
- `historical_fixture_team_feature_snapshots`
- `forward_enriched_prediction_snapshots`
- `team_match_intelligence`
- `matches`
- `current_fixture_tactical_matchups`
- `research_fotmob_metric_observations`
- `research_team_physical_load_states`
- `odds_market_selections`
- `spatial_raw_events`
- related tactical/profile tables

Current approximate depth observed:
- historical prematch rows: 905
- historical matches represented: 456
- enriched snapshot rows: 2,000
- enriched matches: 1,240
- FotMob metric observations: 2,138
- physical team-state rows: 20

Historical prematch archive already has chronology-safe L5/L10 fields for:
- xG for / against
- shots for / against
- days since previous match
- provenance / evidence cutoff

### Existing odds data is richer than originally assumed
Current odds ingestion includes large volumes of:
- totals
- alternative goal lines
- alternative total goals
- exact total goals 0/1/2/3/4/5/6/7+
- home team totals
- away team totals
- BTTS
- correct score
- 1X2
- match/team shots
- match/team SOT
- goalkeeper saves
- player shots / SOT
- anytime scorer
- player 2+ goals
- player 3+ goals

Alternative totals currently extend roughly from 0.5 through 8.5 on available books.

This data can benchmark SOT expectations and tail calibration, but the **full market-tail model remains deferred under C0198**.

### Current FotMob research table gap
Existing `research_fotmob_metric_observations` currently contains mainly physical metrics (`phys_tdc`, `phys_ts`, `phys_sprints`, team possession-won attacking-third proxy). A direct stat-key search returned no existing Big Chances Missed rows.

Therefore source acquisition for Big Chances Missed, SOT/xGOT, player scoring-concentration inputs, and goalkeeper post-shot quality is the immediate next research task.

---

## 5. C0198 — explicitly deferred ideas

Status: Open / Planned.
Title: `Deferred high-score model extensions`

Saved at user request for later discussion and possible implementation:
- game-state simulator (score-state transitions / tactical reaction after goals)
- full bookmaker market-tail model / tail-curvature residual model

Weather/referee micro-effects remain optional future research features, not approved separate models.

Do not implement C0198 while working C0197 unless the user explicitly reopens it.

---

## 6. Immediate next actions in the new conversation

### First: finish the unresolved C0196 UI deploy
1. Inspect current `MatchupModal.tsx` and `fixtures.spec.ts`.
2. Determine the actual formatted fallback probability rendered for the historical fixture.
3. Correct the deterministic test expectation (or code only if the displayed value itself is wrong).
4. Run strict workflow.
5. Require E2E/accessibility, artifact verification, Pages deploy, and live root + `/v2/` integrity green.
6. Only then update C0196 implementation refs / closure state as appropriate. Do not close the model-audit portion merely because the UI fallback is fixed.

### Second: C0197 data-source research
Map required fields to trustworthy sources, prioritizing zero/low-cost and chronology-safe acquisition.

Required source matrix should cover at minimum:

Team level:
- xG/xGA
- shots / SOT
- xGOT / post-shot quality
- big chances created
- **big chances missed**
- big chances conceded if obtainable
- goalkeeper post-shot quality / goals prevented
- home/away splits
- defensive/lineup continuity

Player level:
- xG / xG90
- shots / SOT / per90
- big chances
- **big chances missed**
- penalties
- xGOT / finishing quality if available
- minutes / starts / predicted XI
- player 2+ / 3+ scoring history where derivable

Potential source families to evaluate:
- official FPL API for availability, starts/minutes/status and fixture/player metadata
- FotMob current/season stats if stable/legal enough for research ingestion
- Understat for historical xG / shot-level data where available
- Football-Data.co.uk for long historical match shots/SOT/results/odds/referees
- FBref/StatsBomb-derived public datasets where licensing/robots/availability permit research use
- Kaggle/GitHub archival datasets only after provenance/coverage validation
- existing bookmaker feed for SOT/team totals/scorer benchmarks, research-only

For every candidate source document:
- cost
- historical depth
- update latency
- field coverage
- team/player identity quality
- timestamp/provenance capability
- terms/access stability
- expected maintenance burden
- production vs research-only recommendation

### Third: do not implement the model before the data-source matrix is reviewed
The user asked to look for sources next. Return a source plan first, then implementation after approval.

---

## 7. Permanent project rules to preserve

- Historical forecasts are immutable / append-only.
- Missing data is never zero.
- Future fixture intelligence freezes at kickoff.
- Research signals do not become model effects automatically.
- Do not tune on a tiny recent sample and call it validation.
- Noise-Control Gate applies to model changes as well as FPL decisions.
- C0176 root cutover requires explicit user approval.
- Existing legacy decision objects must be reused by v2 where they already exist rather than rebuilt from lower-level data without explicit approval.
- Finished-event prediction audit marks are presentation/audit only and never rewrite forecasts.
