# Football Intelligence Engine — Project State

_Last updated: 2026-09-20 (Dubai) — C0284 P3 deployed-browser verification complete_

## 1. Mission and immutable rules
Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts append-only; missing data unknown; actual/recommendation/frozen decision/realized state remain separate; unpromoted research has zero production effect; compare ROLL; xMins/role/fixture quality are structural gates; differences inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; live Supabase outranks docs; no external transfer/chip execution without separate authorization.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; tracker + C0213 governance.

## 2. Canonical decision architecture
`FULL-POOL OPTIMIZER` → C0227 uncertainty → C0228 ensemble/equivalence → C0229 structural robustness → C0231 forward-management → C0232 OR/rank utility → C0233 red-team → C0240 adversarial benchmark → captaincy/named-challenger consistency → **C0248 sole canonical sequential selected-path authority** → C0277 chip opportunity-cost supporting gate → C0234/C0276 fail-closed final authorization → C0237 publication → external execution only if separately authorized.

C0230 is advisory/nonblocking. C0240 is supporting evidence, not another selector. C0276 is the bounded autonomy/control plane, not another optimizer.

## 3. Whole-engine reconciliation
C0278 is **Completed / Verified**. Tracker reconciliation D on 2026-09-19 removed stale indefinite-monitoring and superseded backlog states. C0265 remains untouched; C0240 concurrency unchanged; no historical rewrite or external FPL execution.

Transfer-window program disposition: C0203/C0205/C0206 are **Completed / Verified**. Their summer-window objectives are closed; ordinary in-season minutes, roles, set pieces and team state now flow through current-season evidence. C0207-C0211 are closed/superseded rather than left as generic transfer backlogs.

Legacy research/UI cleanup also closed or completed C0034, C0049, C0066, C0074, C0091, C0104, C0105, C0112, C0154, C0163-C0166, C0168, C0176, C0196, C0198, C0216 and C0264 according to their evidence/supersession state. C0082 remains a genuine external licensed-data capability gap.

## 4. C0281 deadline convergence — Completed / Verified
GW5 exposed timeout, async-state and moving-lineage convergence failures. C0281 repairs deadline control without weakening decision governance.

Production cadence is restored duplicate-safe: C0276 autonomous tick job40 `*/5`; projection horizon job41 `*/15`; optimizer orchestration job42 `12,27,42,57`.

The deadline protocol is now `NORMAL → T4_BASELINE → T4_BASELINE_CONVERGED → T2_DELTA → CLOSED`. T-4 establishes a coherent baseline. T-2 is a delta phase rather than the first finalization attempt. Authoritative player-state changes remain immediately material; fixture refresh churn inside T-4 is conservatively debounced until two observations or five minutes. Existing C0248/C0243 price timing is reused: price never creates a football transfer and can only accelerate an already robust football decision when affordability is materially threatened.

Empirical 14-day runtime evidence at closeout: projection P99 ~46.6s, optimizer orchestration P99 ~49.4s, C0276 E2E control tick P99 ~120.0s. Deadline reservation uses `max(300s, 2*E2E P99 + 60s)`. Once breached, no new heavy dispatch is allowed. The controller freezes the latest coherent lineage checkpoint if available, subject to existing governance; otherwise it fails closed. It never fabricates a mixed-lineage answer.

Fault injection and the full GW5 deadline rehearsal passed. The retrospective GW5 T-3 test correctly fails closed because GW5 predates C0281 and has no coherent T-4 checkpoint.

Closeout: `project-management/C0281_DEADLINE_CONVERGENCE_FINALIZATION_CLOSEOUT_20260918.md`.

## 5. C0277 seasonal chip option value — Completed / Verified
C0277 separates exact numerical decision horizon from longer seasonal structural opportunity. Current selector remains **RESERVE_FOR_FUTURE**, chip **NONE**, `PLAY_NOW=false` unless later evidence changes it. Unknown future option value is not zero; structural scenarios cannot authorize spending a chip.

## 6. Active bounded research
- **C0197**: high-score/shootout prospective evidence through GW6, then adjudicate.
- **C0224**: parity/draw shadow is explicitly bounded through GW6; after GW6 it must be promoted, retired or replaced by a newly specified bounded hypothesis. No indefinite monitoring or threshold retuning.
- **C0230**: advisory team-regime diagnostic through GW6 only; after GW6 keep as low-cost advisory or retire. It cannot numerically alter projections or block final authorization.
- **C0279**: promotion blocked / zero production effect. Frozen GW5 cohort awaits settled prospective evidence and full player recalibration before P9.
- **C0280**: P9 explanation contract promoted; P2-P8 predictive effects remain held pending settled prospective evidence.

## 7. C0265 / C0270 integrity watch
C0265 remains **Open / Planned / Critical**, deliberately unchanged. Do not repair without separate authorization. C0270 remains prospective shadow monitoring; numerical coincidences are not causal validation.

## 8. C0273 autonomy planning — Completed / Verified
C0273's authorized scope was planning/documentation, not production implementation. Its master plans, SOPs, red-team, autonomy boundaries, source/deadline/manager/result/publication contracts, failure/recovery model, resource isolation, hosting/cutover roadmap and implementation gates are complete. C0276/C0278/C0281/C0282 subsequently implemented or reconciled substantial pre-VPS stabilization concerns. A future VPS/runtime migration is a separate implementation decision and must not be represented as unfinished C0273 planning.

## 9. V3 / product state
C0282 is **Completed / Verified**. V3 is the current consumer product surface; V2 remains fallback until explicitly retired. UI preserves Actual / Recommendation / Decision snapshot / Realized lanes. `FINAL` never implies external execution. Pages run #955 passed V2/V3 E2E, accessibility, deployment, rollback isolation and deployed-entrypoint verification.

## 10. Current engineering dispositions
- C0082: external licensed spatial/tactical-data blocker; no passive collection.
- C0197: bounded prospective research through GW6.
- C0224/C0230: bounded shadow/advisory through GW6 with mandatory adjudication.
- C0265: Open / Planned / Critical; intentionally untouched.
- C0270: active prospective anomaly watch.
- C0273: **Completed / Verified** planning program.
- C0276: **Completed / Verified** bounded control plane, operating with C0281 deadline protections.
- C0277: **Completed / Verified**.
- C0278: **Completed / Verified**.
- C0279: promotion blocked / zero production effect.
- C0280: prospective GW5 evaluation active; only explanation contract promoted.
- C0281: **Completed / Verified**.
- C0282: **Completed / Verified**.
- C0283: deployed reconciliation components exist, but the current-season-first forward generator is not the active production writer; activation and promotion are governed by C0284.
- C0284: **In Progress / P0-P3 Verified and Live / P4 next / Production blocker**. The cutoff-safe current-season state and canonical prior decay are active. `forward_fixture_v0.3.0_c0284_current_season` is the single active lineage for GW6-GW8; C0166 writer job 20 is paused with snapshots retained for rollback. `fpl-api` v21, `betting-api` v13 and `human-insights-api` v3 are aligned to the canonical contract. Pages run #992 passed every build, parity, live-workspace, V2/V3 browser, accessibility, artifact-isolation, deployment and post-deploy gate. Independent live-browser verification confirmed the deployed matchup modal exposes the C0284 contract, complete Low/Normal/High distribution, near-tie disclosure, separate representative/raw-modal scores and decision hash without page errors. P4-P7 remain publication blockers; no next-GW public forecast is authorized.

## 11. Canonical references
`PROJECT_DESCRIPTION.md`, `DECISIONS_AND_HISTORY.md`, `SYSTEM_ARCHITECTURE.md`, `MODEL_REGISTRY.md`, `WEEKLY_DATA_PIPELINE.md`, `MODEL_CONSUMPTION_AUDIT.md`, `skills/fie/SKILL.md`, C0277 closeout, C0278 reconciliation, C0279 canonical plan, C0280 closeouts, C0281 closeout and C0282 plan/closeout evidence.

When documentation disagrees with live runtime, verify live evidence first and reconcile documentation rather than weakening runtime gates.
