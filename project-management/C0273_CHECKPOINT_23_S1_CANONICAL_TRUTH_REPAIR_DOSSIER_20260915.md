# C0273 — Checkpoint 23: S1 Canonical Truth Contract & Repair Dossier

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Convert Checkpoint 22's live S1 truth/authority audit into implementation-sized repair packages without implementing any repair.

This document defines dependency order, acceptance evidence, rollback/non-rewrite constraints and red-team failure cases for five S1 repairs:

1. canonical official deadline authority;
2. manager-state authority classification;
3. canonical current-publication authority;
4. result completeness + settlement semantics;
5. authority identity hardening across C0248/C0234/C0237/actual capture.

No schema, function, cron, API, frontend, model, source, scheduler, promotion, retirement or FPL-account behavior is changed here.

---

## 1. Current state re-verified

Planning continuity re-read:

- Checkpoint 21 — Pre-VPS Engine/App Stabilization Program;
- Checkpoint 22 — S1 Current Truth & Authority Consolidation Audit;
- live C0273 tracker state: `Open / Planned / Pre-VPS Stabilization Planning / zero model effect`.

Targeted live verification on 2026-09-15 confirms:

- future `gameweek_prediction_runs` still record `metadata.deadline_source = derived_first_kickoff_minus_90m`;
- `current_fpl_live_plan_v01` still selects one row per Gameweek solely by `ORDER BY gameweek, captured_at DESC, id DESC`;
- manager-state durable coverage inspected remains sparse, with rows only for GW3/GW4 in the queried current table surface.

These confirmations do not introduce new defects; they prove Checkpoint 22's repair targets remain current.

---

# Repair package S1-R1 — Canonical official deadline authority

## Problem

Authority-sensitive production lanes currently mix:

- official FPL `events[].deadline_time`;
- stored prediction-run deadline values derived from first kickoff minus 90 minutes;
- fixture-time navigation clocks.

This creates semantic disagreement between actual capture, planner/finalization readiness and application lifecycle display.

## Target contract

For each FPL Gameweek, define one **official deadline evidence identity** containing at minimum:

- gameweek;
- official deadline timestamp;
- source = official FPL event/bootstrap authority;
- observed_at;
- source payload/revision identity where available;
- semantic generation/revision when the official deadline changes.

Rules:

1. Official FPL deadline is the sole authority for decision/finalization/deadline gating.
2. First kickoff remains a fixture/match-navigation clock.
3. `first kickoff - 90m` may remain a diagnostic/legacy-comparison value but must not authorize or close decision work.
4. Any official deadline change invalidates deadline-bound downstream authority according to the generation contract.
5. Commit-time checks must compare against current official deadline authority, not only the deadline observed at work start.

## Planned consumer migration order

1. canonical deadline read contract;
2. projection metadata/finalization generation;
3. C0217/C0235 readiness semantics;
4. C0248 final-candidate eligibility where deadline-sensitive;
5. C0234 authorization;
6. C0237 publication/currentness semantics;
7. V3/FPL APIs and lifecycle display;
8. documentation/tests.

## Acceptance evidence

- no authority-sensitive production path derives its own FPL deadline;
- static/code search shows kickoff-minus-90 usage is diagnostic/navigation only;
- all finalization/publication artifacts expose exact deadline authority lineage;
- simulated official deadline movement invalidates stale in-flight work;
- postdeadline closure cannot become predeadline execution authorization;
- V3 distinguishes `fpl_deadline_at` from `first_kickoff_at`/match window.

## Rollback / non-rewrite constraints

- do not rewrite historical prediction rows to pretend they used official deadline authority;
- legacy rows retain their original deadline source;
- rollback must restore prior code path only, never mutate historical evidence;
- historical replay remains era-aware.

## Red-team

A shared helper returning official deadline is insufficient if downstream persisted rows still bind to an old derived generation. The repair is complete only when **authority lineage and invalidation** are also migrated.

---

# Repair package S1-R2 — Manager-state authority classification

## Problem

Current manager-state rows can be structurally complete yet semantically unable to prove the user's current private predeadline account state. Downstream planner/gate logic can therefore be lineage-consistent around the wrong state class.

## Target contract

Every manager/squad state must explicitly declare one lane:

- `OPENING_LOCKED_BASELINE`;
- `CURRENT_PRIVATE_STATE`;
- `ENGINE_HYPOTHETICAL_STATE`;
- `ACTUAL_SUBMITTED_STATE`.

Each state also needs:

- visibility/authority status;
- freshness timestamp/source;
- manager-state generation;
- exact 15-player identity;
- bank/free-transfer/chip state where applicable;
- purchase/selling-price provenance completeness;
- temporary-vs-permanent squad semantics for Free Hit/chip cases.

Recommended visibility states include:

- `VERIFIED`;
- `PUBLIC_BASELINE_ONLY`;
- `CURRENT_PRIVATE_UNOBSERVABLE`;
- `STALE`;
- `INCOMPLETE`;
- `CONFLICTING`.

## Product rule

Authenticated current-private access is **not required merely to keep recommendation-only operation alive**. If current private state cannot be proven, the product must say so and must not silently relabel a public/opening reconstruction as verified current state.

## Readiness policy to define during implementation

Separate:

- baseline-valid recommendation readiness;
- personalized-current-state readiness;
- execution/account-state readiness.

This avoids unnecessarily blocking all analytical output while still preventing false personalization.

## Acceptance evidence

- every optimizer/gate input identifies its manager-state lane + generation;
- no query means “latest manager state” without specifying required lane/authority;
- stale or wrong-lane rows cannot satisfy personalized readiness;
- Free Hit temporary squad does not overwrite permanent squad lineage;
- bank/FT/purchase/selling-value completeness is testable;
- V3 exposes degraded/unobservable state honestly.

## Rollback / non-rewrite constraints

- historical manager snapshots keep their original evidence and timestamps;
- legacy rows may be classified as `LEGACY_UNCLASSIFIED`/equivalent rather than retroactively invented as private verified;
- no historical transfer/account state may be reconstructed beyond available evidence.

## Red-team

Do not collapse the four lanes into one mutable `current squad` record. That would erase chronology and reintroduce ambiguity.

---

# Repair package S1-R3 — Canonical current-publication authority

## Problem

`fpl_live_plan_publications` is append-only, but `current_fpl_live_plan_v01` still chooses the newest row by timestamp/ID. Newer APIs then apply different secondary checks, causing inconsistent definitions of “current”.

## Target contract

Preserve immutable publication rows, but add one explicit semantic current-authority mechanism per Gameweek.

A canonical authority record/pointer/reducer output must bind to:

- publication ID;
- authority revision;
- deadline generation;
- manager-state generation/lane;
- projection generation/run identity;
- C0248 selected authority identity;
- C0234 authorization identity;
- source/readiness generation vector as required;
- authority state.

Authority states should preserve the already planned semantics:

- `CURRENT_VERIFIED`;
- `SOFT_STALE_CURRENT` where specifically policy-approved;
- `HARD_INVALIDATED`;
- `SUPERSEDED`;
- `REVOKED_INTEGRITY`;
- `DEADLINE_CLOSED_AUDIT`;
- `NO_TRUSTWORTHY_CURRENT_DECISION`.

## Critical rule

`latest publication` and `canonical current publication` are different concepts.

Hard invalidation must remove actionability immediately even if no replacement recommendation exists yet.

## Consumer convergence

After the contract exists, all current-plan APIs should consume one canonical read contract rather than independently combining:

- latest row;
- status strings;
- `execution_authorized`;
- prediction-run alignment;
- timestamps.

## Acceptance evidence

- two publications with identical visible XI but different authority lineage produce different authority revisions;
- newer timestamp cannot override a valid canonical pointer merely by being newer;
- hard invalidation yields `NO_TRUSTWORTHY_CURRENT_DECISION` if no replacement exists;
- V3, manager-plan API and FPL API agree on current/actionable status from the same read contract;
- historical publications remain queryable and immutable;
- stale browser/API representations cannot claim currentness after authority revision diverges.

## Rollback / non-rewrite constraints

- never update/delete prior publication evidence;
- canonicalization is additive/superseding;
- rollback cannot simply restore “latest row wins” if new authority records already exist without explicitly handling their compatibility.

## Red-team

Do not make the canonical pointer a freely mutable singleton without CAS/generation/fencing semantics. That would convert an append-only evidence problem into a mutable-race problem.

---

# Repair package S1-R4 — Result-run completeness and scoring settlement

## Problem A — partial durable result runs

`sync-gw-results` can persist a parent run before all child player actuals are present. Equal-payload short-circuit logic can then suppress repair if completeness is not checked first.

## Problem B — `is_final` semantic overload

Current `is_final` corresponds to fixtures being finished/finished_provisional, not proven official FPL scoring settlement. V3 currently leaks this into `FINAL` / `points_are_final` terminology.

## Target completion contract

Every result observation/run must be reconcilable into:

- `ABSENT`;
- `PARTIAL`;
- `COMPLETE_CURRENT`;
- `COMPLETE_STALE`;
- `CONFLICTING`;
- `SUPERSEDED`.

Parent existence is never sufficient.

The completeness invariant must independently prove expected child coverage for the result payload/universe before short-circuiting an equal payload.

## Target settlement contract

Separate lifecycle:

1. `LIVE_PARTIAL`;
2. `FIXTURES_COMPLETE_PROVISIONAL`;
3. `SETTLEMENT_WAIT`;
4. `SETTLED`;
5. later correction => new settlement generation / supersession.

Until exact official FPL settlement authority is proven, `SETTLED` must fail closed.

## App semantics

The application may show:

- observed points;
- fixture-complete points;
- provisional Gameweek totals;

but must not call them scoring-settlement final unless settlement authority is satisfied.

## Acceptance evidence

- injected parent-before-child failure is detected as `PARTIAL`;
- retry with identical payload repairs missing children rather than short-circuiting;
- child coverage invariant is queryable;
- fixture-complete does not emit `SETTLED` automatically;
- later official correction creates a superseding generation while preserving prior observation;
- evaluation/calibration binds to declared settlement generation;
- V3 removes settlement-overclaiming labels.

## Rollback / non-rewrite constraints

- preserve all historical result observations/payload hashes;
- do not relabel old `is_final=true` rows as if they had passed a settlement contract that did not exist;
- era-aware readers can interpret legacy semantics explicitly.

## Red-team

A UI rename from `FINAL` to `PROVISIONAL` is not sufficient. Completion/reconciliation must be repaired first so the product is not accurately labeling an incomplete backend observation.

---

# Repair package S1-R5 — Authority identity hardening across finalization chain

## Problem

Current row IDs, booleans, timestamps and input signatures are useful evidence but not consistently sufficient as canonical semantic authority identities.

Known examples:

- multiple C0248 artifacts can carry `production_selected=true` within overlapping broad lineage;
- C0234 can validate exact upstream row IDs while the upstream semantic authority itself is weak;
- C0237 can publish append-only evidence without singular generation-valid current authority;
- actual locked capture has strong semantics but application-level rather than DB-level race-proof first-writer uniqueness.

## Target identity layers

Keep separate:

1. row/storage identity;
2. semantic work identity;
3. input-lineage identity;
4. content identity;
5. authority identity;
6. representation identity;
7. provider observation identity.

Do not overload one UUID/signature for all seven roles.

## Chain-specific target

For each Gameweek finalization generation, exactly one canonical selected authority path should be provable:

`manager/source generations -> projection authority -> C0248 candidate/peer -> selected C0248 authority -> C0234 gate authority -> C0237 publication authority -> actual submitted authority -> result/settlement generation`

The chain may contain multiple candidates/evidence rows; it must contain at most one canonical authority per semantic authority slot/generation.

## Acceptance evidence

- multiple candidate rows cannot simultaneously become canonical selected authority for the same authority key;
- stale worker/old generation cannot promote after newer generation exists;
- C0234 authorization references the exact selected authority identity, not only a row with a boolean state;
- C0237 current authority references exact gate/decision/deadline/manager generations;
- actual first complete locked capture has race-proof semantic uniqueness/canonicalization;
- deterministic reconciliation can classify duplicate/equivalent/conflicting outputs.

## Rollback / non-rewrite constraints

- do not delete duplicate historical artifacts simply because a new canonical identity contract exists;
- old ambiguity remains historical evidence;
- canonical authority is additive/superseding and era-aware.

## Red-team

Do not attempt S1-R5 first. Hardening IDs around incorrect deadline, manager-state or current-publication semantics would merely make the wrong truth more rigid.

---

# 2. Dependency graph

Required implementation order remains:

`S1-R1 official deadline`

→ `S1-R2 manager-state authority`

→ `S1-R3 canonical publication authority`

→ `S1-R4 result completeness/settlement`

→ `S1-R5 chain identity hardening`

This is a dependency preference, not one giant deployment.

Each repair should have its own implementation change ID or explicit child change record, migration plan, tests and approval.

### Why R3 precedes R5

Current publication authority must have known semantics before finalization IDs are hardened around it.

### Why R4 can proceed largely independently after R1/R2

Result completeness/settlement is downstream of actual play and can be repaired without waiting for full decision-chain identity hardening, but post-GW evaluation linkage in R5 depends on its final contract.

---

# 3. Proposed approval slicing

C0273 planning should not request one approval to repair all S1 items.

Recommended future approval units:

- `APPROVE S1-R1` — deadline authority only;
- `APPROVE S1-R2` — manager-state classification/readiness only;
- `APPROVE S1-R3` — canonical publication authority only;
- `APPROVE S1-R4` — result completeness/settlement only;
- `APPROVE S1-R5` — authority identity hardening only.

Approval is non-transitive.

---

# 4. Cross-repair invariants

Every eventual repair must preserve:

1. recommendation != actual submission != realized result;
2. historical forecasts are append-only;
3. historical ambiguity is not rewritten into fabricated certainty;
4. official deadline authority cannot be bypassed by a derived clock;
5. stale generations cannot regain canonical authority by later completion;
6. `latest` is never automatically equivalent to `current authoritative`;
7. partial durable work is reconcilable before retry/short-circuit;
8. C0234-equivalent authorization remains fail-closed;
9. no repair introduces autonomous account execution;
10. model numerical behavior is unchanged unless separately approved under another change.

---

# 5. Implementation test classes required later

When implementation is separately approved, each repair dossier must include tests from all applicable classes:

- deterministic unit/contract tests;
- race/concurrency tests;
- stale-generation/fencing tests;
- partial-write/reconcile tests;
- chronology/deadline-boundary tests;
- historical-era compatibility tests;
- API cross-surface consistency tests;
- fail-closed/degraded-state tests;
- rollback tests;
- digital-twin/failure-injection scenarios from prior C0273 planning.

Happy-path production history alone is not sufficient closure evidence.

---

# 6. What remains open for user review

1. Whether recommendation-only personalized output is acceptable while `CURRENT_PRIVATE_STATE` is unobservable, provided the limitation is explicit.
2. Whether authenticated private-manager access should ever be in scope before VPS migration or remain a later product capability.
3. Exact physical representation of canonical deadline evidence: dedicated table vs existing authoritative source snapshot + strict read contract.
4. Exact physical representation of canonical publication authority: pointer row, reducer/materialized state, or equivalent CAS-controlled primitive.
5. Exact official FPL scoring-settlement authority/field and correction policy.
6. Whether legacy `is_final` should remain available as fixture-complete compatibility field after new settlement fields exist.
7. Exact DB uniqueness/CAS primitive for actual locked submission and C0248 selected authority.
8. Whether soft-stale recommendation actionability is ever allowed predeadline; no default approval is assumed.
9. Exact generation-vector storage representation; a single global generation remains rejected.
10. How much legacy API backward compatibility is worth preserving versus deliberately versioning the canonical truth contract.

None of these open questions authorizes implementation.

---

# 7. Decision

S1.2 planning is complete enough to stop further broad truth-contract design.

The five S1 defects are now decomposed into bounded repair dossiers with explicit dependencies and tests.

Recommended next bounded planning batch:

> **S2.1 — Projection Completeness & Decision-Chain Integrity Audit**

That audit should test whether the projection universe is independently complete and trace the exact live path from manager/source state through projection, C0248 candidate/peer/selection, C0234, C0237, actual capture and evaluation—without implementing any repair.

**DO NOT IMPLEMENT, DEPLOY, ALTER RUNTIME/MODEL BEHAVIOR, PROMOTE, KILL, CUT OVER OR REWRITE HISTORY UNDER THIS CHECKPOINT. PRODUCTION CHANGES REMAIN EXPLICITLY APPROVAL-GATED.**
