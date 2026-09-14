# C0273 — Autonomous Website / Engine Control-Plane Master Plan V0.3

Date: 2026-09-14  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Parent: C0272  
Supersedes: V0.2 as the current working architecture  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## 1. Program decision

C0273 is the design program for a **dedicated FIE application plus autonomous engine control plane**, not merely a website redesign and not a self-modifying football model.

The preferred target infrastructure is now:

- **Hostinger VPS** for the dedicated application/runtime/control plane;
- **Supabase** for durable data, semantic authority, audit/control state and selected auth/API services;
- **GitHub** for canonical source control, architecture/documentation, CI/CD source, release history and disaster-recovery/version history.

GitHub is not intended to be a runtime dependency for ordinary engine operation or data freshness.

No provisioning, migration, deployment or runtime change is authorized by this document.

---

## 2. Target product

The end state is a consumer-quality football intelligence product with a built-in operational control plane.

Two inseparable views should coexist:

### Product surface
- FPL pitch/squad;
- transfer recommendations and alternatives;
- captaincy;
- player/team/fixture intelligence;
- historical forecasts vs actuals;
- model confidence and risk where useful to the user.

### Control-plane surface
- official deadline authority;
- source freshness/readiness;
- current manager-state visibility;
- projection/finalization status;
- planner/peer/gate/publication status;
- result/settlement status;
- worker/queue health;
- incidents/blockers;
- operational state: RUN / PAUSE / DRAIN / EMERGENCY_BLOCKED;
- deployed release identity.

The control plane exposes governed engine state; it does not create an alternate decision authority.

---

## 3. Hosting responsibility model

### Hostinger VPS
Execution environment for approved application/runtime components:

- web application;
- internal control API;
- controller/reconciler;
- bounded workers;
- queues/admission control;
- process supervision;
- health/logging/metrics agents;
- reverse proxy/ingress;
- approved deployment releases.

The VPS is replaceable. No unique semantic authority may live only on its local filesystem.

### Supabase
Durable semantic platform:

- football/FPL facts;
- manager/projection/decision/publication/result evidence;
- audit and lineage;
- future approved event/work/controller records;
- canonical authority transitions and integrity constraints where appropriate;
- authentication/authorization data where selected;
- public/internal read services where contractually safe.

### GitHub
Engineering system of record:

- source;
- planning docs;
- architecture/decision history;
- pull requests/review;
- CI/build/test definitions;
- release source/history;
- reproducible infrastructure/configuration definitions where adopted.

The running FIE must remain operational through a temporary GitHub outage.

---

## 4. Logical architecture

```text
USERS
  |
FIE V3 WEB / APP
  |
PUBLIC READ/API LAYER
  |
HOSTINGER VPS
  |-- controller / reconciler
  |-- queue / admission control
  |-- P0 deadline-critical workers
  |-- P1/P2 production workers
  |-- isolated P3 research/shadow workers
  |-- health / logs / metrics
  |
SUPABASE
  |-- durable facts
  |-- generations/lineage
  |-- authority/audit state
  |-- publication/result evidence
  |
EXTERNAL SOURCES

GITHUB
  |-- source / docs / CI-CD / release history
  `-- not normal-path runtime dependency
```

---

## 5. Binding C0273 safety contracts retained

All prior checkpoints remain binding, including:

- official FPL deadline as sole deadline authority;
- source-readiness registry and independent-source semantics;
- manager-state visibility separation;
- fixture completion != scoring settlement;
- multi-axis generation/invalidation model;
- publication supersession and fail-closed fallback;
- orthogonal Gameweek lifecycle planes;
- immutable causal control-event/reconciliation design;
- reconcile-before-retry and explicit completion invariants;
- semantic identity separate from row/input-signature identity;
- era-aware digital-twin replay;
- workload isolation and deadline critical-path admission;
- no autonomous production model promotion;
- no autonomous production code deployment;
- no external FPL account execution unless separately designed and approved;
- V2/legacy fallback isolation until retirement is separately approved.

Dedicated hosting does not relax any of these contracts.

---

## 6. Runtime isolation model

Initial preference: one dedicated VPS with explicit logical/process isolation, not one monolithic process.

Required separation:

- public web/API;
- controller/reconciler;
- P0 authority/finalization lane;
- ordinary production worker lane;
- research/shadow lane;
- maintenance/backfill lane;
- deployment/release operations.

Checkpoint 15 resource classes and reserved P0 capacity remain the governing design. If telemetry shows a single VPS cannot provide safe isolation, split web/controller/worker roles across hosts without changing semantic authority contracts.

---

## 7. Controller durability rule

The controller is logically singular in authority but physically restartable.

After host loss/replacement it must reconstruct from durable state:

1. current official deadline/generations;
2. lifecycle/materialized state;
3. current work identities;
4. in-flight/ambiguous work requiring reconciliation;
5. canonical publication authority;
6. operational control state;
7. incidents/blockers.

Conversation memory and prior-host RAM/local disk are never recovery dependencies.

---

## 8. Deployment and rollback

Approved future code deployment path:

```text
GitHub commit/tag
  -> automated tests/build
  -> immutable release artifact
  -> deploy to VPS
  -> readiness/smoke checks
  -> activate release
  -> monitor
```

Rollback means switching application/runtime release while preserving newer durable Supabase evidence unless a separately approved data-recovery event requires otherwise.

Deployment freeze near official FPL deadlines remains binding.

No automatic deployment from research/model evaluation is permitted.

---

## 9. Migration strategy

No big-bang migration.

Expected staged path after approval:

1. validate Hostinger plan and network/resource envelope;
2. provision non-production VPS;
3. deploy read-only FIE/V3 shell;
4. attach to read-only/current Supabase evidence;
5. run controller/reconciler in shadow only;
6. perform digital-twin/replay/fault tests;
7. shadow-soak against live production;
8. migrate individual work families with explicit dispatcher ownership;
9. validate final-window resource and completion telemetry;
10. separately approve authority cutover;
11. retain V2/legacy fallback through a defined production soak.

Each work family needs a migration record specifying legacy dispatcher, future dispatcher, cutover condition, rollback path and duplicate-dispatch protection.

---

## 10. Website/control API rules

- Public reads never trigger heavy/private work.
- Data freshness never requires a GitHub deploy.
- Browser clients never hold service-role or controller credentials.
- Control actions require strong operator authorization and durable audit.
- UI actions request controller transitions; they cannot bypass generation, fencing, deadline or C0234-equivalent rules.
- Hard-invalidated recommendations cannot remain visually presented as current because of browser/CDN/API cache lag.

The detailed cache/coherency contract remains a subsequent C0273 checkpoint.

---

## 11. Observability requirements

The dedicated runtime must eventually make visible:

- current release;
- process health;
- restart/crash history;
- work queue depth;
- per-class concurrency;
- dispatch/start/completion/reconciliation latency;
- source/provider health;
- database pressure;
- current generation/fencing state;
- deadline remaining;
- current canonical publication validity;
- blockers/incidents;
- result/settlement state;
- research/shadow isolation state.

Operational telemetry must be available without inspecting GitHub Actions logs.

---

## 12. Disaster recovery principle

Recovery is three-layered:

- **Supabase** — durable production data/control evidence and database recovery;
- **GitHub** — source/release/configuration history;
- **VPS** — disposable/reproducible execution host.

Future implementation approval requires explicit RPO/RTO targets and a tested replacement-host procedure.

---

## 13. Hostinger status

Hostinger VPS is the selected **preferred infrastructure direction** based on user preference and architectural fit, but final plan/size is unresolved.

Before purchase/provisioning, verify:

- CPU/RAM/storage;
- network location/latency to Supabase/providers;
- backups/snapshots;
- recovery/restore behavior;
- firewall/network controls;
- container/process support;
- vertical resize/scaling behavior;
- monitoring support;
- SLA/support;
- total cost.

If a concrete Hostinger VPS offering fails these gates, another VPS/container provider may replace only the hosting layer without redesigning the C0273 semantic architecture.

---

## 14. Explicit unresolved blockers

The infrastructure decision does not solve these existing P0 issues:

1. authenticated current-private FPL manager state remains unresolved;
2. exact official FPL scoring-settlement authority remains unresolved;
3. source completeness for press/team-news/predicted-XI/congestion remains incomplete;
4. numeric final-window and concurrency budgets remain unapproved;
5. public API/browser/CDN cache invalidation and freshness contract still needs design;
6. exact event/work/controller physical schema remains unapproved;
7. final implementation readiness requires digital-twin and shadow-forward acceptance;
8. migration ownership of all current scheduled work families remains unmapped;
9. exact Hostinger plan and topology remain unselected;
10. RPO/RTO, observability stack and secrets-management implementation remain unselected.

---

## 15. Current program position

C0273 now has a clear deployment destination and responsibility boundary:

> **Hostinger VPS runs the product and control plane; Supabase owns durable semantic state; GitHub owns engineering history and release source.**

This substantially reduces the ambiguity around “where the autonomous engine lives,” while retaining the safety, lineage and approval contracts established by Checkpoints 01–15.

## Final recommendation

Continue C0273 planning against this architecture. Do not provision or migrate production yet.

The next bounded design batch should define **public API freshness, canonical publication cache invalidation and browser/CDN coherency** for the dedicated VPS architecture, then proceed toward the final implementation-readiness package.

**PRODUCTION IMPLEMENTATION REMAINS EXPLICITLY APPROVAL-GATED.**
