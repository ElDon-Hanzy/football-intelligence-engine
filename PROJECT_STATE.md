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
- Distinguish Planned / Coded / Committed / Deployed / Executed / Verified.
- Do not tune on GW1 and call a same-GW rerun independent validation.
- Process quality and result quality are evaluated separately.
- Negative experiments are first-class evidence and must not be retuned until they look successful.
- A0005, E0007 and W0002 are frozen under their registered rules; outcome-driven rewrites require a new experiment/version/Change ID.

## 2. Source of truth and governance

Supabase project: `knooiwezzsxcwhtjtdap`.
Working engineering ledger: `public.change_tracker_working`.
Fuller local register: `FIE_Tracker_C0137.xlsx`; never commit the Excel tracker to GitHub.

Latest engineering Change ID is **C0137**. Current working-ledger state after reconciling C0133:
- 64 rows total;
- 54 Completed / Verified;
- 2 In Progress / Executed;
- 6 Monitoring / Executed;
- 2 Blocked / Executed.

Governance is enforced by `private.enforce_change_tracker_governance_v01()` and audited by `private.audit_change_tracker_governance_v01()`. Completed rows require Verified stage and implementation references; decision-bearing rows require decision references.

For every resumed session:
1. read this file;
2. read `DECISIONS_AND_HISTORY.md`;
3. query `public.change_tracker_working`;
4. run the governance audit;
5. query A0005 and W0002 status functions;
6. independently inspect current Supabase/GitHub state before material work.

## 3. Genuine forward-validation cohorts

### W0001 / A0005 / E0006 — primary independent cohort

- GW2 = `VALIDATION`.
- GW3 = `TEST`.
- 20 complete fixtures.
- 7 frozen variants, 140 frozen predictions.
- `actual_data_used=false`.
- `model_effect_enabled=false`.

Latest verified state on 2026-08-26:
- 0 finished cohort fixtures;
- 0 forward evaluations;
- 0 run/prediction/duplicate-evaluation integrity violations;
- decision state `ACCUMULATING_GW2_VALIDATION`.

C0115 remains operational:
- `private.capture_a0005_near_close_v01()` permits genuine 5–20 minute pre-kickoff market capture only;
- `private.evaluate_a0005_forward_v01()` appends finished-fixture evaluations;
- unavailable CLV remains `NULL`, never reconstructed;
- GW2 cannot be used for same-cohort retuning;
- GW3 remains separate TEST;
- no automatic promotion.

Do not modify A0005 before or during scoring.

### W0002 / E0008 — second independently precommitted cohort

C0121 froze W0002 before GW2 outcomes were known:
- GW4 = `VALIDATION`;
- GW5 = `TEST`;
- 20/20 fixtures complete;
- full pre-kickoff availability/roles/tactics/replacement/matchup/features/forecast chain already populated;
- dedicated near-close and evaluator crons active;
- 0 evaluations;
- 0 integrity violations;
- decision state `ACCUMULATING_GW4_VALIDATION`;
- A0005 untouched.

## 4. Validation infrastructure — C0049

C0049 remains **In Progress / Executed** only because genuine forward outcome accumulation and resulting comparison/CLV evidence are incomplete. Core infrastructure is operational: canonical snapshots, immutable experiment/ablation registries, walk-forward cohorts, calibration surfaces, promotion gates, historical chronology-safe archive, process-vs-outcome scoring, near-close capture and automatic evaluation.

Historical archive evidence is retrospective-safe training evidence, not genuine forward validation.

## 5. Production FPL decision pipeline — C0135 / C0136

### C0135 — always-available upcoming-GW snapshot — VERIFIED

The correct fix for the earlier `No frozen snapshot for GW2` condition was an upstream scheduler, not weakening `fpl-api`.

Rolling immutable pre-deadline snapshots now:
- target the earliest future-deadline GW;
- create a frozen 600-player projection run plus legal 15-man decision snapshot;
- suppress redundant runs for roughly four hours;
- permit a final refresh near deadline;
- refuse generation after deadline;
- roll automatically to the next future GW.

Cron: `football_intelligence_fpl_upcoming_snapshot` every five minutes.

First verified GW2 run 5: 600 predictions, 3-5-2, XI xPts 49.428, Tzolis captain, Mbeumo vice; zero null-core/tail/chronology violations.

### C0136 — adaptive current-season assimilation — VERIFIED

Completed 2026/27 evidence can update **future rolling FPL projections only**. Frozen betting cohorts are unchanged.

Current source hierarchy:
1. official FPL outcomes/player evidence;
2. Football-Data.co.uk E0 — 20/20 GW1 team-sides;
3. Understat xG — 17/20 GW1 team-sides;
4. FPL-Core-Insights/FotMob-derived competitive enrichment where processed.

Football-Data vs Understat xG overlap on 17 team-sides: correlation 0.9790, MAE 0.1828. When both exist, xG is blended rather than blindly privileging one source.

After one match:
- retained teams receive 25% base current-season weight;
- promoted/weak-baseline teams receive 33.3%;
- coverage reduces effective weight when process evidence is incomplete;
- current-season weight is capped at 85% as sample grows.

Process-led blend is null-aware: xG/xGA 50%, shots 15%, shots on target 10%, big chances 10%, goals 10% attack / 15% defensive concession, possession+pass accuracy jointly 5% when available. Missing metrics are excluded, never zero-filled.

Actual player goals/assists provide only small positive confirmation with a strong prior and +5% caps.

Verified immutable GW2 run 9: 600 predictions, 3-5-2, XI xPts 50.141, Tzolis captain, Mbeumo vice; zero null/tail/deadline/target-actual violations.

## 6. Learned signal effects — current decision state

### C0068 / C0123 — regularized residual effects — VERIFIED

688 training rows, six-row Jan-31 gap, untouched 210-row Feb–May holdout. No non-zero ridge candidate improved both MAE and RMSE. Decision: `SHRINK_TO_ZERO_NO_DUAL_METRIC_GAIN`. Unsupported tactical/personnel/quality families remain unlearned rather than zero-filled.

### C0072 / C0124 — manual vs learned ablation — VERIFIED

On the same holdout, the small combined manual recent-form package modestly improved both MAE and RMSE; opponent-defence trend alone also improved both; own-form alone worsened RMSE; schedule/fatigue remained negative; learned RSE0001 remained zero.

Decision: retain the combined manual form package only as a research comparator. No retrospective activation.

### C0073 / C0125 — effect-family promotion gate — VERIFIED

Requires >=50 genuine VALIDATION observations, >=30 TEST observations, >=0.005 Brier improvement in both, no log-loss regression, process MAE within 2%, and zero integrity violations. Historical evidence alone cannot pass; automatic activation is impossible.

### C0069 / C0126 — nonlinear curves — VERIFIED / REJECTED

Linear-unclipped, clipped-linear, tanh and softsign each produced one pass, one fail and one mixed chronological window. Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`.

### C0070 / C0127 — coverage shrinkage — VERIFIED

Missing `sample_l10` remains missing; 1–9 prior matches receive residual research weight 0; >=10 receives weight 1. Partial weighting harmed sparse bins.

### C0071 / C0132 — hierarchical residual shrinkage — VERIFIED / REJECTED

Team partial-pooling K=5/10/20/40 helped the earliest historical window but failed later windows. Decision: `REJECT_NO_CROSS_WINDOW_STABILITY`; no team-specific residual coefficient is activated.

## 7. Team strength and goal/outcome distribution

### C0104 / C0105 / C0112 — team-strength calibration — MONITORING

Persistent Elo candidate:
- 3,496 historical team-side observations;
- `team_strength_linear_v0.3_elo` beats v0.2 on multiple historical holdouts;
- 10/10 GW2 and 10/10 GW3 candidates frozen;
- retrospective GW1 follow-up: 8/10 direction, Brier 0.495188, process MAE 0.677928.

This is still Monitoring until genuine GW2/GW3 evidence exists. C0136 affects rolling FPL only and does not change this frozen betting-validation lineage.

### C0106 / C0128 — venue context — VERIFIED / REJECTED

25%, 50% and 100% context-specific venue blends failed cross-window stability. A favorable six-team-side retrospective GW1 diagnostic was too sparse/non-independent to override the historical result. No additional venue effect.

### C0058 — retained score distribution

Independent Poisson remains retained. Dixon–Coles, bivariate Poisson and generic over-dispersion did not establish a stable multi-metric improvement with fixed lambdas.

### C0063 / C0133 — mean-preserving mismatch mixture — VERIFIED / REJECTED

C0133 was already executed in production on 2026-08-25 but its working-ledger stage had remained stale until the 2026-08-26 reconciliation.

Experiment design:
- chronology-safe 449-fixture lineage;
- 344 fixtures through 2026-01-31 for candidate screening;
- 105 Feb–May fixtures reserved as untouched holdout;
- 50/50 opposite regimes for fixtures above a lambda-gap threshold;
- regime 1: favorite λ × (1+d), underdog λ × (1-d);
- regime 2: favorite λ × (1-d), underdog λ × (1+d);
- equal mixing preserves each team's unconditional mean lambda;
- thresholds 0.50 / 0.75 / 1.00;
- deltas 0.10 / 0.20 / 0.30.

Training result:
- Poisson control NLL 1029.988205, exact-score log loss 2.994152;
- every one of the nine mixture candidates was worse;
- best non-control `GAP100_D10`: NLL 1030.003100, +0.014895 worse, affecting only one training fixture;
- `GAP050_D10`: +0.277796 NLL worse; larger deltas degraded further.

Decision: **`REJECT_TRAINING_LIKELIHOOD`**.

Because no predeclared candidate passed the training screen, none qualified to consume the reserved holdout. Opening the 105-fixture holdout to rescue or select a candidate would violate the pre-registered discipline. The holdout therefore remains untouched. Independent Poisson stays retained.

Production evidence: `public.mismatch_mixture_benchmarks`; applied migration `20260825112613_c0133_mean_preserving_mismatch_mixture_benchmark_v01`; GitHub migration snapshot and `project-management/C0133_MISMATCH_MIXTURE_BENCHMARK.md`. RLS is enabled, anon/auth direct grants are absent, the table is append-only, `actual_data_used=false`, `model_effect_enabled=false`.

## 8. Player quality / absence consequence — C0091 / C0092 / C0131

C0091 remains **Monitoring** because absence-consequence/model-effect validation requires genuine forward evidence.

C0092 is **Completed / Verified** after C0131 ingested a genuine 2024/25 player season:
- 38/38 GWs;
- 11,567 source player-match rows;
- 7,583 mapped current-player rows;
- 3,984 intentionally unmapped historical-only rows;
- identity by stable player code, never display-name-only.

Current v3 outfield priors: 341 total; 216 genuine two-season blends; 125 remain one-season because older EPL evidence is absent/insufficient. Missing evidence is never fabricated. Model effect remains disabled.

## 9. Spatial / tactical evidence — C0082 / C0083 / C0084

C0083 ranked defensible production providers: Opta Vision, Hudl integrated event+tracking, SkillCorner. C0084 deployed immutable vendor-neutral spatial manifests/artifact metadata/event index/zone definitions.

C0082 remains **Blocked / Executed** because licensed production spatial/tracking access is still missing. Do not relabel spatial-lite proxies as true pressing, PPDA, line height or side-specific geometry.

## 10. Market intelligence

Correct Score remains research-only; `value_edge_available=false` until genuine validation. Bet365 + Unibet remain the main captured sources.

### C0034 — third Correct Score source — BLOCKED

Pinnacle produced no usable selections. Genuine GW2 William Hill/Betway/BetVictor tests through Odds-API.io matched 10/10 events but wrote zero normalized selections and encountered 403/429 provider behavior. Sportmonks Premium Odds / TXODDS is the current candidate, but C0034 stays Blocked until a real third provider actually produces normalized pre-kickoff Correct Score selections.

### C0120 / E0007 — xG-modal Correct Score hypothesis — IN PROGRESS / EXECUTED

The historical O/U interpretation failed: gap >=1.2 had closing-average Over 2.5 ROI -7.92%, with Aug–Dec +2.07% and Jan–May -14.05%; disagreement filters worsened robustness.

Do not call raw xG-minus-modal gap a validated O/U edge.

E0007 remains frozen prospectively: W0001/A0005 only; gap >=1.2; BASE_V03_ELO + FULL_V04_ELO_NO_SCHEDULE; Bet365+Unibet both required; exact-score p>=1%; higher-total scoreline; raw EV>0 across both variants and both books; genuine 5–20 minute near-close preferred; GW2 cannot retune; GW3 remains TEST; model effect disabled.

Current early state remains five Aston Villa–Arsenal scorelines, all `EARLY_FALLBACK` and not recommendations.

## 11. Security — C0045 / C0122 — VERIFIED

C0045 mapped dependencies. C0122 then enabled RLS on legacy exposed tables, removed direct anon/auth table and sequence grants, restricted mutating replay/research RPCs while preserving service-role application paths, and smoke-tested the live APIs. No forecast/model data was changed.

## 12. Retrospective GW1 evidence — reference only

Blind current-engine Elo follow-up: 8/10 direction, Brier 0.495188, score log loss 2.928976, process MAE 0.677928, xG-gap error 0.996323. It is retrospective follow-up, not independent validation.

C0134 dual blind proof-test is also retrospective only:
- genuine two-book prices for only 3/10 fixtures;
- five fixed market actions, one win, -3.27u, -65.4% ROI;
- 1X2 0/3, totals 1/2, strict Correct Score zero bets;
- FPL optimizer produced 59 points versus 67 same-squad hindsight ceiling = 88.1% captured;
- full-15 xPts MAE 2.6927, RMSE 3.5694;
- source FPL prediction batch was generated post-deadline and is excluded from backtest, so blind-to-result is not deadline-valid.

## 13. Current unresolved work

### In Progress / Executed
- **C0049** — infrastructure operational; awaiting genuine forward outcomes and resulting CLV/comparison completion.
- **C0120** — E0007 awaits genuine forward near-close prices/outcomes.

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

There are currently no Planned/Pending rows in the working ledger. Do not manufacture new model complexity merely to create work. The highest-value evidence now is genuine forward scoring.

## 14. Near-term operating sequence

1. Keep A0005, E0007 and W0002 frozen.
2. Keep C0135/C0136 rolling FPL snapshots pre-deadline and immutable; completed prior matches may update only future FPL decisions.
3. Let guarded near-close capture run before GW2 fixtures.
4. If a finished A0005 fixture lacks exactly seven evaluation rows, investigate result-sync/evaluator integrity before model analysis.
5. At 10/10 GW2 VALIDATION, compare all seven A0005 variants without retuning.
6. Score E0007 independently under its frozen rule.
7. Preserve GW3 as TEST and GW4/GW5 as separate W0002 VALIDATION/TEST.
8. Apply C0125 effect-family gates only after genuine sample thresholds exist.
9. Do not auto-promote any betting model/effect.
10. Do not create a new experiment solely because the working ledger has no Planned row; require an independently justified question and Change ID first.

## 15. Reconciliation state — C0129 / C0130 / C0137

C0129 reconciled production through C0128. C0130 repaired a lost finalized local tracker artifact. C0137 then reconciled GitHub and the fuller local Excel tracker through C0136.

A post-C0137 inspection found that C0133 had actually been executed and documented on 2026-08-25 while its working-ledger status remained Planned. That stale state is now corrected in Supabase and the local tracker; the applied migration has also been preserved in GitHub. This did not rerun C0133 or consume its holdout.

Supabase execution truth remains authoritative; documentation/tracker drift is corrected to production, never the other way around.

## 16. Resume command

When the user says to continue:
1. read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md`;
2. query `public.change_tracker_working`;
3. run `private.audit_change_tracker_governance_v01()`;
4. query A0005 and W0002 status functions;
5. query C0120 candidates/evaluation without changing E0007;
6. check the latest upcoming-GW FPL snapshot and C0136 state before FPL decisions;
7. if GW2 fixtures are finished, verify evaluator completeness before analysis;
8. preserve all retrospective-vs-forward distinctions and missing-is-not-zero;
9. update the working ledger before material work;
10. regenerate/update the local Excel tracker at the end of any material work block; never commit it to GitHub.