# C0273 — Checkpoint 01: Distributed Control Safety

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE

## 1. Batch objective

Red-team the V0.2 control-plane design specifically against duplicate and out-of-order events, overlapping reconciler invocations, expired leases, partial worker failures, stale completion, final-window invalidation and deadline races.

This checkpoint changes no production code, model, cron, Edge Function, database schema, website runtime or shadow-model lifecycle.

## 2. Executive finding

V0.2 correctly rejects exactly-once execution and requires at-least-once + idempotency. That is necessary but not sufficient for a fully autonomous deadline-sensitive controller.

The missing safety concept is **generation/fencing authority**.

A worker may legitimately obtain a lease, run for a long time, lose the lease, and then finish after another worker or a newer finalization cycle has taken authority. If the old worker can still commit its result, idempotency does not protect the system from a stale-but-valid-looking write.

Therefore the future controller must separate:

- eligibility to start work;
- temporary ownership of work;
- authority to commit the result into the current canonical cycle.

## 3. Required contract addition — controller epoch / fencing token

Every leased work item that can mutate current orchestration or canonical decision state must carry an immutable fencing token / controller epoch issued when ownership is acquired.

Conceptually:

```text
work_id
input_signature
gameweek
finalization_generation
lease_epoch
lease_owner
lease_expires_at
```

Commit is accepted only if:

```text
lease_epoch == current accepted epoch for work_id
AND finalization_generation == current generation for the Gameweek
AND input_signature still matches required current inputs
```

A stale worker may finish and preserve its diagnostic output, but it cannot advance canonical state after its authority is obsolete.

## 4. Required contract addition — Gameweek state version / compare-and-swap

Materialized Gameweek lifecycle state should use a monotonic `state_version` or equivalent compare-and-swap guard.

Every transition should declare the state version it observed. The transition is rejected if another reconciler has already advanced or invalidated that state.

This prevents two overlapping reconciler invocations from both deciding that the same transition is eligible and applying conflicting next states.

The transition log remains append-only; the materialized current-state pointer moves only through an accepted versioned transition.

## 5. Required contract addition — finalization generation

The T−2-to-deadline period needs an explicit **finalization generation / cycle ID**.

Example:

```text
GW5 final generation 17
  source refresh
  prediction run
  C0248 candidate
  cross-beam peer
  C0234 authorization
  C0237 publication
```

If a material P0 event arrives before the deadline — for example a player is ruled out — the reconciler increments to generation 18 and invalidates generation 17 for canonical progression.

Generation-17 work already in flight may finish for audit/reuse if its outputs are independently useful, but it must never promote, authorize or publish as current after generation 18 exists.

This is the mechanical enforcement of V0.2's existing rule: **no mixed-lineage patching**.

## 6. Required contract addition — work-result commit protocol

The worker lifecycle must distinguish:

```text
QUEUED
LEASED
RUNNING
OUTPUT_OBSERVED
COMMIT_ELIGIBLE
COMMITTED
SUPERSEDED
RETRY_WAIT
FAILED_TERMINAL
```

The exact names are implementation-detail later; the semantic distinction is mandatory.

Key failure case:

1. worker invokes an existing engine function;
2. engine output is successfully written;
3. worker crashes before marking the queue item complete;
4. reconciler later sees the work as incomplete.

Recovery must first search for the deterministic output using input signature / canonical natural key. It must not blindly repeat a possibly non-idempotent side effect.

Where a database transaction can atomically persist an intent and state transition, use transaction/outbox semantics. Where the worker calls an external or separately committed system, use durable reconciliation against the produced output.

## 7. Required contract addition — event ordering and source revision semantics

`known_at` and `observed_at` are necessary but insufficient for out-of-order delivery.

The event ledger should additionally support, where the provider exposes them:

```text
effective_at
source_event_id
source_revision
source_sequence
supersedes_event_id
```

Canonical fact selection must be domain-specific. An event observed later is not automatically newer football truth.

Examples:

- an injury provider may resend an older story after a newer clearance;
- a fixture provider may issue revision 4 after revision 3 even if network delivery is reversed;
- FPL player metadata may be a latest-state snapshot without an explicit revision number.

The Source Coverage Registry must therefore document the **newness comparator** for every P0 fact family, not merely its freshness budget.

## 8. Required contract addition — commit-time deadline guard

Checking the official FPL deadline when work is enqueued is not sufficient.

Any transition capable of creating a newly executable/authoritative final recommendation must verify deadline authority again at commit time.

Required rule:

- work may start before deadline;
- if it finishes after the official deadline, it cannot create new pre-deadline execution authority;
- post-deadline completion can be preserved only as audit/closure evidence under the existing chronology rules.

The deadline source used at commit must itself satisfy the Deadline Authority Contract.

This closes the race: `started predeadline -> completed postdeadline`.

## 9. Publication monotonicity and supersession

Predeadline publication needs an explicit supersession contract.

Proposed semantics:

- every publication is immutable and generation-bound;
- a newer valid generation may supersede an older predeadline recommendation before the official deadline;
- public canonical pointer may advance only to a publication accepted for the current generation;
- historical/frozen publications are never rewritten;
- once the official deadline passes, the canonical predeadline recommendation freezes and later rows are audit/closure only;
- `FINAL` continues to mean publication maturity, not FPL-account execution authority.

The implementation phase should decide whether the user-facing label remains `FINAL` throughout the last two hours or whether a separate `FINAL_CANDIDATE` label would reduce semantic ambiguity. This is a product-language decision, not yet resolved.

## 10. Split-brain / multiple reconciler rule

Multiple scheduler/reconciler invocations are allowed for availability, but they must be safe without assuming a permanent singleton process.

Planning requirement:

- one logical authority is represented by durable state/versioning;
- multiple instances may observe state;
- only one accepted transition for a given expected version/generation can win;
- losing instances exit/reconcile rather than compensate by overwriting;
- no controller instance receives GitHub production deployment authority.

A permanent leader process is therefore optional; correctness must come from durable coordination, not process uniqueness.

## 11. Pause / emergency stop semantics

A fully autonomous service requires a safe human stop control even though routine operation should not need a human.

Proposed future control states:

- `RUNNING` — normal autonomous orchestration;
- `DRAINING` — no new nonessential work, allow already-safe critical work to settle according to policy;
- `PAUSED` — no new decision-mutating work; public site serves labeled last-valid state;
- `EMERGENCY_BLOCKED` — fail-closed final authorization/publication progression.

Any manual override must be:

- scope-bound;
- reason-required;
- actor-attributed;
- timestamped;
- preferably TTL-bound;
- visible in incident/audit history;
- unable to rewrite historical forecasts or bypass C0234.

The exact emergency authority model remains approval-gated.

## 12. New digital-twin / replay cases

Add these cases to the V0.2 P0 test package:

1. two reconcilers read the same `state_version` and race to advance it;
2. worker A lease expires, worker B acquires a higher fencing epoch, worker A later completes;
3. a new P0 event increments finalization generation while the old C0248 run is in flight;
4. old-generation C0234 result arrives after a new generation exists;
5. work begins before deadline but tries to commit after deadline;
6. duplicate provider facts arrive under different transport event IDs but identical payload/source revision;
7. events arrive in reverse source-revision order;
8. database commit succeeds but queue-completion write is lost;
9. queue-completion succeeds but downstream observation is delayed;
10. database reconnect/retry causes an ambiguous transaction outcome;
11. controller clock and database clock disagree materially;
12. manual PAUSE arrives while P0 work is running;
13. final generation is superseded twice during the last hour;
14. public canonical pointer is stale while a newer immutable publication exists;
15. stale worker attempts to mutate state after controller restart.

Pass condition: none can produce mixed lineage, duplicate canonical progression, postdeadline execution authority, stale-current publication or historical rewrite.

## 13. Consequences for the current plan

These findings do **not** change the architectural direction. They strengthen it.

Recommended additions before implementation approval:

- add fencing token/lease epoch to work-ownership contract;
- add state-version compare-and-swap to lifecycle transitions;
- add finalization generation to all final-window lineage;
- define deterministic work-output reconciliation before retry;
- document source-specific event newness comparators;
- add commit-time deadline revalidation;
- formalize predeadline publication supersession;
- define safe PAUSE/DRAIN/EMERGENCY_BLOCKED controls;
- extend digital-twin cases with split-brain/stale-worker/deadline-race scenarios.

## 14. Open questions preserved for user review

1. Product language: keep `FINAL` for a recommendation that can still be superseded by new material information before deadline, or label it `FINAL_CANDIDATE` until deadline freeze?
2. Emergency control: should an approved operator be able only to pause/block, or also request a fresh cycle? Recommendation: pause/block/request-refresh is acceptable; bypassing readiness/authorization gates is not.
3. When a stale generation finishes expensive projections, may compatible lower-level outputs be reused by the next generation if their own input signatures are identical? Recommendation: yes at component-output level, never at decision/publication lineage level.
4. Exact clock-skew tolerance remains to be measured and contracted.

None of these questions authorizes implementation.

## 15. Next bounded planning batch

Recommended next batch: audit current production entrypoints for **actual retry/idempotency behavior** and classify the highest-value P0/P2 work families without changing them. This would turn the current `AUDIT_REQUIRED` table into evidence-backed design input.

## 16. Continuity

Resume C0273 in this order:

1. `C0273_PLANNING_CHECKPOINT_20260914.md`;
2. `C0273_CHECKPOINT_01_DISTRIBUTED_CONTROL_SAFETY_20260914.md`;
3. `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V02_20260914.md`;
4. `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V02_20260914.md`;
5. `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`;
6. `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`;
7. live tracker row `C0273`;
8. live Supabase/runtime state only as required for evidence.

Production changes remain explicitly approval-gated.