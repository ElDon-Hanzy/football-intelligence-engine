# C0273 — Autonomous Website Operating Procedures V0.1

Date: 2026-09-14  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED

This document converts the C0273 master plan into operational procedures. It describes how an eventual autonomy controller should behave. It does not authorize code, schema, cron, model or deployment changes.

## Procedure 0 — universal execution contract

Every autonomous procedure must follow the same control pattern:

1. Identify target Gameweek and lifecycle state.
2. Read current canonical inputs and their timestamps.
3. Validate freshness, completeness, lineage and semantic integrity.
4. Compute deterministic input signature / idempotency key.
5. Check whether an equivalent valid output already exists.
6. Acquire a bounded lease before dispatching work.
7. Run exactly one bounded unit of heavy work per work item.
8. Persist success/failure with lineage and timestamps.
9. Re-evaluate readiness.
10. Advance lifecycle only when the transition contract passes.
11. On failure, classify transient vs stale vs semantic vs code/regression.
12. Never weaken integrity rules in order to make progress.

Permanent flags on all decision-grade transitions:

- `historical_forecasts_rewritten=false`;
- actual submitted team remains separate from recommendation;
- missing evidence is not zero;
- production model promotion is not automatic;
- no external FPL account execution.

---

## SOP 1 — source refresh

### Trigger

- source cadence due;
- provider event/change detected;
- downstream freshness contract failed;
- T−2 forced final refresh;
- post-match settlement transition.

### Preconditions

- target source/provider identified;
- rate-limit budget available;
- no equivalent fresh capture already exists;
- target GW/match chronology known.

### Action

Dispatch the approved source ingest/refresh entrypoint.

### Success criteria

- source capture timestamp updated;
- expected row/fixture/player scope present;
- chronology known-at constraints hold;
- provider response not partial/corrupt;
- source-specific semantic checks pass.

### Failure action

- 429/5xx/timeout: bounded backoff/retry;
- stale but noncritical: DEGRADED advisory;
- stale deadline-critical: BLOCK final decision progression;
- semantic contradiction: BLOCK and incident record.

### Persistence

Record source, GW, request signature, attempt, captured-at, row counts, provider status and downstream invalidation scope.

---

## SOP 2 — canonical state refresh

### Trigger

A source change invalidates current player/team/fixture/role state.

### Preconditions

- required source facts meet freshness contract;
- no fixture chronology violation;
- canonical identity mapping is healthy.

### Action

Refresh only the affected state family:

- player availability/state;
- team performance/process;
- realized roles;
- prospective role/tactical state;
- fixture features;
- price/manager economy.

### Success criteria

- required current rows exist;
- identity coverage meets contract;
- no duplicate/cross-GW contamination;
- state lineage points to current valid source rows.

### Failure action

Do not run projections on an invalidated state. Preserve last valid published decision with stale/degraded labeling.

---

## SOP 3 — projection cycle

### Trigger

- canonical upstream state materially changed;
- ordinary projection cadence due and current signature is stale;
- final T−2 forced refresh.

### Preconditions

- exact target GW/horizon available;
- fixture forecast state ready;
- availability/xMins/role state ready;
- production model registry green;
- chronology cutoff valid.

### Action

Run approved projection pipeline for exact target horizon.

### Success criteria

- one valid prediction run per target GW in horizon;
- required player coverage meets governed contract;
- distribution fields internally consistent;
- model effect provenance valid;
- no shadow-only numeric effect leaks into production;
- C0213 behavioral/definition assumptions remain compatible.

### Failure action

Projection readiness becomes false. Decision stack must not consume stale lineage as current.

---

## SOP 4 — rolling decision cycle

### Trigger

A new valid exact-horizon projection lineage or material manager-state change appears.

### Preconditions

- manager state and economy current;
- exact horizon lineage complete;
- projection readiness true;
- current price/selling values available;
- C0248 required inputs present.

### Action

1. Run canonical optimizer inputs as required.
2. Run C0248 sequential decision candidate.
3. Evaluate required uncertainty/structural/rank/red-team/challenger controls.
4. Compare against ROLL.
5. Apply Noise-Control/model-error semantics.
6. Publish PRE_FINAL through C0237 when valid.

### Success criteria

- no mixed prediction lineage;
- decision uses exact manager state;
- ROLL present;
- chip state explicit;
- captain/vice explicit;
- serious challenger state explicit;
- result is READY, CONTESTED or BLOCKED rather than silently missing.

---

## SOP 5 — final T−2 procedure

### Trigger

Clock crosses `deadline - 2 hours`.

### Preconditions

- authoritative deadline known;
- lifecycle is pre-deadline;
- no deadline clock contradiction.

### Sequence

1. Force deadline-critical source refresh.
2. Wait for freshness contracts to settle or explicitly block.
3. Require a prediction run generated after T−2.
4. Generate final-lineage C0248 candidate.
5. Generate same-manager-state, identical-prediction-vector cross-beam peer.
6. Run unchanged deterministic C0248 promotion acceptance.
7. Re-run decision controls against promoted lineage.
8. Invoke C0234 fail-closed authorization.
9. Invoke C0237 publication.
10. Record final-window cycle outcome and remaining blockers.

### Material late-information rule

If a decision-critical fact changes after a final publication but before deadline:

- invalidate affected final lineage;
- re-enter FINAL_REFRESH_RUNNING;
- never mix old candidate with new projection input;
- republish only after the full final validation chain passes again.

### Deadline safety

Once deadline is reached:

- stop attempts to create new executable authorization;
- preserve last pre-deadline evidence;
- post-deadline closure is audit-only and never retroactive authorization.

---

## SOP 6 — actual submission capture

### Trigger

Deadline passed and public FPL picks are available.

### Preconditions

- entry ID known;
- target GW locked;
- actual source endpoint available.

### Action

Capture 11 starters, bench order, captain/vice and chip from the actual public FPL submission.

### Success criteria

- 15 unique players;
- legal XI/bench metadata;
- source and capture time recorded;
- actual is not reconstructed from recommendation;
- if unavailable, status remains unverified.

### User-facing failure phrase

`Actual submitted team not verified.`

---

## SOP 7 — live scoring

### Trigger

Fixtures move FUTURE → LIVE → FINISHED.

### Preconditions

- fixture identity valid;
- raw player actual rows belong to target GW;
- recommendation and actual scenario membership frozen independently.

### Action

Update realized scoring under approved FPL semantics:

- captain multiplier;
- vice inheritance;
- legal autosubs;
- GK-only reserve GK substitution;
- minimum legal formation;
- Bench Boost / Triple Captain when active.

### Success criteria

- frozen xPts unchanged;
- realized total marked provisional until settlement;
- engine and actual scenarios scored independently;
- missing result rows remain unknown.

---

## SOP 8 — Gameweek settlement

### Trigger

All target GW fixtures and required player result rows are final.

### Preconditions

- fixture set complete;
- result ingestion complete;
- no unresolved match state;
- actual submission status recorded.

### Action

1. Finalize realized player/team actuals.
2. Finalize engine vs actual scoring.
3. Append decision journal result.
4. Compute decision-quality evaluation using information available at decision time.
5. Refresh realized roles/team state.
6. Trigger calibration/evaluation jobs.
7. Trigger shadow experiment evaluator.
8. Initialize next-GW state.

### Success criteria

- frozen forecast evidence unchanged;
- realized evidence linked append-only;
- postmortem distinguishes outcome quality from decision quality.

---

## SOP 9 — shadow experiment registration

### Preconditions

No experiment can auto-run until its contract exists.

### Required contract

- change ID;
- hypothesis;
- inputs;
- frozen parameters;
- capture window;
- holdout/forward cohort;
- metrics;
- minimum sample;
- continue threshold;
- reject threshold;
- promotion-candidate threshold;
- hard expiry;
- multiple-testing policy;
- evaluator;
- production effect disabled.

### Action

Register experiment and begin capture only after chronology-safe freeze.

---

## SOP 10 — shadow evaluation

### Trigger

Target cohort settles or hard expiry is reached.

### Action

Evaluate against preregistered baseline and metrics.

### Allowed autonomous outcomes

- CONTINUE_SHADOW;
- REJECTED;
- EXPIRED;
- PROMOTION_CANDIDATE.

### Prohibited autonomous outcome

Direct numeric production promotion.

A promotion candidate must produce a durable dossier containing sample, calibration, sensitivity, failure cases, maintenance cost, overlap analysis and exact intended consumption path.

---

## SOP 11 — degraded-mode serving

### Trigger

A dependency misses freshness/SLO but last valid publication exists.

### Action

Website serves last valid state with visible status:

- delayed;
- degraded;
- stale since timestamp;
- blocker/advisory summary.

### Rules

- never fabricate current readiness;
- never relabel stale state as current;
- noncritical research failure must not take V3 down;
- decision-critical stale state blocks new final authorization but does not erase last valid publication.

---

## SOP 12 — blocked integrity state

### Trigger

Examples:

- mixed prediction lineage;
- impossible manager budget;
- duplicate player in canonical squad;
- cross-GW actual/recommendation mix;
- historical rewrite detection;
- unexpected production effect from a shadow component;
- manager-state contradiction;
- deadline chronology contradiction.

### Action

1. Stop affected downstream dispatch.
2. Record immutable incident evidence.
3. Preserve last good publication.
4. Expose blocked state publicly where material.
5. Alert operator/senior analyst.
6. Resume only after the underlying input/state changes or an approved fix is deployed.

No blind retry loop.

---

## SOP 13 — transient failure recovery

### Failure types

- provider timeout;
- HTTP 429;
- provider 5xx;
- temporary Edge/database networking failure.

### Retry contract

- retry only idempotent work;
- exponential + jittered backoff;
- provider-specific max attempts;
- observe `Retry-After` where available;
- one active lease per work item;
- exceeding retry budget moves item to WAITING/DEGRADED and records incident.

Do not fan out many retries simultaneously.

---

## SOP 14 — controller/worker restart

### Startup procedure

1. Read current Gameweek lifecycle rows.
2. Find expired leases.
3. Reconcile unfinished work items against actual runtime outputs.
4. Mark already-completed equivalent work as completed rather than rerunning.
5. Requeue only genuinely incomplete idempotent work.
6. Re-evaluate transition readiness.
7. Continue from durable state.

Conversation or ChatGPT state must never be required for recovery.

---

## SOP 15 — deployment/change control

### Trigger

A separately approved implementation change.

### Procedure

1. Register change/tracker decision.
2. Branch from verified main.
3. Update tests/docs/contracts with code.
4. Validate migration/runtime parity.
5. Run semantic, behavioral and security regressions.
6. Review expected architecture impact.
7. Deploy only through approved path.
8. Run live smoke.
9. Run C0213 behavioral/governance audit.
10. Verify GitHub/runtime parity.
11. Mark Completed/Verified only after runtime evidence.

Autonomy controller may not deploy its own modified logic.

---

## SOP 16 — rollback

### Trigger

Post-deploy regression or material integrity failure.

### Procedure

1. Freeze affected control-plane progression.
2. Keep last valid publication available.
3. Identify last known good code/runtime version.
4. Roll back only the affected component where possible.
5. Validate source/runtime parity.
6. Re-run readiness/behavioral checks.
7. Resume from durable lifecycle state, not from assumed conversation state.

V2 remains an independent UI fallback until explicit retirement approval.

---

## SOP 17 — emergency pause / kill switch

The future controller requires an explicit administrative pause state.

When paused:

- no new heavy work is dispatched;
- in-flight idempotent work may finish and persist;
- public last-valid state remains available;
- live result ingestion may be separately allowed if safe;
- reason, initiator and timestamp are audited;
- resume requires an explicit audited transition.

The kill switch must not delete evidence or rewrite history.

---

## SOP 18 — daily self-audit

At least once daily, controller health should verify:

- lifecycle state is plausible for current deadline/fixture state;
- no expired active leases;
- no orphaned work items beyond SLO;
- production registry integrity green;
- no shadow production-effect violation;
- no active retired deployment;
- no duplicate active dispatch target;
- public status publication age within budget;
- repository/runtime parity indicators healthy where applicable;
- incident list reconciled.

Daily self-audit failure is an operational advisory unless it identifies a decision-integrity breach.

---

## SOP 19 — pre-deadline self-audit

Before any final authorization:

- manager state verified;
- exact target GW/deadline verified;
- exact-horizon projection lineage current;
- deadline-critical sources fresh;
- C0248 selected path validated;
- ROLL comparison present;
- captain/vice/chip explicit;
- C0234 blockers empty;
- C0213 critical readiness green;
- no unresolved integrity incident affecting decision;
- publication and authorization semantics distinct.

If any required item fails, publish BLOCKED rather than force a recommendation.

---

## SOP 20 — analyst escalation package

When automation needs human/senior-analyst review, it should provide one compact package:

- Gameweek/lifecycle;
- incident class/severity;
- first/last seen;
- affected components;
- last valid publication;
- stale/missing inputs;
- failed work items and attempts;
- lineage/signatures;
- exact blockers;
- automatic actions already taken;
- safe choices available;
- whether deadline is at risk;
- whether any production/model semantics changed (normally no).

This prevents the analyst from reconstructing the incident manually.

## Planning note

All procedures above are design targets. C0273 V0.1 has not implemented any controller, queue, lease, schema, retry policy, website health endpoint or deployment behavior.
