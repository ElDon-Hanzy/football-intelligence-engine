# C0273 — Checkpoint 21: Pre-VPS Engine/App Stabilization Program

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Record the user's decision to **defer the Hostinger VPS move** and tighten the current Football Intelligence Engine and application first.

The Hostinger VPS + Supabase + GitHub architecture remains the preferred eventual destination, but it is no longer the next action. C0273 now inserts a **Pre-VPS Stabilization Program** whose objective is to remove correctness, ownership, data-contract, application-state and governance loose ends in the existing production architecture before any runtime migration.

This checkpoint authorizes no implementation, deployment, schema change, cron change, model change, source change, frontend change, production promotion/kill, or FPL-account execution.

---

## 1. Revised program sequence

Previous sequence:

`C0273 planning -> G1 Hostinger foundation -> shadow -> staged cutover`

Revised sequence:

`C0273 planning -> PRE-VPS STABILIZATION -> engine/app closure evidence -> implementation-readiness re-audit -> Hostinger G1 only when user chooses`

Hostinger is therefore a **deferred destination**, not a current milestone.

No VPS purchase, provisioning, deployment or migration should be treated as necessary to close the stabilization work below.

---

## 2. Stabilization principle

Do not move unresolved ambiguity to a better server.

A VPS would not fix:

- split deadline authority;
- ambiguous current publication authority;
- stale/private manager-state uncertainty;
- partial result-run semantics;
- monolithic orchestration boundaries;
- projection completeness ambiguity;
- duplicated/unclear production-selected planner artifacts;
- source-readiness gaps;
- stale website/public-state semantics;
- unused or weakly consumed models;
- job ownership ambiguity;
- historical-era inconsistencies;
- app data-contract drift.

These issues should be tightened in the current environment first wherever safe and useful.

---

## 3. Stabilization tracks

### Track A — Authority and chronology correctness — P0

Goal: one unambiguous answer to “what is authoritative now, what was authoritative then, and why?”

Closure targets:

1. official FPL deadline is the sole authority-sensitive deadline source;
2. derived first-kickoff-minus-90m remains diagnostic only;
3. recommendation != actual submission != realized result is mechanically preserved;
4. postdeadline closure cannot imply predeadline execution authority;
5. exact current canonical publication semantics are defined;
6. stale/hard-invalidated output cannot silently remain current;
7. historical forecasts remain append-only and era-aware.

Priority: **highest** because hosting cannot compensate for authority ambiguity.

### Track B — Manager-state truth and squad/economy lineage — P0

Goal: stop pretending public/opening state is equivalent to private current account state.

Closure targets:

- explicit lanes for `OPENING_LOCKED_BASELINE`, `CURRENT_PRIVATE_STATE`, `ENGINE_HYPOTHETICAL_STATE`, `ACTUAL_SUBMITTED_STATE`;
- manager-state freshness/visibility classification exposed throughout readiness logic;
- purchase/selling-price provenance completeness checked for the 15-man squad;
- chip/Free Hit temporary/permanent squad semantics kept separate;
- optimizer cannot silently consume stale or semantically wrong manager state.

Authenticated private-current access remains optional/deferred if the product explicitly declares the limitation and fails closed where required.

### Track C — Result completeness and settlement semantics — P0

Goal: distinguish “we observed a result payload” from “the Gameweek is settled.”

Closure targets:

- parent result row cannot count as complete without child completeness proof;
- partial runs are detectable and repairable;
- fixture-complete provisional state is distinct from FPL scoring settlement;
- later official corrections create superseding settlement generations;
- evaluation/calibration binds to settlement generation, not first final-looking poll.

### Track D — Projection / optimizer / finalization chain cleanup — P0

Goal: make the main decision path understandable, bounded and testable before migration.

Target chain:

`manager/source state -> projection -> C0248 candidate/peer -> production selection -> C0234 -> C0237 -> actual capture -> result evaluation`

Closure targets:

- independently derived projection completeness invariant;
- exact semantic identity for candidate, peer and selected authority;
- no “latest row wins” authority where generation/currentness matters;
- completion/reconciliation states for each stage;
- C0217/C0213/C0272 orchestration responsibilities separated conceptually and, after separate approval, operationally where justified;
- no opaque job may combine compute, promotion, authorization and publication without auditable boundaries.

### Track E — Source readiness and expected-minutes integrity — P0/P1

Goal: ensure the engine's football inputs match the operating doctrine.

Closure targets:

- injury/suspension/availability freshness contract;
- expected minutes/start probability provenance;
- actual tactical role refresh after each GW;
- independent predicted-XI/team-news coverage clearly distinguished from internal model inference;
- press-conference/team-news gap resolved or explicitly degraded;
- transfer/registration coverage verified;
- cup/Europe congestion consumed where minute risk is material;
- penalties/set pieces consumption map verified, including FK/corners where claimed.

This track explicitly protects against a repeat of the previously identified actual-role omission problem.

### Track F — Model-consumption and architecture hygiene — P0/P1

Goal: no model exists merely because it was built.

For every production/shadow model or layer, require:

- owner/change ID;
- inputs;
- outputs;
- consuming function/table/API;
- decision effect;
- production/shadow/research status;
- freshness cadence;
- failure behavior;
- overlap/redundancy assessment;
- kill/retire candidate if unused or duplicative.

No model should be promoted or killed under this checkpoint. The output is an evidence-backed consumption map and cleanup dossier.

### Track G — Automated-job reliability and ownership — P1

Goal: make current automation trustworthy before moving schedulers.

Closure targets:

- all 29 current jobs classified by semantic purpose and execution style;
- dispatch success separated from completion success;
- retry/idempotency/reconciliation class recorded;
- scheduler ownership ambiguity removed;
- startup timeout/statement timeout incidents mapped to specific job families;
- no hidden duplicate scheduler ownership;
- research/diagnostic jobs cannot starve deadline-critical production work.

This may produce future implementation proposals, but no cron changes are authorized by this planning checkpoint.

### Track H — V3 application truthfulness and data-contract QA — P1

Goal: website/app reflects the engine correctly rather than merely rendering available rows.

Closure targets:

- FPL page uses current canonical data contract;
- pitch/player roles/formation are consistent with actual modeled roles;
- publication state/freshness/blockers are visible and truthful;
- no stale recommendation appears current;
- API/public payload fields have clear provenance;
- V2 remains untouched fallback until V3 passes QA;
- UI does not invent certainty where engine state is degraded or blocked;
- app data does not depend on GitHub deployment freshness.

### Track I — Governance/documentation consolidation — P1

Goal: current production, registry and documentation converge enough that a new operator can understand the engine without conversation memory.

Closure targets:

- `PROJECT_STATE.md` matches live production state;
- `DECISIONS_AND_HISTORY.md` includes major architecture/governance changes;
- current production functions/models/jobs documented once, without contradictory duplicates;
- active vs legacy vs shadow artifacts clearly labeled;
- unresolved contradictions stay explicit;
- change tracker references are complete;
- migration to VPS later does not depend on reconstructing intent from chat history.

---

## 4. Recommended stabilization order

Do not attack all tracks simultaneously.

### Phase S1 — Truth/authority first

1. deadline authority;
2. manager-state truth;
3. publication/canonical-current semantics;
4. result completeness/settlement semantics.

Reason: every later test depends on knowing what “current”, “actual”, “final” and “settled” mean.

### Phase S2 — Decision-chain integrity

5. projection completeness;
6. C0248 identity/selection;
7. C0234/C0237 lineage;
8. actual-capture and result linkage;
9. retry/reconciliation tests.

### Phase S3 — Football intelligence quality

10. actual roles;
11. xMins/start probability;
12. team news/predicted XI;
13. congestion;
14. transfers/registration;
15. penalties/set pieces;
16. source freshness and degraded-mode behavior.

### Phase S4 — Architecture hygiene

17. production/shadow model-consumption map;
18. unused/duplicate model dossier;
19. 29-job reliability/ownership audit;
20. workload/resource collisions;
21. documentation convergence.

### Phase S5 — Application/product closure

22. V3 canonical API contract;
23. pitch-first/FPL UI truthfulness;
24. freshness/blocker/degraded-state presentation;
25. historical/recommendation/actual/result surfaces;
26. cross-browser/UI/data QA;
27. V2 fallback validation.

### Phase S6 — Pre-VPS exit audit

Only after S1–S5:

- repeat C0273 implementation-readiness audit;
- classify unresolved items as true VPS blockers vs later autonomy blockers;
- confirm current system is internally stable enough to move without carrying hidden debt;
- user decides whether/when to approve Hostinger G1.

---

## 5. Definition of “tight enough to move”

The current engine/app does **not** need to achieve full G6 autonomy before VPS migration.

It does need:

1. one authoritative deadline contract;
2. explicit manager-state visibility semantics;
3. unambiguous canonical-current publication semantics;
4. result run completeness and settlement states;
5. traceable projection -> decision -> publication -> actual -> result lineage;
6. independently provable projection coverage;
7. known model-consumption map;
8. known job ownership/retry/reconcile map;
9. P0 source gaps either fixed or explicitly degraded/blocked;
10. V3 displays engine state truthfully;
11. current docs/registry substantially match production;
12. no known critical ambiguity that would become harder to debug after runtime migration.

This is the **Pre-VPS Exit Gate**.

---

## 6. What should remain deferred

Do not spend stabilization effort on infrastructure that only matters after the move:

- Hostinger provisioning;
- final VPS size purchase;
- container/process layout implementation;
- VPS firewall/reverse proxy implementation;
- production secrets migration;
- VPS backup configuration;
- new controller deployment;
- scheduler ownership cutover;
- multi-host topology;
- CDN deployment changes solely for Hostinger.

The architecture for these remains documented, but implementation is paused.

---

## 7. Red-team: avoid turning “tighten loose ends” into endless refactoring

### Risk 1 — perfection before migration

We could spend months cleaning every historical artifact.

**Rule:** close only issues that affect current correctness, explainability, reliability, product truthfulness or migration risk.

### Risk 2 — architecture cleanup changes model behavior accidentally

Structural refactors can alter numerical decisions.

**Rule:** model-effect changes remain separate change IDs with explicit before/after evidence and user approval.

### Risk 3 — deleting unused-looking models too early

A model may have hidden consumption.

**Rule:** first map consumption; promotion/kill remains separately approval-gated.

### Risk 4 — fixing UI before authority semantics

A beautiful V3 can still display the wrong “current” decision.

**Rule:** S1/S2 precede final application polish.

### Risk 5 — loose ends become new feature development

The objective is closure, not expansion.

**Rule:** new model families/features require a separate demonstrated gap and must not be smuggled into stabilization.

### Risk 6 — VPS work resumes because it is easier than engine cleanup

Infrastructure progress can feel tangible while semantic debt remains.

**Rule:** Hostinger G1 stays deferred until user explicitly reopens it after the Pre-VPS Exit Gate review.

---

## 8. Immediate next bounded audit

Recommended next action under C0273:

> **S1.1 — Current Truth & Authority Consolidation Audit**

One bounded audit should re-check live production and produce a single contradiction matrix covering:

- official vs derived deadline usage;
- manager-state lanes/freshness;
- C0248 production-selected authority identity;
- C0234 authorization identity;
- C0237 publication/canonical-current behavior;
- actual-submission capture;
- result-run completeness/finality/settlement.

Output should distinguish:

- already correct;
- known defect;
- semantic ambiguity;
- documentation drift;
- implementation candidate;
- requires separate approval;
- safe to defer.

No production fix should be performed inside that audit unless separately authorized.

---

## 9. Current decision

- Hostinger VPS architecture remains preferred eventual destination.
- Hostinger G1 is **DEFERRED BY USER**, not rejected.
- C0273 broad architecture planning remains closed.
- C0273 now enters **Pre-VPS Stabilization Planning / Audit**.
- Immediate focus is current engine/app correctness and closure, not hosting.
- Production/model/runtime changes remain explicitly approval-gated.

**DO NOT PROVISION, DEPLOY, CUT OVER, PROMOTE, KILL OR ALTER PRODUCTION BEHAVIOR under this checkpoint.**
