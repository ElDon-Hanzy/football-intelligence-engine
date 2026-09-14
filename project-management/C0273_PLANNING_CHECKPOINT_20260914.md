# C0273 — Planning Checkpoint

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: Open / Planned  
Runtime effect: NONE

## Completed batches

### Batch 1 — current-state audit + initial plan

Reviewed:

- `PROJECT_STATE.md`;
- `SYSTEM_ARCHITECTURE.md`;
- `WEEKLY_DATA_PIPELINE.md`;
- `PROJECT_DESCRIPTION.md`;
- C0248 sequential planner plan;
- C0272 post-audit consolidation;
- live active cron inventory (29 active jobs at audit time).

Produced:

- `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V01_20260914.md`;
- `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V01_20260914.md`.

### Batch 2 — external senior analyst red-team

Produced:

- `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`.

Key critical findings:

- official FPL deadline must be authoritative rather than inferred from kickoff;
- full autonomy cannot be claimed without automated coverage of all P0 qualitative fact families;
- one logical controller must not become one physical SPOF;
- at-least-once/idempotency must be hard contract;
- workload isolation/request budgets are P0 reliability requirements;
- causal event ledger required for replay/forensics;
- historical replay/digital twin required before dispatch;
- fixture anomalies and settlement corrections need explicit states;
- website data freshness must be decoupled from GitHub Pages deploy;
- deployment freeze needed near FPL deadline;
- shadow statistical multiplicity and production-model drift need governance;
- C0273 should target one canonical manager first, not premature multi-tenancy.

### Batch 3 — revised design + P0 contract package

Produced:

- `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V02_20260914.md` — current working master plan;
- `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V02_20260914.md` — current working SOPs;
- `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`.

The contract package includes:

- initial Source Coverage Registry;
- Deadline Authority Contract draft;
- health-state contract;
- P0–P4 work priorities;
- initial idempotency/retry work catalog;
- materiality/invalidation map;
- deployment-freeze contract;
- public/internal API boundary;
- digital-twin acceptance scenarios.

### Batch 4 — distributed-control safety red-team

Produced:

- `C0273_CHECKPOINT_01_DISTRIBUTED_CONTROL_SAFETY_20260914.md`.

New P0 design requirements identified:

- leases/idempotency alone are insufficient; mutating work needs a fencing token / lease epoch so a stale worker cannot commit after takeover;
- Gameweek lifecycle transitions need monotonic state-version compare-and-swap semantics;
- final-window lineage needs an explicit `finalization_generation` / cycle ID, incremented when material P0 evidence invalidates the current cycle;
- recovery after ambiguous worker failure must reconcile deterministic output before retry rather than blindly replaying side effects;
- event ordering needs provider-specific source revision / effective-at semantics in addition to known-at/observed-at;
- final authority requires a commit-time official-deadline check, not merely an enqueue-time check;
- immutable publications need an explicit predeadline supersession/canonical-pointer contract;
- autonomy needs audited PAUSE / DRAIN / EMERGENCY_BLOCKED controls that can never bypass C0234;
- digital-twin tests must include split-brain reconcilers, expired-lease stale completion, generation invalidation mid-run, ambiguous database outcomes and predeadline-start/postdeadline-finish races.

These are planning findings only; nothing was implemented.

### Batch 5 — live retry/idempotency entrypoint audit

Produced:

- `C0273_CHECKPOINT_02_RETRY_IDEMPOTENCY_AUDIT_20260914.md`;
- updated `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md` with evidence-backed retry classifications.

Live production inspection replaced several assumptions with concrete findings:

- `sync-gw-results` v5 is **not safe for blind autonomous retry**. It can persist a parent result run before all player child rows, and its later equal-payload short-circuit can incorrectly treat an incomplete run as complete after a crash. Concurrent equal-payload workers can also produce multiple parent runs.
- `sync-fpl-data` v3 is an **observation-append** operation, not an idempotent invocation: dimension rows upsert but price history and sync-run telemetry append with fresh timestamps.
- `refresh-availability-intelligence` v4 is the strongest current retry candidate: semantic rows are uniquely keyed by `(match_id, player_id, observation_hash)`, so partial batches are naturally repairable.
- `refresh-current-player-state` v8 needs **reconcile-before-retry**: semantic equality is checked against latest state in application logic, while table uniqueness is timestamp-based; concurrent or partial retries can duplicate semantic states.
- `sync-fpl-actual-decision` v2 already uses official FPL `deadline_time` correctly, but first-write race guards are application-level only; the target table has no Gameweek/signature uniqueness, so controller dispatch must be single-writer/fenced.
- C0248 planner v6, C0234 gate and C0237 publication all have strong stable input-signature uniqueness. C0248 planner still needs unique-conflict reconciliation for simultaneous same-signature inserts.

A new generic work contract is now required before controller dispatch: stable work key, immutable input lineage, generation, fencing token, queryable completeness invariant, retry class, reconcile procedure, canonicalization, deadline guard and supersession rule.

Most important principle added: **a durable run marker or matching input signature is not automatically proof of complete output**. Work identity, work started, output complete and output canonical must be modeled separately.

No runtime, schema, cron, Edge Function or model was changed.

## Current recommended architecture

```text
Sources / Official Clock / Results
        ↓
Causal Event Ledger
        ↓
Restartable Scheduler / Reconciler
        ↓
Readiness + Policy Contracts
        ↓
Priority Work Queue + Leases + Fencing + Backpressure
        ↓
Bounded Existing Workers / Engine Components
        ↓
Generation-bound canonical lineage
        ↓
C0248 → C0234 → C0237
        ↓
Versioned Public Status / Data APIs
        ↓
V3 Website
```

The control plane orchestrates existing intelligence. It does not duplicate model or optimization logic.

## Current implementation recommendation

**DO NOT IMPLEMENT YET.**

Before implementation approval, resolve/audit the P0 planning items:

1. exact automated coverage/providers for availability, predicted XI, expected minutes, press conferences/team news, transfers, set pieces and congestion;
2. official FPL deadline data path and every current consumer that infers deadline from first kickoff;
3. retry/idempotency class for remaining dispatchable work families and exact completeness invariants for result sync/current-player-state/actual-decision;
4. fencing/state-version/finalization-generation contracts for distributed control;
5. safe server-side concurrency/resource budgets;
6. official points settlement/correction criterion;
7. public status API versioning/contract and publication supersession semantics;
8. final deadline change-freeze duration and commit-time deadline guard;
9. alert channel for SEV0/SEV1;
10. digital-twin/replay evidence plan and soak duration, including split-brain, partial-write and stale-worker cases.

## Explicit non-changes

C0273 planning has not:

- created controller/state/queue schema;
- changed any cron;
- changed any Edge Function;
- changed C0234/C0237/C0248;
- changed projection/model numerics;
- promoted/killed any shadow model;
- changed V2/V3 runtime behavior;
- deployed anything;
- rewritten any historical forecast;
- executed any FPL action.

## Continuity protocol

If a chat/tool/session fails, resume by reading in this order:

1. this checkpoint;
2. `C0273_CHECKPOINT_02_RETRY_IDEMPOTENCY_AUDIT_20260914.md`;
3. `C0273_CHECKPOINT_01_DISTRIBUTED_CONTROL_SAFETY_20260914.md`;
4. `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V02_20260914.md`;
5. `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V02_20260914.md`;
6. `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`;
7. `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`;
8. live `public.change_tracker_working` row `C0273`;
9. live Supabase/runtime state before any future implementation.

Production changes remain approval-gated even if planning automation continues unattended.
