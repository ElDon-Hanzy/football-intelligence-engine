# Football Intelligence Engine — Project State

_Last updated: 2026-09-17 (Dubai) — C0278 reconciled state / C0276 GW5 T-2 wait_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules:
- historical forecasts are append-only;
- missing data remains unknown;
- actual submitted team ≠ engine recommendation ≠ frozen forecast ≠ realized outcome;
- unpromoted research has zero numeric production effect;
- every meaningful action compares with ROLL;
- xMins, tactical role and fixture quality are structural gates;
- differences inside model error are `NO_MEANINGFUL_EDGE`;
- captaincy is a separate optimization problem;
- live Supabase/runtime evidence outranks documentation;
- no transfer or chip is executed by the engine unless separately authorized.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; `public.change_tracker_working`; C0213 architecture/governance surfaces.

## 2. Canonical decision architecture

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 ensemble/equivalence
→ C0229 structural robustness
→ C0231 forward-management evidence
→ C0232 OR/rank utility
→ C0233 red-team evidence
→ C0240 adversarial benchmark
→ captaincy / named-challenger consistency
→ **C0248 canonical sequential selected-path authority**
→ C0234/C0276 fail-closed final authorization
→ C0237 publication
→ external execution only if separately authorized.

C0230 remains advisory/nonblocking with zero numeric production effect. C0240 is a supporting adversarial benchmark, not a second selected-path authority. C0248 is the sole canonical sequential selected-path authority. C0276 is the bounded autonomy/control plane around this chain, not another optimizer.

## 3. C0278 whole-engine reconciliation

C0278 is **Completed / Verified**. Final reconciliation established:
- C0213 system consolidation GREEN;
- production-effect behavioral proof 14/14 current;
- tracker consumption/governance 99/99;
- prediction provenance, retirement and storage/immutability checks healthy;
- orphan C0274 cron retired during reconciliation;
- 30 active crons remained after that retirement with no duplicate authority target identified;
- intentional open, blocked, deferred and prospective-shadow programs were preserved rather than mass-closed;
- C0265 production behavior remained untouched;
- C0240 concurrency remained unchanged;
- no historical forecast rewrite and no external FPL execution.

Historical closeouts remain historical evidence and must not override this current state.

## 4. Current GW5 decision-cycle state

Current governed GW5 lineage has reconverged through:
- prediction run **1401**;
- optimizer run **47**;
- ensemble run **19**;
- structural run **15**;
- forward run **14**;
- OR-utility run **15**;
- red-team run **15**;
- current-lineage C0240 adversarial batch **270**, completed **32/32 with 0 failed**;
- C0248 sequential candidate run **38**, prediction lineage `[1401,1385,1386]`.

Run 38 remains a candidate/shadow artifact; it is not external execution. The current normal selected path begins Palmer → Saka with no chip, but the engine has **not** crossed FINAL authorization merely because the candidate exists.

C0276 is **In Progress** at the governed **T-2 timing wait**. GW5 deadline is 2026-09-18 17:30 UTC; the T-2 threshold is 15:30 UTC. FINAL_GATE must remain fail-closed before its authorized timing window and must not be bypassed.

## 5. Chip option-value state

C0277 is the seasonal chip option-value program. The sequential planner can enumerate current chip roots, but raw short-horizon chip utility is not season-level chip authorization. In particular, a high raw GW5 wildcard branch is insufficient while future wildcard reservation value / seasonal chip timing remains unresolved.

C0277 must preserve Noise-Control, opportunity-cost, chronology-safe calibration and fail-closed authorization. No chip should be authorized from a short-horizon branch alone.

## 6. C0265 / C0270 integrity watch

C0265 remains **Open / Planned / Critical** and deliberately unchanged. The predicted-XI hard-anchor compression issue is registered for observation; do not repair it without separate authorization.

C0270 remains prospective shadow monitoring using frozen definitions. Numerical coincidences do not constitute causal validation. Production xMins behavior remains unchanged.

## 7. Research / shadow governance

Unpromoted research remains zero-effect. Relevant continuing states include C0197 prospective monitoring through its governed expiry, C0224 Parity–Draw shadow, C0230 advisory shadow, and C0270 xMins coincidence diagnostics. Rejected experiments remain rejected rather than silently reintroduced.

## 8. Product/runtime separation

V3 remains the current consumer product surface; V2 remains available as fallback until explicitly retired. Product UI must preserve four lanes:
1. Actual — verified submitted manager state.
2. Recommendation — engine hypothetical action/state.
3. Decision snapshot — frozen decision-time evidence.
4. Realized — live/finished outcome state.

`FINAL` never implies external execution authorization.

## 9. Current engineering dispositions

- C0264: Blocked; experimental branch closed/unmerged.
- C0265: Open / Planned / Critical; no production fix authorized.
- C0270: In Progress / Executing; shadow only.
- C0273: broader autonomy/website/VPS architecture remains deferred/open where acceptance evidence is incomplete.
- C0276: In Progress; current-lineage reconvergence complete through sequential run 38, waiting on governed T-2 final window.
- C0277: seasonal chip option-value work continues under fail-closed governance.
- C0278: Completed / Verified; whole-engine reconciliation closed.

## 10. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`

When any canonical document disagrees with live runtime, verify live evidence first and reconcile documentation rather than weakening runtime gates.
