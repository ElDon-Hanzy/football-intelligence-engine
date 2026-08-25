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
- Negative experiments are first-class evidence and must not be hidden or retuned until they look successful.

## 2. Change management and source of truth

Working engineering ledger: `public.change_tracker_working` in Supabase project `knooiwezzsxcwhtjtdap`.

Excel tracker rule:
- Excel is the fuller local project register generated from the working ledger plus historical rows.
- **Do not push the Excel tracker to GitHub.**
- GitHub contains code, migrations, project handover and decision/history documentation.

Latest engineering Change ID is **C0130**. Substantive model/data implementation remains verified through **C0128**; C0129 reconciled Supabase, GitHub and the local tracker, and C0130 repaired a missing finalized local tracker artifact detected by the post-reconciliation audit. Neither C0129 nor C0130 changes model forecasts or experiment definitions.

Database governance from C0118 remains machine-checkable:
- `private.enforce_change_tracker_governance_v01()` rejects invalid Change IDs;
- `Completed` requires `delivery_stage='Verified'`;
- `Completed` requires at least one implementation reference;
- decision-bearing rows marked `decision_required=true` require explicit `decision_refs`;
- `private.audit_change_tracker_governance_v01()` reports ledger violations.

For every new/resumed session:
1. Read this file.
2. Read `DECISIONS_AND_HISTORY.md`.
3. Query `public.change_tracker_working`.
4. Run `private.audit_change_tracker_governance_v01()`.
5. Independently inspect current Supabase/GitHub production state before executing.
6. Do not blindly trust chat-history summaries or an old Excel filename.

## 3. Genuine forward-validation cohorts

### W0001 / A0005 / E0006 — primary independent cohort

`W0001`:
- GW2 = `VALIDATION`;
- GW3 = `TEST`;
- 20 complete fixtures total;
- actual data was not used in generation;
- model effects remain disabled.

`A0005`:
- ablation run id 5;
- engine `walk_forward_ablation_v0.4_elo`;
- 7 frozen variants across 20 fixtures;
- 140 frozen predictions total;
- `actual_data_used=false`;
- `model_effect_enabled=false`.

Latest verified state on 2026-08-25:
- 140 predictions;
- 20 complete cohort fixtures;
- 0 finished cohort fixtures;
- 0 forward evaluations;
- 0 run/prediction/duplicate-evaluation integrity violations.

Do not modify A0005 before or during scoring.

C0115 remains operational:
- `private.capture_a0005_near_close_v01()` guards genuine 5–20 minute pre-kickoff bookmaker capture;
- `private.evaluate_a0005_forward_v01()` pins scoring to A0005 and appends finished-fixture evaluations;
- `private.a0005_forward_validation_status_v01()` reports coverage/integrity/decision state;
- unavailable CLV remains `NULL` and is never reconstructed;
- GW2 is validation-only with no retuning;
- GW3 is separate TEST confirmation;
- no automatic promotion.

### W0002 / E0008 — second independently precommitted cohort

C0121 created a second forward cohort **before GW2 outcomes were known**:
- GW4 = `VALIDATION`;
- GW5 = `TEST`;
- 20/20 fixtures complete;
- full pre-kickoff chain populated for both weeks: availability, roles, team tactics, replacement research, tactical matchups, canonical feature snapshots, structural forecasts, Elo candidates and enriched forecasts;
- dedicated near-close capture/evaluator cron jobs are active;
- 0 evaluations so far;
- 0 integrity violations;
- A0005 remains untouched.

Production functions:
- `private.capture_w0002_near_close_v01()`;
- `private.evaluate_w0002_forward_v01()`;
- `private.w0002_forward_validation_status_v01()`.

## 4. Validation infrastructure — C0049

C0049 remains **In Progress / Executed** only because genuine forward outcomes have not accumulated yet. The infrastructure itself is operational.

Verified components include:
- C0050 canonical chronology-safe pre-match feature snapshots;
- C0051 immutable experiment registry;
- C0052 walk-forward cohort engine;
- C0053 immutable ablation framework;
- C0054/C0114 calibration backend and live Performance control room;
- C0055 model-promotion gate;
- C0056 retrospective historical pre-match archive;
- C0057 version registry;
- C0109 process-vs-outcome scoring;
- C0115 guarded near-close capture and automatic forward evaluation;
- C0121 second forward cohort.

The historical archive remains retrospective-safe training evidence, not genuine historical prediction evidence and not forward validation.

## 5. Learned signal effects — current decision state

### C0068 / C0123 — regularized signal-effect model — VERIFIED

A chronology-safe ridge residual model used:
- 688 training rows;
- a six-row Jan-31 temporal gap;
- an untouched 210-row Feb–May holdout.

Inner validation tested penalties from 0 to 1.0. No non-zero candidate improved both MAE and RMSE. On the untouched holdout, non-zero fits produced tiny MAE gains but worse RMSE.

Decision: **shrink currently supported learned residual effects to zero**. Unsupported tactical/personnel/quality families remain *unlearned*, not zero-filled. `model_effect_enabled=false`.

### C0072 / C0124 — manual vs learned ablation — VERIFIED

On the same 210-row untouched holdout:
- baseline: MAE 0.639759, RMSE 0.817821;
- combined small manual recent-form package: MAE 0.637791, RMSE 0.817136;
- opponent-defence trend alone improved both metrics modestly;
- own-form alone improved MAE but worsened RMSE;
- regularized learned effects remain zero;
- schedule/fatigue remains rejected from C0066.

Decision:
- retain only the **small combined manual form package as a research comparator**;
- do not retain own-form standalone;
- do not activate any learned or manual residual effect from retrospective evidence.

### C0073 / C0125 — signal-effect promotion gate — VERIFIED

Current effect-family promotion requires genuine forward evidence:
- at least 50 VALIDATION observations;
- at least 30 TEST observations;
- at least 0.005 absolute Brier improvement in both windows;
- log loss must not worsen;
- process MAE must stay within 2% tolerance;
- zero integrity violations;
- historical retrospective evidence alone cannot pass;
- automatic activation is impossible.

Current states correctly block all existing effect families. Recent form is `NOT_ENOUGH_FORWARD_SAMPLE`; other families are historical-not-eligible or lack isolated forward variants.

### C0069 / C0126 — nonlinear response curves — VERIFIED / REJECTED

Fixed linear-unclipped, clipped-linear, tanh and softsign responses were tested over three chronology-separated historical windows (120 / 200 / 210 rows).

Every candidate had one pass window, one fail window and one mixed window. No response curve improved both MAE and RMSE consistently.

Decision: **REJECT_NO_CROSS_WINDOW_STABILITY**. No nonlinear response is activated.

### C0070 / C0127 — coverage shrinkage policy — VERIFIED

Coverage audit found partial weighting did not rescue sparse evidence:
- `sample_l10` missing → remains missing;
- 1–9 prior-match L10 coverage → residual research effect weight 0;
- >=10 → weight 1.

In the 5–7 and 8–9 coverage bins, zero effect beat linear/quadratic/cubic partial weighting on both MAE and RMSE. The 1–4 bin had only six rows and is also suppressed.

This policy is research-only and is not wired to active forecasts.

## 6. Team-strength calibration — C0104 / C0112 / C0106

The key historical diagnosis remains that the old engine often estimated total goal volume reasonably but allocated expected goals too evenly between teams.

Persistent Elo candidate:
- 3,496 historical team-side Elo observations;
- research model `team_strength_linear_v0.3_elo`;
- beats v0.2 across multiple historical holdouts;
- 10/10 GW2 and 10/10 GW3 forward candidates frozen;
- retrospective GW1 follow-up: 8/10 direction, Brier 0.495188, process MAE 0.677928;
- GW1 is reference only, not independent validation.

C0112 remains **Monitoring** pending genuine GW2/GW3 evidence.

### C0106 / C0128 — venue/home-context calibration — VERIFIED / REJECTED

The earlier blanket global home uplift was already rejected. C0128 then tested fixed context-specific venue blends (25%, 50%, 100%) across four chronology-separated historical windows with 312 / 234 / 130 / 152 team-side observations.

No venue formulation improved both MAE and RMSE consistently across windows.

A separate retrospective GW1 diagnostic had only six covered team-sides and looked favorable, but it was too sparse and non-independent to override the historical result.

Decision: **no additional venue effect is activated**.

## 7. Goal/outcome distribution — C0058

Independent Poisson remains the retained outcome distribution for now.

Rejected/insufficient alternatives with fixed lambdas:
- Dixon–Coles: mixed proper-score result and worse scoreline concentration;
- bivariate Poisson: microscopic gain;
- negative binomial: optimum approached Poisson limit.

The larger problem remains upstream team-strength estimation rather than the score-distribution family.

## 8. Player quality / absence consequence — C0091 / C0092 / C0117

Current layer:
- 372 original outfield quality priors;
- 341 outfield v2 ability priors;
- 297/341 v2 rows receive conservative opponent-Elo adjustment after continuity/coverage gates;
- missing event metrics are excluded rather than zero-filled;
- goalkeeper quality intentionally remains unscored until goalkeeper-specific evidence exists;
- GW2/GW3 absence-consequence observations exist and remain observational;
- `model_effect_enabled=false`.

C0092 remains **In Progress** because production contains only one genuine historical player season (2025/26). Do not call the prior multi-season until a second historical season is ingested and validated.

## 9. Spatial / tactical evidence — C0082 / C0083 / C0084

### C0083 — spatial data source audit — VERIFIED

Defensible provider options were audited for true pressure, continuous XY/line-height, channels and speed. Preferred procurement order:
1. Opta Vision;
2. Hudl integrated event + tracking;
3. SkillCorner.

Public materials do not provide sufficient exact EPL pricing/licensing/storage terms; written vendor confirmation is still required.

### C0084 — vendor-neutral raw spatial schema — VERIFIED

Production now has immutable vendor-neutral structures for:
- match manifests;
- raw artifacts/chunks;
- raw event index;
- provider-native zone definitions.

Large continuous tracking is checksum-addressed file/chunk oriented. Provider-native coordinates/zones/time semantics are preserved. RLS and append-only guards were verified with a rollback round-trip test.

### C0082 — still BLOCKED

The blocker is now **licensed production data access**, not source discovery or schema design. Do not relabel spatial-lite proxies as true pressing, line height or side-specific geometry.

## 10. Market intelligence

Correct Score remains research-only. `value_edge_available=false` until validated.

Bet365 + Unibet remain the main genuine captured sources.

### C0034 — third Correct Score source — BLOCKED

Pinnacle produced no usable selections. Genuine GW2 tests of William Hill, Betway and BetVictor through the current Odds-API.io route matched 10/10 events but wrote zero normalized selections; provider responses included 403 and later 429 behavior.

Independent replacement candidate: **Sportmonks Premium Odds powered by TXODDS**, which advertises Correct Score and broad bookmaker coverage. Acceptance still requires real Premium/API access and a successful normalized pre-kickoff capture. Keep C0034 Blocked until that happens.

### C0120 / E0007 — xG-modal Correct Score hypothesis — IN PROGRESS / EXECUTED

Historical O/U interpretation failed:
- gap >=1.2, n=71;
- closing-average Over 2.5 ROI -7.92%;
- Aug–Dec +2.07% vs Jan–May -14.05%;
- model-vs-market disagreement filters worsened the result.

Decision: raw xG-minus-modal gap is **not** a validated O/U edge.

The narrower Correct Score hypothesis remains frozen prospectively as E0007:
- W0001/A0005 only;
- xG-minus-modal gap >=1.2;
- BASE_V03_ELO and FULL_V04_ELO_NO_SCHEDULE only;
- Bet365 + Unibet both required;
- exact-score model probability >=1%;
- higher-total scoreline;
- positive raw EV across both variants and both bookmakers;
- genuine 5–20 minute near-close price preferred;
- GW2 validation cannot retune the rule;
- GW3 remains separate TEST;
- `model_effect_enabled=false`.

Current early-price state remains five provisional Aston Villa–Arsenal scorelines, all `EARLY_FALLBACK` and not recommendations.

## 11. Security — C0045 / C0122 — VERIFIED

Legacy security is **not an unresolved workstream anymore**.

C0045 first mapped dependencies and confirmed the live GitHub Pages frontend uses Edge Function APIs rather than direct table access.

C0122 then hardened production:
- seven previously RLS-disabled public tables now have RLS enabled and no anon/auth grants;
- the additional legacy RLS tables with broad anon/auth grants now have zero direct anon/auth table grants;
- public sequence grants to anon/auth were removed;
- mutating replay/research RPCs are no longer executable by anon/auth and remain available to `service_role`;
- `fpl-api`, `fixture-intelligence-api` and `betting-api` smoke tests remained HTTP 200;
- A0005 and W0002 stayed integrity-clean;
- no forecast/model rows were changed.

## 12. UI / explainability — C0119 — VERIFIED

Performance enriched-shadow cards now:
- show home/away xG and mean total;
- show top-three exact-score probabilities rather than implying one modal score is the literal expectation;
- replace misleading partial movement attribution with a concise result-hidden pre-match thesis;
- use only preserved pre-kickoff evidence;
- move actual result into a separate post-match audit;
- omit personnel/H2H claims when reliable pre-match evidence was not preserved.

Arsenal–Coventry sanity check:
- shadow xG 1.985–0.767;
- mean total 2.752;
- top exact scores: 1–0 12.66%, 2–0 12.57%, 1–1 9.71%;
- Arsenal win 65.87%;
- Coventry blank 46.45%;
- BTTS No 53.86%.

This layer is read-only and does not mutate forecasts.

## 13. Retrospective GW1 evidence — reference only

Blind current-engine run 1:
- direction 6/10;
- Brier 0.517874;
- score log loss 2.928090;
- exact top score 1/10;
- process MAE 0.699162;
- xG-gap error 1.056865.

Blind current-engine run 2 with Elo:
- direction 8/10;
- Brier 0.495188;
- score log loss 2.928976;
- exact top score 1/10;
- process MAE 0.677928;
- xG-gap error 0.996323.

Run 2 is retrospective follow-up, not independent validation. The Elo hypothesis was investigated after GW1 diagnostics.

C0128 venue GW1 reference also looked favorable but had only six covered team-sides and did not trigger tuning.

## 14. Current unresolved work

### In Progress
- **C0049** — infrastructure operational; waiting for genuine forward outcome accumulation.
- **C0092** — player ability prior needs a genuine second historical season.
- **C0120** — E0007 Correct Score hypothesis waits for genuine GW2/GW3 forward prices/outcomes.

### Monitoring / forward-evidence dependent
- C0066 learned signal effect sizes;
- C0074 signal interactions;
- C0091 quality/absence consequence;
- C0104 team-strength calibration;
- C0105 lambda/team-strength signal;
- C0112 persistent Elo signal.

### Blocked by external access
- **C0034** — third Correct Score provider requires a viable independent API/source; Sportmonks/TXODDS is the current candidate.
- **C0082** — true spatial/pressing/line-height/channel work requires licensed tracking/event data.

Do not invent more model complexity merely to create work. The highest-value next evidence is genuine forward scoring.

## 15. Near-term operating sequence

1. Keep A0005, E0007 and W0002 frozen.
2. Let guarded near-close capture run before GW2 fixtures.
3. Investigate immediately if a finished A0005 fixture lacks exactly seven evaluation rows.
4. At 10/10 GW2 VALIDATION, compare all seven A0005 variants without retuning.
5. Score E0007 independently under its already-frozen rule.
6. Preserve GW3 as TEST.
7. Keep GW4/GW5 W0002 separate and precommitted.
8. Apply C0125 effect-family promotion gates only when genuine forward sample thresholds exist.
9. Do not auto-promote any model/effect.

## 16. C0129/C0130 reconciliation state

C0129 synchronized Supabase execution truth, GitHub handover/decision documentation and the fuller local tracker after overnight execution. C0130 was opened by the first post-reconciliation audit because the finalized `FIE_Tracker_C0129.xlsx` referenced by C0129 was missing from the current local runtime while the pre-final working workbook was present.

C0130 recovery outcomes:
- regenerated the finalized `FIE_Tracker_C0129.xlsx` from the reconciled working artifact;
- finalized the C0129 workbook row to `Completed / Verified`;
- emitted `FIE_Tracker_C0130.xlsx` as the current local tracker including C0130;
- formula-error scan remained clean;
- no forecast/model/experiment data changed;
- A0005, E0007 and W0002 remained frozen and integrity-clean.

## 17. Resume command for the next conversation

When the user says to continue this project:
1. Read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`.
2. Query `public.change_tracker_working`.
3. Run `private.audit_change_tracker_governance_v01()` and resolve any ledger violation before material work.
4. Query `private.a0005_forward_validation_status_v01()` and `private.w0002_forward_validation_status_v01()`.
5. Query `private.c0120_forward_candidates_v01()` and `private.c0120_forward_evaluation_v01()`; never change E0007's frozen definition from GW2 evidence.
6. If a GW2 fixture is finished but its seven A0005 evaluations are missing, investigate result-sync/evaluator integrity before model analysis.
7. If GW2 is complete, analyze VALIDATION without retuning and preserve GW3 as TEST.
8. Preserve all retrospective-vs-forward distinctions.
9. Update the working ledger during engineering.
10. Regenerate/update the Excel tracker locally at the end of the work block; **never push the Excel tracker to GitHub**.