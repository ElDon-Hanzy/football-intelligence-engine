# Football Intelligence Engine — Project State

_Last updated: 2026-08-25_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Permanent rules:
- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Retrospective replay/shadow work is always stored separately and never presented as a genuine historical prediction.
- Missing data is not zero.
- Preserve source/provenance plus `known_at` / `captured_at` / `evidence_cutoff` timestamps.
- Never commit secrets/API keys.
- New intelligence remains `model_effect_enabled=false` until it passes genuine out-of-sample forward validation.
- Distinguish planned / coded / committed / deployed / executed / verified.
- Do not tune a model on GW1 and then call the same GW1 rerun independent validation.
- Process quality (realized xG/chance process) and result quality must be evaluated separately.

## 2. Change-management source of truth

Working change ledger: `public.change_tracker_working` in Supabase project `knooiwezzsxcwhtjtdap`.

This is now the working implementation tracker during engineering. Update this table as work progresses.

Excel tracker rule:
- Excel is generated/updated locally from the working ledger and the fuller historical register.
- **Do not push the Excel tracker to GitHub.**
- GitHub contains project handover/docs/code/migrations only.

Latest tracker IDs run through **C0114**.

For any new/resumed session:
1. Read this file.
2. Read `DECISIONS_AND_HISTORY.md`.
3. Query `change_tracker_working`.
4. Independently inspect current Supabase/GitHub production state before executing.
5. Do not blindly trust chat-history summaries.

## 3. Current forward pipeline

The forward chain is running early enough to accumulate genuine pre-match evidence for future GWs:

- availability / Expected XI;
- fixture roles;
- team tactical snapshots;
- replacement research;
- tactical matchups;
- structural/base fixture forecast;
- enriched research forecast;
- canonical C0050 feature snapshot;
- market/odds capture where available.

GW2 and GW3 were both seeded before kickoff rather than waiting for the nearest unfinished GW to clear.

Verified GW2/GW3 coverage from this implementation phase:
- GW2 availability observations: 609;
- GW3 availability observations: 609;
- GW2 fixture-role rows: 609;
- GW3 fixture-role rows: 609;
- GW2 team tactical snapshots: 20;
- GW3 team tactical snapshots: 20;
- GW2 replacement observations: 224+ (later quality/absence layer is separate);
- GW3 replacement observations: 234+;
- GW2/GW3 tactical matchup rows: full five-signal framework;
- GW2 base forecasts: 10/10 pre-kickoff;
- GW3 base forecasts: 10/10 pre-kickoff;
- GW2 enriched research forecasts: 10/10 valid canonical rows;
- GW3 enriched research forecasts: 10/10, v2 automation, idempotent;
- latest C0050 canonical snapshots: 20/20 fixture-sides with base forecast, 11-player Expected XI, roles and all 5 matchup signals; replacement evidence may remain unavailable rather than zero.

A faulty early enriched automation cohort that coerced a missing tactical score to zero was not deleted; it is preserved and excluded through an append-only invalidation ledger. Corrected v2 preserves null as unavailable and reruns idempotently.

As of 2026-08-25, GW2 and GW3 have not produced any result evidence. `W0001` / `A0005` therefore remains untouched with 140 frozen ablation predictions, 20 complete cohort fixtures and zero forward evaluations.

## 4. Validation/sample infrastructure — C0049

### C0050 — Unified pre-match feature snapshot — VERIFIED
Canonical append-only fixture-team feature snapshots with provenance and chronology.

Key fixes:
- history features are recomputed from rows whose capture time is at/before the snapshot cutoff;
- dedup hash no longer changes merely because the snapshot cutoff clock changed;
- tactical dedup uses `signal_key`, not broad `signal_family`;
- unchanged reruns insert zero.

### C0051 — Experiment registry — VERIFIED
Immutable `E000x` experiment definitions with feature/model/version/training/validation metadata. Materially different experiment = new ID.

### C0052 — Walk-forward engine — VERIFIED
`W0001` freezes:
- GW2 = VALIDATION;
- GW3 = TEST;
- 20/20 fixtures complete;
- zero actual-data/model-effect/chronology violations.

### C0053 — Ablation framework — VERIFIED
Multiple immutable ablation cohorts exist. Latest important forward cohort is **A0005**, tied to the v0.3 Elo team-strength candidate and frozen before outcomes.

### C0054 — Calibration dashboard — VERIFIED
Backend and live presentation support:
- Brier;
- score log loss;
- direction accuracy;
- exact-score rate;
- process MAE;
- xG-gap error;
- total-xG error;
- reliability bins/calibration;
- market disagreement;
- genuinely captured CLV context where a closing proxy exists.

`calibration-summary` v3 is live and the Performance page includes the C0114 forward-validation control room. The selected independent cohort is intentionally pinned to `W0001` / `A0005` so a later experiment cannot silently replace it.

Verified live state on 2026-08-25:
- 140 A0005 frozen predictions;
- 20 complete cohort fixtures;
- GW2 validation = 10 fixtures;
- GW3 test = 10 fixtures;
- forward evaluations = 0;
- prediction/cohort actual-data violations = 0;
- prediction/cohort model-effect violations = 0;
- live API HTTP 200;
- deployed GitHub Pages serves `ui-v4.js` / `ui-v4.css`.

The UI renders unavailable forward metrics as **Pending**, not zero, and labels the two GW1 blind-current replays as retrospective reference only.

CLV remains null when no captured closing proxy exists; never reconstruct it.

### C0055 — Promotion gate — VERIFIED
`P0001` cannot auto-activate a model. Requires documented validation/test improvement, no log-loss regression, process tolerance, zero chronology/policy violations, and a sufficiently large genuine forward sample. Current sample remains insufficient.

### C0056 — Historical pre-match archive — VERIFIED
- 964 reconstructed historical team-side snapshots;
- 905 training-eligible;
- training-only retrospective-safe data;
- `forward_valid=false`;
- zero chronology/policy violations;
- cannot be presented as forward validation.

### C0057 — Version registry — VERIFIED
Predictions/manifests can be tied to exact component versions. GW2/GW3 manifests exist for the main forward candidates.

### C0114 — Forward calibration presentation — VERIFIED
New live Performance surface presents:
- W0001/A0005 cohort coverage;
- validation vs test ablation scoreboard across all seven A0005 variants;
- explicit chronology/model-effect integrity state;
- market-disagreement and captured-CLV state;
- promotion-gate status without implying an old gate assessment applies to A0005;
- retrospective GW1 replay metrics in a clearly separate reference table.

Implementation:
- Supabase Edge Function `calibration-summary` v3;
- repository-tracked `supabase/functions/calibration-summary/` source;
- `ui-v4.js`;
- `ui-v4.css`;
- `index.html` asset wiring.

## 5. Team-strength calibration — C0104

GW1 post-mortem found that the old engine often got total fixture goal volume roughly right but allocated expected goals too evenly between the two teams.

Important rejected ideas:
- blindly amplify lambda separation: rejected by historical holdout;
- blanket global home uplift: looked good on GW1 but failed a 141-match chronological holdout;
- simple exponent retuning alone: not stable enough;
- naive full-strength Championship→PL translation: failed leave-one-promotion-out validation.

### C0107 — Promoted-team priors — VERIFIED
Promoted teams use a conservative research prior, not a generic identical baseline and not a raw Championship translation.

Three promoted research means were differentiated (Coventry, Hull, Ipswich). Lower-division evidence gets only a small-sample shrunk mean contribution; uncertainty stays wide. These priors are research-only.

### C0108 — Cross-season form decay — VERIFIED
Stale May L5/L10 trends are exponentially downweighted across the summer. This improved GW1 calibration/process modestly. Form remains a small residual effect.

### C0111 — Uncertainty layer — VERIFIED
Historical residuals show large next-match process variance. Promoted/sparse teams are marked higher uncertainty. This is observational and does not yet alter active probabilities.

### C0105 / C0112 — stronger team-strength candidates
A learned linear xG model materially beat the old structural formula across chronological historical holdouts.

Long-term version (`team_strength_linear_v0.2_long_term`) combined recent and long-horizon xG strength plus venue context.

A persistent Elo enhancement was then built:
- historical Elo rows: 3,496 team-side observations;
- research candidate: `team_strength_linear_v0.3_elo`;
- it beat v0.2 on multiple historical holdouts;
- 10/10 GW2 and 10/10 GW3 forward candidate forecasts are frozen;
- associated forward experiment/ablation: `E0006` / `A0005`.

**Do not promote v0.3 Elo from GW1 retrospective performance. Its genuine test is GW2/GW3.**

## 6. Goal/outcome distribution — C0058 — VERIFIED decision

Tested with fixed lambdas:
- independent Poisson;
- Dixon–Coles;
- bivariate Poisson;
- negative-binomial / generic over-dispersion.

Result:
- Dixon–Coles slightly helped 1X2 Brier in one holdout but worsened scoreline log loss and made 1–1 concentration worse;
- bivariate Poisson gain was microscopic;
- negative-binomial optimum approached the Poisson limit.

Decision: **retain independent Poisson for now.** The larger weakness is upstream team-strength estimation, not lack of a fashionable distribution.

## 7. Learned residual effects — C0066

Historical residual testing shows:
- short-term form gives at most a very small incremental benefit;
- schedule/fatigue heuristic worsens holdout metrics and is disabled in newer research candidates;
- tactical/personnel/quality coefficients remain unlearned because genuine forward outcome sample is still too small.

Do not increase form weight based on GW1 anecdotes.

## 8. Player quality / absence consequence — C0091

Separate from role fit.

Current research layer:
- 372 outfield player-quality priors;
- position-normalized;
- minutes-shrunk;
- separate attack/defence quality dimensions;
- goalkeepers intentionally unscored until goalkeeper-specific evidence exists;
- GW2 absence-consequence observations: 53;
- GW3 absence-consequence observations: 55.

A role-compatible replacement is not assumed to be equal player quality.

Quality effect in forward ablation is deliberately tiny/pre-specified and remains research-only until genuine results.

For retrospective GW1 quality use, later-created player-quality priors can be used only where the underlying player history was already knowable pre-match **and** genuine pre-kickoff availability/replacement evidence existed. Do not backfill missing availability from hindsight.

## 9. Tactical interactions / spatial evidence

### C0074 — interactions — MONITORING
20/20 GW2 and 20/20 GW3 observational interaction rows exist. `learned_effect=false`. No interaction term may affect active forecasts before forward validation.

### C0082 — spatial/tactical evidence — BLOCKED for full implementation
Available Core Insights support a spatial-lite layer using defensible fields such as territorial activity, possession, sprints, long balls, crosses, duels and opposition-box touches.

Spatial-lite rows: 18/20 fixture-sides in both GW2 and GW3 at the tested capture point.

Still **not available**:
- true pressing intensity / PPDA;
- defensive line height;
- true event-coordinate left/right channel geometry;
- tracking-level speed/space interactions.

Do not relabel proxies as pressing or high line.

## 10. Market intelligence

- Correct Score remains research-only; `value_edge_available=false` until validated.
- Bet365 + Unibet remain the main captured sources.
- Third Correct Score source C0034 is blocked: Pinnacle test returned no usable selections from the current provider.
- `ingest-bookmaker-odds` v5 includes the Leeds/Leeds United alias fix.
- GW2 market coverage reached 10/10 fixtures after the alias fix.
- C0110 compares the research team-strength candidate with de-vigged bookmaker 1X2 consensus; it is a confidence/diagnostic signal only and never auto-overrides the model.
- A very large Villa–Arsenal model/market disagreement was the trigger to investigate persistent team quality; this helped motivate the long-horizon/Elo work.
- Correct-score CLV uses captured closing proxies only.

## 11. Blind current-engine GW1 replay — C0113

This is the latest retrospective test requested by the product vision.

Storage:
- `blind_current_engine_runs`;
- `blind_current_engine_predictions`;
- `blind_current_engine_evaluations`.

Generation/evaluation separation:
1. freeze all blind predictions using pre-kickoff-safe evidence;
2. audit for leakage;
3. only then reveal actual results to the evaluation table.

All 10 GW1 fixtures are now finished; Fulham–Chelsea finished **2–3**.

### Run 1 — `blind_current_v0.3_strength_long_form_tactical_quality`
Integrity:
- 10/10 predictions frozen;
- `actual_data_used=false`;
- `model_effect_enabled=false`;
- no real historical prediction tables rewritten.

Evaluation:
- 10/10 fixtures;
- result direction: **6/10**;
- average 1X2 Brier: **0.517874**;
- score log loss: **2.928090**;
- exact top score: **1/10**;
- process MAE: **0.699162**;
- xG-gap error: **1.056865**;
- total-xG error: **0.796039**.

### Run 2 — `blind_current_v0.4_elo_strength`
This follow-up keeps the same no-outcome-input replay discipline but changes the base strength to the historically validated Elo-enhanced candidate.

Evaluation:
- 10/10 fixtures;
- result direction: **8/10**;
- average 1X2 Brier: **0.495188**;
- score log loss: **2.928976**;
- exact top score: **1/10**;
- process MAE: **0.677928**;
- xG-gap error: **0.996323**;
- total-xG error: **0.812167**.

**Critical interpretation:** run 2 is NOT independent validation. The Elo investigation was motivated after diagnosing run 1/GW1 team-strength compression. The Elo coefficients themselves were selected from historical holdouts, not GW1 scores, but the hypothesis selection was post-GW1. Preserve this result as retrospective follow-up evidence only.

The genuine independent test is the already-frozen GW2/GW3 forward cohort (`W0001`, `A0005`).

## 12. Previous GW1 replays that must remain distinct

Do not conflate:
- original frozen v0.1.3 GW1 predictions;
- Blind Context Replay run 1;
- Enriched Shadow v0.1 run 2;
- form-decay / venue research shadows;
- Blind Current Engine v0.3 run 1;
- Blind Current Engine Elo v0.4 run 2.

Each experiment has different provenance and validity. Never present a later retrospective run as the original GW1 forecast.

## 13. Current major pending work

Highest priority:
1. Let GW2 validation and GW3 test results arrive; evaluate `A0005` without changing its frozen definitions.
2. Compare BASE / FORM / TACTICAL / PERSONNEL / QUALITY / combined variants using proper scores and process metrics.
3. Run promotion gate only after enough genuine forward sample exists. Current sample is far below the required threshold.
4. Keep v0.3 Elo, quality and interaction layers research-only until that forward evidence exists.
5. Let the verified C0054 dashboard populate naturally as forward evaluations and genuinely captured near-close CLV become available; do not fabricate missing values.
6. Continue collecting future GWs under the same canonical feature/version/market pipeline.
7. Third Correct Score source remains blocked pending a provider/source that actually returns data.
8. True pressing/defensive-line work remains blocked pending suitable spatial/tracking data.
9. Legacy security/RLS findings on older public objects remain a separate hardening task; do not mix them into forecast-model changes without dependency mapping.

Do **not** retune A0005 or the GW2/GW3 candidate after seeing results. New tuning requires a new experiment/version/Change ID.

## 14. UI / API state

Static GitHub Pages frontend remains a live-data shell over Supabase APIs.

Existing product surfaces include Home / FPL / Fixtures / Market Intelligence / Performance.

UI work now includes:
- human football wording for backend enums;
- FPL pitch layout;
- pagination over 20;
- actual-result pre-match odds where genuinely captured;
- retrospective replay/performance views;
- a verified forward-validation control room on Performance backed by `calibration-summary` v3;
- explicit A0005 validation/test scoreboard, integrity flags, market/CLV state and retrospective-vs-forward labeling.

The static deployment and API boundaries were verified live with HTTP 200 on 2026-08-25. Browser/device visual QA can still be improved later, but do not prioritize cosmetic work ahead of genuine forward model validation.

## 15. Resume command for the next conversation

When the user says to continue this project:

1. Read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`.
2. Query `public.change_tracker_working`.
3. Verify current GW2/GW3 result state and whether any W0001/A0005 fixtures have finished.
4. If results exist, evaluate the frozen forward ablations **without modifying them first**.
5. Preserve all retrospective-vs-forward distinctions above.
6. Update Supabase working ledger during engineering.
7. Regenerate/update the Excel tracker locally at the end of the work block only; **never push the Excel tracker to GitHub**.
