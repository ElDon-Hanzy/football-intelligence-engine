# C0273 — Autonomous Website / Engine Control-Plane Master Plan V0.1

Date: 2026-09-14  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Parent: C0272  
Branch: `c0273-autonomous-website-planning`

## 1. Objective

Turn the Football Intelligence Engine from a system that is largely automated but still operationally supervised through ChatGPT into a self-operating football/FPL intelligence product whose website continuously reflects the latest valid engine state without requiring ChatGPT to trigger, inspect, promote, publish or recover normal cycles.

Target operating chain:

```text
SOURCE CHANGE / CLOCK EVENT
        ↓
CONTROL-PLANE ORCHESTRATOR
        ↓
READINESS + INTEGRITY CONTRACTS
        ↓
CANONICAL DATA / PROJECTIONS
        ↓
OPTIMIZATION + DECISION CONTROLS
        ↓
FAIL-CLOSED AUTHORIZATION
        ↓
CANONICAL PUBLICATION
        ↓
V3 WEBSITE
        ↓
LIVE RESULTS / SETTLEMENT
        ↓
POST-GW EVALUATION / SHADOW LAB / NEXT-GW STATE
```

The goal is autonomy of **operation and publication**, not unconstrained autonomous model mutation or external FPL-account execution.

## 2. Current-state baseline

The live system already contains much of the required intelligence:

- chronology-safe source ingestion and result sync;
- current player/team/role/fixture state;
- production fixture and player projections;
- a full-pool optimizer;
- C0248 sequential multi-GW path authority;
- uncertainty, structural, red-team and challenger controls;
- C0234 fail-closed authorization;
- C0237 publication;
- V3 live workspace and actual-vs-engine scoring;
- C0213 architecture/consumption governance;
- C0272 T−2 final-promotion repair;
- 29 active production/research/infrastructure cron jobs at the 2026-09-14 planning baseline.

The key gap is not football intelligence. It is **coherent control-plane ownership**. Today multiple independent schedules, functions and manual inspections collectively decide what should run next. ChatGPT still acts as a senior operator across gaps, especially for diagnosis, retries, shadow adjudication, documentation and exceptional state transitions.

## 3. Definition of “fully autonomous website”

The website is operationally autonomous when all of the following are true:

1. Data refreshes occur without human prompting.
2. The system knows whether each required source is fresh enough for the current lifecycle state.
3. Projections run only on valid upstream lineage and are invalidated when material inputs change.
4. Decision jobs run in dependency order rather than because unrelated crons happen to align.
5. C0248 produces a fresh selected path automatically when required.
6. C0234 remains the sole fail-closed final authorization boundary.
7. C0237 publishes the latest valid state automatically.
8. V3 renders canonical publication/state, never reconstructing decision truth client-side.
9. Live results and actual FPL submission update automatically.
10. End-of-GW settlement triggers postmortem, calibration and shadow evaluation automatically.
11. Failed or stale dependencies lead to a visible degraded state instead of fabricated output.
12. The system can resume safely after timeouts, duplicated triggers, partial failure or service restart.
13. Shadow experiments have machine-readable start, freeze, evaluate, promote-candidate, expire and reject contracts.
14. Routine operation does not require ChatGPT.
15. ChatGPT becomes an external senior analyst / investigator rather than a runtime dependency.

## 4. Explicit autonomy boundaries

### Allowed target autonomy

The future controller may autonomously:

- detect lifecycle/state changes;
- schedule and sequence already-approved jobs;
- retry idempotent jobs within bounded policy;
- stop on stale/missing/contradictory evidence;
- select the latest valid lineage;
- request C0248 cross-beam validation;
- invoke already-approved deterministic promotion contracts;
- invoke C0234 and C0237;
- update website status/publication data;
- settle completed Gameweeks;
- evaluate preregistered shadow experiments;
- expire a shadow experiment when its pre-authorized hard-expiry condition is reached;
- raise promotion candidates for human approval;
- alert on degraded/blocked states;
- recover from an interrupted cycle using durable state.

### Not authorized by this plan

The autonomous system must **not**:

- rewrite historical forecasts;
- silently change model weights, thresholds or formulas;
- promote a new numeric model into production without a separately approved promotion decision;
- execute real FPL transfers, chip activation, captaincy or lineup changes on the user account;
- weaken C0234 or Noise-Control to achieve availability;
- infer missing evidence as zero;
- substitute engine recommendation for actual submitted team;
- mutate V2 rollback semantics;
- bypass security or freshness contracts during an incident.

## 5. Architecture principle: separate planes

### 5.1 Data plane

Owns football/FPL facts and derived evidence:

- source ingestion;
- canonical player/team/fixture/role state;
- prediction runs;
- optimizer/planner runs;
- actual results;
- shadow evidence.

The data plane must remain append-oriented where chronology matters.

### 5.2 Decision plane

Owns football decisions:

- full-pool optimization;
- C0248 sequential path selection;
- uncertainty/robustness/challenger controls;
- C0234 authorization;
- C0237 publication.

The future control plane orchestrates these components but does not duplicate their football logic.

### 5.3 Control plane

A small **FIE Autonomy Controller** owns operational progression only:

- current lifecycle state;
- dependency graph;
- trigger evaluation;
- leases/locks;
- idempotency keys;
- freshness/readiness checks;
- bounded retry/backoff;
- circuit-breaker state;
- job/run lineage;
- recovery/resume;
- alerts;
- checkpoints.

It must not become another model or optimizer.

### 5.4 Presentation plane

V3 consumes published canonical state and displays:

- engine state: healthy / delayed / degraded / blocked;
- Gameweek lifecycle;
- recommendation maturity: rolling / pre-final / final / post-deadline audit;
- authorization separately from publication maturity;
- latest verified actual submission;
- engine-vs-actual scoring;
- freshness timestamps and material blockers;
- decision rationale / key alternatives;
- shadow/research status where appropriate.

The presentation plane must not decide whether a recommendation is valid.

## 6. Canonical Gameweek lifecycle state machine

The controller should persist exactly one current lifecycle record per target Gameweek plus append-only transition history.

Proposed states:

```text
GW_DISCOVERED
  ↓
BASE_FACTS_SYNCING
  ↓
BASE_FACTS_READY
  ↓
PROJECTION_READY
  ↓
DECISION_CANDIDATE_READY
  ↓
PRE_FINAL_PUBLISHED
  ↓
FINAL_WINDOW_WAITING
  ↓
FINAL_REFRESH_RUNNING
  ↓
FINAL_CANDIDATE_READY
  ↓
FINAL_VALIDATION_RUNNING
  ↓
FINAL_AUTHORIZATION_READY / FINAL_BLOCKED
  ↓
FINAL_PUBLISHED
  ↓
POST_DEADLINE_ACTIVE
  ↓
SETTLEMENT_RUNNING
  ↓
GW_SETTLED
  ↓
POSTMORTEM_COMPLETE
```

Any state may transition to `DEGRADED` when a nonfatal dependency is stale/unavailable, or `BLOCKED` when decision integrity cannot be guaranteed.

Each transition must record:

- previous state;
- next state;
- timestamp UTC;
- target Gameweek;
- trigger type;
- exact input lineage/signature;
- controller version;
- job/run references;
- freshness contract result;
- decision/publication IDs if applicable;
- blockers/advisories;
- historical rewrite flag = false.

## 7. Trigger model: hybrid event-driven + scheduled safety net

Do not replace 29 crons with one giant cron.

Target pattern:

1. **Source/schedule events** detect that work may be needed.
2. Controller evaluates dependency state.
3. Only stale/invalidated downstream nodes run.
4. Completion records create the next eligible transition.
5. A low-frequency reconciliation sweep catches missed events.

Examples:

- result row changes → refresh realized roles/team state → future fixture state → affected projections → decisions;
- material availability change → invalidate affected target projection lineage → regenerate relevant projections → decisions;
- price change → manager economy/feasibility refresh → C0248 decision refresh only if materially relevant;
- entering T−2 window → force final information refresh regardless of ordinary cadence;
- deadline passes → freeze recommendation lane, verify actual submission, switch website to post-deadline mode;
- final fixture settles → post-GW pipeline.

Current crons remain valid operational sensors until a later implementation proves they can be consolidated safely.

## 8. Dependency/readiness contracts

Every autonomous stage needs an explicit machine-readable contract. At minimum each contract returns:

```text
ok
state
freshness
required_inputs
missing_inputs
stale_inputs
lineage
blockers
advisories
next_eligible_actions
```

Important distinction:

- **freshness**: data is recent enough;
- **completeness**: required rows exist;
- **lineage**: downstream output derives from the current required inputs;
- **semantic validity**: values make sense and satisfy invariants;
- **decision readiness**: all decision-critical contracts pass.

A stage must not rerun merely because a timer fired when its current valid output signature still matches all required inputs.

## 9. Durable orchestration records

Future implementation should persist, conceptually, four durable records rather than rely on conversation state:

### A. `autonomy_gameweek_state`
Current materialized state per GW.

### B. `autonomy_transition_log`
Append-only state changes and causal lineage.

### C. `autonomy_work_items`
Requested work, status, idempotency key, attempt count, lease owner/time, error class and result reference.

### D. `autonomy_incidents`
Degraded/blocked conditions, first seen, last seen, impact, automatic action, resolution and postmortem reference.

Exact schema is intentionally not implemented in C0273.

## 10. Work execution semantics

The system should assume **at-least-once triggers**, not magical exactly-once delivery.

Every work item therefore needs:

- deterministic idempotency key;
- input signature;
- lease with expiry;
- bounded retry count;
- exponential/jittered backoff for network/provider failures;
- no retry for semantic/integrity failures until input changes;
- deduplication against already-completed equivalent work;
- durable completion/failure record.

Two workers may observe the same event; only one should own the active lease, and a repeated completed work item should return the existing result rather than create conflicting decisions.

## 11. Source freshness classes

Each source should later be assigned a freshness class instead of one universal timeout.

Proposed classes:

- **deadline-critical**: manager state, FPL prices, injuries/suspensions, late team news, current-GW projections;
- **match-live**: scores, minutes, cards, substitutions, bonus/DC-relevant facts;
- **hourly/tactical**: team/process evidence, bookmaker data, tactical state;
- **post-match**: realized roles, result settlement, calibration;
- **research**: shadow captures/evaluation, never allowed to block production unless explicitly promoted.

Each contract needs `max_age`, expected update cadence, provider, fallback policy and whether stale data causes advisory, degraded or blocked state.

## 12. Normal weekly operating procedure

### Phase 1 — post-settlement / next-GW initialization

1. Verify prior GW is settled.
2. Append actuals and decision journal outcome.
3. Refresh realized roles and current team/player state.
4. Run calibration/evaluation jobs.
5. Evaluate shadow contracts.
6. Discover next relevant fixtures/deadline.
7. Create/refresh next GW lifecycle state.

### Phase 2 — rolling preparation

1. Refresh sources on approved cadence.
2. Recompute only invalidated fixture/player state.
3. Generate exact-horizon projections.
4. Verify C0213 readiness/lineage.
5. Run optimizer / C0248 as needed.
6. Run required decision controls.
7. Publish PRE_FINAL state through C0237.
8. Website reflects fresh state and blockers.

### Phase 3 — final window

At T−2:

1. Force deadline-critical source refresh.
2. Require a prediction run after the threshold.
3. Run final-lineage C0248 candidate.
4. Run independent same-lineage cross-beam validation.
5. Apply unchanged deterministic promotion acceptance.
6. Refresh decision controls.
7. Run C0234.
8. Publish final/blocked state via C0237.
9. Continue to re-evaluate if material final-window facts change, but never publish mixed lineage.

### Phase 4 — deadline transition

1. Freeze pre-deadline recommendation evidence.
2. Stop any operation that would create retrospective authorization.
3. Sync actual FPL submission from public FPL data when available.
4. Keep actual and recommendation separate.
5. Website switches to POST_DEADLINE_ACTIVE.

### Phase 5 — live / settlement

1. Ingest live/final result facts.
2. Update realized scoring without rewriting frozen xPts.
3. Mark totals provisional until fixture/GW settlement.
4. After final fixture, run settlement pipeline.
5. Freeze actual result and decision-quality records.

## 13. Shadow Lab lifecycle

Every shadow family must have a machine-readable experiment contract containing:

- hypothesis/change ID;
- owner/workstream;
- input sources;
- freeze timestamp;
- target cohort/GWs;
- immutable parameters;
- primary metric;
- secondary metrics;
- minimum sample;
- promotion-candidate threshold;
- rejection threshold;
- hard expiry;
- multiple-testing/family-selection policy;
- production effect = false;
- evaluator entrypoint;
- current state.

Proposed states:

```text
REGISTERED → CAPTURING → FROZEN → EVALUATING
            → CONTINUE_SHADOW
            → PROMOTION_CANDIDATE
            → REJECTED
            → EXPIRED
```

A preregistered hard expiry may autonomously stop further research capture. A **numeric production promotion remains human approval-gated**.

## 14. Website autonomy contract

V3 should consume a compact public status contract rather than infer system health from partial APIs.

Conceptual fields:

```text
gameweek
lifecycle_state
engine_health
publication_id
publication_stage
publication_status
execution_authorized
prediction_run_id
planner_run_id
last_valid_at
freshness_summary
blockers
advisories
actual_submission_status
realized_status
shadow_summary
```

User-facing rules:

- always show last verified timestamp;
- distinguish `FINAL`, `AUTHORIZED`, `ACTUAL`, and `SETTLED`;
- when current state is invalid, retain the last valid publication but label it stale/degraded;
- never replace a blocked final state with an earlier recommendation without explicit stale labeling;
- never make the website unavailable merely because a noncritical research job failed.

## 15. Failure taxonomy and automatic response

### Class A — transient provider/network

Examples: HTTP 429/5xx, timeout.

Response:
- bounded retry with backoff;
- respect provider rate limits;
- continue last valid state;
- escalate to DEGRADED only after freshness budget is exceeded.

### Class B — missing/stale source

Response:
- do not synthesize values;
- classify impact by freshness contract;
- block only if decision-critical.

### Class C — semantic/integrity contradiction

Examples: impossible budget, duplicated player, mixed GW, lineage mismatch.

Response:
- no automatic retry loop;
- enter BLOCKED;
- preserve evidence;
- alert.

### Class D — worker/controller interruption

Response:
- lease expires;
- next controller pass resumes from durable work/state;
- no assumption that prior invocation completed.

### Class E — code/deployment regression

Response:
- stop advancing affected state;
- retain last valid publication;
- rollback under approved deployment procedure;
- V2 remains separate fallback until later retirement approval.

## 16. Observability requirements

### Health metrics

- source freshness by source/GW;
- work queue depth;
- oldest pending work age;
- job latency and failure rate;
- retry counts;
- projection readiness;
- decision readiness;
- publication age;
- current lifecycle state duration;
- controller reconciliation drift;
- Edge/API 429/5xx rate;
- V3 API latency;
- stale publication duration.

### Decision integrity metrics

- current prediction lineage;
- optimizer/planner lineage;
- cross-beam status;
- C0234 blockers;
- actual-vs-recommendation separation checks;
- historical rewrite flag;
- C0213 behavioral proof;
- shadow production-effect violations.

### Public website health

- catalog/workspace/actual-live availability;
- max-two cold-request C0269 policy preserved;
- last successful public smoke;
- last successful Pages deployment;
- client error budget.

## 17. Proposed SLOs — planning targets, not commitments

- Deadline-critical source freshness: within its provider-specific budget for 99% of final-window time.
- Final T−2 cycle begins within 5 minutes after threshold once required source refresh is possible.
- A completed/valid final cycle publishes within 15 minutes of all required final inputs becoming ready.
- No mixed-lineage final publication: 100% integrity target.
- No retrospective execution authorization: 100% integrity target.
- Public V3 last-valid state availability: 99.9% monthly target, independent of noncritical research failures.
- Control-plane work recovery after transient worker interruption: within 15 minutes.

These must be validated against provider/API limits before implementation.

## 18. Security model

- public website receives only least-privilege public endpoints;
- internal orchestration endpoints require service/admin authorization;
- secrets never enter browser bundles or GitHub documentation;
- controller permissions are split where possible: scheduling/orchestration vs data mutation vs deployment;
- no FPL account credential is required for the autonomous website plan;
- production model promotion and deployment remain approval-gated;
- every administrative transition is auditable.

## 19. Deployment/change-control design

The autonomous runtime must not autonomously deploy arbitrary new code.

Target deployment procedure:

1. change registered;
2. branch + migration/code + tests;
3. regression/semantic/security checks;
4. staging or controlled validation where feasible;
5. explicit production approval for material model/control changes;
6. deploy;
7. post-deploy live smoke;
8. C0213 behavioral/governance audit;
9. mark Verified only after runtime/source parity.

Autonomy operates **within approved runtime contracts**; it does not rewrite those contracts on its own.

## 20. Recovery / disaster requirements

Future implementation must support:

- reconstructing current controller state from append-only transitions + canonical runtime tables;
- detecting incomplete work after restart;
- replaying orchestration without replaying already-completed model effects;
- database backup/restore procedure;
- repository/runtime parity check;
- emergency pause/kill switch for controller dispatch;
- last-known-good publication serving;
- manual state override only through an audited administrative action.

## 21. Implementation roadmap — not authorized yet

### Phase A — contracts and observability only

Design/freeze lifecycle states, work semantics, source freshness matrix, SLOs and public health contract. No orchestration cutover.

### Phase B — read-only controller shadow

Controller observes current crons/runs and predicts what should run next without dispatching. Compare controller intention vs actual system behavior for multiple GWs.

### Phase C — noncritical dispatch

Allow dispatch of idempotent refreshes/research evaluation only. No final decision authority.

### Phase D — rolling FPL orchestration

Controller owns rolling projection/decision sequencing while C0234/C0237 remain unchanged.

### Phase E — final-window orchestration

Absorb/generalize C0272 final-window sequencing only after shadow proof.

### Phase F — settlement/shadow automation

Automate post-GW settlement, decision journal, calibration and experiment state transitions.

### Phase G — product health surface

Expose lifecycle/health/freshness/degraded state cleanly in V3.

### Phase H — cron consolidation

Retire redundant schedules only after dependency/traffic evidence proves controller coverage. Avoid big-bang removal.

## 22. Program acceptance criteria

A later implementation is not “fully autonomous” until, across a multi-GW soak period:

- normal weekly cycle requires no ChatGPT intervention;
- final decision cycle reaches valid published/blocked state automatically;
- duplicated triggers do not create conflicting runs/publications;
- transient failures recover automatically;
- integrity failures stop safely;
- V3 always exposes accurate health/maturity;
- shadow contracts evaluate automatically;
- controller restart/resume is proven;
- C0213 governance remains green;
- zero historical rewrites;
- zero unauthorized account execution;
- V2 remains independently viable until explicit retirement approval.

## 23. V0.1 known open questions

1. What source-specific freshness budgets are realistic in the final two hours?
2. Which current crons are best retained as source sensors and which are eventual controller-owned dispatches?
3. Should work dispatch live primarily in Postgres/pg_cron + Edge Functions, or should a dedicated queue/worker service eventually be introduced?
4. What is the minimum viable public engine-health contract for V3?
5. What soak duration is sufficient before C0272 final-window responsibility can be generalized?
6. Which shadow lifecycle transitions may be fully automatic versus approval-gated?
7. What operational alert channel should be canonical outside the website itself?
8. What disaster-recovery RPO/RTO is justified for this project?

## 24. Planning checkpoint

This V0.1 document is deliberately a design artifact only. No schema, cron, Edge Function, model, optimizer, publication behavior or website runtime has been changed by C0273 at this checkpoint.
