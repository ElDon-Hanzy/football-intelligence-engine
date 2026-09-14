# C0273 — Checkpoint 18: Hostinger VPS Sizing, Runtime Topology, Deployment, Observability, Recovery & Secrets

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Convert the accepted Hostinger VPS + Supabase + GitHub target architecture into an evidence-backed initial hosting and operations contract.

This checkpoint selects a **planning preference**, not a purchase or deployment:

> **Preferred initial production target: Hostinger KVM 4 (4 vCPU / 16 GB RAM / 200 GB NVMe / 16 TB bandwidth), one VPS with strict logical/process isolation, with KVM 8 or a second worker VPS reserved as evidence-driven scale-out paths.**

No VPS is provisioned, no DNS is changed, no code is deployed, no cron is moved, no worker is started, no schema is changed, and no production behavior is altered by this checkpoint.

---

## 1. Inputs re-verified

This batch re-read:

- C0273 Checkpoint 16 dedicated-runtime architecture;
- C0273 Checkpoint 17 public API/cache-coherency contract;
- current C0273 Supabase tracker state;
- Checkpoint 15 workload/resource evidence already recorded for production;
- current official Hostinger VPS plan/resource and backup documentation.

Current C0273 tracker remains:

- status: `Open`;
- delivery stage: `Planned`;
- priority: `P0`;
- model effect: `None. Planning/documentation only; zero runtime/model effect.`

No planning gate is relaxed by selecting a preferred VPS size.

---

## 2. Current Hostinger resource envelope checked

Hostinger's currently published KVM VPS resource tiers are:

| Plan | vCPU | RAM | NVMe | Bandwidth |
|---|---:|---:|---:|---:|
| KVM 1 | 1 | 4 GB | 50 GB | 4 TB |
| KVM 2 | 2 | 8 GB | 100 GB | 8 TB |
| KVM 4 | 4 | 16 GB | 200 GB | 16 TB |
| KVM 8 | 8 | 32 GB | 400 GB | 32 TB |

Hostinger also documents:

- AMD EPYC CPU platform;
- NVMe storage;
- full root access;
- firewall management;
- 1 Gbps network interface;
- public API;
- worldwide data centers;
- weekly backups by default;
- daily backups available as an upgrade;
- manual VPS snapshots.

Official references checked in this planning batch:

- https://www.hostinger.com/vps-hosting
- https://www.hostinger.com/support/6976044-parameters-and-limits-of-hosting-plans-in-hostinger/
- https://www.hostinger.com/support/1583232-how-to-back-up-or-restore-a-vps-at-hostinger/

Hostinger states plan resources are fixed per tier and individual resources are not independently upgraded; moving to a higher tier is the scale-up path.

All provider specifications are time-sensitive and must be re-verified in hPanel immediately before any purchase approval.

---

## 3. Existing FIE workload evidence that matters to sizing

Checkpoint 15 already established the important current production facts:

- 29 active cron jobs at audit time;
- seven-day observed peak overlap of 8 cron executions;
- SQL-heavy jobs with meaningful p95 tails;
- observed successful executions in the 40–111 second range;
- 120-second statement-timeout events;
- scheduler startup-timeout events;
- asynchronous workers whose true completion latency is not represented by short cron dispatch duration;
- future requirement for reserved P0 deadline-critical capacity;
- research/background work must yield to finalization.

The VPS will not host the canonical Postgres database; Supabase retains that role. Therefore VPS sizing is primarily about:

- application/API concurrency;
- controller/reconciler process;
- queue/admission processing;
- source/compute worker processes;
- Python/Node/runtime memory;
- transient data processing;
- structured logging/metrics buffers;
- reverse proxy;
- deployment headroom;
- failure isolation.

Database-heavy SQL itself remains primarily executed on Supabase, but the VPS can still create database pressure by dispatching excessive concurrent work.

---

## 4. Initial sizing decision

### KVM 1 — rejected for production target

1 vCPU / 4 GB RAM leaves effectively no safe isolation margin for:

- public website/API;
- controller;
- finalization worker;
- ordinary workers;
- telemetry;
- deploy/restart overhead.

It may be usable for a tiny static/read-only experiment but is not an appropriate C0273 production-control target.

### KVM 2 — acceptable for development/shadow, not preferred for production

2 vCPU / 8 GB RAM is materially better and Hostinger itself positions this tier for medium-scale application workloads.

However, for FIE it creates a likely contention boundary when combining:

- web/API;
- controller/reconciler;
- P0 finalization workers;
- ordinary source workers;
- research/shadow processes;
- telemetry/observability.

KVM 2 is therefore a reasonable **non-production/shadow or cost-minimal pilot** candidate, but not the preferred first autonomous production host.

### KVM 4 — preferred initial production target

4 vCPU / 16 GB RAM / 200 GB NVMe provides enough initial headroom to logically separate runtime classes while remaining modest in cost and complexity.

Planning rationale:

- two CPU cores would make web/controller/worker contention more probable under coincident finalization activity;
- 16 GB RAM allows bounded workers to coexist without forcing every workload into severe memory pressure;
- 200 GB local storage is ample for application images/releases/log buffers/cache artifacts while durable authority stays in Supabase;
- KVM 4 gives a meaningful safety step above minimum viable capacity without jumping immediately to KVM 8;
- scale-up remains simple if measured telemetry proves KVM 4 insufficient.

**KVM 4 is a planning recommendation, not an approved purchase.**

### KVM 8 — not justified initially

8 vCPU / 32 GB RAM provides substantially more headroom, but current evidence does not prove the runtime needs it.

Starting at KVM 8 would hide poor scheduling/concurrency design and could encourage uncontrolled worker fan-out.

Use KVM 8 only if shadow/live telemetry shows sustained CPU, memory, queue-latency or finalization-tail pressure after workload controls are working correctly.

---

## 5. Initial topology: one VPS, multiple isolated process classes

Do not begin with multiple servers unless telemetry justifies the operational complexity.

Preferred first topology:

```text
HOSTINGER KVM 4
|
+-- ingress / reverse proxy
|
+-- FIE web + public API
|
+-- controller / reconciler
|
+-- P0 deadline-critical worker pool
|
+-- P1/P2 ordinary production worker pool
|
+-- P3/P4 research + maintenance worker pool
|
+-- telemetry/logging agent
|
+-- deployment/release supervisor
|
+--> Supabase durable state/data/authority
```

Isolation must be enforced even on one host through independent processes/containers and resource/concurrency limits.

A single process containing web + controller + workers is rejected.

---

## 6. Scale-out trigger: separate worker host before oversized monolith

If KVM 4 becomes constrained, the preferred next architectural move should be evaluated as:

1. **second VPS dedicated to workers/research**, or
2. vertical upgrade to KVM 8.

Do not automatically choose vertical scale-up.

A second worker host has architectural advantages:

- public website/API survives worker overload;
- controller/web resource reservation becomes easier;
- research can be physically isolated;
- final-window worker pools can receive dedicated capacity;
- host-level blast radius is reduced.

But it adds:

- deployment complexity;
- network/security configuration;
- more monitoring;
- additional cost;
- distributed coordination requirements.

Therefore the scale-out decision remains telemetry-driven.

---

## 7. Capacity guardrails for initial implementation design

No final numeric limits are authorized yet, but the implementation design should reserve resources conceptually as follows:

- public API/web: always retain capacity to serve status/current authority;
- controller/reconciler: never depend on spare capacity from research workers;
- P0 workers: reserved admission capacity;
- P1/P2 workers: bounded pool;
- P3/P4 research/maintenance: hard-preemptible/deferable pool;
- deployment/build work: must not compete with finalization window.

Do not use `all available CPU/RAM` as a worker budget.

Future shadow soak must determine:

- CPU high-water mark;
- memory RSS high-water mark;
- OOM/restart behavior;
- load average;
- event-loop/API latency;
- queue wait time;
- per-class throughput;
- Supabase connection utilization;
- outbound request concurrency;
- finalization tail latency.

---

## 8. Containerization / process supervision planning decision

Preferred implementation direction:

> containerized services with a simple single-host orchestrator initially, rather than Kubernetes.

Kubernetes is rejected for the first implementation because the current FIE scale does not justify its operational complexity.

Acceptable implementation families to evaluate at build approval:

- Docker Compose or equivalent container composition;
- systemd-managed containers/processes where simpler;
- immutable release images built from approved GitHub commits.

Required properties regardless of tool:

- independent restart policy per service;
- health/readiness checks;
- resource limits where supported;
- versioned release identity;
- environment/secrets injection outside images;
- logs to structured stdout/collector;
- graceful drain before deploy;
- controller and worker processes independently restartable.

Exact tooling is not selected by this checkpoint.

---

## 9. Deployment contract

Future approved deployment path:

```text
approved GitHub commit/tag
 -> CI tests
 -> build immutable release artifact/image
 -> identify release SHA/version
 -> transfer/pull release to VPS
 -> enter DRAIN where required
 -> deploy inactive/new release
 -> startup/readiness validation
 -> read-only smoke tests
 -> controller recovery/reconciliation check
 -> traffic/current-release switch
 -> monitor
 -> rollback application release if required
```

Rules:

- no autonomous code deploy;
- no autonomous model promotion;
- deployment freeze around FPL deadline remains binding;
- deploy cannot overwrite Supabase historical state;
- rollback of code must not roll back database semantic history;
- database/schema compatibility must support rolling or controlled rollback where relevant;
- controller must reconstruct durable state before accepting authority-changing work after restart.

A deploy success is not proven by process start alone.

---

## 10. Release rollback model

Application rollback should mean:

> run a prior known-good code release against the **current durable Supabase state**.

It must not mean:

> restore an old VPS image containing old semantic state and pretend time moved backward.

Therefore Hostinger snapshots/backups are disaster-recovery tools, not normal application rollback mechanisms.

Normal rollback should use immutable application releases.

---

## 11. Hostinger backup limitations and recovery implications

Current Hostinger documentation states:

- automatic weekly backups are available by default;
- daily backups can be enabled;
- up to four automatic backups are retained in the documented policy (two daily/two weekly when daily is enabled);
- a manual snapshot can be created;
- only one manual snapshot is retained at a time;
- the current English support documentation states the snapshot expires after one day;
- VPS restore can take from minutes to hours depending on size;
- restore locks the VPS while the operation is in progress;
- backup/snapshot restore replaces the current VPS contents;
- backup/snapshot download is not directly available from hPanel.

Implication:

> Hostinger backups are useful host-recovery aids but are insufficient as the only C0273 disaster-recovery strategy.

Durable semantic truth remains Supabase; source/release history remains GitHub.

---

## 12. Recovery planes must remain separate

### A. Semantic/data recovery — Supabase

Primary recovery target for:

- football/FPL evidence;
- controller event/work state;
- authority revisions;
- publication history;
- manager/projection/decision/result lineage.

Exact Supabase PITR/backup RPO/RTO remains separately approval-gated.

### B. Application/source recovery — GitHub

Provides:

- source;
- release definitions;
- documentation;
- infrastructure/configuration templates;
- known-good commit history.

### C. Host recovery — Hostinger

Provides:

- VM backup/snapshot restoration;
- replacement VPS provisioning environment;
- base OS/network host.

No one plane substitutes for the others.

---

## 13. Proposed recovery objectives — not yet approved numeric SLOs

C0273 should ultimately define at least:

- **RPO-data:** maximum acceptable loss of durable Supabase semantic evidence;
- **RTO-runtime:** maximum acceptable time to restore website/controller runtime;
- **RTO-authority:** maximum time to re-establish trusted controller authority after host loss;
- **RTO-read:** maximum time to restore public read access;
- **RTO-final-window:** stricter behavior when failure occurs close to official FPL deadline.

Do not choose these numbers from hosting marketing claims.

They must be proven through replacement-host drills.

---

## 14. Replacement-host recovery contract

A fresh VPS must be able to recover using only approved durable sources:

1. provision clean host;
2. install/restore approved runtime prerequisites;
3. obtain approved release from GitHub/artifact source;
4. inject approved secrets/configuration;
5. connect to Supabase;
6. start read-only/status services first;
7. reconstruct controller state from durable event/work/authority records;
8. reconcile ambiguous/in-flight work;
9. reject stale fencing epochs;
10. verify official deadline/generations;
11. expose current public authority state;
12. enable governed worker dispatch only after recovery checks pass.

The previous VPS local disk must not be required.

---

## 15. Secrets-management contract

Never store production secrets in:

- Git repository;
- Docker image;
- browser bundle;
- planning documents;
- plain-text public deployment logs;
- client-side environment variables;
- operator chat history as the only copy.

Separate credentials by process class where feasible:

- public read/API;
- controller;
- workers;
- deployment agent;
- monitoring;
- operator/admin.

Principles:

- least privilege;
- short blast radius;
- rotation procedure;
- audit of privileged use;
- no Supabase service-role credential in browser;
- private control endpoints require strong server-side authentication;
- compromise of public web process must not automatically grant controller authority.

Exact secrets tool is unresolved. Candidate mechanisms should be compared at implementation design time rather than embedding a permanent choice in this planning checkpoint.

---

## 16. Network/security baseline

Future VPS implementation should require at minimum:

- deny-by-default host firewall;
- expose only required public ingress ports;
- SSH key authentication; password/root-login policy hardened as appropriate;
- internal controller/worker endpoints not exposed publicly;
- TLS for public traffic;
- automated security update policy with controlled restart behavior;
- brute-force/rate protection for operator/admin surfaces;
- application-level auth independent of mere network location;
- outbound provider access observable;
- production secrets inaccessible to browser/static assets.

Security configuration must not cause unscheduled final-window restart without deadline-aware governance.

---

## 17. Observability design

The VPS/control plane should expose four distinct observability layers.

### Host

- CPU;
- RAM;
- disk utilization;
- disk I/O;
- network;
- process/container restarts;
- filesystem pressure;
- load average.

### Application

- API latency/error rate;
- active requests;
- release version;
- process health;
- public authority revision served;
- cache behavior from Checkpoint 17.

### Controller/workers

- queue depth;
- admitted/running work by priority class;
- work age;
- dispatch/start/complete/reconcile latency;
- retry/reconcile disposition;
- fencing epoch;
- generation vector;
- stale worker rejection;
- deadline remaining at dispatch/commit.

### Semantic health

- official deadline authority;
- source readiness;
- manager-state visibility/freshness;
- projection readiness;
- C0248 state;
- C0234 authorization state;
- publication/current-authority state;
- actual submission state;
- result/settlement state;
- active incidents/blockers.

A green host must never imply a green engine decision state.

---

## 18. Alerting principles

Future alerts should be severity-based and actionable.

Examples:

### SEV0 / critical

- canonical authority contradiction;
- stale/old fencing epoch successfully commits;
- execution authorization after official deadline;
- semantic history mutation/integrity failure;
- security compromise suspected.

### SEV1

- finalization blocked close to deadline;
- controller unable to determine current authority;
- P0 source unavailable beyond freshness budget;
- public API serving authority revision mismatch;
- replacement host recovery cannot reconcile.

### SEV2

- ordinary worker repeated failure;
- rising queue latency;
- resource saturation outside final window;
- research/maintenance failure.

Exact alert transport remains unresolved.

---

## 19. Log-retention contract

Do not rely on VPS local disk as the sole log archive.

Required future design:

- structured logs;
- correlation/work IDs;
- release ID;
- gameweek;
- semantic work key;
- generation/fencing metadata where relevant;
- bounded local rotation;
- off-host retention for incident-relevant logs;
- secret/token redaction;
- queryable incident window.

Exact provider and retention duration remain open.

---

## 20. Deployment/recovery red-team

### Finding A — KVM 4 capacity can still be exhausted by bad orchestration

More RAM/CPU does not replace backpressure.

**Rule:** Checkpoint 15 concurrency/admission controls remain mandatory.

### Finding B — one VPS still creates host-level common-mode failure

Logical process isolation cannot survive total host loss.

**Rule:** replacement-host recovery must be proven before autonomous cutover; second host remains a future scale/availability option.

### Finding C — Hostinger snapshot is not application rollback

Restoring a whole server can roll local files/configuration backwards and makes the VPS unavailable during restore.

**Rule:** normal releases use immutable deployment rollback; snapshots are disaster recovery only.

### Finding D — Hostinger backup retention is not a durable semantic audit strategy

Short backup retention and host-level images do not replace append-only Supabase/GitHub history.

**Rule:** semantic truth and audit evidence remain off-host.

### Finding E — observability can become a new resource competitor

Heavy local monitoring/log aggregation can consume CPU/disk during finalization.

**Rule:** observability collection must be bounded and lower priority than P0 work while preserving critical signals.

### Finding F — deployment agent can become a hidden authority bypass

A deploy user with broad shell/database credentials could circumvent control-plane policy.

**Rule:** deployment privilege and semantic authority privilege remain separate.

### Finding G — automatic OS reboots can violate deadline freeze

Security maintenance that restarts the host near deadline can be operationally equivalent to an unsafe deployment.

**Rule:** restart policy must be deadline-aware while preserving urgent security-response capability.

### Finding H — local queue state would make VPS replacement unsafe

If queued/in-flight semantic intention exists only on disk/memory, host loss can duplicate or lose work.

**Rule:** durable work identity/reconciliation evidence belongs in Supabase or another approved durable plane; local queue is execution convenience only.

---

## 21. Initial go-forward hosting recommendation

If implementation approval were granted after C0273 planning closes, the current preferred starting point would be:

```text
Hostinger KVM 4
Ubuntu LTS-class host
containerized/process-isolated services
one host initially
Supabase remains durable authority/data plane
GitHub remains source/release plane
strict P0/P1/P2/P3/P4 admission controls
no unique local semantic state
immutable application release/rollback
host backup + independent Supabase data recovery
```

This is still subject to:

- region/latency verification;
- exact hPanel plan/spec re-check;
- non-production shadow load test;
- replacement-host recovery drill;
- secrets mechanism selection;
- monitoring/alerting selection;
- measured finalization latency;
- user implementation approval.

---

## 22. Contradictions / unresolved questions preserved

1. **Exact Hostinger region:** not selected; must minimize latency to Supabase and relevant providers without creating legal/operational issues.
2. **KVM 4 vs KVM 2 for non-production:** both viable; cost/parallel-environment strategy not chosen.
3. **Single host availability:** acceptable initial preference, but no high-availability SLA is claimed.
4. **Second VPS vs KVM 8 scale path:** unresolved until telemetry.
5. **Exact container/process supervisor:** unresolved.
6. **Exact ingress/reverse proxy:** unresolved.
7. **Exact monitoring/logging stack:** unresolved.
8. **Exact alert delivery channel:** unresolved.
9. **Exact secret-management tool:** unresolved.
10. **Supabase RPO/PITR contract:** still needs explicit verification/approval.
11. **Hostinger backup RPO/RTO:** provider backup schedule exists, but FIE recovery SLO must be proven empirically.
12. **Daily Hostinger backup add-on:** not approved; may be useful for host config recovery but cannot substitute for Supabase durability.
13. **Domain/subdomain plan:** unresolved.
14. **Public API direct-Supabase vs VPS-only path:** unresolved and must respect Checkpoint 17 authority/cache rules.
15. **Migration ownership for the current 29 active jobs:** not yet mapped; remains the next operational planning problem.
16. **Private-current FPL manager state:** unresolved and unaffected by VPS sizing.
17. **Official result settlement authority:** unresolved and unaffected by VPS sizing.
18. **Numeric final-window concurrency budgets:** unresolved until shadow telemetry.
19. **Soft-stale actionability:** unresolved policy question from Checkpoints 08/17.
20. **No purchase authorization:** KVM 4 is a planning preference only.

---

## 23. Acceptance criteria for this planning checkpoint

This checkpoint is complete when:

- Hostinger current resource envelope is verified;
- initial production-size recommendation is evidence-based;
- under/over-sizing risks are documented;
- one-host logical topology is explicit;
- scale-out path is explicit;
- deployment/rollback semantics are separated from host snapshot restore;
- recovery planes are separated;
- replacement-host contract is defined;
- secrets/security baseline is defined;
- observability/alerts/logging requirements are defined;
- contradictions remain visible;
- no production change occurs.

All criteria are satisfied at the planning/documentation level only.

## Final status

**CHECKPOINT 18 COMPLETE — PLANNING ONLY.**

Preferred initial production host: **Hostinger KVM 4**, subject to later implementation approval and pre-purchase re-verification.

No runtime, deployment, model, source, cron, schema, promotion, kill, or FPL-account behavior changed.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT YET.**
