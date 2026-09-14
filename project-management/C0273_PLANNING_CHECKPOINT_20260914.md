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
Priority Work Queue + Leases + Backpressure
        ↓
Bounded Existing Workers / Engine Components
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
3. retry/idempotency class for each dispatchable work family;
4. safe server-side concurrency/resource budgets;
5. official points settlement/correction criterion;
6. public status API versioning/contract;
7. final deadline change-freeze duration;
8. alert channel for SEV0/SEV1;
9. digital-twin/replay evidence plan and soak duration.

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
2. `C0273_AUTONOMOUS_WEBSITE_MASTER_PLAN_V02_20260914.md`;
3. `C0273_AUTONOMOUS_WEBSITE_OPERATING_PROCEDURES_V02_20260914.md`;
4. `C0273_P0_CONTRACT_PACKAGE_DRAFT_20260914.md`;
5. `C0273_EXTERNAL_SENIOR_ANALYST_REVIEW_20260914.md`;
6. live `public.change_tracker_working` row `C0273`;
7. live Supabase/runtime state before any future implementation.

Production changes remain approval-gated even if planning automation continues unattended.
