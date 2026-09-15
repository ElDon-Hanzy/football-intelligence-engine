# C0273 — Checkpoint 30: PRE-FINAL Control-Set & Finalization Escalation Contract

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoints 28–29 by defining which decision controls are required for an all-week PRE-FINAL recommendation and which high-assurance controls should remain FINALIZATION-only. This checkpoint does not run C0248 for GW5, resolve/create manager state, alter C0227/C0240/C0242/C0234/C0237, change cron/API/UI behavior, or authorize account execution.

## 1. Live re-verification

Current production surfaces confirm that the controls are not equivalent in cost or semantics:

- C0227 exposes projection uncertainty/sensitivity state. Current inspected GW4 status reports 604 rows and explicitly `model_effect_enabled=false`; its value is decision uncertainty/control, not an xPts rewrite.
- C0240 is a substantial adversarial program with prepare/expand/dispatch/capture/finalize/orchestrate functions and slot/structure/path attacks. Current GW4 status is `STABLE_NO_MEANINGFUL_EDGE` after 15 slot attacks, 10 structure attacks and transfer-path checks.
- C0242/C0251 exposes captaincy consistency/equivalence and named-challenger resolution. Current GW4 status requires named challengers to resolve and reports captaincy separately from squad optimization.
- C0234's current final gate contains 15 gates, including C0213 readiness, uncertainty/sensitivity, C0240 supporting adversarial benchmark, C0242 consistency, C0248 selected-path authority, roll comparison, final T-2 refresh and chip controls.

Therefore copying the entire current C0234 final gate into every PRE-FINAL refresh would unnecessarily make routine website freshness depend on final-window assurance machinery.

## 2. Governing principle

PRE-FINAL must be trustworthy, but it is not FINAL.

The architecture should separate:

1. **Invariant safety/integrity controls** — required at every authority level because failure means the recommendation is malformed, stale, illegal or semantically untrustworthy.
2. **Decision-quality controls** — required for PRE-FINAL when cheap/current enough, but may expose uncertainty rather than always hard-block.
3. **High-assurance challenger/finalization controls** — required before FINAL authority, not necessarily before every routine planning-week publication.

A control must not become PRE-FINAL mandatory merely because it appears in the current monolithic final gate.

## 3. Proposed PRE-FINAL mandatory set — planning recommendation

### P1 — Canonical source/projection generation integrity — HARD BLOCK

Require:
- exact upcoming-GW projection universe reconciliation;
- canonical generation identity/freshness;
- mandatory source/role/xMins prerequisites according to current production policy;
- no hard-invalidated generation.

Reason: a recommendation against incomplete/stale canonical forecasts is not trustworthy even when labelled PRE-FINAL.

### P2 — Manager-state authority/completeness — HARD BLOCK OR EXPLICIT DEGRADED MODE

Apply Checkpoint 29 authority classes.

- VERIFIED_CURRENT / USER_CONFIRMED_CURRENT: normal current-aware PRE-FINAL subject to freshness.
- VERIFIED_OPENING_BASELINE: baseline-relative PRE-FINAL only.
- UNKNOWN_CURRENT or incomplete bank/FT/chip/economic state: no transfer recommendation claiming feasibility.

### P3 — C0248 legal sequential planning/selection — HARD BLOCK

Require legal squad/budget/FT/chip/action-path construction, exact input lineage and selected-path identity. C0248 remains sole intended canonical selected-path authority.

### P4 — C0227 uncertainty state — REQUIRED, but semantics are bounded

Require a current uncertainty/sensitivity observation aligned to the projection generation where the production contract says it is applicable.

Recommended PRE-FINAL behavior:
- integrity failure / missing mandatory uncertainty lineage: block;
- high but valid uncertainty: publish with uncertainty/degraded confidence rather than automatically suppress all planning-week intelligence;
- uncertainty must never be described as xPts model effect when it is only control evidence.

### P5 — Captaincy control — REQUIRED FOR PUBLISHED CAPTAIN/VC

A website recommendation that displays captain/vice must pass a current captaincy lineage/equivalence check. C0251/C0242 already separates captaincy from squad optimization and supports `NO_MEANINGFUL_EDGE` semantics.

PRE-FINAL may publish a nominal captain when the candidates are statistically equivalent, but must label equivalence/no meaningful edge rather than fabricate certainty.

### P6 — Lightweight legality/consistency publication gate — HARD BLOCK

PRE-FINAL needs its own bounded gate contract checking:
- projection generation current;
- manager authority inherited correctly;
- planner legality/completeness;
- exact planner/renderer manager-state lineage;
- captaincy control current if captain/VC shown;
- chip claim is legal and correctly qualified;
- publication is PRE_FINAL and execution_authorized=false;
- no stale-generation change occurred before commit.

This should not be implemented by weakening the existing final C0234 gate in place without an explicit versioned contract.

## 4. Controls recommended as FINALIZATION-only by default

### F1 — Full C0240 adversarial attack suite

Current C0240 runs slot, structure and transfer-path attacks and repeat-cycle stability checks. This is valuable independent assurance but is too heavy to make a prerequisite for every routine planning-week refresh unless telemetry later proves otherwise.

Target:
- PRE-FINAL: consume latest compatible C0240 evidence opportunistically and surface disagreement/staleness; severe integrity-class findings may hard-block under explicit policy.
- FINAL: require fresh C0240 high-assurance adversarial completion against the final candidate/generation.

### F2 — Exhaustive/manual named-challenger closure

Current C0242 final consistency can be false while newly introduced named challengers await exact evaluation. Requiring every ad-hoc/manual challenger to resolve before every PRE-FINAL refresh would let research/user challenge backlog suppress the website indefinitely.

Target:
- canonical automated challenger classes with integrity significance may block PRE-FINAL under explicit policy;
- manual/research challengers are visible but non-blocking for PRE-FINAL by default;
- FINAL requires the approved finalization challenger set to be resolved.

### F3 — Final T-2 refresh proof

By definition FINALIZATION-only. PRE-FINAL must instead expose its own freshness age/generation.

### F4 — Production-promotion/final selector proof

Current C0234 distinguishes normal-path authority from production promotion. PRE-FINAL should require canonical C0248 selected-path identity but not pretend final production promotion has occurred.

### F5 — Final chip opportunity closure

Routine PRE-FINAL may show current chip recommendation with uncertainty and season-opportunity caveats. FINAL requires the stricter chip-action robustness policy selected for deadline authority.

## 5. C0240 special rule

C0240 should not be demoted to irrelevant research. It remains a production supporting adversarial benchmark.

Proposed effect by lane:
- PRE-FINAL: `INDEPENDENT_CHALLENGER_EFFECT`; hard-block only for integrity-class findings such as illegal canonical path, missing action family, stale/mismatched lineage, or deterministic regression evidence.
- FINAL: `INDEPENDENT_CHALLENGER_EFFECT + DECISION_BLOCKING_EFFECT` with fresh required completion.

Ordinary objective disagreement inside model-error/semantic-divergence policy should not automatically erase a useful PRE-FINAL recommendation.

## 6. C0242/C0251 special rule

Captaincy has two different control surfaces that must not be conflated:

1. automated captaincy equivalence/tail/floor/lineage analysis — required whenever captain/VC is publicly recommended;
2. arbitrary named/manual challenger backlog — not automatically a PRE-FINAL blocker.

The current final gate's `named_challengers_must_be_resolved=true` is a FINAL assurance policy, not automatically the correct all-week publication policy.

## 7. PRE-FINAL status vocabulary

A future public/control API should distinguish at least:

- `PRE_FINAL_CURRENT` — mandatory PRE-FINAL controls green against current verified manager state;
- `PRE_FINAL_BASELINE_RELATIVE` — green against verified opening baseline, current private state unverified;
- `PRE_FINAL_DEGRADED_UNCERTAINTY` — legal/current but material uncertainty explicitly surfaced;
- `PRE_FINAL_CHALLENGED` — canonical plan remains publishable but compatible challenger evidence materially disagrees without integrity failure;
- `NO_TRUSTWORTHY_CURRENT_PLAN` — hard prerequisite failed;
- `FINAL_READY` / `FINAL_BLOCKED` — separate finalization semantics.

These are conceptual states, not authorized schema/API values.

## 8. Red-team cases

### A — Full C0240 required every projection refresh

Risk: expensive adversarial workload makes website freshness brittle and recreates resource contention.

Guard: final-only freshness requirement; PRE-FINAL consumes compatible evidence and blocks only explicit integrity classes.

### B — C0240 never required before FINAL

Risk: canonical planner regression survives to deadline.

Guard: fresh full adversarial completion is mandatory for FINAL.

### C — Manual named challenger added during planning week

Risk: website disappears until research backlog resolves.

Guard: manual/research challenger is visible but not automatically authority-blocking PRE-FINAL.

### D — Captaincy model says NO_MEANINGFUL_EDGE

Risk: UI turns nominal leader into false high-confidence captain edge.

Guard: captain/VC may be shown but equivalence/no-edge semantics must be first-class.

### E — High uncertainty but valid projections

Risk: fail-closed policy makes the website useless all week.

Guard: distinguish uncertainty from integrity failure; degrade confidence unless a versioned threshold/policy explicitly blocks.

### F — PRE-FINAL gate reuses C0234 by simply skipping T-2

Risk: hidden FINAL-only assumptions remain and future edits couple the two lanes again.

Guard: versioned lane-specific gate contract with shared invariant primitives, not duplicated monoliths or boolean bypasses.

### G — PRE-FINAL passes, then generation changes before publication

Guard: commit-time generation/manager/deadline comparison; stale work becomes COMPLETE_STALE and cannot become current authority.

## 9. Planned repair package — NOT AUTHORIZED

### S2-R15 — Lane-specific decision-control policy registry

Future implementation should make each control's lane behavior machine-queryable:
- PRE_FINAL_REQUIRED_BLOCKING;
- PRE_FINAL_REQUIRED_DEGRADABLE;
- PRE_FINAL_OPTIONAL_CHALLENGER;
- FINAL_REQUIRED_BLOCKING;
- ADVISORY/RESEARCH_ONLY.

### S2-R16 — PRE-FINAL bounded gate

Create a versioned pre-final gate/controller contract composed from shared invariant checks, without weakening historical/final C0234 semantics.

### S2-R17 — Challenger backlog isolation

Separate automated integrity-significant challenger classes from manual/research named challengers so research backlog cannot accidentally suppress routine PRE-FINAL authority.

## 10. Acceptance evidence

Before PRE-FINAL activation:
- missing/illegal projection or manager lineage blocks publication;
- valid high uncertainty produces explicit degraded state according to policy rather than silent false certainty;
- captain/VC publication always has aligned captaincy evidence;
- adding an unresolved manual research challenger does not automatically remove a previously trustworthy PRE-FINAL plan;
- an integrity-class C0240 finding does block PRE-FINAL;
- ordinary compatible C0240 disagreement is surfaced without silently replacing C0248;
- FINAL remains impossible without fresh approved C0240/finalization controls;
- PRE-FINAL cannot set execution_authorized=true;
- generation change between gate and publish fails stale;
- no historical rows are rewritten.

## 11. Contradictions / open questions preserved

1. Exact uncertainty thresholds that should degrade vs hard-block PRE-FINAL are not yet data-derived.
2. Exact C0240 integrity-class blocker taxonomy needs historical/shadow evidence; do not guess objective-difference thresholds.
3. Exact automated challenger set mandatory for FINAL remains policy-versioned and may differ from arbitrary named/manual challenges.
4. Whether routine PRE-FINAL should run a cheap subset of C0240 attacks or only consume latest compatible full evidence remains open pending workload/value telemetry.
5. C0213 full-pool optimizer remains a legacy hard readiness prerequisite today; Checkpoint 26's challenger-role closure is still required before it can cease blocking PRE-FINAL indirectly.
6. Current C0234 final gate includes `FORWARD_MANAGEMENT` legacy supporting evaluator and C0213 readiness; their PRE-FINAL necessity must be judged by unique integrity contribution, not copied automatically.
7. S1-R1 deadline, S1-R2/S2-R12 manager authority, S1-R3 publication authority and S1-R5 authority identity remain prerequisites for safe activation.
8. Current C0242 status can change as named challengers are added/resolved after a prior publication. This proves challenger backlog state and immutable publication evidence must remain distinct.
9. Exact chip policy for baseline-relative manager state remains unresolved.
10. No FPL account execution is authorized.

## 12. Decision

C0273 adopts the planning recommendation that all-week PRE-FINAL publication should use a **bounded integrity/control set**, not the complete FINAL assurance stack.

PRE-FINAL must require canonical projections, valid manager-state authority/degraded mode, legal C0248 selection, aligned uncertainty evidence, captaincy evidence when captain/VC is shown, and a lane-specific fail-closed publication gate. Full C0240 adversarial completion, exhaustive final challenger closure, T-2 proof and final promotion remain FINALIZATION requirements by default, while integrity-class challenger findings can still block PRE-FINAL under explicit policy.

This preserves useful website freshness without weakening FINAL authority or turning every planning-week refresh into a deadline-grade compute event.

No production behavior is changed.

**All implementation, deployment, scheduler, model, gate, planner, publication, API/UI and account-execution changes remain explicitly approval-gated.**
