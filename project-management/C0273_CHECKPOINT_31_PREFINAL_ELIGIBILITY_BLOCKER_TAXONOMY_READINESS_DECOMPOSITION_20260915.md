# C0273 — Checkpoint 31: PRE-FINAL Eligibility Blocker Taxonomy & Readiness Decomposition

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoints 28–30 by testing whether the current readiness machinery can safely serve the proposed all-week PRE-FINAL lane. This checkpoint is diagnostic/planning only. It does not run C0248, create manager state, alter readiness functions, change any gate/cron/API/UI, or publish GW5.

## 1. Live GW5 readiness re-verification

A read-only call to `private.c0213_p2_current_lineage_v03(5)` at approximately 2026-09-15 03:18 UTC shows that the current C0213 readiness aggregate is not suitable to be copied wholesale into a PRE-FINAL gate.

Current stages include:

- RESULTS — READY;
- FPL_CURRENT_DATA — READY, 659 rows;
- REALIZED_ROLES — BLOCKED, 219/220 mapped starters, coverage 0.9955;
- PLAYER_STATE — READY, 604 rows;
- TEAM_STATE — READY, 20 rows;
- TACTICAL_FIXTURE_STATE — READY, 100 calibrated rows;
- FIXTURE_PROJECTION — BLOCKED while its orchestrator row reports `running`, despite 10/10 fixture rows existing;
- PLAYER_PROJECTION — READY, prediction run 1368, 604 projected + 54 governed exclusions + 0 ungoverned missing;
- POINT_DISTRIBUTION — READY, 604 rows;
- MANAGER_STATE — NOT_CAPTURED;
- FULL_POOL_OPTIMIZER — INPUTS_NOT_READY;
- AUTOMATED_CURRENT15_DECISION — BLOCKED_EXPECTED and not required;
- SAVED_MANAGER_PLAN — NOT_YET_ALLOWED.

The aggregate blockers are:

1. `FIXTURE_PROJECTION_NOT_READY`;
2. `REALIZED_ROLE_REFRESH_INCOMPLETE` (219/220);
3. `MANAGER_STATE_NOT_READY`;
4. `FULL_POOL_OPTIMIZER_NOT_CURRENT`.

The aggregate result correctly reports `decision_ready=false`.

However, the lineage also contains an internal `DECISION_READINESS` stage whose local state is `READY` and whose embedded legacy evidence reports `decision_ready=true`. This is not necessarily a bug: it represents a narrower older evidence contract inside the broader C0213 P2 aggregate. But the vocabulary is dangerously ambiguous for an autonomous controller because `DECISION_READINESS=READY` and top-level `decision_ready=false` coexist in the same result.

## 2. Main finding

Checkpoint 30 concluded that PRE-FINAL should not simply reuse the complete final C0234 control stack. This live check establishes the same principle one layer earlier:

> **PRE-FINAL must not simply require `C0213 decision_ready=true` as one opaque prerequisite.**

C0213 currently bundles heterogeneous concerns:

- canonical forecast/data integrity;
- realized-role refresh completeness;
- transient orchestrator state;
- manager-state availability;
- legacy full-pool optimizer readiness;
- older decision-evidence readiness;
- saved-plan lifecycle restrictions.

Some are hard integrity prerequisites, some are lane-specific, some are transient/retryable, and some are legacy duplicate dependencies already under Checkpoint 26 adjudication.

Using the monolithic boolean as PRE-FINAL eligibility would reproduce the current website-availability problem even after adding a PRE-FINAL orchestrator.

## 3. Target blocker taxonomy

Future controller/gate logic should consume typed blocker semantics rather than one readiness boolean.

### B1 — HARD_INTEGRITY

Recommendation cannot be trusted under any lane.

Examples:
- incomplete/ungoverned player universe;
- illegal or contradictory projection identity;
- missing required point distributions;
- deterministic stale-generation mismatch at commit;
- malformed manager state when claiming current-aware transfer feasibility.

PRE-FINAL: block.  
FINAL: block.

### B2 — AUTHORITY_MISSING

Required semantic authority is absent, but a specifically governed degraded mode may exist.

Example:
- no verified current manager state.

PRE-FINAL: either `NO_TRUSTWORTHY_CURRENT_PLAN` or explicitly baseline-relative mode under Checkpoint 29.  
FINAL current-account authority: block unless policy explicitly permits the relevant authority class.

### B3 — TRANSIENT_RECONCILABLE

Work is currently running, partially persisted, or awaiting deterministic reconciliation.

Example:
- fixture projection orchestrator reports `running` while expected output rows already exist.

PRE-FINAL: do not immediately reinterpret as semantic corruption; reconcile/wait with bounded timeout. Preserve previous still-valid PRE-FINAL authority if its generation remains valid.  
FINAL: bounded wait/reconcile, then fail closed if deadline safety margin is threatened.

### B4 — COVERAGE_DEGRADED

Coverage is below a desired target but the semantic impact may be bounded and measurable.

Current example candidate:
- realized roles 219/220 (99.55%).

This must not automatically be reclassified as harmless. The missing identity could be a high-impact player. Future policy must inspect materiality, affected player/fixture and downstream fallback before choosing block vs degraded publication.

PRE-FINAL: policy-driven degrade/block based on materiality.  
FINAL: stricter threshold; exact coverage may remain required unless evidence supports a governed exception.

### B5 — LEGACY_CHALLENGER_DEPENDENCY

A historical readiness dependency that is not the intended canonical selector.

Example:
- C0213 full-pool optimizer, currently mandatory but targeted by Checkpoint 26 for possible independent-challenger role after D1–D5 proof.

PRE-FINAL today: remains blocking because no implementation change is authorized.  
Target: challenger policy, not opaque canonical readiness prerequisite, only after approved closure evidence.

### B6 — FINALIZATION_ONLY

Evidence/control required for FINAL but not inherently required for routine PRE-FINAL authority.

Examples from Checkpoint 30:
- fresh full C0240 adversarial completion;
- final T-2 refresh proof;
- final promotion selector proof;
- approved final challenger closure.

PRE-FINAL: not a default hard blocker.  
FINAL: block if required evidence absent.

### B7 — RESEARCH_OR_MANUAL_BACKLOG

Research/manual challenge work with no explicit production-integrity authority.

PRE-FINAL: visible, non-blocking by default.  
FINAL: only blocks if included in the approved finalization challenger set.

## 4. Realized-role 219/220 red-team

The current 219/220 state demonstrates why percentage-only readiness is insufficient.

Two cases with identical 99.55% coverage can have radically different risk:

- missing starter is a low-impact defensive role with stable fallback evidence;
- missing starter is a captain candidate, set-piece taker, newly transferred attacker, or player whose role materially changes teammate xMins/xGI.

Target policy therefore needs `coverage + materiality`, not a guessed percentage threshold.

Future evidence should expose:
- missing canonical player identity;
- expected minutes/ownership/captain relevance;
- whether player is in current/baseline squad;
- whether player is in C0248 viable candidate universe;
- whether missing role affects teammate redistribution or set pieces;
- fallback source and age;
- estimated decision sensitivity.

Do not relax 220/220 today.

## 5. Transient fixture-projection state red-team

The inspected lineage reports 10 fixture rows but marks FIXTURE_PROJECTION blocked because an orchestrator run is still `running`.

This proves row completeness and orchestrator lifecycle are separate facts.

Target controller behavior:
1. observe work identity/generation;
2. reconcile whether expected semantic outputs are complete;
3. distinguish `RUNNING_VALID`, `RUNNING_STALLED`, `COMPLETE_CURRENT`, `COMPLETE_STALE`, `PARTIAL_REPAIRABLE`;
4. avoid dispatching duplicate work merely because scheduler/runtime state has not yet closed;
5. never treat row count alone as proof of canonical completion.

This aligns with Checkpoints 02, 10, 12 and 15.

## 6. Decision-readiness naming contradiction

Current output can simultaneously contain:

- internal stage `DECISION_READINESS.state=READY` with embedded `decision_ready=true`;
- top-level C0213 `decision_ready=false`.

The likely semantic explanation is contract layering, but the names are unsafe for autonomous consumption.

Target documentation/API naming should distinguish:
- `LEGACY_DECISION_EVIDENCE_READY` (narrow historical evidence contract);
- `CANONICAL_PROJECTION_READY`;
- `PREFINAL_ELIGIBLE`;
- `FINALIZATION_ELIGIBLE`;
- `PUBLICATION_AUTHORIZED`.

No historical function/result should be rewritten. Future adapters may translate old evidence into explicit typed semantics.

## 7. Planned repair package — NOT AUTHORIZED

### S2-R18 — Typed readiness/blocker adapter

Create a versioned controller-facing readiness contract that decomposes existing evidence into typed blocker classes without rewriting historical C0213 outputs.

Acceptance:
- no single ambiguous `decision_ready` boolean is sufficient to authorize PRE-FINAL;
- every blocker has class, source, generation, materiality where applicable, retry/reconcile semantics and lane effect;
- legacy readiness remains queryable for audit.

### S2-R19 — Materiality-aware role coverage policy

Before any relaxation of exact role coverage, evaluate missing-role materiality and decision sensitivity. Preserve exact fail-closed behavior until validated.

### S2-R20 — Transient-work reconciliation policy

Controller distinguishes in-progress/reconcilable work from semantic incompleteness and avoids duplicate dispatch.

### S2-R21 — Readiness vocabulary cleanup at adapter/API layer

Expose unambiguous names for legacy evidence readiness, PRE-FINAL eligibility, FINAL eligibility and publication authority. Do not rewrite old rows/functions solely for naming consistency.

## 8. Acceptance scenarios

Future implementation tests should include:

- 604 + governed exclusions + zero ungoverned missing, manager state absent → explicit authority blocker/degraded baseline path;
- 219/220 roles with missing low-materiality player → policy outcome is explicit and evidence-backed;
- 219/220 roles with missing captain/current-squad/high-xMins candidate → hard block under conservative policy;
- fixture output complete while orchestrator still running → reconcile rather than duplicate dispatch;
- stalled orchestrator with partial rows → bounded repair/fail-closed path;
- legacy C0213 decision evidence green while canonical aggregate red → controller does not misread as eligible;
- C0213 challenger unavailable after future approved role closure → canonical C0248 path follows explicit challenger policy, not accidental hidden dependency;
- PRE-FINAL eligible does not imply FINAL eligible or execution authorized;
- stale generation between readiness and publication cannot become current authority.

## 9. Contradictions / open questions preserved

1. Exact realized-role materiality policy is unresolved; 99.55% is evidence, not an automatic acceptable threshold.
2. The missing 220th realized-role identity was not resolved in this checkpoint; no production diagnosis/repair is attempted.
3. Exact timeout distinguishing `RUNNING_VALID` from `RUNNING_STALLED` must be telemetry-derived.
4. C0213 full-pool optimizer remains a live hard blocker until Checkpoint 26 D1–D5 evidence and explicit approval permit role change.
5. GW5 manager state remains absent; Checkpoint 29 degraded-mode contract remains unresolved for implementation.
6. Official deadline authority remains unresolved under S1-R1.
7. Canonical publication authority remains unresolved under S1-R3.
8. The narrow internal `DECISION_READINESS` contract may have legitimate consumers; naming cleanup must not break or rewrite historical behavior.
9. `upstream_drifted_since_snapshot=true` appears in the current C0218 horizon readiness for GW5–GW7 while cadence-valid snapshots remain accepted. Exact meaning/acceptable drift for PRE-FINAL needs a separate freshness adjudication.
10. GW6/GW7 forward baselines are several days older than the current GW5 primary run; whether this is appropriate for sequential PRE-FINAL optimization depends on the forward-horizon cadence contract and material upstream changes.
11. No FPL account execution is authorized.

## 10. Decision

C0273 records that the proposed PRE-FINAL lane requires a **typed readiness adapter/blocker taxonomy**, not direct reuse of the monolithic C0213 `decision_ready` boolean.

The current GW5 lineage demonstrates four materially different blocker types at once: transient fixture-projection lifecycle, incomplete realized-role coverage, missing manager authority and legacy full-pool optimizer readiness. They must not be treated as one undifferentiated failure class.

This is planning only. No blocker is relaxed, no planner is invoked and no publication is created.

**All implementation, deployment, scheduler, readiness, model, gate, planner, publication, API/UI and account-execution changes remain explicitly approval-gated.**
