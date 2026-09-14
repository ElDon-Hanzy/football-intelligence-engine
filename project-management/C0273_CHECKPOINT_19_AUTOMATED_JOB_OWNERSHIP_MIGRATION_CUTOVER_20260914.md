# C0273 — Checkpoint 19: Automated Job Ownership, Migration & No-Double-Dispatch Cutover

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Map the current production scheduling surface into the accepted Hostinger VPS + Supabase + GitHub target architecture and define a safe migration/cutover contract.

This checkpoint is planning only. It does **not** disable, reschedule, add, invoke, migrate or alter any cron, Edge Function, SQL function, worker, model, publication, deployment or FPL-account behavior.

## 1. State re-verified

The latest C0273 master architecture V0.3 and Checkpoint 18 remain binding. The Supabase tracker remains `Open / Planned / P0` with zero runtime/model effect and explicit human approval required before implementation.

Read-only live inspection finds **29 active Supabase cron jobs**. This is the same count used in recent workload planning, but this batch maps every active job by target ownership.

## 2. Core ownership principle

The target architecture must distinguish **schedule ownership** from **execution location**.

A SQL function may remain physically executed in Supabase while the Hostinger controller owns when it is eligible to run. Likewise, a source worker may execute on the VPS while Supabase remains the durable semantic authority for its output.

Future rule:

> exactly one scheduler/controller owns each semantic work family at a time.

No migration may leave both legacy Supabase cron and the VPS controller independently dispatching the same semantic work.

## 3. Target ownership classes

- `VPS_CONTROLLER` — Hostinger controller owns eligibility, cadence/event response, generation/deadline admission and reconciliation.
- `VPS_WORKER` — bounded worker executes source/compute work under controller-issued semantic work identity.
- `SUPABASE_PRIMITIVE` — SQL computation/state transition remains executed in Supabase but is invoked by governed controller work, not independently scheduled where authority-sensitive.
- `SUPABASE_MAINTENANCE` — low-risk storage/maintenance may remain database-scheduled if proven isolated and non-authoritative.
- `RESEARCH_LANE` — shadow/evaluation work remains non-authoritative and yields to production.
- `LEGACY_RETIRE_OR_DECOMPOSE` — current monolithic/orchestration job must not migrate as-is.

These are target planning classes, not current changes.

## 4. Live 29-job ownership map

| Current active job | Current mechanism | Target owner/class | Migration disposition |
|---|---|---|---|
| result sync | HTTP Edge `sync-gw-results` | VPS_CONTROLLER + VPS_WORKER | Replace blind polling ownership only after result completion/reconcile contract; current retry flaw blocks direct lift-and-shift. |
| availability refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Strongest early migration candidate after generic generation/fencing wrapper. |
| current player state refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Reconcile-required before migration. |
| role/tactical refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Move scheduling ownership; preserve source/readiness lineage. |
| forward forecast refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Controller-owned dependency work. |
| feature snapshot refresh | direct SQL | VPS_CONTROLLER + SUPABASE_PRIMITIVE | SQL can remain DB-side; remove independent cadence only at cutover. |
| forward enriched refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Controller-owned dependency work. |
| W0002 near-close | direct SQL | RESEARCH_LANE / SUPABASE_PRIMITIVE | Non-authoritative; defer/preempt near deadline. |
| W0002 evaluator | direct SQL | RESEARCH_LANE / SUPABASE_PRIMITIVE | Non-authoritative evaluation. |
| FPL upcoming snapshot / C0217 cycle | direct SQL orchestration | LEGACY_RETIRE_OR_DECOMPOSE | Do not migrate monolith as-is; split projection eligibility/work/completion/authority per prior checkpoints. |
| Understat ingest | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Background/source lane; provider budget required. |
| football-data ingest | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Background/source lane; provider budget required. |
| competitive-core ingest | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Background/source lane. |
| team-state refresh | direct SQL | VPS_CONTROLLER + SUPABASE_PRIMITIVE | DB-side primitive under controller eligibility. |
| C0147 matchup capture | direct SQL | RESEARCH/PRODUCTION-SUPPORT lane + SUPABASE_PRIMITIVE | Consumption criticality must be confirmed before final class. |
| C0147 matchup evaluate | direct SQL | RESEARCH_LANE + SUPABASE_PRIMITIVE | Evaluation should yield near deadline unless proven production-critical. |
| C0159 production fixture refresh | direct SQL | VPS_CONTROLLER + SUPABASE_PRIMITIVE | P1/P2 production; heavy-tail DB work needs admission budget. |
| current-GW bookmaker ingest | direct SQL orchestration | VPS_CONTROLLER + bounded source worker/DB primitive | Exact external-call boundary needs implementation mapping. |
| C0197 shootout forward shadow | direct SQL | RESEARCH_LANE | Keep zero production effect; hard-preemptible. |
| FPL price history / `sync-fpl-data` | HTTP Edge | VPS_CONTROLLER + VPS_WORKER | Observation-append semantics require work identity/reconcile; price freshness can become P1 near deadline. |
| realized role refresh | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Post-match/background role evidence; dependency-aware. |
| C0213 full-pool optimizer | direct SQL orchestration | LEGACY_RETIRE_OR_DECOMPOSE | Do not lift-and-shift orchestration; controller must separate projection readiness, optimizer work and completion reconciliation. |
| C0213 lineage capture | direct SQL | VPS_CONTROLLER + SUPABASE_PRIMITIVE | Diagnostic/lineage capture after exact dependency contract. |
| C0213 storage retention | direct SQL | SUPABASE_MAINTENANCE | Candidate to remain DB-scheduled, but must yield/avoid final window. |
| C0217 storage daily | direct SQL | SUPABASE_MAINTENANCE | Candidate to remain DB-scheduled; non-authoritative. |
| C0236 correct-score price cache | direct SQL | VPS_CONTROLLER + SUPABASE_PRIMITIVE | Read/cache support; freshness criticality must be explicit. |
| C0239 engine diagnostics cache | direct SQL | VPS_CONTROLLER or SUPABASE_MAINTENANCE diagnostic | Heavy-tail history means it must not compete with P0; exact target depends on future observability replacement. |
| FPL actual-decision sync | Edge dispatch | VPS_CONTROLLER + VPS_WORKER | Post-deadline actual evidence; official deadline contract retained; reconcile/race-proof semantic uniqueness required. |
| C0272 final-promotion watch | direct SQL monolith | LEGACY_RETIRE_OR_DECOMPOSE | **Must not migrate as one job.** Split C0248 candidate/peer, promotion authority, C0234 gate and C0237 publication into distinct work/authority transitions. |

## 5. Strongest red-team finding

The migration target is **not “move 29 crons from Supabase to Hostinger.”**

That would preserve the main architectural defects while adding another scheduler.

The correct target is:

1. keep durable data and suitable SQL primitives in Supabase;
2. move semantic scheduling/eligibility/reconciliation ownership to the VPS controller;
3. move bounded external/source/compute workers to VPS where appropriate;
4. decompose monolithic orchestration before cutover;
5. leave selected low-risk maintenance DB-local where it has no authority role and cannot starve P0 work.

## 6. Migration waves

### Wave 0 — instrumentation and shadow ownership

No legacy schedule changes. Future controller observes/reconstructs what *would* be eligible and records shadow intentions only. It must prove no production side effects.

### Wave 1 — low-authority bounded workers

Candidates: availability, background source ingests, realized-role refresh, selected non-authoritative refreshes. Preconditions: semantic work key, completion invariant, generation/fencing, reconcile-before-retry, provider budget.

### Wave 2 — production-support dependency work

Fixtures, feature snapshots, current player state, forward forecasts/enrichment, price refresh. Preconditions additionally include workload isolation, freshness budgets and dependency graph.

### Wave 3 — optimizer/projection orchestration

Only after C0217/C0213 monoliths are decomposed into controller-visible work with exact completion invariants. No authority promotion yet.

### Wave 4 — finalization authority chain

C0248 primary/peer -> production selection -> C0234 -> C0237. This is the highest-risk cutover and requires all P0 digital-twin, deadline, fencing, authority-revision, cache and final-window tests to pass.

### Wave 5 — results/actual/settlement

Result observation and actual-submission evidence can migrate only with complete-child/reconcile semantics. Settlement authority remains blocked until exact official FPL settlement evidence is proven.

### Wave 6 — maintenance/research rationalization

Decide which DB-local maintenance/research schedules remain, migrate, consolidate or retire. No research job receives production authority.

## 7. No-double-dispatch cutover protocol

For each semantic work family, future approved cutover must use a durable ownership epoch/lease rather than a timing assumption.

Conceptual sequence:

1. identify exact semantic work family and legacy scheduler;
2. freeze its migration contract/version;
3. run VPS controller in `SHADOW_NO_DISPATCH` and compare intentions;
4. enter migration `DRAIN` for that family;
5. prevent legacy scheduler from creating new work **only after approval**;
6. reconcile all legacy in-flight/ambiguous work;
7. advance scheduler ownership epoch to VPS controller;
8. enable one bounded canary family/GW;
9. verify output equivalence/completion/current-generation semantics;
10. observe through defined soak period;
11. rollback scheduler ownership if required;
12. only then remove/retire legacy scheduling definition under separate approval.

A cron being disabled is not itself proof that no legacy work is still in flight.

## 8. Rollback contract

Rollback must restore **scheduler ownership**, not duplicate it.

If VPS ownership fails:

- place VPS family in DRAIN/BLOCKED;
- reconcile in-flight VPS work;
- revoke/advance its ownership/fencing epoch;
- restore legacy scheduler only after proving the VPS cannot still commit authority-changing work;
- retain all audit events;
- never rewrite generated historical evidence.

For authority-sensitive families, rollback must fail closed if exclusive ownership cannot be proven.

## 9. Supabase cron end-state

C0273 should not set a goal of zero Supabase cron jobs.

A better end-state is:

- **zero independent Supabase cron ownership for semantic decision/finalization authority**;
- selected database-local maintenance may remain scheduled if isolated and safe;
- SQL primitives remain callable in Supabase where that is the correct execution location;
- the VPS controller owns the causal decision about when authority-relevant work is eligible.

This avoids moving database-native work merely for architectural aesthetics.

## 10. Jobs explicitly unsafe to lift-and-shift

At minimum:

- `c0272_fpl_final_promotion_watch` — combines multiple authority/work boundaries and inherits legacy deadline issues;
- `football_intelligence_fpl_upcoming_snapshot` / C0217 cycle — mixed cadence/orchestration and legacy derived deadline semantics;
- `football_intelligence_c0213_full_pool_optimizer` — orchestration and completion ambiguity;
- result sync — parent existence/equal-payload behavior does not prove child completeness;
- actual-decision sync — requires race-proof semantic uniqueness/controller single-writer contract.

Moving these unchanged to VPS would create **location migration without autonomy safety**.

## 11. Cutover acceptance evidence per family

Before any future production ownership switch, require:

- current semantic owner identified;
- target owner identified;
- stable work key;
- generation vector binding;
- fencing/ownership epoch;
- exact completion invariant;
- deterministic reconcile procedure;
- retry classification;
- deadline/freshness class;
- resource class and concurrency budget;
- dependency/invalidation edges;
- shadow-intention equivalence evidence;
- canary evidence;
- rollback procedure;
- observability/alerting;
- proof no double dispatch/commit occurred.

## 12. Contradictions and open questions preserved

1. **C0147 matchup capture:** current production-vs-research consumption criticality needs an exact consumer map before deciding whether it belongs P2 or research.
2. **Bookmaker ingest:** exact split between DB orchestration and external provider execution should be mapped before assigning the physical worker boundary.
3. **C0236 cache:** decision-critical freshness contribution versus presentation/support role needs explicit dependency proof.
4. **C0239 diagnostics:** likely superseded partly by future control-plane observability, but retirement is not authorized and future residual role is unresolved.
5. **Supabase Edge Functions:** this checkpoint prefers VPS bounded workers for target external/compute work, but whether selected Edge Functions remain as transitional or permanent adapters is unresolved.
6. **Maintenance schedules:** C0213 retention/C0217 storage are candidates to remain Supabase-scheduled, subject to measured resource isolation.
7. **Result settlement:** exact official FPL settlement authority remains unresolved and blocks full settlement autonomy.
8. **Private manager state:** authenticated current-private state remains unresolved; public reconstruction cannot substitute for it.
9. **Exact migration soak duration:** not selected until telemetry exists.
10. **Exact rollback trigger thresholds:** not selected until SLO/alert contracts are finalized.
11. **Final ownership storage primitive:** physical schema for scheduler ownership epoch/lease is not authorized yet.
12. **Cron deletion vs disable:** future cleanup policy should preserve audit/recovery value; no deletion policy is approved.

## 13. Decision

C0273 adopts the automated-job migration principle:

> **Centralize semantic scheduling and reconciliation on the Hostinger VPS controller, not necessarily physical execution. Keep Supabase as durable authority and database-native execution platform where appropriate. Decompose unsafe monoliths before migration. Enforce exclusive scheduler ownership and no-double-dispatch cutover per semantic work family.**

This is a planning decision only.

## 14. Next bounded planning batch

With hosting, cache coherency and job ownership now mapped, the next bounded batch should consolidate the **implementation-readiness blocker matrix and GO/NO-GO acceptance package**:

- enumerate every unresolved P0 blocker;
- separate blockers to provisioning, shadow build, production cutover and full autonomy;
- define evidence needed to close each;
- identify which work can safely begin after approval without waiting for every later-stage blocker;
- produce a staged implementation order and explicit approval gates.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT YET.**
