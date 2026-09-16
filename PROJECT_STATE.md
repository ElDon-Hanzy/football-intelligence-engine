# Football Intelligence Engine — Project State

_Last updated: 2026-09-17 (Dubai) — C0277/C0278 reconciled state / C0276 GW5 T-2 wait_

## 1. Mission and immutable rules
Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts append-only; missing data unknown; actual/recommendation/frozen decision/realized state remain separate; unpromoted research has zero production effect; compare ROLL; xMins/role/fixture quality are structural gates; differences inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; live Supabase outranks docs; no external transfer/chip execution without separate authorization.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; tracker + C0213 governance.

## 2. Canonical decision architecture
`FULL-POOL OPTIMIZER` → C0227 uncertainty → C0228 ensemble/equivalence → C0229 structural robustness → C0231 forward-management → C0232 OR/rank utility → C0233 red-team → C0240 adversarial benchmark → captaincy/named-challenger consistency → **C0248 sole canonical sequential selected-path authority** → C0277 chip opportunity-cost supporting gate → C0234/C0276 fail-closed final authorization → C0237 publication → external execution only if separately authorized.

C0230 is advisory/nonblocking. C0240 is supporting evidence, not another selector. C0276 is the bounded autonomy/control plane, not another optimizer.

## 3. Whole-engine reconciliation
C0278 is **Completed / Verified**. Current C0213 status after C0277 P5: system consolidation GREEN; behavioral proof 14/14; 19/19 required capabilities; tracker governance 99/99; zero duplicate cron targets; zero active retired API/edge/external deployments. Runtime currently reports 29 active crons. C0265 remains untouched; C0240 concurrency unchanged; no historical rewrite or external FPL execution.

## 4. Current GW5 decision cycle
Current governed lineage includes C0248 sequential planner run **38**. Candidate existence does not equal FINAL authorization. C0276 remains at governed T−2 timing wait. GW5 deadline: 2026-09-18 17:30 UTC; T−2 threshold: 15:30 UTC. FINAL_GATE remains fail-closed before the authorized window.

## 5. C0277 seasonal chip option value — Completed / Verified
C0277 now separates the exact numerical decision horizon from the longer seasonal structural opportunity window. Current GW5 contract: exact horizon 3; exact numerical GWs 5–8; structural-only GWs 9–19; no confirmed first-half BGW/DGW/nonstandard window; season-best chip weeks remain unresolved.

Current selector: **RESERVE_FOR_FUTURE**, chip **NONE**, `PLAY_NOW=false`. Bounded current evidence is BB +2.367, TC +6.499, FH +5.702 and WC exact-horizon edge +10.593; these values are not season-level authorization. Unknown future option value is not zero. Structural scenarios may reserve a chip but cannot authorize spending. Shared future windows cannot be double-counted. Invalid long numerical horizon requests fail closed.

C0276 consumes C0277 through `private.c0276_chip_opportunity_gate_v01`; C0248 remains selected-path authority and the gate cannot execute a chip. See `project-management/C0277_SEASONAL_CHIP_OPTION_VALUE_OPTIMIZER_CLOSEOUT_20260917.md`.

## 6. C0265 / C0270 integrity watch
C0265 remains **Open / Planned / Critical**, deliberately unchanged. Do not repair without separate authorization. C0270 remains prospective shadow monitoring; numerical coincidences are not causal validation.

## 7. Research / product governance
Unpromoted research remains zero-effect. V3 is the current consumer product surface; V2 remains fallback until explicitly retired. UI preserves Actual / Recommendation / Decision snapshot / Realized lanes. `FINAL` never implies external execution.

## 8. Current engineering dispositions
- C0264: Blocked; experimental branch closed/unmerged.
- C0265: Open / Planned / Critical; no fix authorized.
- C0270: In Progress / shadow.
- C0273: broader autonomy/website/VPS work remains open/deferred where acceptance evidence is incomplete.
- C0276: In Progress; waiting on governed GW5 T−2 final window.
- C0277: **Completed / Verified**.
- C0278: **Completed / Verified**.

## 9. Canonical references
`PROJECT_DESCRIPTION.md`, `DECISIONS_AND_HISTORY.md`, `SYSTEM_ARCHITECTURE.md`, `MODEL_REGISTRY.md`, `WEEKLY_DATA_PIPELINE.md`, `MODEL_CONSUMPTION_AUDIT.md`, `skills/fie/SKILL.md`, C0277 closeout and C0278 reconciliation.

When documentation disagrees with live runtime, verify live evidence first and reconcile documentation rather than weakening runtime gates.
