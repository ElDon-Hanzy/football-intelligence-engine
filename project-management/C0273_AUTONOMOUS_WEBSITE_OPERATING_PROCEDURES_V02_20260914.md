# C0273 — Autonomous Website Operating Procedures V0.2

Date: 2026-09-14  
Status: REVISED PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Supersedes: V0.1 as the working SOP design

This revision incorporates the external senior-analyst review. It adds authoritative deadline handling, source-coverage checks, workload priority, backpressure, event causality, settlement finality, deployment freeze and replay/recovery procedures.

## SOP 0 — universal controller rule

Before any work item:

1. Resolve target Gameweek from canonical event state.
2. Resolve authoritative official FPL deadline.
3. Read lifecycle + health dimensions.
4. Read causal trigger/event.
5. Evaluate source coverage/freshness for the work type.
6. Evaluate materiality/invalidation scope.
7. Build deterministic input signature + idempotency key.
8. Classify priority P0–P4.
9. Check concurrency/rate/resource budget.
10. Deduplicate against equivalent active/completed work.
11. Acquire lease.
12. Run one bounded unit of work.
13. Persist result/error with causation lineage.
14. Re-evaluate readiness/health.
15. Advance state only through an explicit transition contract.

Never weaken a gate to recover availability.

---

## SOP 1 — authoritative deadline resolution

### Primary source
Official FPL Gameweek/event `deadline_time`.

### Cross-check
Compare against fixture chronology and expected first-kickoff relationship.

### Pass
Official deadline exists, target GW identity is unambiguous, and no material contradiction exists.

### Fail
If official deadline is absent or materially conflicts with calendar state:

- set `DECISION_HEALTH=BLOCKED` for final-window progression;
- create SEV1 deadline incident;
- preserve last valid PRE_FINAL state;
- do not infer a new final deadline from first kickoff alone.

All persisted times are UTC. Display conversion happens only in V3.

---

## SOP 2 — source coverage check

Before any decision-grade cycle, evaluate required fact families for the lifecycle.

### Rolling cycle minimum

- fixtures/deadline;
- current prices;
- manager state/economy;
- injuries/suspensions/availability;
- expected minutes / XI evidence;
- team/fixture state;
- role/tactical state.

### Final-window minimum

All rolling requirements plus any registered P0 late-news/press-conference/lineup sources required by the Source Coverage Registry.

### Outcome

- covered + fresh => continue;
- covered but stale noncritical => DEGRADED;
- covered but stale decision-critical => BLOCKED;
- required fact family has no automated source => declared autonomy coverage gap; do not label system L6 over that scope.

---

## SOP 3 — event capture and materiality

Every detected change becomes a causal event before downstream work.

Record:

- event type/source;
- observed-at;
- source-known-at;
- target entity/GW;
- payload hash;
- materiality class;
- invalidation targets;
- causation/correlation identifiers.

Examples:

- `PLAYER_AVAILABILITY_MATERIAL` invalidates player state + affected projections + decision;
- `PRICE_AFFORDABILITY_CROSSING` invalidates economy/decision feasibility only;
- `FIXTURE_CALENDAR_CHANGE` invalidates fixture state + projections + decision/lifecycle;
- `RESEARCH_RESULT` routes only to shadow evaluation;
- `COSMETIC_METADATA` does not trigger football decision recomputation.

---

## SOP 4 — admission control / workload priority

Classify work:

- P0 FINAL_WINDOW;
- P1 LIVE_SETTLEMENT;
- P2 ROLLING_DECISION;
- P3 CORE_BACKGROUND;
- P4 RESEARCH_SHADOW.

Before dispatch:

- check active heavy-work count;
- check provider request budget;
- check Edge/database budget;
- reserve capacity for P0;
- defer P4 first under pressure;
- never launch retry fan-out.

When P0 work is active, research may be paused automatically under the approved policy.

---

## SOP 5 — transient provider failure

For retry-safe work only:

1. inspect status/error class;
2. honor `Retry-After` if available;
3. exponential backoff + jitter;
4. release/renew lease correctly;
5. increment attempt count;
6. stop at provider/work-type max attempts;
7. open/extend circuit breaker on repeated failure;
8. move health to DEGRADED/BLOCKED only when freshness budget is exceeded.

A dependency outage should reduce traffic, not multiply it.

---

## SOP 6 — base source refresh

Dispatch only approved ingestion entrypoints whose idempotency/retry class is registered.

Success requires:

- expected scope/row counts plausible;
- provenance/known-at present;
- no target-GW contamination;
- semantic validation passed;
- causal event linked.

A timer alone is not sufficient reason to rerun if equivalent valid evidence exists.

---

## SOP 7 — canonical state rebuild

Rebuild only state invalidated by causal events.

State families include:

- manager/economy;
- player availability;
- player role/xMins support;
- team performance;
- fixture/tactical state;
- prices;
- realized role/state after completed matches.

Do not propagate a failed state rebuild into projections.

---

## SOP 8 — projection cycle

Preconditions:

- exact GW/horizon;
- deadline/source coverage contract valid;
- required canonical states fresh;
- model registry compatible;
- no unresolved integrity incident.

Run projection pipeline only when its current input signature differs from the latest valid projection signature or a forced final refresh is required.

Success requires exact-horizon lineage, governed player coverage, internal distribution consistency and zero unapproved shadow numeric effect.

---

## SOP 9 — rolling decision cycle

Trigger: new valid prediction lineage or material manager-state/economy change.

Sequence:

1. verify projection readiness;
2. run required optimizer evidence;
3. run C0248 candidate;
4. run required uncertainty/structural/rank/red-team/challenger controls;
5. compare against ROLL;
6. apply Noise-Control/model-error rules;
7. publish PRE_FINAL via C0237.

C0230 remains advisory shadow and may not block.

---

## SOP 10 — deployment freeze

At candidate default T−6h before official FPL deadline:

- ordinary production code/schema/model deploys are frozen;
- current runtime continues normal data/decision operation;
- documentation and zero-runtime research may continue;
- emergency fix requires explicit incident approval;
- emergency deploy must be followed by live smoke + readiness/governance rerun.

Exact freeze duration must be approved during implementation planning.

---

## SOP 11 — final T−2 cycle

Trigger: official deadline minus two hours.

Priority: P0.

Sequence:

1. confirm authoritative deadline;
2. force all registered P0 source refreshes;
3. wait for required freshness contracts or declare blocker;
4. require projection lineage generated after T−2;
5. run final C0248 candidate;
6. run independent same-manager-state / identical prediction-vector cross-beam peer;
7. run unchanged deterministic C0248 promotion acceptance;
8. re-run required decision controls;
9. invoke C0234;
10. invoke C0237;
11. persist final-window cycle event + work lineage.

Material late P0 event after publication invalidates the final lineage and restarts the full final cycle. Never patch only one downstream layer.

---

## SOP 12 — deadline transition

At official deadline:

- stop creation of new executable authorization;
- freeze final pre-deadline recommendation evidence;
- retain any blocker state honestly;
- switch lifecycle to POST_DEADLINE_ACTIVE;
- start actual-submission acquisition;
- any later FINAL closure is audit-only, never retroactive execution authorization.

---

## SOP 13 — actual submitted team capture

Capture from verified public FPL source when available.

Pass requirements:

- 15 unique players;
- 11 + 4 structure;
- captain/vice/chip captured;
- target GW matches;
- source/capture timestamp recorded.

If unavailable, preserve exact user-facing phrase:

`Actual submitted team not verified.`

Recommendation may never substitute for actual.

---

## SOP 14 — live result ingestion and provisional scoring

Fixture transitions:

`FUTURE → LIVE → MATCH_FINISHED_RAW`.

Player scoring can become `FPL_RESULT_PROVISIONAL` after sufficient result facts exist.

Engine and actual scenarios are scored independently with official FPL captain/vice/autosub/chip semantics. Frozen xPts never change.

Missing player result row remains unknown.

---

## SOP 15 — settlement finality

Do not settle merely because all matches show finished.

Required stages:

1. all fixtures `MATCH_FINISHED_RAW`;
2. required FPL player/event result rows present;
3. points/bonus state reaches official/approved settlement criterion;
4. bounded correction waiting rule satisfied;
5. mark `FPL_RESULT_SETTLED`;
6. then mark `GW_SETTLED`.

If official scoring later changes within the allowed settlement policy, realized evidence may receive a new append-only correction state; frozen forecasts remain untouched.

---

## SOP 16 — post-GW pipeline

After `GW_SETTLED`:

1. finalize engine-vs-actual realized totals;
2. append decision journal outcome;
3. evaluate decision quality using only decision-time evidence;
4. refresh realized roles;
5. refresh team/player state;
6. run production quality/calibration monitors;
7. evaluate due shadow experiments;
8. discover next GW/deadline;
9. initialize next lifecycle.

---

## SOP 17 — fixture/calendar anomaly

High-materiality anomaly examples:

- postponement;
- reschedule;
- abandonment;
- Double Gameweek;
- Blank Gameweek;
- official deadline change.

Procedure:

1. record `FIXTURE_CALENDAR_CHANGE` event;
2. invalidate affected fixture/projection/decision state;
3. recompute source coverage/deadline authority;
4. rebuild exact target horizon;
5. republish only after valid lineage.

Do not assume the prior fixture list remains authoritative.

---

## SOP 18 — controller restart / expired lease recovery

1. load durable lifecycle and health;
2. identify expired active leases;
3. inspect actual runtime outputs by signature;
4. close work already completed before crash;
5. requeue only retry-safe incomplete work;
6. preserve non-idempotent uncertainty as BLOCKED/manual review;
7. re-evaluate transitions;
8. continue.

ChatGPT/session continuity is never required.

---

## SOP 19 — integrity blocker

SEV0 examples:

- historical rewrite;
- recommendation substituted as actual;
- cross-GW merge;
- shadow numeric effect in production;
- unauthorized external execution;
- mixed final prediction lineage.

Action:

- pause affected progression;
- preserve evidence;
- keep last-valid public state with blocked label;
- create incident;
- alert;
- resume only after approved repair and revalidation.

Blind retry is prohibited.

---

## SOP 20 — degraded public serving

Health dimensions are separate:

- DATA_HEALTH;
- MODEL_HEALTH;
- DECISION_HEALTH;
- PUBLICATION_HEALTH;
- WEBSITE_API_HEALTH;
- RESEARCH_HEALTH.

Serve last valid publication when possible, with stale/degraded timestamp and reason. A research failure must not imply a decision failure. A healthy website must not imply a fresh decision.

---

## SOP 21 — shadow experiment registration

Required before capture:

- fixed hypothesis;
- primary metric;
- baselines;
- variant/family count;
- frozen parameters;
- cohort;
- minimum sample;
- robustness criteria;
- rejection threshold;
- promotion-candidate threshold;
- hard expiry;
- multiplicity/family-selection policy;
- expected decision-value threshold;
- overlap test against existing production features;
- evaluator;
- `production_effect_enabled=false`.

---

## SOP 22 — shadow evaluation / auto-expiry

Allowed autonomous states:

- CONTINUE_SHADOW;
- EXPIRED;
- REJECTED_AUTO_BY_FROZEN_CONTRACT;
- PROMOTION_CANDIDATE.

Auto-rejection/expiry stops future scheduled capture but preserves code and evidence. Reactivation needs a new governed decision/change ID.

PROMOTION_CANDIDATE produces a dossier. It never changes production numerics automatically.

---

## SOP 23 — production quality drift

After settlement windows, calculate approved quality monitors.

If drift exceeds a pre-approved safety threshold:

- open model-quality incident/research ticket;
- optionally lower decision confidence or block only if that threshold was explicitly approved for gating;
- do not auto-retrain;
- do not auto-tune;
- do not auto-promote replacement model.

---

## SOP 24 — public/internal API discipline

Public API:

- read-only;
- versioned contract;
- no privileged secret;
- no heavy-work trigger;
- rate/abuse controlled.

Internal control API:

- authenticated server-side;
- audited;
- bounded work request only;
- cannot deploy code.

Static GitHub Pages code deployment is independent from live football-data refresh.

---

## SOP 25 — digital-twin validation before dispatch cutover

Read-only controller must pass:

- historical replay where evidence permits;
- live shadow comparison for multiple GWs;
- synthetic golden fault scenarios.

At minimum test:

- duplicate event;
- timeout/429;
- stale source;
- mixed lineage;
- deadline conflict;
- late price/injury change;
- fixture postponement/DGW/BGW;
- result correction;
- controller restart;
- cross-beam disagreement;
- chip path;
- actual submission missing;
- research overload during P0 cycle.

No production dispatch until expected state transitions are deterministic and auditable.

---

## SOP 26 — daily self-audit

Daily check:

- lifecycle plausible vs official calendar/deadline;
- no expired orphan lease;
- queue oldest age within SLO;
- P0 capacity available;
- no active retired component;
- no duplicate dispatch target;
- no shadow production leak;
- C0213 governance/behavioral state healthy;
- public status freshness within budget;
- unresolved incident list reconciled.

---

## SOP 27 — pre-final self-audit

Before any C0234 final authorization:

- deadline authoritative;
- source coverage complete for P0 contract;
- exact manager state current;
- exact horizon lineage current;
- final projection after T−2;
- C0248 validation complete;
- ROLL comparison present;
- captain/vice/chip explicit;
- no unresolved SEV0/SEV1 blocker affecting decision;
- C0234 blockers empty;
- publication/authorization semantics separate.

Failure => FINAL_BLOCKED.

---

## SOP 28 — emergency pause

PAUSED state:

- no new heavy decision dispatch;
- safe result ingestion may continue by policy;
- in-flight idempotent work may finish;
- last-valid public state remains available;
- reason/initiator/time audited;
- resume explicitly audited.

---

## SOP 29 — deployment/change procedure

Only for later separately approved implementation:

1. register change + approval;
2. branch from verified main;
3. tests/contracts/docs with code;
4. staging/controlled validation where feasible;
5. respect deadline change freeze;
6. deploy;
7. live smoke;
8. C0213 behavioral/governance audit;
9. verify runtime/GitHub parity;
10. mark Verified only after evidence.

Autonomy controller cannot alter its own code/deployment.

---

## SOP 30 — analyst escalation package

Any unresolved SEV0–SEV2 escalation should contain:

- GW/lifecycle;
- health dimensions;
- incident severity/signature;
- official deadline and time remaining;
- last-valid publication;
- causal event;
- stale/missing inputs;
- queued/failed work;
- attempt/backoff state;
- current lineage;
- exact blockers/advisories;
- automatic actions already taken;
- safe next options;
- whether runtime/model semantics changed.

The analyst should not need to reconstruct the failure from raw tables.

## Planning-only notice

V0.2 is procedural design only. No controller, queue, state schema, source feed, cron change, deployment freeze, website health endpoint, model gate or retry system has been implemented in C0273.
