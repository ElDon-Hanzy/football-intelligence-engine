# C0273 — Checkpoint 28: P0 Pre-Final Autonomous Publication Gap

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Record and design the newly verified P0 stabilization defect explaining why V3 has no GW5 decision despite current GW5 projections. This checkpoint is architecture/planning only. It does not invoke the planner, alter cron/function/API/UI behavior, change deadline semantics, publish a plan, or promote/kill anything.

## 1. Live incident evidence

GW5 currently has prediction runs but no downstream decision artifacts:

- `gameweek_prediction_runs`: 22 GW5 rows; latest inspected run id 1368 at 2026-09-14 18:15:02 UTC;
- `fpl_sequential_planner_runs`: 0 GW5 rows;
- `fpl_autonomous_gate_runs`: 0 GW5 rows;
- `fpl_live_plan_publications`: 0 GW5 rows.

The C0272 cron itself is alive: `c0272_fpl_final_promotion_watch` runs every five minutes and recent executions report scheduler success.

A read-only diagnostic call `private.c0272_final_promotion_watch_v01(5,5,false)` returns:

`OUTSIDE_FINAL_WINDOW`

with stored deadline `2026-09-18T17:30:00Z` and final-refresh threshold `2026-09-18T15:30:00Z`.

Inspection of the function definition proves this is intentional current behavior: C0272 exits before T-2 and only after entering the final window does it request C0248 primary beam, cross-beam peer, promotion, C0234 gate refresh and C0237 publication.

Therefore the immediate GW5 website absence is not a frontend/cache defect and is not currently a manager-state rejection. The chain never reaches planner eligibility because the only verified autonomous decision orchestrator is final-window scoped.

## 2. Defect classification

### P0 — Missing autonomous PRE-FINAL orchestration

Current architecture has an automated finalization/promotion loop but no verified autonomous planning-period loop that continuously turns fresh projections into a current PRE-FINAL decision/publication before T-2.

Consequences:

1. V3 can legitimately have no current upcoming-GW recommendation for most of the planning week.
2. Daily projection refresh does not imply daily decision refresh.
3. Scheduler health can remain green while user-visible decision freshness is absent.
4. The system is not yet autonomous at the website/product level between deadlines.
5. Manually invoking C0248 would mask rather than repair this orchestration gap.

This is a pre-VPS stabilization blocker because moving the same scheduling semantics to a VPS would merely migrate the defect.

## 3. Deadline-authority contradiction remains coupled

C0272 currently derives its window from `gameweek_prediction_runs.deadline_at`. Latest inspected GW5 rows identify the deadline source as `derived_first_kickoff_minus_90m`.

Checkpoint 23 S1-R1 already requires official FPL `deadline_time` to become the sole authority for decision/finalization/deadline gating. The new pre-final orchestrator must consume that canonical deadline contract; it must not create a second local deadline calculation.

Thus implementation dependency is:

**S1-R1 canonical official deadline authority → pre-final orchestration cutover for authority-sensitive timing.**

Planning/design may proceed before R1 implementation, but production activation must not institutionalize the derived deadline.

## 4. Target two-lane orchestration contract

The target architecture should distinguish planning freshness from final authority.

### Lane A — PRE-FINAL planning loop

Purpose: keep the website and decision journal populated with the best current, explicitly non-final recommendation during the open planning period.

Conceptual flow:

`fresh governed source/projection generation → manager-state eligibility → C0248 pre-final candidate/selection policy → required decision controls → C0237 PRE_FINAL publication → current-publication authority revision → V3`

Required properties:

- runs throughout the open Gameweek planning period, not only T-2;
- event/freshness driven rather than blindly recomputing every five minutes;
- consumes the latest eligible generation vector;
- idempotent/reconcilable;
- publication explicitly says PRE_FINAL and never implies execution authorization;
- stale/hard-invalidated inputs revoke current/actionable authority according to S1-R3;
- manager-state authority is explicit according to S1-R2;
- may publish a fail-closed unavailable/degraded state rather than silently leave the prior GW as current.

### Lane B — FINALIZATION loop

Purpose: perform high-assurance deadline-window refresh, peer/adversarial checks, final gate and final publication.

Conceptual flow:

`official T-2 window → final source/projection refresh → C0248 primary + independent peer/challenger controls → promotion/selection authority → C0234 → C0237 FINAL → deadline closure`

C0272 is conceptually close to Lane B and should not be stretched into a generic all-week controller without a red-team review. Separation keeps expensive/final peer work from becoming mandatory on every routine pre-final refresh.

## 5. PRE-FINAL trigger semantics

Do not use a fixed high-frequency planner loop as the primary semantic trigger.

A pre-final refresh should become eligible when one or more material generations change, including:

- canonical player/fixture projection generation;
- manager-state generation;
- official deadline generation;
- availability/xMins/role generation when it invalidates projections;
- fixture generation;
- other mandatory decision-control generations.

The controller should reconcile whether an equivalent current decision already exists for that semantic identity before dispatching work.

A low-frequency watchdog may remain for reconciliation, but scheduler tick != work identity.

## 6. Publication semantics

PRE_FINAL and FINAL must remain distinct.

PRE_FINAL means:

- best current evaluated recommendation under current eligible evidence;
- subject to change before deadline;
- not proof of final execution authorization;
- exact generation/manager/deadline lineage exposed;
- freshness/currentness independently queryable.

FINAL means only the finalization policy has completed under the correct authority generation. `FINAL`, `latest`, `production_selected`, and `current actionable` must not be treated as synonyms, consistent with Checkpoints 17, 23 and 24.

If no trustworthy GW5 pre-final recommendation exists, V3 should explicitly expose `NO_TRUSTWORTHY_CURRENT_PLAN` or equivalent instead of silently presenting GW4 as though current.

## 7. Operational-health correction

Current cron reporting `succeeded / 1 row` only proves the SQL function executed. It does not prove pipeline progress.

Future health must distinguish at least:

- scheduler invocation success;
- semantic disposition (`OUTSIDE_WINDOW`, `NO_CHANGE`, `WAITING_INPUT`, `DISPATCHED`, `RECONCILED`, `BLOCKED`, `PUBLISHED`);
- age of latest eligible projection;
- age of latest current pre-final decision;
- age of latest publication;
- blocker/reason code;
- upcoming-GW website coverage.

A green scheduler with zero upcoming-GW publication for days must be visible as a product/autonomy freshness failure, not overall healthy.

## 8. Red-team analysis

### Failure A — simply remove the T-2 guard from C0272

This could repeatedly run final peer/promotion/gate behavior all week and blur PRE_FINAL vs FINAL authority.

**Reject as default design.** Preserve two semantic lanes.

### Failure B — manually run C0248 after each missing website report

This creates human-dependent pseudo-autonomy and hides orchestration defects.

**Reject except explicitly approved incident recovery.**

### Failure C — pre-final loop publishes against stale/reconstructed manager state

A polished website could show an internally optimized but operationally impossible transfer path.

**Guard:** S1-R2 manager-state authority/freshness is part of pre-final eligibility; degraded recommendation-only behavior must be explicit.

### Failure D — every projection refresh triggers expensive duplicate planning

Could recreate Supabase workload/concurrency problems identified in Checkpoint 15.

**Guard:** semantic generation identity, debounce/coalescing, bounded workers and reconcile-before-dispatch.

### Failure E — latest PRE_FINAL row becomes canonical by timestamp

Would recreate S1-R3 ambiguity.

**Guard:** canonical authority revision/pointer contract rather than latest-id semantics.

### Failure F — pre-final plan is mistaken for account execution authority

**Guard:** PRE_FINAL is informational recommendation authority only; no FPL account execution is authorized by C0273.

## 9. Planned implementation package — NOT AUTHORIZED

### S2-R11 — Autonomous PRE-FINAL decision orchestration

Future approved implementation should:

1. introduce a planning-period controller/reconciler distinct from finalization semantics;
2. consume canonical official deadline authority;
3. dispatch C0248 only for a new eligible semantic generation;
4. require explicit manager-state authority/freshness;
5. run the appropriate non-final decision-control set;
6. publish immutable PRE_FINAL evidence through C0237/current-authority contract;
7. expose semantic disposition and freshness telemetry;
8. fail closed when no trustworthy current plan exists;
9. preserve C0272 finalization as a separate T-2 lane until an explicitly approved replacement proves equivalence.

### Acceptance tests

- fresh eligible upcoming-GW projection can produce a PRE_FINAL publication outside T-2 without manual action;
- repeated watchdog ticks with unchanged semantic identity do not create duplicate work/publications;
- changed projection generation produces a new reconciled pre-final decision;
- stale/unverified manager state produces explicit blocker/degraded state, not fabricated current authority;
- official deadline revision invalidates/re-evaluates deadline-bound authority;
- PRE_FINAL cannot claim final execution authorization;
- hard invalidation removes current authority immediately;
- finalization lane still performs required T-2 peer/gate behavior;
- no historical rows are rewritten;
- GW N+1 planning does not wait for unrelated GW N settlement;
- website can distinguish no-plan, stale-plan, pre-final, final and historical states.

## 10. Open questions preserved

1. What exact cadence/debounce should be used after a new eligible projection generation: immediate event dispatch, short coalescing window, or scheduled batch? Decide after workload telemetry, not by guess.
2. Which C0248 peer/challenger controls are mandatory for routine PRE_FINAL publication versus only FINAL authority?
3. What degraded PRE_FINAL behavior is acceptable while `CURRENT_PRIVATE_STATE` remains unobservable? Recommendation-only against an explicitly named baseline may be useful, but must not masquerade as verified current account state.
4. Should PRE_FINAL publication occur after every materially changed projection generation or only after decision-equivalent output changes? Immutable evidence may record both while public authority revision advances only when semantically required.
5. What freshness SLO should make missing upcoming-GW PRE_FINAL coverage a P0/P1 alert?
6. Should C0272 remain the finalization implementation long-term or be absorbed into the future controller after equivalence tests? No decision yet.
7. Exact official FPL deadline storage/identity remains governed by S1-R1 and is not solved here.
8. Exact canonical-publication storage primitive remains governed by S1-R3.
9. Exact private manager-state adapter remains approval-gated and unresolved.
10. Routine PRE_FINAL planning must be resource-isolated from research/maintenance before VPS cutover; exact concurrency remains telemetry-driven.

## 11. Decision

C0273 records a new **P0 pre-VPS stabilization defect**:

> The current production system autonomously refreshes projections during the open planning week, but the verified decision/publication orchestrator C0272 intentionally does not start C0248/C0234/C0237 until T-2. Consequently the autonomous website can have no upcoming-GW decision for most of the planning period even while projection data is current.

Target architecture is a two-lane model: continuous/event-driven PRE-FINAL planning plus separate high-assurance FINALIZATION.

No manual planner invocation is performed under this checkpoint. No production behavior is changed.

**All implementation, deployment, scheduler, deadline, planner, gate, publication, API/UI and model changes remain explicitly approval-gated.**
