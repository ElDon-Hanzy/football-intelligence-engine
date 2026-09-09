# Football Intelligence Engine — Project State

_Last updated: 2026-09-09 (Dubai) — through C0236 chronology-safe serving closeout_

## 1. Purpose and immutable rules

Build one football-intelligence engine for FPL decision quality and betting-market mispricing research, with one FPL objective: maximize the probability of finishing #1 Overall.

Permanent rules:

- Historical FPL and betting forecasts are append-only and never rewritten after results.
- Genuine fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Completed-match evidence may update future decisions only.
- Retrospective replay/shadow work is stored separately and never presented as a genuine historical prediction.
- Missing data is not zero.
- Preserve provenance plus `known_at` / `captured_at` / `evidence_cutoff` timestamps.
- Never commit secrets/service-role credentials.
- Unvalidated intelligence remains research/shadow until its registered forward gate passes.
- Distinguish Planned / Coded / Committed / Deployed / Executed / Verified.
- Do not tune on an outcome and then call a same-sample rerun independent validation.
- Negative experiments are first-class evidence.
- Projection readiness is not decision readiness.
- Every meaningful FPL action must compare against ROLL and pass Noise-Control / Decision-Control.
- Ownership/EO has **zero direct xPts effect**. It may influence rank-aware decision utility only after football/value alternatives are already within the model-error band.
- A final autonomous decision gate is allowed to refuse action.

Canonical references:

- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `DECISIONS_AND_HISTORY.md`
- `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_PLAN_20260909.md`
- `project-management/C0226_AUTONOMOUS_FPL_DECISION_ARCHITECTURE_CLOSEOUT_20260909.md`
- `project-management/C0236_CHRONOLOGY_SAFE_HISTORY_SERVING_CLOSEOUT_20260909.md`

## 2. Production source of truth

Supabase project: `knooiwezzsxcwhtjtdap`.
GitHub: `ElDon-Hanzy/football-intelligence-engine`.
Working engineering ledger: `public.change_tracker_working`.

For every resumed engineering session:

1. read this file and `DECISIONS_AND_HISTORY.md`;
2. read the latest relevant handover/change docs;
3. query `public.change_tracker_working`;
4. run `private.audit_change_tracker_governance_v01()`;
5. inspect relevant architecture/readiness/forward-cohort status functions;
6. independently verify current Supabase/GitHub state before material changes.

Live runtime/registry evidence outranks documentation if they disagree.

## 3. Canonical production path

C0213 architecture consolidation is **Completed / Verified**.

Current production path:

`RESULTS → CURRENT DATA → REALIZED ROLES → PLAYER/TEAM STATE → TACTICAL/FIXTURE STATE → C0159 → C0166 → PLAYER PROJECTION → DISTRIBUTION → FULL-POOL OPTIMIZER → STRUCTURAL ENSEMBLE → UNCERTAINTY/ROBUSTNESS → RANK-AWARE DECISION CONTROL → RED-TEAM → AUTONOMOUS FINAL GATE → SAVED MANAGER PLAN → API/UI`

C0213 controls remain active:

- machine-readable component/dependency/capability registry;
- prediction-level effect provenance;
- tracker consumption/evaluator governance;
- definition-hash-bound production behavioral tests;
- retired external runtimes physically removed;
- projection readiness separated from decision readiness.

Latest verified production-effect proof on GW4 run 1354: **14/14 passing**.

## 4. C0214–C0219 reliability foundation

### C0214

Completed / Verified.

- GW3 realized-role starter mapping repaired to 220/220.
- Realized roles use canonical identity mappings and append-only correction semantics.
- C0167 explanation integrity repaired without altering probabilities.

### C0215 / A0005

No promotion. Frozen forward evidence remains insufficient; accumulate more genuine forward samples.

W0002 remains frozen independently.

### C0216

Manager High-Stakes Tactical Regime remains **deferred**. Do not activate without explicit new decision + validation.

### C0217

Completed / Verified storage/ingestion redesign.

- current decision GW: at most one full daily projection snapshot;
- final forced refresh at about T−2h;
- forward GWs use bounded baselines;
- odds scope limited to H2H/1X2, totals, BTTS and correct score;
- redundant writes filtered/disabled.

### C0218

Optimizer implementation is verified, but final GW4 decision lock remains pending the T−2h refresh.

### C0219

Completed / Verified cadence reconciliation.

- C0217 is the sole projection-cadence controller;
- optimizer orchestration no longer forces raw projection writes because live upstream state drifted;
- valid frozen snapshots remain usable until cadence permits a new one;
- accidental historical duplicate runs remain immutable evidence.

## 5. C0220 forecast-integrity repair

C0220 is **Completed / Verified**.

Production player forecast now explicitly handles:

- penalty-attempt/conversion hierarchy and penalty misses;
- realized-role numeric adaptation only for stable material attacking↔defensive/control changes;
- competition-budget constraints so team start probability/minutes do not exceed 11 starters / 990 minutes;
- future-only forecast repair with no historical rewrite.

Role adaptation does not blindly extrapolate one-match positional changes.

## 6. C0221 / C0223 xMins and exact-horizon state

The fixed historical start/minutes priors were repaired so current-season evidence can move both upward and downward.

Current starter-regime logic includes symmetric `STARTER_UP` / `STARTER_DOWN` gates based on repeated starts/non-starts, predicted XI confidence and current evidence.

De Cuyper was the canonical discovery case: his repeated wide-attacking starts could not previously overcome stale historical priors quickly enough.

C0223 then closed the downstream integration gaps:

- canonical matchup selector is consumed by the projection core;
- GW6+ may no longer silently reuse GW5 player state;
- GW4–GW8 have explicit target-GW role/availability state;
- optimizer is role-aware as Decision-Control only, with **no invented role multiplier**;
- role risk may challenge near-equal structures but cannot fabricate xPts.

## 7. Current projection horizon

Current verified production horizon used by the autonomous stack:

- GW4: **run 1354 — PRE_FINAL**
- GW5: run 1348
- GW6: run 1350
- GW7: run 1352
- GW8: run 1353

Each current horizon run carries 604 player forecasts and preserves the 11-start / 990-minute team integrity constraints.

The engine may use GW4–GW8 for strategic comparison, but it must not fabricate further-GW numerical precision where approved forecast inputs do not exist.

## 8. C0224 Parity–Draw Regime

C0224 is **SHADOW / FORWARD MONITOR ONLY**.

Historical + initial forward evidence suggested that slight home/away parity, especially in lower-event environments, may carry more draw propensity than the existing model fully captures.

Key finding: the effect was not monotonic; exact dead-even parity did not simply produce the strongest excess draws.

Promotion gate remains hard:

- at least 60 genuine forward parity fixtures;
- positive residual in two independent forward blocks;
- actual calibration/log-loss improvement.

C0224 has **zero production probability effect** until that gate passes.

## 9. C0225 rank-aware Differential Opportunity / Leverage

C0225 is **Completed / Verified**.

Ownership/EO is a downstream Decision-Control input only.

Permanent semantics:

- low ownership never adds xPts;
- no mandatory differential quota;
- player must first pass football/minutes/role/haul gates;
- leverage can break statistical ties, not rescue a clearly worse projection;
- early season remains EV-first;
- later-season variance may adapt to OR, remaining GWs and distance from #1.

The engine explicitly searches for explosive low-owned opportunities, including the explosive-exception pool, without forcing one into the squad.

## 10. C0226–C0234 Autonomous FPL Decision Architecture

C0226 and child layers C0227–C0234 are **Completed / Verified**.

### C0227 — uncertainty / sensitivity

Tracks explicit uncertainty vectors instead of pretending to have calibrated confidence intervals where none exist. Inputs include minutes/start risk, role confidence, sample depth, inherited confidence and regression dependence.

Examples from the acceptance work:

- João Pedro: materially cleaner uncertainty profile;
- Thiago: higher uncertainty because forecast depends more heavily on finishing regression / penalty assumptions;
- Cherki: high minutes/sample fragility despite explosive upside.

### C0228 — diverse search + equivalence classes

The canonical optimizer now explores multiple structural families through distributed invocations rather than one oversized Edge worker.

The engine is required to discover materially different near-optimal structures instead of presenting one heuristic local optimum as globally certain.

### C0229 — structural/portfolio control

Near-equal squads are compared on structural robustness, marginal £ value, role risk, club-slot opportunity cost, premium access and flexibility rather than meaningless decimal xPts differences.

### C0230 — team regime diagnostic

Shadow/diagnostic only. Tactical/team regime evidence can challenge a decision but currently has zero numeric model effect unless separately validated.

### C0231 — forward management / premium access

Evaluates future transfer burden, expensive-premium reacquisition routes, club-slot bottlenecks and fragile price structures.

### C0232 — rank-aware leverage across ensemble

Applies C0225 game theory across near-equivalent structural families, never by rewriting player xPts.

### C0233 — automatic adversarial red-team

Actively tries to defeat the raw optimizer winner under reasonable uncertainty/role/structure assumptions.

### C0234 — fail-closed final gate

The autonomous final gate may return:

- `FINAL_AUTONOMOUS_DECISION`
- `DECISION_NOT_READY`
- `NO_MEANINGFUL_EDGE`

It is prohibited from forcing a plan when uncertainty, equivalence, structural robustness, red-team, ROLL or chip opportunity-cost gates fail.

First production C0234 evaluation correctly returned **`DECISION_NOT_READY` / action NONE** rather than rubber-stamping the raw optimizer.

The raw Haaland/value family versus Bruno+Saka/no-Haaland family was close enough that adversarial robustness failed; the gate did not pretend the decimal winner was final.

Permanent regression acceptance case:

`240.952 vs 240.841` must be classified as **no meaningful edge / equivalent**, then resolved only by downstream robustness controls.

## 11. Wildcard semantics

A fresh legal 15-man Wildcard comparator now exists independently of the current squad / free-transfer neighborhood.

Current rules encoded in the decision layer include:

- Wildcard = unlimited permanent transfers;
- banked FTs are preserved;
- only one chip per GW;
- first-half Wildcard expires before the GW19 deadline;
- first-half Wildcard is currently available and unused for this FPL entry.

A raw fresh-squad gain is **not enough** to authorize the chip. The autonomous gate also requires robust structural advantage and credible chip opportunity-cost reasoning.

## 12. GW4 manager state and saved plan

FPL Team ID: `3559923` (`ElDon`).

Standing user confirmation: no transfers since GW3 unless subsequently recorded in authoritative manager state.

The latest saved manager-plan head remains **Plan 10**, but it is **provisional and not authorized for execution** by the current autonomous gate.

Plan 10 previously encoded:

- O'Reilly → Guéhi
- Mosquera → Calafiori
- retain Palmer
- captain João Pedro
- vice Bruno
- chip NONE

Do **not** execute Plan 10 simply because it exists. It is historical/provisional decision state pending the final T−2h autonomous refresh.

Current autonomous action: **NONE until final information gate**.

## 13. C0235 PRE-FINAL production cadence

C0235 is **Completed / Verified**.

GW4 run **1354** is the first named `PRE_FINAL` production snapshot.

Semantics:

- each daily PRE_FINAL is a new immutable production run;
- a pointer/history advances to the newest daily PRE_FINAL;
- forecasts are never overwritten;
- daily current-GW generation continues under the C0217 24h cadence until T−2h;
- T−2h begins a separate final-stage generation/autonomous gate.

Current GW4 schedule:

- first kickoff: **2026-09-12 18:00 Dubai**
- FPL deadline: **16:30 Dubai**
- final T−2h refresh: **14:30 Dubai**

The scheduled `GW4 Final Autonomy Gate` automation is set for **2026-09-12 14:30 Asia/Dubai**.

## 14. C0236 chronology-safe website / historical serving

C0236 is **Completed / Verified**.

### Historical FPL

`fpl-api` contract: `fpl_api_v12_chronology_safe`.

Historical/current classification now comes from forecast chronology, not whether a manager-plan row happens to exist.

Verified matrix:

- GW1: `HISTORICAL_FROZEN`, but surviving FPL forecast is not valid pre-deadline model truth → fail closed;
- GW2: valid historical frozen forecast;
- GW3: valid historical frozen forecast;
- GW4: `PRE_FINAL`, 604 players.

Current price/ownership/news is no longer backfilled into old Gameweeks. If historical metadata was never captured, UI says unavailable/not captured.

### Historical fixtures

Only genuinely pre-kickoff tactical evidence is served. Audit found **zero served post-kickoff tactical/role rows** across GW1–GW4.

GW1 really has partial early-model coverage (including only 2/20 tactical team-side profiles), so UI reports partial/unavailable instead of reconstructing history with later models.

### Markets

Correct-score historical serving now uses a scoped cache/index path rather than repeatedly aggregating full raw chronology.

GW1–GW4 `betting-api` regression returns all 10 fixtures per GW with price tracking and zero verified timeout warnings.

### Engine Diagnostics auth

Public browser auth path was repaired after strict CI exposed an invalid embedded public gateway JWT. The UI uses the active public anon credential; no service-role/secret credential is committed.

## 15. Repository / CI state

C0236 strict release and closeout pipelines passed without bypassing gates.

Verified successful pipeline stages include:

- TypeScript typecheck;
- 21 unit tests;
- production build;
- bundle budget;
- full Playwright E2E/accessibility;
- Pages artifact verification;
- legacy rollback integrity;
- GitHub Pages deployment;
- live legacy root verification;
- live `/v2/` verification.

Key C0236 workflows:

- 34329236699 — successful product release after auth repair;
- 34329863729 — successful closeout HEAD verification;
- 34343548927 — successful final documentation HEAD verification.

Latest C0236 closeout documentation commit before this state update: `dded5e8407bbd083dfb1f5934395edd277f0d4c1`.

## 16. Tracker / governance

Final verified state before this documentation-only Project State update:

- tracker rows: **161**
- bad Change IDs: **0**
- Completed-not-Verified: **0**
- Completed-without-refs: **0**
- decision rows without refs: **0**
- consumption-contract violations: **0**
- rows requiring consumption contracts: **79**
- covered contracts: **79/79**
- current production-effect behavioral proof: **14/14 passing**

C0236 has a registered `PRODUCTION_CONSUMER` contract covering:

`EDGE_FUNCTION:fpl-api + EDGE_FUNCTION:betting-api + VIEW:public.correct_score_price_summary + UI_V2:FplPage/FixturesPage`

No numeric xPts/model-family effect was introduced by C0235/C0236.

## 17. Research layers that remain unpromoted

Do not silently activate these merely because they exist:

- C0197 research families / Tactical Clash evidence
- C0202 generic player-side/flank xPts scalar
- A0005
- W0002
- C0210 historical decay
- C0211 uncertainty widening as numeric production effect
- C0216 MHTR
- C0224 Parity–Draw production adjustment
- C0230 team-regime numeric adjustment

They may inform diagnostics/red-team only where their registered contracts permit.

## 18. Immediate sequence

1. Continue daily immutable GW4 PRE_FINAL generation under C0217/C0235 until the final window.
2. Make no external FPL transfers or chip activation from provisional Plan 10.
3. At **2026-09-12 14:30 Dubai**, refresh current prices/ownership, manager state/FT/selling values/chips, injuries/suspensions, press conferences, predicted XIs, xMins, tactical roles, penalties/set pieces, congestion and matchup inputs.
4. Generate the separate final current-GW projection snapshot.
5. Rerun the canonical optimizer plus C0227→C0234 autonomous stack.
6. Always compare ROLL/no action and the best legal normal-transfer path.
7. Evaluate Wildcard only if live chip availability and opportunity-cost gates are green.
8. If C0234 returns `FINAL_AUTONOMOUS_DECISION`, save a new append-only GW4 manager plan superseding provisional plans, but do not execute external FPL transfers automatically.
9. If C0234 returns `DECISION_NOT_READY` or `NO_MEANINGFUL_EDGE`, do not force action.
10. After GW4, continue forward validation, realized-role refresh and deferred research according to tracker priority.

This file is the operational state summary. Detailed reasoning and implementation evidence remain in the tracker, canonical architecture documents, migrations, Edge source mirrors and project-management closeouts.
