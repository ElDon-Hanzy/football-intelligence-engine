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
- `refresh-availability-intelligence` v4 is the strongest current retry candidate: semantic rows are uniquely keyed by `(match_id,player_id,observation_hash)`, so partial batches are naturally repairable.
- `refresh-current-player-state` v8 needs **reconcile-before-retry**: semantic equality is checked against latest state in application logic, while table uniqueness is timestamp-based; concurrent or partial retries can duplicate semantic states.
- `sync-fpl-actual-decision` v2 already uses official FPL `deadline_time` correctly, but first-write race guards are application-level only; the target table has no Gameweek/signature uniqueness, so controller dispatch must be single-writer/fenced.
- C0248 planner v6, C0234 gate and C0237 publication all have strong stable input-signature uniqueness. C0248 planner still needs unique-conflict reconciliation for simultaneous same-signature inserts.

A new generic work contract is now required before controller dispatch: stable work key, immutable input lineage, generation, fencing token, queryable completeness invariant, retry class, reconcile procedure, canonicalization, deadline guard and supersession rule.

Most important principle added: **a durable run marker or matching input signature is not automatically proof of complete output**. Work identity, work started, output complete and output canonical must be modeled separately.

No runtime, schema, cron, Edge Function or model was changed.

### Batch 6 — P0 information-source autonomy audit

Produced:

- `C0273_CHECKPOINT_03_P0_INFORMATION_SOURCE_AUTONOMY_AUDIT_20260914.md`.

Key evidence-backed findings:

- current availability/injury/suspension evidence is primarily official FPL bootstrap `status`, `chance_of_playing_next_round` and `news`, refreshed every four hours;
- availability observations record fetch time but explicitly have `source_item_timestamp_available=false`, so provider-publication time is not known;
- current expected XI is an **internal inference**, not an independent external lineup feed: it selects highest internal start probabilities under legal FPL formation constraints and explicitly marks the shape as non-tactical;
- no dedicated manager press-conference / club-team-news structured source, table, Edge Function or cron was proven;
- penalty order is production-consumed from official FPL hierarchy; direct-FK/corner hierarchy is stored but general production consumption was not proven;
- transfer/event provenance exists, but a continuously automated completeness contract was not proven;
- complete non-Premier-League congestion coverage for Europe/domestic cups is not proven as a rotation/xMins autonomy input;
- tactical/realized-role automation is strong, but its cadence is not a substitute for late team-news evidence;
- **new P0 orchestration gap:** manager-state snapshots exist but no active cron invoking `sync-fpl-manager-state` was found. Inspected snapshots are sparse and stop at GW4, so current squad/free-transfers/bank/purchase-price lineage cannot yet be assumed autonomous for GW5+.

New design requirements:

- first-class Source Readiness Registry;
- evidence-independence tags (`MODEL_XI` must not count as independent confirmation of itself);
- qualitative team-news adapter contract;
- manager-state capture contract as a prerequisite to optimizer/decision work;
- congestion schedule contract;
- set-piece consumption map;
- per-fact-family final-window freshness budgets;
- explicit degraded modes rather than manufactured confidence.

No provider was selected and no source/runtime behavior changed.

### Batch 7 — deadline authority audit

Produced:

- `C0273_CHECKPOINT_04_DEADLINE_AUTHORITY_AUDIT_20260914.md`;
- hardened the Deadline Authority Contract in `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`.

Key evidence-backed findings:

- `sync-fpl-actual-decision` v2 already uses official FPL `events[].deadline_time` and correctly refuses to expose locked picks predeadline;
- `private.generate_upcoming_fpl_projection_core_v01`, `private.c0217_projection_horizon_cycle_v01`, `private.c0235_capture_prefinal_snapshot_v01`, and live `fpl-autonomous-gate` v7 still derive the decision deadline from first kickoff minus 90 minutes;
- `private.c0272_final_promotion_watch_v01` consumes `gameweek_prediction_runs.deadline_at`, so it indirectly inherits the same derived authority;
- latest GW4–GW8 prediction runs explicitly record `deadline_source=derived_first_kickoff_minus_90m`;
- the stored derived values currently align with the expected schedule, but that coincidence is not a sufficient authority contract for a fully autonomous system.

The revised contract now requires:

- official FPL event `deadline_time` as sole final authority;
- fixture-derived deadline only as diagnostic cross-check telemetry;
- versioned deadline evidence identity carried through finalization lineage;
- `CHANGED` deadline state that increments `finalization_generation` and invalidates pending deadline-bound work;
- commit-time official-deadline/generation validation for final projection acceptance, C0248 promotion, C0234 authorization, C0237 canonical publication and any future execution adapter;
- no rewriting of historical frozen prediction rows whose original deadline source was derived;
- digital-twin cases for deadline moving earlier/later, missing/contradicted authority, mixed deadline generations and predeadline-start/postdeadline-finish races.

No production deadline behavior was changed.

## Current recommended architecture

```text
Sources / Official Clock / Results
        ↓
Source Readiness Registry + Causal Event Ledger
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

1. choose/prove provenance-safe automated coverage for manager press conferences/team news and decide whether independent external predicted XI is mandatory or confidence-enhancing;
2. define manager-state autonomous capture/freshness/completeness/single-writer contract;
3. define complete cup/Europe congestion schedule coverage and conservative materiality semantics;
4. decide the `OFFICIAL_ONLY` deadline policy, contradiction handling and deadline-change emergency refresh semantics; the deadline-consumer map itself is now audited;
5. complete retry/idempotency audit for remaining controller-dispatched work families and exact completeness invariants for result sync/current-player-state/actual-decision;
6. finalize fencing/state-version/finalization-generation contracts for distributed control;
7. measure safe server-side concurrency/resource budgets;
8. define official FPL points settlement/correction criterion;
9. finalize public status API versioning and publication supersession/canonical-pointer semantics;
10. finalize deadline change-freeze duration and commit-time deadline guard;
11. choose an alert channel for SEV0/SEV1;
12. complete digital-twin/replay evidence plan and soak duration, including split-brain, partial-write, stale-worker, source-degradation and deadline-change cases.

## Explicit non-changes

C0273 planning has not:

- created controller/state/queue schema;
- changed any cron;
- changed any Edge Function;
- changed any source provider/ingestion;
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
2. `C0273_CHECKPOINT_04_DEADLINE_AUTHORITY_AUDIT_20260914.md`;
3. `C0273_CHECKPOINT_03_P0_INFORMATION_SOURCE_AUTONOMY_AUDIT_20260914.md`;
4. `C0273_CHECKPOINT_02_RETRY_IDEMPOTENCY_AUDIT_20260914.md`;
5. `C0273_CHECKPOINT_01_DISTRIBUTED_CONTROL_SAFETY_20260914.md`;
6. `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V02_20260914.md`;
7. `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V02_20260914.md`;
8. `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`;
9. `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`;
10. live `public.change_tracker_working` row `C0273`;
11. live Supabase/runtime state before any future implementation.

Production changes remain approval-gated even if planning automation continues unattended.
