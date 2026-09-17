# Football Intelligence Engine — Project State

_Last updated: 2026-09-17 (Dubai) — C0279 P5 verified / C0277-C0278 reconciled / C0276 GW5 T-2 wait_

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

## 6. C0279 season-state / score-family / player-upside integration — P5 Verified

C0279 P0 is **Completed / Verified** and the program remains shadow-first after live defects in Leeds–Crystal Palace and Brentford–Chelsea. It will consolidate the team-state hierarchy, eliminate opaque cross-season L10/L20 production leakage, classify fixtures as LOW/NORMAL/HIGH scoring with shootout/demolition as high-scoring subtypes, select representative score families, propagate team goal states into player haul distributions/captaincy/TC nominations, and enforce a calculation-faithful Decision-Evidence Contract in the matchup modal.

Approved season-performance blend: 40/60 after one current-season match; 55/45 after two; 65/35 after three; 75/25 after four-five; 80/20 after six; 85/15 after seven; 90/10 after eight; 100/0 from nine. Structural/tactical/availability variables remain orthogonal modifiers. L20 is audit/removal scope only and must not be restored. P0 froze GW5 evidence (fixture hash `a7ce3ddf7b5620a3103dc6c307fa5fbc`, player run 1426/hash `4c1e9ab3b700f29cedf173c242d41a47`) and mapped the canonical C0159 cross-season L10 bypass, C0166 cross-season L5 path, downstream player/captaincy consumers and zero-effect L20 infrastructure. No production behavior changed. P1 is **Completed / Verified**. The private shadow contract now applies the approved sample schedule, reaches 100/0 at 9+, exposes actual sample/weights/lineage, fails closed on missing or invalid evidence, keeps structural modifiers orthogonal, and marks L5/L10/L20 as unconsumed. Samples 0–10 and both diagnostic fixtures passed. Existing C0159/C0166 definitions and production behavior remain unchanged. P2 is **Completed / Verified**. The bounded two-match layer uses P1 opponent-adjusted state, distinguishes process improvement, finishing-only spikes, weak-opponent inflation, tactical regimes, noise and insufficient evidence, and can never replace the canonical baseline. Leeds is correctly recognized as process improvement; Palace’s recent scoring is finishing-only under current evidence. P3 is **Completed / Verified**. The full score matrix now produces LOW/NORMAL/HIGH shadow memberships, goal bands and subtype probabilities; shootout and demolition are HIGH subtypes, missing evidence fails closed, and the raw modal score is diagnostic only. Brentford–Chelsea and Leeds–Palace both classify HIGH/SHOOTOUT despite raw 1–1 cells. P4 is **Completed / Verified**. The full-matrix selector aggregates mutually exclusive football families, treats shootout as high scoring, preserves the raw modal cell as a diagnostic, chooses an environment-eligible and direction-aware representative score, discloses weak/conflicting direction, and fails closed below 95% matrix coverage. Brentford–Chelsea and Leeds–Palace both select SHOOTOUT / 3–2 while retaining raw 1–1 references; both distributions reconcile to 1. P5 is **Completed / Verified**. Team goal states 0/1/2/3/4+ now propagate through a private conditional player-return bridge using canonical goal/assist lambdas, existing haul distributions, xMins/start probability and current roles. Player/team goal and assist allocations conserve; weighted states reconstruct the canonical unconditional forecast. All 604 frozen GW5 player rows passed conservation, monotonic-tail and chronology/effect checks. In Brentford–Chelsea, João Pedro is the highest eligible Chelsea P(10+) option in the 4+ goal state, but P5 grants no automatic captaincy or Triple Captain authority. P6 captaincy/chip consumption is pending. No C0279 production effect is authorized before behavioral consumption proof, shadow validation and explicit promotion.

Canonical plan: `project-management/C0279_SEASON_STATE_SCORE_FAMILY_PLAYER_UPSIDE_INTEGRATION_PLAN_20260917.md`. P0 closeout: `project-management/C0279_P0_FREEZE_AND_ACTIVE_CONSUMER_AUDIT_CLOSEOUT_20260917.md`. P1 closeout: `project-management/C0279_P1_CANONICAL_SEASON_STATE_CLOSEOUT_20260917.md`. P2 closeout: `project-management/C0279_P2_BOUNDED_ACCELERATION_REGIME_CLOSEOUT_20260917.md`. P3 closeout: `project-management/C0279_P3_SCORING_ENVIRONMENT_SHADOW_CLOSEOUT_20260917.md`. P4 closeout: `project-management/C0279_P4_SCORE_FAMILY_SHADOW_SELECTOR_CLOSEOUT_20260917.md`. P5 closeout: `project-management/C0279_P5_CONDITIONAL_PLAYER_RETURN_BRIDGE_CLOSEOUT_20260917.md`.

## 7. C0265 / C0270 integrity watch
C0265 remains **Open / Planned / Critical**, deliberately unchanged. Do not repair without separate authorization. C0270 remains prospective shadow monitoring; numerical coincidences are not causal validation.

## 8. Research / product governance
Unpromoted research remains zero-effect. V3 is the current consumer product surface; V2 remains fallback until explicitly retired. UI preserves Actual / Recommendation / Decision snapshot / Realized lanes. `FINAL` never implies external execution.

## 9. Current engineering dispositions
- C0264: Blocked; experimental branch closed/unmerged.
- C0265: Open / Planned / Critical; no fix authorized.
- C0270: In Progress / shadow.
- C0273: broader autonomy/website/VPS work remains open/deferred where acceptance evidence is incomplete.
- C0276: In Progress; waiting on governed GW5 T−2 final window.
- C0277: **Completed / Verified**.
- C0278: **Completed / Verified**.
- C0279: **In Progress / P5 completed; P6 pending; zero production effect**.

## 10. Canonical references
`PROJECT_DESCRIPTION.md`, `DECISIONS_AND_HISTORY.md`, `SYSTEM_ARCHITECTURE.md`, `MODEL_REGISTRY.md`, `WEEKLY_DATA_PIPELINE.md`, `MODEL_CONSUMPTION_AUDIT.md`, `skills/fie/SKILL.md`, C0277 closeout, C0278 reconciliation and the C0279 canonical plan.

When documentation disagrees with live runtime, verify live evidence first and reconcile documentation rather than weakening runtime gates.
