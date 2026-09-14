# C0273 — External Senior Analyst Review / Red-Team

Date: 2026-09-14  
Review target: C0273 Master Plan V0.1 + Operating Procedures V0.1  
Perspective: external senior SRE / ML-platform architect / quantitative football analyst / product-security reviewer  
Status: PLANNING REVIEW ONLY — NO IMPLEMENTATION AUTHORIZED

## 1. Executive assessment

V0.1 is directionally correct. It correctly identifies that FIE's main remaining gap is orchestration rather than another football model, and it preserves the right safety boundaries: append-only historical forecasts, fail-closed authorization, no autonomous numeric model promotion, no external FPL-account execution, and separation of actual/recommendation/realized evidence.

However, V0.1 is **not yet implementation-ready**. It under-specifies several failure domains that matter more in an autonomous system than in an operator-assisted system.

The biggest risk is turning today's distributed complexity into one new central controller without first solving **authoritative time, source coverage, idempotent dispatch, workload isolation, rate-limit budgeting, replayability and operational change freeze**.

External-review verdict:

**KEEP THE PROGRAM. REVISE THE PLAN BEFORE ANY IMPLEMENTATION.**

No additional football model is required for this program.

---

## 2. Critical finding A — deadline authority is not explicit enough

The current runtime has at least one final-gate implementation that derives deadline as `first kickoff - 90 minutes`. That may usually agree with FPL, but an autonomous system should not infer the competition deadline from a fixture assumption when the official FPL event object exposes an authoritative deadline.

### Required correction

The autonomy plan must define a canonical **Deadline Authority Contract**:

1. primary: official FPL event `deadline_time` for the target Gameweek;
2. secondary cross-check: fixture chronology / expected 90-minute relation;
3. contradiction => integrity incident and final-window block, not silent selection of one value;
4. all database timestamps stored UTC;
5. display timezone is presentation-only;
6. controller must tolerate clock skew and record controller/database time.

This becomes a P0 prerequisite for final-window autonomy.

---

## 3. Critical finding B — “full autonomy” currently exceeds source coverage

The FPL operating doctrine requires current information such as injuries, suspensions, manager press conferences, predicted/confirmed lineups, transfers, expected minutes, set pieces, European/cup congestion and tactical changes.

The current autonomous runtime has strong structured FPL/team/statistical ingestion, but V0.1 does not prove that every required **late qualitative source** has an automated, provenance-safe feed.

A controller cannot make the system fully autonomous merely by orchestrating the sources it already has if material information still depends on ChatGPT/web/manual review.

### Required correction

Create a Source Coverage Registry with, for each decision-critical fact family:

- required/optional status;
- current source;
- provider authority tier;
- structured vs unstructured;
- automated coverage yes/no;
- expected latency;
- freshness budget by lifecycle;
- provenance/known-at timestamp;
- fallback;
- known blind spots.

Until all P0 fact families are covered, autonomy maturity must be described honestly as **operational autonomy over covered inputs**, not complete football-information autonomy.

---

## 4. Critical finding C — controller must not become a single point of failure

V0.1 says “one FIE Autonomy Controller.” Conceptually correct, physically dangerous if interpreted as one process/function.

### Required architecture

Separate:

- **scheduler/reconciler** — decides what work is eligible;
- **durable state/event store** — source of controller truth;
- **workers/dispatchers** — execute bounded work;
- **policy/readiness functions** — pure-ish evaluators of readiness;
- **public status materializer** — serving surface.

The reconciler should be stateless/restartable. Durable state must live in the database. Multiple reconciler invocations must be safe under lease/leader semantics.

There should be one **logical authority**, not one fragile runtime process.

---

## 5. Critical finding D — exactly-once is impossible; at-least-once must be a design invariant

V0.1 mentions this, but it needs to become a hard acceptance criterion.

Every dispatchable operation must be classified:

- idempotent by natural key;
- idempotent via input signature/upsert;
- append-only but duplicate-detectable;
- non-idempotent and therefore not autonomously retryable.

No final implementation should be accepted until every controller-invoked action has a declared retry/idempotency class.

This is particularly important around projection generation, planner runs, publication and actual-result settlement.

---

## 6. Critical finding E — workload isolation and priority are missing

FIE currently has 29 active cron jobs, including production refresh, decisioning, diagnostics and research. An autonomous orchestrator can make load worse if it reacts to many events simultaneously.

The project already observed reliability problems from burst concurrency on V3. The same lesson applies server-side.

### Required correction

Define work priority classes:

1. **P0 FINAL_WINDOW** — deadline-critical facts, projections, C0248, C0234, C0237.
2. **P1 LIVE/SETTLEMENT** — result/actual scoring and settlement.
3. **P2 ROLLING_DECISION** — ordinary future-GW refresh/decision.
4. **P3 CORE_BACKGROUND** — team/history/tactical refresh.
5. **P4 RESEARCH/SHADOW** — never allowed to starve P0–P3.

Define global and provider-specific concurrency budgets, plus a circuit breaker that pauses research under deadline/load pressure.

This should be a first-class control-plane requirement, not an optimization after launch.

---

## 7. Major finding F — rate limits/backpressure need explicit budgets

Recent “too many requests” errors are a warning. V0.1 says backoff, but does not define coordinated request budgeting.

Required concepts:

- token/budget per provider/API;
- respect `Retry-After`;
- maximum concurrent cold Edge requests;
- queue admission control;
- deadline-priority reservation;
- no fan-out retries;
- exponential backoff with jitter;
- circuit breaker after repeated provider failure;
- cached last-valid data when allowed.

The controller must reduce load when dependencies are unhealthy, not amplify it.

---

## 8. Major finding G — event ledger needs causal semantics, not only state transitions

A transition log alone is insufficient to answer “why did this rerun?”

Add a durable **trigger/event ledger** concept:

- event type;
- source;
- observed-at / known-at;
- entity/GW scope;
- payload hash;
- causation ID;
- correlation/cycle ID;
- materiality classification;
- downstream invalidation set.

Then a work item can state: “projection rerun because availability event E123 invalidated player-state signature S456,” rather than only showing that the lifecycle moved.

This is essential for forensic replay and avoiding unnecessary recomputation.

---

## 9. Major finding H — need a historical replay / digital twin before dispatch autonomy

V0.1 proposes shadow observation but does not specify replay depth.

Before controller dispatches production work, it should be tested against:

- historical GW event sequences where available;
- at least several live GWs in read-only shadow mode;
- synthetic failure scenarios.

Golden scenarios must include:

- duplicate trigger;
- 429/timeout;
- missing manager state;
- stale availability;
- mixed horizon lineage;
- late price move;
- late injury/lineup news;
- deadline change/clock contradiction;
- postponed/rescheduled fixture;
- blank/double GW;
- partial result ingestion;
- bonus/points correction;
- controller restart mid-cycle;
- cross-beam disagreement;
- chip path;
- actual FPL submission unavailable.

No final-window autonomy should launch without deterministic replay evidence.

---

## 10. Major finding I — fixture anomalies are under-modeled operationally

A fully autonomous season must handle more than ordinary single-GW weeks.

Explicit lifecycle rules are required for:

- postponed matches;
- rescheduled matches;
- Double Gameweeks;
- Blank Gameweeks;
- cup/European congestion;
- abandoned fixtures;
- FPL deadline changes;
- fixture corrections after initial publication.

The controller must treat fixture/calendar changes as high-materiality invalidation events.

---

## 11. Major finding J — settlement finality must be defined more carefully

“Final fixture finished” is not always equivalent to “all FPL scoring facts permanently settled.” Bonus/stat corrections can arrive after full time.

Required correction:

Define at least:

- `MATCH_FINISHED_RAW`;
- `FPL_RESULT_PROVISIONAL`;
- `FPL_RESULT_SETTLED`;
- optional correction window / official-final criterion.

Decision journal outcome can initially be provisional, then become settled without rewriting the frozen forecast.

---

## 12. Major finding K — GitHub Pages must not be coupled to data freshness

The public product should update because APIs/publication tables change, not because GitHub Pages redeploys.

Pages deployment is code-release infrastructure. It should not be part of the normal football lifecycle.

The revised plan should state explicitly:

- static frontend deploys only on approved code changes;
- live engine state comes from versioned APIs/publication contracts;
- website can continue serving last-valid data if GitHub Actions is unavailable;
- a data refresh never needs a Pages build.

---

## 13. Major finding L — public/internal API separation and schema versioning need stronger treatment

Autonomous operation increases the cost of accidental API coupling.

Required:

- internal admin/orchestration APIs separated from public read APIs;
- public schema versions / backward-compatible additive changes;
- contract tests;
- payload size/latency budgets;
- cache policy by endpoint;
- public endpoints cannot trigger heavy decision jobs;
- public failures cannot mutate controller state.

---

## 14. Major finding M — change freeze around deadlines is missing

A production deployment shortly before an FPL deadline can create more risk than a slightly stale noncritical feature.

Required policy:

- establish a **deadline change freeze window** (candidate starting point: T−6h, to be validated);
- no ordinary production code/schema/model deployment during freeze;
- emergency fixes require explicit incident justification and post-deploy gate rerun;
- documentation/research may continue without runtime effect.

This is independent from the T−2 data refresh.

---

## 15. Major finding N — shadow governance needs statistical multiplicity controls

The proposed shadow contract is good but incomplete. With many experiments/variants, false positives are inevitable.

Require:

- one primary endpoint/metric;
- fixed cohort before outcomes;
- family/variant count recorded;
- adjustment or explicit evidence penalty for repeated family selection;
- TRAIN/VALIDATION/TEST separation where possible;
- promotion based on effect size + robustness, not p-value alone;
- minimum expected decision value after maintenance cost;
- overlap test against existing production features.

This strengthens the Noise-Control gate for the autonomous Shadow Lab.

---

## 16. Major finding O — automatic rejection should be reversible/audited

Allowing shadow auto-expiry is reasonable. Automatic “kill” needs nuance.

Recommended rule:

- automation may stop scheduled capture at a preregistered hard expiry or clear failure gate;
- evidence and code remain preserved;
- lifecycle becomes `REJECTED_AUTO_BY_FROZEN_CONTRACT` or `EXPIRED`;
- reactivation requires a new change ID or explicit decision;
- no silent deletion.

This avoids losing useful negative evidence.

---

## 17. Major finding P — source/change materiality must be formalized

Not every new datum should invalidate the whole decision chain.

Define materiality classes such as:

- player availability/status change;
- xMins-relevant expected-XI change;
- price affordability threshold crossed;
- fixture/deadline change;
- manager-state change;
- tactical state change above threshold;
- cosmetic/nondecision data change.

Each event maps to a downstream invalidation graph. This prevents event-driven orchestration from becoming constant recomputation.

---

## 18. Major finding Q — production model drift belongs in autonomy scope

Operational health can be green while the model deteriorates.

Add production-quality monitors for:

- xPts calibration;
- xMins/start calibration;
- captain haul calibration;
- clean-sheet/event calibration;
- fixture probability calibration;
- drift in error by position/team/role/regime;
- systematic missing-data/coverage shifts.

Drift does **not** automatically retrain/promote a model. It creates an alert/research ticket or can lower confidence/authorization if a pre-approved safety threshold is breached.

---

## 19. Major finding R — user/product scope needs a decision: personal engine or multi-user product

Current FPL architecture is deeply tied to entry `3559923`. A public consumer product eventually serving many managers is a different architecture.

Before implementation, explicitly choose one scope for C0273:

### Option A — autonomous personal FIE website

- one canonical manager state;
- fastest/lowest-risk path;
- current architecture naturally supports it.

### Option B — multi-user FPL product

Requires tenant isolation, per-user manager state, authentication, quotas, personalized optimization jobs, billing/privacy/abuse controls and much larger compute architecture.

Recommendation: **C0273 should target Option A first**. Keep public football intelligence pages reusable, but do not contaminate the autonomy controller with premature multi-tenancy.

---

## 20. Major finding S — observability should distinguish product health from decision health

One “engine health” label is insufficient.

Expose separately:

- DATA_HEALTH;
- MODEL_HEALTH;
- DECISION_HEALTH;
- PUBLICATION_HEALTH;
- WEBSITE/API_HEALTH;
- RESEARCH_HEALTH.

A research failure should not make the user think the final FPL decision is invalid. Conversely, a healthy website should not hide a stale decision.

---

## 21. Major finding T — need resource/cost budgets

Even on Supabase Pro, autonomy can create runaway execution.

Define budgets for:

- concurrent Edge invocations;
- SQL execution time;
- per-cycle work count;
- max controller work per reconciliation pass;
- retained raw data growth;
- research jobs/day;
- public API request rate.

Budget breach should throttle/defer low-priority work before production reliability degrades.

---

## 22. Security review additions

V0.1 security principles are right but need these explicit controls:

- service-role/admin secrets only server-side;
- admin-token rotation procedure;
- audit all privileged controller transitions;
- public APIs read-only with RLS/definer boundaries reviewed;
- website cannot send a request that indirectly triggers privileged orchestration;
- CORS/abuse/rate limits;
- dependency/version pinning for critical workers;
- secret absence must fail closed;
- least-privilege split between orchestration and deployment;
- controller has no GitHub code-write/deploy authority in normal operation.

---

## 23. Product UX review additions

The autonomous website needs a compact trust model visible to the user:

- “Updated X minutes ago”;
- lifecycle state;
- current recommendation maturity;
- confidence/no-meaningful-edge status;
- blocker vs advisory;
- last valid state when degraded;
- source freshness summary without overwhelming engineering detail;
- explicit distinction between engine recommendation and actual submitted team;
- reason a recommendation changed since previous publication.

A fully autonomous product that changes silently will feel less trustworthy than the current operator-assisted process.

---

## 24. Suggested autonomy maturity ladder

Do not call the system “fully autonomous” as a binary switch.

### L0 — manual operator
ChatGPT/human triggers and diagnoses.

### L1 — automated refresh
Schedules run sources/projections.

### L2 — autonomous rolling orchestration
Controller sequences rolling work and publication.

### L3 — autonomous finalization
Controller completes final window and fail-closed publication without operator.

### L4 — self-recovering operations
Retries, degraded mode, restart/replay, workload isolation and incident state are proven.

### L5 — autonomous research lifecycle
Shadow capture/evaluation/expiry and promotion-candidate dossier automated.

### L6 — full operational autonomy over covered inputs
Multiple-GW soak shows no routine operator dependency.

**Self-modifying production models/code are outside this maturity ladder by design.**

---

## 25. Revised implementation-order recommendation

V0.1's phases are good but should be reordered:

1. **Source Coverage + Deadline Authority** — prove the controller has the information and clock truth it needs.
2. **Contracts + Event/State Ledger** — define materiality, idempotency and causality.
3. **Observability + Public Health Contract** — visibility before control.
4. **Read-only Reconciler / Digital Twin** — historical replay + live shadow.
5. **Workload Isolation + Rate Budgets** — before autonomous dispatch.
6. **Low-risk dispatch** — noncritical idempotent jobs.
7. **Rolling decision orchestration**.
8. **Final-window orchestration**.
9. **Settlement + Shadow Lab autonomy**.
10. **Cron retirement/consolidation** after proven coverage.

This sequence reduces the risk that the controller becomes a new opaque failure layer.

---

## 26. What should not be added

The review explicitly rejects these tempting additions:

- another optimizer;
- a second final authorization gate;
- an LLM inside the critical decision path;
- autonomous code/model self-modification;
- a heavyweight external queue before Postgres-backed orchestration proves insufficient;
- big-bang removal of existing crons;
- public endpoints that can trigger expensive private work;
- autonomous live FPL account execution.

---

## 27. External-review conclusion

C0273 should proceed as a **control-plane consolidation and product-reliability program**, not an AI-agent program.

The target architecture should be deterministic, replayable, event-aware, deadline-authoritative, workload-isolated, rate-limited, fail-closed and observable. ChatGPT should remain valuable for strategic review and novel diagnosis, but routine operation must not depend on conversation continuity.

The revised master plan should incorporate all P0/Critical findings before the user is asked to approve implementation.
