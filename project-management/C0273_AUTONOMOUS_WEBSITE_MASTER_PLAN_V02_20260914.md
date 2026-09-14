# C0273 — Autonomous Website / Engine Control-Plane Master Plan V0.2

Date: 2026-09-14  
Status: REVISED PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Parent: C0272  
Supersedes: V0.1 as the working design  
External review incorporated: `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`

## 1. Program decision

C0273 is a **control-plane consolidation and product-reliability program**, not a new football model, not an AI-agent runtime, and not a self-modifying system.

The first target is an **autonomous personal FIE website for the canonical FPL entry and public football-intelligence surfaces**. Multi-user personalized optimization is explicitly outside the first implementation scope.

The target system should run the covered football/FPL workflow continuously without ChatGPT as operator, while preserving human approval for production model/code changes and preserving the existing prohibition on external FPL-account execution.

## 2. Autonomy maturity target

Use a maturity ladder instead of a binary “autonomous/not autonomous” claim.

- **L0 Manual operator** — human/ChatGPT triggers and diagnoses.
- **L1 Automated refresh** — source/projection schedules run themselves.
- **L2 Autonomous rolling orchestration** — controller sequences rolling work/publication.
- **L3 Autonomous finalization** — final-window cycle reaches valid FINAL/BLOCKED automatically.
- **L4 Self-recovering operations** — retries, degraded mode, restart/replay, workload isolation proven.
- **L5 Autonomous research lifecycle** — shadow capture/evaluate/expire/promotion-candidate dossier automated.
- **L6 Full operational autonomy over covered inputs** — multi-GW soak shows no routine operator dependency.

Self-modifying production code/models are outside the ladder by design.

## 3. Non-negotiable invariants

- Historical forecasts are append-only.
- Missing data is unknown, not zero.
- Actual submitted team != engine recommendation != realized outcome.
- `FINAL` != `execution_authorized`.
- ROLL remains a required comparator.
- Noise-Control/model-error semantics remain binding.
- Shadow research has zero numeric production effect until separately promoted.
- No autonomous numeric production-model promotion.
- No autonomous production code deployment.
- No external FPL account transfer/chip/captain/lineup execution.
- C0234 remains the single fail-closed authorization boundary.
- C0237 remains the canonical publication boundary.
- V2 stays isolated as rollback until separately retired.

## 4. P0 prerequisite: Deadline Authority Contract

Final-window autonomy cannot be implemented until deadline truth is explicit.

### Primary deadline authority

Official FPL event `deadline_time` for the target Gameweek.

### Cross-check

Fixture chronology / expected relation to first kickoff is diagnostic only.

### Contradiction policy

If official event deadline and fixture-derived expectation materially disagree:

- raise an integrity incident;
- mark deadline state unresolved;
- block final-window authorization progression;
- do not silently choose the convenient timestamp.

### Time rules

- persist UTC in database/controller records;
- store source-known-at and controller-observed-at separately;
- compare database/server clock and controller clock where practical;
- user timezone affects display only.

## 5. P0 prerequisite: Source Coverage Registry

A system cannot be called fully autonomous if required decision facts still depend on manual web/ChatGPT review.

Before implementation, register all fact families required by the FPL operating doctrine:

- prices;
- ownership/EO context;
- fixtures/deadlines;
- injuries;
- suspensions;
- transfers/registrations;
- expected minutes;
- predicted XI;
- confirmed XI when relevant/live;
- manager press conferences/team news;
- penalties/set pieces;
- European/cup congestion;
- tactical-role changes;
- realized roles;
- team/fixture statistical evidence;
- current manager squad/economy;
- public actual submitted FPL team after deadline;
- live/final scoring facts.

For each family record:

```text
fact_family
criticality
source/provider
authority_tier
structured_or_unstructured
automated_coverage
known_at_semantics
expected_latency
rolling_max_age
final_window_max_age
fallback
failure_effect = ADVISORY / DEGRADED / BLOCKED
known_blind_spots
```

C0273 implementation may progress only over fact families with an explicit coverage/freshness contract. Any uncovered P0 qualitative information remains a declared autonomy gap rather than being silently ignored.

## 6. Target architecture: one logical authority, multiple restartable parts

Do not implement one giant controller process.

```text
SOURCES / CLOCK / RESULT EVENTS
           ↓
      EVENT LEDGER
           ↓
   SCHEDULER / RECONCILER
           ↓
  READINESS + POLICY FUNCTIONS
           ↓
      WORK QUEUE / LEASES
           ↓
       BOUNDED WORKERS
           ↓
   CANONICAL ENGINE OUTPUTS
           ↓
 C0234 AUTHORIZATION → C0237 PUBLICATION
           ↓
   PUBLIC STATUS MATERIALIZER
           ↓
            V3
```

### Scheduler/reconciler

Stateless/restartable. It observes durable state and decides which work is eligible.

### Event/state store

Durable source of orchestration truth.

### Workers

Execute one bounded unit of already-approved work.

### Policy/readiness functions

Evaluate freshness, completeness, lineage, materiality and transition eligibility. They do not run hidden football logic.

### Public status materializer

Produces compact versioned read payloads for V3. Public reads never trigger heavy work.

## 7. Durable conceptual records

No schema is authorized yet, but the design requires these concepts.

### A. Gameweek state

Current materialized lifecycle/health per GW.

### B. Transition log

Append-only lifecycle changes.

### C. Trigger/event ledger

Why work became eligible:

```text
event_id
event_type
source
observed_at
known_at
gameweek/entity scope
payload_hash
causation_id
correlation_cycle_id
materiality_class
invalidation_targets
```

### D. Work items

```text
work_id
work_type
priority
input_signature
idempotency_key
status
lease_owner
lease_expires_at
attempt_count
next_attempt_at
result_ref
error_class
```

### E. Incidents

Degraded/blocked operational state and resolution history.

## 8. Hard work-execution invariant: at-least-once + idempotency

Never assume exactly-once execution.

Every future controller-dispatched action must be cataloged as one of:

1. naturally idempotent;
2. idempotent by input signature/upsert;
3. append-only but duplicate-detectable;
4. non-idempotent and therefore not safe for autonomous retry.

No action may enter autonomous dispatch until its class, deduplication key and retry policy are documented and tested.

## 9. Work priority and isolation

Current architecture mixes production, infrastructure and research schedules. The future controller must prevent research/background work from starving final FPL decisions.

Priority classes:

- **P0 FINAL_WINDOW** — deadline facts, final projections, C0248 validation, C0234, C0237.
- **P1 LIVE_SETTLEMENT** — live results, actual scoring, settlement.
- **P2 ROLLING_DECISION** — ordinary future projections/decisioning.
- **P3 CORE_BACKGROUND** — team/history/role/tactical refresh.
- **P4 RESEARCH_SHADOW** — captures/evaluations; always preemptible/deferable.

Required controls:

- global concurrency budget;
- provider/API concurrency budget;
- database-heavy-work budget;
- Edge invocation budget;
- reserved P0 capacity;
- research pause under deadline/load pressure;
- one heavy step per reconciliation pass where useful;
- no uncontrolled retry fan-out.

## 10. Rate-limit/backpressure policy

Given prior burst failures and connector/API throttling, coordinated rate control is mandatory.

Future policy must support:

- provider token/request budget;
- `Retry-After` respect;
- exponential backoff + jitter;
- circuit breaker after repeated provider failure;
- queue admission control;
- cached last-valid facts where semantically safe;
- no simultaneous retry storms;
- telemetry for 429/5xx/timeout rate.

The controller should reduce pressure when a dependency is unhealthy.

## 11. Materiality and invalidation graph

Event-driven does not mean “rerun everything on every change.”

Each event type must map to materiality and downstream invalidation.

Examples:

- availability/status change → player state → affected projections → decision;
- predicted-XI/xMins-relevant change → role/minutes state → projections → decision;
- market price crosses affordability threshold → manager economy/C0248 feasibility, not player xPts;
- fixture/deadline change → fixture state → projections + decision + lifecycle;
- manager-state change → C0248/decision only;
- nondecision metadata change → website/data refresh only;
- research evidence → shadow evaluator only.

Materiality thresholds themselves require explicit contracts; hidden ad-hoc invalidation is prohibited.

## 12. Revised Gameweek lifecycle

```text
GW_DISCOVERED
  ↓
SOURCE_COVERAGE_CHECK
  ↓
BASE_FACTS_SYNCING
  ↓
BASE_FACTS_READY
  ↓
PROJECTION_READY
  ↓
ROLLING_DECISION_READY
  ↓
PRE_FINAL_PUBLISHED
  ↓
FINAL_WINDOW_WAITING
  ↓
FINAL_SOURCE_REFRESH
  ↓
FINAL_PROJECTION_READY
  ↓
FINAL_C0248_VALIDATION
  ↓
FINAL_AUTHORIZATION_READY / FINAL_BLOCKED
  ↓
FINAL_PUBLISHED
  ↓
POST_DEADLINE_ACTIVE
  ↓
RESULT_PROVISIONAL
  ↓
RESULT_SETTLEMENT_WAITING
  ↓
GW_SETTLED
  ↓
POSTMORTEM_COMPLETE
```

Cross-cutting health states:

- HEALTHY;
- DEGRADED;
- BLOCKED;
- PAUSED.

These are orthogonal to lifecycle: e.g. `PRE_FINAL_PUBLISHED + DEGRADED` is valid.

## 13. Final-window design

T−2 remains the mandatory final refresh threshold, but it is not the only opportunity to react to late information.

### At T−2

- force P0 source refresh;
- require official deadline authority;
- require post-threshold prediction lineage;
- produce final C0248 candidate;
- produce identical-lineage independent beam peer;
- run unchanged promotion acceptance;
- re-run required decision controls;
- invoke C0234;
- publish C0237 state.

### Between T−2 and deadline

Material P0 events can invalidate the final lineage and trigger a complete new final cycle.

No mixed-lineage patching.

### At deadline

- stop creation of new executable authorization;
- freeze final pre-deadline recommendation evidence;
- transition to post-deadline mode;
- any later closure is audit-only.

## 14. Deployment freeze policy

Operational autonomy is incompatible with casual last-minute code changes.

Planning default:

- ordinary production code/schema/model deployment freeze begins **T−6h** before FPL deadline;
- exact freeze duration must be validated before implementation;
- emergency incident fix requires explicit approval/incident reason;
- any emergency deploy must rerun relevant smoke/readiness/governance checks;
- documentation-only/research-only changes with zero runtime effect may continue.

This freeze is separate from T−2 data finalization.

## 15. Fixture/calendar anomaly handling

The controller must have explicit policies for:

- postponed fixture;
- rescheduled fixture;
- Double Gameweek;
- Blank Gameweek;
- abandoned match;
- official FPL deadline change;
- fixture correction after prior publication;
- cup/European congestion changes relevant to minutes.

Calendar/deadline changes are high-materiality events and invalidate affected projections/decisions.

## 16. Result finality model

Do not equate final whistle with fully settled FPL scoring.

Recommended states:

- `MATCH_FINISHED_RAW`;
- `FPL_RESULT_PROVISIONAL`;
- `FPL_RESULT_SETTLEMENT_WAITING`;
- `FPL_RESULT_SETTLED`.

Exact settlement criterion must use official result/points state and a bounded correction policy. Frozen xPts remain immutable throughout.

## 17. Website/public API contract

GitHub Pages deployment is **not** part of football-data freshness.

- frontend code deploys only when code changes;
- data/state updates via versioned public read APIs/publication tables;
- data refresh never requires Pages rebuild;
- V3 should remain usable during GitHub Actions outage if current public APIs are healthy;
- public reads never trigger private heavy orchestration.

Public health should be decomposed into:

```text
DATA_HEALTH
MODEL_HEALTH
DECISION_HEALTH
PUBLICATION_HEALTH
WEBSITE_API_HEALTH
RESEARCH_HEALTH
```

Suggested status payload fields:

```text
contract_version
gameweek
lifecycle_state
health_dimensions
publication_id
publication_stage
publication_status
execution_authorized
prediction_run_id
planner_run_id
last_valid_at
source_freshness_summary
blockers
advisories
actual_submission_status
realized_status
change_since_previous_publication
```

## 18. Public/internal API separation

- Public endpoints are read-only.
- Internal orchestration/admin endpoints require strong server-side authorization.
- Public payloads are versioned and additive where possible.
- Contract tests are mandatory.
- Public endpoints have rate/abuse controls.
- Browser bundles contain no privileged secrets.
- Public failure cannot mutate controller state.
- Orchestration authority and deployment/code-write authority are separated.

## 19. Source freshness strategy

Freshness budgets vary by lifecycle and source. Do not define one age threshold.

Categories:

- deadline-critical;
- rolling decision;
- live/settlement;
- background tactical/statistical;
- research-only.

Each source contract determines whether stale data creates:

- advisory only;
- degraded state;
- decision blocker.

## 20. Shadow Lab V0.2

Every shadow contract must include statistical multiplicity controls.

Required fields:

- hypothesis/change ID;
- one primary metric;
- baselines;
- variant/family count;
- frozen parameters;
- target cohort;
- minimum sample;
- TRAIN/VALIDATION/TEST split where feasible;
- robustness/sensitivity rules;
- promotion-candidate threshold;
- reject threshold;
- hard expiry;
- expected decision value requirement;
- overlap test against existing production information;
- maintenance-cost assessment;
- production effect disabled.

Allowed automatic terminal research outcomes:

- `EXPIRED`;
- `REJECTED_AUTO_BY_FROZEN_CONTRACT`;
- `CONTINUE_SHADOW`;
- `PROMOTION_CANDIDATE`.

Rejection stops future capture but preserves evidence/code. Reactivation requires explicit new decision/change ID.

Numeric production promotion remains approval-gated.

## 21. Production-model quality monitoring

Autonomy must monitor not only uptime but predictive degradation.

Future quality monitors should include:

- xPts calibration;
- xMins/start calibration;
- haul/blank calibration;
- captain tail calibration;
- clean-sheet/fixture-event calibration;
- position/team/role/regime error drift;
- missing-data/coverage drift.

Drift does not auto-retrain or auto-promote. It creates an incident/research requirement, or can lower decision confidence if a separately approved safety threshold is breached.

## 22. Digital twin / replay requirement

Before any production dispatch authority, build/test a read-only reconciler against:

1. historical event sequences where available;
2. live current runtime in shadow for multiple GWs;
3. synthetic fault cases.

Minimum golden scenarios:

- duplicate trigger;
- 429/timeout/provider 5xx;
- stale manager state;
- stale availability;
- mixed prediction horizon;
- late price affordability crossing;
- late injury/team-news change;
- deadline contradiction/change;
- fixture postponement/reschedule;
- DGW/BGW;
- partial results;
- post-match points correction;
- worker/controller restart;
- cross-beam disagreement;
- chip path;
- actual submission unavailable;
- research job overload during final window.

Controller intention must match safe expected behavior before dispatch cutover.

## 23. Self-recovery design

On restart/reconciliation:

1. load lifecycle and health state;
2. inspect expired leases;
3. reconcile work items against actual completed runtime outputs;
4. close equivalent completed items;
5. requeue only genuinely incomplete retry-safe work;
6. re-evaluate freshness/lineage;
7. resume lifecycle.

Conversation context is never a recovery dependency.

## 24. Last-valid / degraded serving

If current state becomes invalid but a prior valid publication exists:

- keep serving last-valid publication;
- show `stale/degraded since` timestamp;
- show decision blockers separately from website health;
- never silently call stale data current;
- do not let research failure invalidate a good FPL publication.

No last-valid state may be reused for final authorization if required final freshness is gone.

## 25. Observability and SLO design

Track:

### Operational
- queue depth;
- oldest pending work;
- lease age;
- job latency;
- retry counts;
- 429/5xx/timeout;
- provider freshness;
- controller cycle duration;
- resource budget utilization.

### Decision integrity
- prediction lineage;
- manager-state lineage;
- C0248 candidate/peer/promotion state;
- C0234 blockers;
- ROLL comparison presence;
- historical rewrite flag;
- shadow effect violations;
- C0213 behavioral/governance status.

### Product
- public API availability/latency;
- publication age;
- stale/degraded duration;
- actual submission status;
- live scoring settlement state;
- latest successful code deployment separately from latest data update.

Planning SLO targets:

- no mixed-lineage final publication: 100%;
- no retrospective authorization: 100%;
- no shadow numeric leak: 100%;
- P0 final cycle begins within 5 minutes of T−2 once required sources are reachable;
- valid final state publishes within 15 minutes of all required P0 inputs becoming ready;
- restart/recovery of retry-safe controller work within 15 minutes;
- public last-valid read surface target 99.9% monthly.

Provider-specific budgets must be validated before adoption.

## 26. Incident severity

Suggested operational levels:

- **SEV0 Integrity** — history rewrite, mixed actual/recommendation truth, unauthorized execution/model effect. Immediate block/pause.
- **SEV1 Deadline** — P0 decision path at risk before deadline.
- **SEV2 Production degraded** — rolling/public decision stale but deadline not immediately at risk.
- **SEV3 Noncritical** — research/background failure.

Alerts should be deduplicated by incident signature to avoid notification storms.

## 27. Emergency pause / kill switch

The future controller needs an audited PAUSED mode.

While paused:

- no new heavy decision work dispatched;
- in-flight idempotent work may finish/persist;
- public last-valid state remains available;
- result ingestion may continue if independently safe;
- reason/initiator/time recorded;
- resume is explicit and audited.

Pause never deletes evidence or rewrites history.

## 28. Security requirements

- service/admin secrets server-side only;
- secret absence fails closed;
- rotation procedure documented;
- public APIs least privilege;
- privileged transition audit trail;
- CORS/abuse/rate controls;
- dependency pinning for critical workers;
- orchestration role cannot write GitHub/deploy code during normal operation;
- deployment authority separate from runtime controller;
- no FPL account password/token required for this program.

## 29. Revised implementation sequence — approval-gated

### Phase 0 — planning freeze
Current C0273 state. Finalize contracts/docs only.

### Phase 1 — Source Coverage + Deadline Authority
No orchestration cutover. Build/verify the registry and authoritative deadline contract.

### Phase 2 — Event/State/Idempotency Contracts
Define materiality graph, work catalog, retry classes and lifecycle state.

### Phase 3 — Observability + Public Health Contract
Expose health/readiness without controlling runtime.

### Phase 4 — Read-only Digital Twin
Reconciler observes existing system, predicts next work, performs historical/live replay, no dispatch.

### Phase 5 — Workload Isolation + Rate Budgets
Introduce priority/admission/backpressure policies before controller dispatch.

### Phase 6 — Low-risk Autonomous Dispatch
Only approved idempotent non-final refresh/research operations.

### Phase 7 — Rolling Decision Orchestration
Own rolling projection/decision sequencing. C0234/C0237 unchanged.

### Phase 8 — Final-Window Orchestration
Generalize/absorb C0272 only after multi-GW shadow proof and deadline-authority tests.

### Phase 9 — Settlement + Shadow Lifecycle
Automate post-GW settlement, journal, quality monitors, shadow expiry/evaluation/dossiers.

### Phase 10 — Cron Consolidation
Retire redundant schedules via a strangler approach only after live dependency/traffic proof.

### Phase 11 — L6 Soak
Several full Gameweeks with no routine operator intervention, including at least one abnormal/failure scenario.

No phase begins automatically. Each material implementation phase requires an approved change program.

## 30. Acceptance gates before first implementation

The user should not approve implementation until the planning package contains:

- Source Coverage Registry draft;
- Deadline Authority Contract;
- lifecycle/health state definitions;
- work priority/concurrency policy;
- idempotency/retry work catalog;
- event/materiality invalidation map;
- public/internal API boundary;
- deployment freeze policy;
- replay/golden-scenario test plan;
- incident/kill-switch policy;
- shadow statistical governance;
- explicit list of current crons/components that would remain untouched in Phase 1.

## 31. Anti-over-engineering rule

Do not build all conceptual records/services just because they appear in this plan.

Implementation should prefer existing Supabase/Postgres/Edge primitives first. Introduce an external queue/worker system only if measured scale/reliability proves Postgres-backed orchestration insufficient.

No new decision layer, model or LLM belongs in the critical path.

## 32. Current planning recommendation

**Do not implement yet.**

Next planning work should produce the concrete P0 contract package: source coverage matrix, deadline authority, work/idempotency catalog, materiality/invalidation graph, state/health definitions and digital-twin acceptance tests. After that package is red-teamed, C0273 can be presented for implementation approval.
