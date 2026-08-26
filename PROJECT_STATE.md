# Football Intelligence Engine — Project State

_Last updated: 2026-08-26_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research.

Permanent rules:
- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Retrospective replay/shadow work is stored separately and never presented as a genuine historical prediction.
- Missing data is not zero.
- Preserve provenance plus `known_at` / `captured_at` / `evidence_cutoff` timestamps.
- Never commit secrets/API keys.
- Unvalidated betting intelligence remains `model_effect_enabled=false` until genuine out-of-sample forward validation passes.
- Distinguish planned / coded / committed / deployed / executed / verified.
- Do not tune on GW1 and then call a same-GW rerun independent validation.
- Process quality and result quality are evaluated separately.
- Negative experiments are first-class evidence and must not be retuned until they look successful.
- A0005, E0007 and W0002 are frozen under their registered rules; outcome-driven rewrites require a new experiment/version/Change ID.

## 2. Source of truth and change management

Supabase project: `knooiwezzsxcwhtjtdap`.

Working engineering ledger: `public.change_tracker_working`.

Latest engineering Change ID at this reconciliation is **C0137**. Verified production implementation exists through **C0136**; C0137 is the documentation/tracker reconciliation that brings GitHub and the fuller local Excel register to that production state.

Excel rule:
- Excel is the fuller local project register generated from the working ledger plus historical rows.
- Do **not** push the Excel tracker to GitHub.
- GitHub contains code, migrations, operational handover and decision/history documentation.

Database governance from C0118 is machine-checkable:
- `private.enforce_change_tracker_governance_v01()` validates Change IDs and completion rules;
- `Completed` requires `delivery_stage='Verified'` and implementation references;
- decision-bearing rows require explicit decision references;
- `private.audit_change_tracker_governance_v01()` must remain clean.

For every resumed session:
1. read this file;
2. read `DECISIONS_AND_HISTORY.md`;
3. query `public.change_tracker_working`;
4. run `private.audit_change_tracker_governance_v01()`;
5. inspect A0005 and W0002 status functions;
6. independently inspect current Supabase/GitHub production state before material work.

## 3. Genuine forward-validation cohorts

### W0001 / A0005 / E0006 — primary independent cohort

- GW2 = `VALIDATION`.
- GW3 = `TEST`.
- 20 complete fixtures.
- A0005 has 7 frozen variants and 140 frozen predictions.
- `actual_data_used=false`.
- `model_effect_enabled=false`.

Latest verified state on 2026-08-26:
- 20 fixtures;
- 140 predictions;
- 0 finished cohort fixtures;
- 0 forward evaluations;
- 0 run/prediction/duplicate-evaluation integrity violations.

C0115 remains operational:
- `private.capture_a0005_near_close_v01()` allows genuine 5–20 minute pre-kickoff capture only;
- `private.evaluate_a0005_forward_v01()` appends finished-fixture evaluations;
- unavailable CLV remains `NULL`, never reconstructed;
- GW2 cannot be used for same-cohort retuning;
- GW3 is separate TEST confirmation;
- no automatic promotion.

Do not modify A0005 before or during scoring.

### W0002 / E0008 — second independently precommitted cohort

C0121 created W0002 before GW2 outcomes were known:
- GW4 = `VALIDATION`;
- GW5 = `TEST`;
- 20/20 fixtures complete;
- full pre-kickoff chain already populated: availability, roles, team tactics, replacement research, tactical matchups, canonical features, structural forecasts, Elo candidates and enriched forecasts;
- dedicated near-close capture/evaluator crons are active;
- 0 evaluations;
- 0 integrity violations;
- A0005 remains untouched.

Production functions:
- `private.capture_w0002_near_close_v01()`;
- `private.evaluate_w0002_forward_v01()`;
- `private.w0002_forward_validation_status_v01()`.

## 4. Validation infrastructure — C0049

C0049 remains **In Progress / Executed** only because genuine forward outcome accumulation is incomplete. Core infrastructure is operational.

Verified components include:
- C0050 chronology-safe pre-match feature snapshots;
- C0051 immutable experiment registry;
- C0052 walk-forward cohort engine;
- C0053 immutable ablation framework;
- C0054/C0114 calibration backend and live Performance control room;
- C0055 promotion gate;
- C0056 retrospective historical pre-match archive;
- C0057 version registry;
- C0109 process-vs-outcome scoring;
- C0115 guarded near-close capture / automatic evaluation;
- C0121 second forward cohort;
- C0135 always-available rolling upcoming-GW FPL snapshot pipeline.

Historical archive evidence remains retrospective-safe training evidence, not genuine forward validation.

## 5. Production FPL decision pipeline — C0135 / C0136

### C0135 — always-available upcoming-GW snapshot — VERIFIED

The FPL API previously had no GW2 snapshot because no scheduler generated `gameweek_prediction_runs`. The API itself was behaving correctly by refusing mutable/unfrozen state.

C0135 fixes the upstream pipeline using rolling immutable pre-deadline snapshots:
- target the earliest future-deadline GW;
- generate a new frozen 600-player projection run and legal 15-man decision snapshot;
- suppress redundant runs for roughly four hours;
- permit a final refresh in the last 30 minutes before the derived deadline;
- refuse generation after deadline;
- automatically roll to the next future GW.

Production:
- `private.generate_upcoming_fpl_snapshot_v01()`;
- `private.fpl_upcoming_snapshot_status_v01()`;
- cron `football_intelligence_fpl_upcoming_snapshot` every five minutes.

First verified GW2 run 5:
- 600 predictions;
- 3-5-2;
- XI xPts 49.428;
- Tzolis captain;
- Mbeumo vice;
- zero null-core/tail/chronology violations;
- immutable mutation guards passed.

### C0136 — adaptive current-season assimilation — VERIFIED

Opening-week FPL projections must not remain anchored almost entirely to 2025/26. C0136 lets completed 2026/27 evidence affect **future rolling FPL projections only** while keeping betting validation cohorts frozen.

Production source hierarchy:
1. official FPL results/player outcomes;
2. Football-Data.co.uk 2026/27 E0 — 20/20 GW1 team-sides;
3. Understat — 17/20 GW1 current-team xG sides;
4. FPL-Core-Insights/FotMob-derived competitive enrichment where processed.

Football-Data vs Understat xG overlap on 17 team-sides: correlation 0.9790, MAE 0.1828. When both exist, xG is blended rather than blindly privileging one source.

Current-season base team weight:
- retained EPL team after 1 match: 25%;
- promoted / weak-baseline team after 1 match: 33.3%;
- effective weight is reduced for incomplete process coverage;
- cap is 85% as the current-season sample grows.

Process-led weights use null-aware renormalization:
- xG/xGA 50%;
- shots 15%;
- shots on target 10%;
- big chances 10%;
- goals 10% attacking / 15% defensive concession;
- possession + pass accuracy jointly 5% attacking-control context when both exist.

Player actual goals/assists provide only small positive confirmation with a strong prior and a +5% cap. They do not create hindsight-style large boosts or negative double punishment.

Verified immutable GW2 run 9 after assimilation:
- 600 predictions;
- 3-5-2;
- XI xPts 50.141;
- Tzolis captain;
- Mbeumo vice;
- zero null-core/tail/deadline/target-actual violations.

Important separation:
- C0136 may change future rolling **FPL** snapshots from completed prior matches;
- it does **not** alter W0001/A0005, E0007 or W0002;
- it is not retrospective evidence for betting-model promotion.

## 6. Learned signal effects — current decision state

### C0068 / C0123 — regularized residual effects — VERIFIED

Chronology-safe ridge model:
- 688 training rows;
- six-row Jan-31 gap;
- untouched 210-row Feb–May holdout.

No non-zero candidate improved both MAE and RMSE. Selected decision: **SHRINK_TO_ZERO_NO_DUAL_METRIC_GAIN**. Unsupported tactical/personnel/quality families remain unlearned rather than zero-filled. No active effect.

### C0072 / C0124 — manual vs learned ablation — VERIFIED

Common untouched holdout:
- baseline MAE/RMSE 0.639759 / 0.817821;
- small combined manual recent-form package 0.637791 / 0.817136;
- opponent-defence trend alone improved both modestly;
- own-form alone worsened RMSE;
- schedule/fatigue remains rejected;
- learned RSE0001 remains zero.

Decision: retain the small combined manual form package only as a research comparator. No retrospective activation.

### C0073 / C0125 — effect-family promotion gate — VERIFIED

Requires genuine forward evidence:
- >=50 VALIDATION observations;
- >=30 TEST observations;
- >=0.005 absolute Brier improvement in both;
- no log-loss regression;
- process MAE within 2%;
- zero integrity violations.

Historical evidence alone cannot pass. Automatic activation is impossible.

### C0069 / C0126 — nonlinear curves — VERIFIED / REJECTED

Linear-unclipped, clipped-linear, tanh and softsign each produced one pass, one fail and one mixed chronological window.

Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`.

### C0070 / C0127 — coverage shrinkage — VERIFIED

- missing `sample_l10` remains missing;
- 1–9 prior matches: residual research weight 0;
- >=10: weight 1.

Partial weighting harmed the 5–7 and 8–9 bins relative to zero. No active forecast connection.

### C0071 / C0132 — team hierarchical residual shrinkage — VERIFIED / REJECTED

Fixed team partial-pooling candidates K=5/10/20/40 plus global control were tested on three chronology-separated windows.

- W1 supported stronger pooling.
- W2 worsened RMSE for every hierarchy.
- W3 produced either dual regression or an MAE/RMSE tradeoff.

Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`. C0071 is closed as a tested negative hypothesis; no team-specific residual coefficient is activated.

## 7. Team strength and goal/outcome distribution

### C0104 / C0105 / C0112 — team-strength calibration — MONITORING

Historical diagnosis: the older engine often estimated total goal volume reasonably but allocated xG too evenly between teams.

Persistent Elo candidate:
- 3,496 historical team-side observations;
- model `team_strength_linear_v0.3_elo`;
- beats v0.2 on multiple historical holdouts;
- 10/10 GW2 and 10/10 GW3 candidates frozen;
- retrospective GW1 follow-up: 8/10 direction, Brier 0.495188, process MAE 0.677928.

C0112 remains Monitoring until genuine GW2/GW3 evidence exists.

C0136 current-season assimilation is allowed to alter rolling FPL projections only; it does not change this frozen betting-validation lineage.

### C0106 / C0128 — venue context — VERIFIED / REJECTED

25%, 50% and 100% context-specific venue blends failed cross-window MAE/RMSE stability across four historical windows. A favorable six-team-side retrospective GW1 diagnostic was too sparse/non-independent to override that result.

Decision: no additional venue effect.

### C0058 — retained score distribution

Independent Poisson remains retained for now. Dixon–Coles, bivariate Poisson and over-dispersed alternatives did not establish a stable proper-score improvement with fixed lambdas.

### C0063 / C0133 — mean-preserving mismatch mixture — OPEN RESEARCH

C0063 has been restored as **Pending / Planned**. C0133 is **In Progress / Planned** and was registered before any training-grid evaluation.

Design:
- exact 449-fixture chronology-safe sample;
- 344-fixture training window selects fixed mismatch threshold/intensity candidates;
- one untouched 105-fixture Feb–May holdout evaluation;
- candidate must improve Brier and exact-score log loss without degrading exact-hit/calibration;
- team mean lambdas remain preserved by construction;
- no GW1 tuning and no holdout-driven candidate selection;
- no A0005/E0007/W0002 mutation.

No C0133 benchmark result exists yet. Do not infer one.

## 8. Player quality / absence consequence — C0091 / C0092 / C0131

C0091 remains **Monitoring** because absence-consequence/model-effect validation still depends on genuine forward evidence.

### C0092 / C0117 / C0131 — player ability prior — VERIFIED

The prior is now genuinely multi-season where EPL evidence exists.

C0131 ingested 2024/25 FPL-Core-Insights evidence:
- 38/38 GWs;
- 11,567 source player-match rows;
- 7,583 mapped current-player rows;
- 3,984 intentionally unmapped historical-only rows;
- identity resolved by stable player code, never display name alone.

v3 current outfield priors:
- 341 total;
- 216 have genuine two-season blends with >=450 older minutes and required components;
- 125 remain one-season because older EPL evidence is absent/insufficient rather than fabricated;
- position-specific cross-season persistence is shrunk;
- opponent-Elo adjustment requires reconciled team context and coverage;
- append-only/idempotent checks passed;
- `model_effect_enabled=false`.

C0092 is **Completed / Verified**. Multi-season is a per-player evidence property, not a requirement that every current player must have EPL history two seasons ago.

## 9. Spatial / tactical evidence — C0082 / C0083 / C0084

C0083 source audit ranked defensible production options:
1. Opta Vision;
2. Hudl integrated event + tracking;
3. SkillCorner.

C0084 deployed immutable vendor-neutral manifests, raw artifact/chunk metadata, raw event index and provider-native zone definitions with RLS and append-only controls.

C0082 remains **Blocked / Executed** because the project still lacks licensed production spatial/tracking access. Do not relabel spatial-lite proxies as true pressing, PPDA, line height or side-specific channel geometry.

## 10. Market intelligence

Correct Score remains research-only; `value_edge_available=false` until genuine validation.

Bet365 + Unibet remain the main captured sources.

### C0034 — third Correct Score source — BLOCKED

Pinnacle produced no usable selections. Genuine pre-kickoff GW2 tests of William Hill, Betway and BetVictor through Odds-API.io matched 10/10 events but wrote zero normalized selections; provider responses included 403/429 behavior.

Current independent candidate: Sportmonks Premium Odds powered by TXODDS. Keep C0034 Blocked until a real third provider produces normalized pre-kickoff Correct Score selections.

### C0120 / E0007 — xG-modal Correct Score hypothesis — IN PROGRESS / EXECUTED

Historical O/U interpretation failed:
- gap >=1.2, n=71;
- closing-average Over 2.5 ROI -7.92%;
- Aug–Dec +2.07% vs Jan–May -14.05%;
- disagreement filters worsened robustness.

Do not call the raw xG-modal gap a validated O/U edge.

E0007 remains frozen prospectively:
- W0001/A0005 only;
- gap >=1.2;
- BASE_V03_ELO + FULL_V04_ELO_NO_SCHEDULE;
- Bet365 + Unibet both required;
- exact-score p >=1%;
- higher-total candidate score;
- raw EV >0 at both books for both variants;
- genuine 5–20 minute near-close preferred;
- GW2 VALIDATION cannot retune;
- GW3 remains TEST;
- `model_effect_enabled=false`.

Current early state remains five Aston Villa–Arsenal scorelines, all `EARLY_FALLBACK` and not recommendations.

## 11. Security — C0045 / C0122 — VERIFIED

C0045 mapped dependencies before permission changes. C0122 then:
- enabled RLS on seven previously exposed legacy tables;
- removed direct anon/auth table grants from those and additional legacy tables;
- removed anon/auth public-sequence usage;
- removed anon/auth execution from mutating replay/research RPCs while keeping service-role paths;
- smoke-tested FPL, Fixtures and Betting APIs successfully;
- changed no forecast/model data.

Legacy RLS/grant cleanup is no longer an unresolved workstream.

## 12. Retrospective GW1 evidence — reference only

### Blind current-engine fixture replay

Run 2 with Elo:
- direction 8/10;
- Brier 0.495188;
- score log loss 2.928976;
- process MAE 0.677928;
- xG-gap error 0.996323.

It is retrospective follow-up, not independent validation.

### C0134 dual blind proof-test — VERIFIED negative/mixed diagnostic

This is `RETROSPECTIVE_BLIND_REPLAY`, not forward validation.

Betting track:
- genuine two-book pre-kickoff prices existed for only 3/10 fixtures;
- fixed 1X2/O2.5 rule produced 5 actions;
- 1 win;
- -3.27u;
- -65.4% ROI;
- 1X2 0/3, -100%;
- totals 1/2, -13.5%;
- strict Correct Score rule produced zero bets.

Interpretation: strong retrospective fixture-direction accuracy did not translate into profitable market disagreement. Do not tune thresholds to rescue GW1.

FPL track:
- 4-5-1 optimizer;
- Tzolis captain, Bruno vice;
- selected XI 53 points + 6 captain = 59;
- same-squad hindsight ceiling 67;
- 88.1% captured;
- full-15 xPts MAE 2.6927, RMSE 3.5694.

Important limitation: the source GW1 FPL prediction batch was generated **after the deadline** and is already excluded from backtest. It was blind to the result but is not a deadline-valid historical FPL backtest.

## 13. UI / explainability — C0119 — VERIFIED

Performance shadow cards show home/away xG, mean total and top-three exact-score probabilities; use a result-hidden pre-match thesis; separate actual result into a post-match audit; and omit unsupported personnel/H2H claims. This is read-only and does not mutate forecasts.

## 14. Current unresolved work

### In Progress / Executed
- **C0049** — infrastructure operational; waiting for genuine forward outcomes and CLV/comparison completion.
- **C0120** — E0007 waiting for genuine forward near-close prices/outcomes.

### In Progress / Planned
- **C0133** — mean-preserving mismatch-mixture benchmark registered; training-grid/holdout work not yet executed.

### Pending / Planned
- **C0063** — parent game-state/mismatch-mixture research item; being addressed through C0133.

### Monitoring / forward-evidence dependent
- C0066 learned signal effect sizes;
- C0074 signal interactions;
- C0091 player quality/absence consequence;
- C0104 team-strength calibration;
- C0105 lambda/team-strength signal;
- C0112 persistent Elo signal.

### Blocked / external dependency
- **C0034** — third normalized Correct Score source;
- **C0082** — licensed spatial/tracking data.

Do not manufacture work by adding complexity that lacks an independently justified experiment. The highest-value evidence remains genuine forward scoring.

## 15. Near-term operating sequence

1. Keep A0005, E0007 and W0002 frozen.
2. Keep C0135/C0136 rolling FPL snapshots pre-deadline and immutable; completed prior matches may update only future FPL decisions.
3. Let guarded near-close capture run before GW2 fixtures.
4. If a finished A0005 fixture lacks exactly seven evaluation rows, investigate result-sync/evaluator integrity before model analysis.
5. At 10/10 GW2 VALIDATION, compare all seven A0005 variants without retuning.
6. Score E0007 independently under its frozen rule.
7. Preserve GW3 as TEST and GW4/GW5 as the separate W0002 validation/test cohort.
8. Apply C0125 effect-family gates only after genuine sample thresholds exist.
9. C0133 may be executed because it has a pre-registered chronology-safe train/holdout design; do not choose candidates from the untouched holdout.
10. Do not auto-promote any betting model/effect.

## 16. Reconciliation state — C0129 / C0130 / C0137

C0129 reconciled production through C0128. C0130 repaired the local tracker artifact referenced by C0129 after a runtime lost the finalized file.

Production subsequently advanced to C0136. C0137 was therefore registered before a new reconciliation pass to:
- update this operational handover;
- consolidate decision/history through the new implementation set;
- rebuild the fuller local Excel tracker through C0137;
- verify current governance and frozen-cohort integrity.

The tracker is a convenience artifact; Supabase execution truth remains authoritative.

## 17. Resume command for the next conversation

When the user says to continue:
1. read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`;
2. query `public.change_tracker_working`;
3. run `private.audit_change_tracker_governance_v01()`;
4. query `private.a0005_forward_validation_status_v01()` and `private.w0002_forward_validation_status_v01()`;
5. query C0120 candidates/evaluation without changing E0007;
6. check current upcoming-GW FPL snapshot status and C0136 current-season state before FPL decisions;
7. if GW2 fixtures are finished, verify evaluator completeness before analysis;
8. if C0133 is still Planned, preserve its registered 344-train / 105-holdout design during execution;
9. preserve retrospective-vs-forward distinctions and missing-is-not-zero;
10. update the working ledger for material work;
11. regenerate/update the Excel tracker locally at the end of the work block; never commit it to GitHub.