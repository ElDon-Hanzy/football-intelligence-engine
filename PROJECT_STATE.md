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
- Do not tune on GW1 and then call a same-GW rerun independent validation.
- Process quality and result quality are evaluated separately.

## 2. Change management and source of truth

Working engineering ledger: `public.change_tracker_working` in Supabase project `knooiwezzsxcwhtjtdap`.

Excel tracker rule:
- Excel is the fuller local project register generated from the working ledger plus historical rows.
- **Do not push the Excel tracker to GitHub.**
- GitHub contains code, migrations, project handover and decision/history documentation.

Latest tracker IDs now run through **C0119**.

### C0116 — Tracker reconciliation — VERIFIED
The fuller Excel register was reconciled against Supabase, `PROJECT_STATE.md` and production evidence. Stale Pending/Planned labels were corrected without falsely completing partially implemented work.

### C0118 — Governance enforcement & traceability audit — VERIFIED
Database-level governance is now machine-checkable.

Production controls:
- `private.enforce_change_tracker_governance_v01()` rejects invalid Change IDs;
- `Completed` requires `delivery_stage='Verified'`;
- `Completed` requires at least one implementation reference;
- decision-bearing rows marked `decision_required=true` require explicit `decision_refs`;
- `private.audit_change_tracker_governance_v01()` reports ledger violations.

Verified state on 2026-08-25:
- 35 working-ledger rows at audit time;
- 10 explicit decision-bearing rows;
- 0 bad Change IDs;
- 0 Completed-not-Verified rows;
- 0 Completed-without-implementation-ref rows;
- 0 decision-bearing rows without decision refs;
- negative tests rejected invalid writes and rolled back cleanly.

C0100, C0101 and C0102 are therefore **Completed / Verified**. Ongoing compliance is an operating rule, not unfinished implementation.

For every new/resumed session:
1. Read this file.
2. Read `DECISIONS_AND_HISTORY.md`.
3. Query `public.change_tracker_working`.
4. Independently inspect current Supabase/GitHub production state before executing.
5. Do not blindly trust chat-history summaries.

## 3. Current forward-validation cohort

Independent forward cohort: `W0001` / `A0005`, experiment `E0006`.

`W0001`:
- GW2 = `VALIDATION`;
- GW3 = `TEST`;
- 20 complete fixtures total;
- training_end = `2026-08-28 19:00:00+00`;
- actual data was not used in generation;
- model effects remain disabled.

`A0005`:
- ablation run id 5;
- engine `walk_forward_ablation_v0.4_elo`;
- change C0112;
- 7 frozen variants across 20 fixtures;
- 140 frozen predictions total;
- `actual_data_used=false`;
- `model_effect_enabled=false`.

As of the latest 2026-08-25 verification:
- 140 predictions;
- 20 complete cohort fixtures;
- 0 finished cohort fixtures;
- 0 forward evaluations;
- 0 run/prediction/duplicate-evaluation integrity violations.

Do not modify A0005 before or during scoring.

GW2 and GW3 were seeded before kickoff. Current pre-match chain includes availability/Expected XI, fixture roles, team tactical snapshots, replacement research, tactical matchups, base forecasts, enriched research forecasts, canonical C0050 feature snapshots and market capture where available.

## 4. C0115 — Forward-validation readiness & near-close capture — VERIFIED

C0115 is operational in production.

Functions:
- `private.capture_a0005_near_close_v01()` checks only complete A0005 cohort fixtures and triggers bookmaker ingestion only inside the protected pre-kickoff window;
- `private.evaluate_a0005_forward_v01()` pins scoring to A0005 and uses the append-only/idempotent evaluator;
- `private.a0005_forward_validation_status_v01()` reports coverage, integrity, capture state and decision state.

Schedules:
- `football_intelligence_a0005_near_close`: every 5 minutes, with a database guard allowing work only 5–20 minutes before kickoff;
- `football_intelligence_a0005_evaluator`: at :08/:23/:38/:53, after the existing official-result sync.

Rules:
- no reconstructed closing odds;
- unavailable CLV remains `NULL`;
- finished fixtures only are evaluated;
- duplicate evaluation rows are prevented;
- GW2 is validation-only and cannot be used for same-cohort retuning;
- GW3 remains separate TEST confirmation;
- no automatic model promotion.

Decision states:
- incomplete GW2 → `ACCUMULATING_GW2_VALIDATION`;
- complete GW2 / incomplete GW3 → `GW2_COMPLETE_REVIEW_ONLY_NO_TUNING`;
- complete GW2 + GW3 → `GW3_COMPLETE_PROMOTION_GATE_ELIGIBLE`.

## 5. Validation infrastructure — C0049

### C0050 — Unified pre-match feature snapshot — VERIFIED
Canonical append-only fixture-team feature snapshots with chronology/provenance. Historical features are recomputed only from evidence available by cutoff. Missing data remains missing.

### C0051 — Experiment registry — VERIFIED
Immutable `E000x` experiment definitions with feature/model/version/training/validation metadata.

### C0052 — Walk-forward engine — VERIFIED
`W0001` freezes GW2 VALIDATION and GW3 TEST with 20/20 complete cohort fixtures and zero chronology/model-effect violations.

### C0053 — Ablation framework — VERIFIED
Multiple immutable ablation cohorts exist. A0005 is the independent forward cohort of interest.

### C0054 / C0114 — Calibration backend + live dashboard — VERIFIED
Performance surface supports Brier, score log loss, direction accuracy, exact-score rate, process MAE, xG-gap error, total-xG error, reliability/calibration, market disagreement and genuine captured CLV context.

The live forward-validation control room is intentionally pinned to W0001/A0005 so later experiments cannot silently replace the independent cohort. Missing forward metrics display Pending rather than zero. Retrospective GW1 evidence is shown separately.

### C0055 — Promotion gate — VERIFIED
No model can auto-activate. Promotion requires sufficient genuine validation/test evidence, no chronology/policy violations and no unacceptable proper-score/process regression.

### C0056 — Historical pre-match archive — VERIFIED
- 964 reconstructed historical team-side snapshots;
- 905 training-eligible;
- `forward_valid=false`;
- retrospective-safe training evidence only;
- cannot be presented as genuine forward validation.

### C0057 — Version registry — VERIFIED
Forward predictions/manifests are tied to exact component versions.

C0049 remains **In Progress** only because genuine forward outcome accumulation is incomplete. The infrastructure itself is operational.

## 6. Team-strength calibration — C0104 / C0112

GW1 diagnostics showed the old engine often got total fixture goal volume roughly right but allocated expected goals too evenly between teams.

Rejected ideas include:
- blind lambda-separation amplification;
- blanket global home uplift;
- simple exponent retuning without stability;
- naive full-strength Championship→Premier League translation.

Verified supporting work:
- C0107 promoted-team priors — conservative and shrunk;
- C0108 cross-season form decay — offseason stale form downweighted;
- C0111 uncertainty layer — sparse/promoted teams carry wider uncertainty;
- C0109 process-vs-outcome evaluation — process and result errors separated.

Persistent Elo candidate:
- 3,496 historical team-side Elo observations;
- research model `team_strength_linear_v0.3_elo`;
- beat v0.2 across multiple historical holdouts;
- 10/10 GW2 and 10/10 GW3 candidate forecasts frozen;
- forward experiment/ablation `E0006` / `A0005`.

C0112 remains **Monitoring** until genuine GW2/GW3 evidence exists. Do not promote it from retrospective GW1 evidence.

## 7. Goal/outcome distribution — C0058 — VERIFIED decision

Compared with fixed lambdas:
- independent Poisson;
- Dixon–Coles;
- bivariate Poisson;
- negative-binomial / generic over-dispersion.

Result:
- Dixon–Coles slightly helped 1X2 Brier in one holdout but worsened scoreline log loss and 1–1 concentration;
- bivariate Poisson gain was microscopic;
- negative-binomial optimum approached the Poisson limit.

Decision: retain independent Poisson for now. The larger weakness is upstream team-strength estimation.

## 8. Player quality / absence consequence — C0091 / C0092 / C0117

Role fit and absolute player quality remain separate concepts.

Original C0091 layer:
- 372 outfield 2025/26 position-normalized, minutes-shrunk quality priors;
- separate attack/defence quality dimensions;
- goalkeeper quality intentionally unscored until goalkeeper-specific evidence exists;
- GW2 absence-consequence observations: 53;
- GW3 absence-consequence observations: 55;
- research-only with `model_effect_enabled=false`.

### C0117 — Player ability prior v2 evidence expansion — VERIFIED
C0117 improves the historical player prior without touching frozen forecasts.

Production table/function:
- `player_ability_prior_v2_observations`;
- `refresh_player_ability_priors_v2_2025_26()`.

Verified results:
- 341 outfield v2 priors;
- 297/341 received conservative opponent-Elo adjustment;
- adjustment requires inferred team continuity >= 0.80 and opponent-Elo coverage >= 0.60;
- missing event metrics are excluded rather than coerced to zero;
- append-only mutation guard is active;
- identical second run inserted 0;
- `actual_data_used=false`;
- `model_effect_enabled=false`;
- A0005 stayed untouched.

Important limitation: production currently contains only one historical player season (2025/26). Therefore **C0092 remains In Progress**. Do not label the player ability prior “multi-season” until a genuine second historical player season is ingested and validated.

## 9. Learned effects and interactions

### C0066 — Learned signal effect sizes — MONITORING
Historical residual testing shows short-term form adds at most a small residual benefit and schedule/fatigue worsens holdout metrics. Tactical/personnel/quality effect sizes remain unlearned pending genuine forward sample.

### C0074 — Signal interactions — MONITORING
20/20 GW2 and 20/20 GW3 observational interaction rows exist. `learned_effect=false`; interactions cannot affect active forecasts yet.

## 10. Spatial/tactical evidence — C0082 — BLOCKED

Spatial-lite rows exist for 18/20 fixture-sides in both GW2 and GW3 using defensible territorial/workload fields.

Still unavailable:
- true pressing intensity / PPDA;
- defensive line height;
- true event-coordinate left/right channel geometry;
- tracking-level speed/space interactions.

Do not relabel proxies as pressing, high line or side-specific channel evidence.

## 11. Market intelligence

- Correct Score remains research-only; `value_edge_available=false` until validated.
- Bet365 + Unibet are the main captured sources.
- C0034 third Correct Score source remains blocked because the tested Pinnacle route returned no usable selections.
- GW2 market coverage reached 10/10 after the Leeds alias fix.
- C0110 market-disagreement diagnostic compares the research team-strength candidate with de-vigged bookmaker 1X2 consensus and never auto-overrides the model.
- C0115 handles guarded near-close capture for A0005.
- Correct-score CLV uses genuine captured closing proxies only.

## 12. Retrospective GW1 evidence — reference only

Do not conflate original frozen GW1 forecasts with later replays/shadows.

Blind current-engine run 1 (`blind_current_v0.3_strength_long_form_tactical_quality`):
- 10/10 evaluations;
- direction 6/10;
- Brier 0.517874;
- score log loss 2.928090;
- exact top score 1/10;
- process MAE 0.699162;
- xG-gap error 1.056865.

Blind current-engine run 2 (`blind_current_v0.4_elo_strength`):
- 10/10 evaluations;
- direction 8/10;
- Brier 0.495188;
- score log loss 2.928976;
- exact top score 1/10;
- process MAE 0.677928;
- xG-gap error 0.996323.

Run 2 is retrospective follow-up, not independent validation. The Elo hypothesis was investigated after GW1 diagnostics. Genuine independent evidence is W0001/A0005.

## 13. Current unresolved work

Highest priority:
1. Let C0115 collect genuine near-close prices and automatically append A0005 evaluations as GW2 fixtures finish.
2. Once all 10 GW2 VALIDATION fixtures are evaluated, compare all seven A0005 variants using proper scores and process metrics without retuning from GW2.
3. Preserve GW3 as the separately frozen TEST confirmation.
4. Run promotion-gate review only after sufficient genuine forward sample exists.
5. Keep v0.3 Elo, quality and interaction layers research-only until forward evidence supports them.
6. Continue future-GW collection under the same canonical feature/version/market pipeline.
7. Complete C0092 only after a genuine second historical player season is available and the resulting multi-season prior is validated.
8. C0034 third Correct Score source remains blocked pending a viable source/provider.
9. C0082 true pressing/line-height/channel work remains blocked pending suitable event/spatial/tracking data.
10. Legacy security/RLS findings remain a separate hardening workstream.

Do **not** retune A0005 or the GW2/GW3 candidate after seeing results. Any materially changed model requires a new experiment/version/Change ID.

## 14. UI / API state

Static GitHub Pages frontend remains a live-data shell over Supabase APIs.

Current product surfaces include Home / FPL / Fixtures / Market Intelligence / Performance.

Verified UI capabilities include:
- human football wording for backend enums;
- FPL pitch layout;
- pagination over 20;
- genuine pre-match odds where captured;
- retrospective performance views;
- forward-validation control room on Performance;
- explicit A0005 validation/test scoreboard and integrity state.

### C0119 — Fixture thesis & score-distribution explanation — VERIFIED
Performance enriched-shadow fixture cards no longer present a naked “top score” as if it were the expected literal goal total and no longer present a few small adjustment terms as if they explain the full baseline→shadow movement.

The C0119 presentation layer now:
- shows displayed home/away xG plus the mean total;
- derives and shows the top three exact-score probabilities from the retained independent-Poisson distribution;
- replaces “Why X moved” with a concise **result-hidden pre-match thesis**;
- uses only evidence preserved before kickoff;
- moves the actual score into a separate **Post-match audit** block after the thesis;
- treats underdog blank probability / BTTS state as probability, not certainty;
- surfaces a preserved tactical counter-case where one exists;
- omits personnel/injury and H2H claims when no reliable pre-match decision-state evidence was preserved.

Arsenal–Coventry sanity check from the shadow card:
- shadow xG = 1.985–0.767;
- mean total = 2.752;
- top exact scores = 1–0 12.66%, 2–0 12.57%, 1–1 9.71%;
- Arsenal win = 65.87%;
- Coventry blank = 46.45%;
- BTTS No = 53.86%;
- Coventry transition opportunity remains the main preserved counter-case.

Implementation: `ui-v5.js`, `ui-v5.css`, `index.html`. GitHub Pages deployment completed successfully on 2026-08-25. This is presentation/read-only; no forecast/model tables were changed and A0005 remains untouched.

Cosmetic browser/device QA can improve later, but should not outrank genuine forward model validation.

## 15. Resume command for the next conversation

When the user says to continue this project:
1. Read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`.
2. Query `public.change_tracker_working`.
3. Run `private.audit_change_tracker_governance_v01()` and resolve any ledger violations before new material work.
4. Query `private.a0005_forward_validation_status_v01()` or independently reproduce its checks.
5. If a GW2 fixture is finished but its seven A0005 evaluations are missing, investigate the result-sync/evaluator pipeline before model analysis.
6. If GW2 is complete, analyze VALIDATION without retuning; preserve GW3 as TEST.
7. Preserve all retrospective-vs-forward distinctions.
8. Update the working ledger during engineering.
9. Regenerate/update the Excel tracker locally at the end of the work block; **never push the Excel tracker to GitHub**.
