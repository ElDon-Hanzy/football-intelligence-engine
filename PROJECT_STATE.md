# Football Intelligence Engine — Project State

_Last updated: 2026-09-18 (Dubai) — C0281 completed / verified_

## 1. Mission and immutable rules
Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts append-only; missing data unknown; actual/recommendation/frozen decision/realized state remain separate; unpromoted research has zero production effect; compare ROLL; xMins/role/fixture quality are structural gates; differences inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; live Supabase outranks docs; no external transfer/chip execution without separate authorization.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; tracker + C0213 governance.

## 2. Canonical decision architecture
`FULL-POOL OPTIMIZER` → C0227 uncertainty → C0228 ensemble/equivalence → C0229 structural robustness → C0231 forward-management → C0232 OR/rank utility → C0233 red-team → C0240 adversarial benchmark → captaincy/named-challenger consistency → **C0248 sole canonical sequential selected-path authority** → C0277 chip opportunity-cost supporting gate → C0234/C0276 fail-closed final authorization → C0237 publication → external execution only if separately authorized.

C0230 is advisory/nonblocking. C0240 is supporting evidence, not another selector. C0276 is the bounded autonomy/control plane, not another optimizer.

## 3. Whole-engine reconciliation
C0278 is **Completed / Verified**. C0265 remains untouched; C0240 concurrency unchanged; no historical rewrite or external FPL execution.

## 4. C0281 deadline convergence — Completed / Verified
GW5 exposed timeout, async-state and moving-lineage convergence failures. C0281 repairs deadline control without weakening decision governance.

Production cadence is restored duplicate-safe: C0276 autonomous tick job40 `*/5`; projection horizon job41 `*/15`; optimizer orchestration job42 `12,27,42,57`.

The deadline protocol is now `NORMAL → T4_BASELINE → T4_BASELINE_CONVERGED → T2_DELTA → CLOSED`. T-4 establishes a coherent baseline. T-2 is a delta phase rather than the first finalization attempt. Authoritative player-state changes remain immediately material; fixture refresh churn inside T-4 is conservatively debounced until two observations or five minutes. Existing C0248/C0243 price timing is reused: price never creates a football transfer and can only accelerate an already robust football decision when affordability is materially threatened.

Empirical 14-day runtime evidence at closeout: projection P99 ~46.6s, optimizer orchestration P99 ~49.4s, C0276 E2E control tick P99 ~120.0s. Deadline reservation uses `max(300s, 2*E2E P99 + 60s)`. Once breached, no new heavy dispatch is allowed. The controller freezes the latest coherent lineage checkpoint if available, subject to existing governance; otherwise it fails closed. It never fabricates a mixed-lineage answer.

Fault injection and the full GW5 deadline rehearsal passed. The retrospective GW5 T-3 test correctly fails closed because GW5 predates C0281 and has no coherent T-4 checkpoint.

Correction: a prior tracker note said the P5 live phase was CLOSED. The recorded call at 17:20:58 UTC was actually `T2_DELTA`, roughly nine minutes before the 17:30 UTC deadline.

Closeout: `project-management/C0281_DEADLINE_CONVERGENCE_FINALIZATION_CLOSEOUT_20260918.md`.

## 5. C0277 seasonal chip option value — Completed / Verified
C0277 separates exact numerical decision horizon from longer seasonal structural opportunity. Current selector remains **RESERVE_FOR_FUTURE**, chip **NONE**, `PLAY_NOW=false` unless later evidence changes it. Unknown future option value is not zero; structural scenarios cannot authorize spending a chip.

## 6. C0279 season-state / score-family / player-upside integration
C0279 remains **promotion blocked / zero production effect** after P8 validation. Its shadow architecture and frozen prospective cohort remain available for future evidence. It must not affect production until its promotion gate is satisfied.

## 7. C0265 / C0270 integrity watch
C0265 remains **Open / Planned / Critical**, deliberately unchanged. Do not repair without separate authorization. C0270 remains prospective shadow monitoring; numerical coincidences are not causal validation.

## 8. Research / product governance
Unpromoted research remains zero-effect. V3 is the current consumer product surface; V2 remains fallback until explicitly retired. UI preserves Actual / Recommendation / Decision snapshot / Realized lanes. `FINAL` never implies external execution.

## 9. Current engineering dispositions
- C0264: Blocked; experimental branch closed/unmerged.
- C0265: Open / Planned / Critical; no fix authorized.
- C0270: In Progress / shadow.
- C0273: broader autonomy/website/VPS work remains open/deferred where acceptance evidence is incomplete.
- C0276: active bounded control plane with C0281 deadline protections.
- C0277: **Completed / Verified**.
- C0278: **Completed / Verified**.
- C0279: **Promotion blocked / zero production effect**.
- C0281: **Completed / Verified**.

## 10. Canonical references
`PROJECT_DESCRIPTION.md`, `DECISIONS_AND_HISTORY.md`, `SYSTEM_ARCHITECTURE.md`, `MODEL_REGISTRY.md`, `WEEKLY_DATA_PIPELINE.md`, `MODEL_CONSUMPTION_AUDIT.md`, `skills/fie/SKILL.md`, C0277 closeout, C0278 reconciliation, C0279 canonical plan, and C0281 closeout.

When documentation disagrees with live runtime, verify live evidence first and reconcile documentation rather than weakening runtime gates.