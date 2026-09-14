# C0273 — Checkpoint 16: Dedicated Runtime Hosting Architecture

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Decision recorded

The target C0273 architecture is now explicitly:

- **Hostinger VPS** — dedicated application/runtime and autonomous control-plane host;
- **Supabase** — durable database, auth/data platform, canonical engine state, audit/event evidence and approved server-side data services;
- **GitHub** — canonical source control, planning/documentation history, code review, CI/CD source and disaster-recovery/version history; GitHub is **not** a normal engine-runtime dependency.

This is a planning decision only. No VPS has been provisioned, no deployment has been performed, no cron/runtime worker has been moved, and no production behavior has changed.

---

## 1. Why this architecture fits C0273

The C0273 audits show that the engine is becoming a continuously operating control system rather than a static website. The runtime therefore needs:

- long-lived/restartable worker processes;
- explicit queues/admission control;
- resource isolation;
- deadline-critical workload prioritization;
- durable reconciliation after failures;
- observability independent of GitHub Actions;
- internal/private control endpoints;
- public read APIs that do not trigger heavy work;
- predictable deployment and rollback boundaries.

A dedicated VPS is a better fit for those responsibilities than treating GitHub Pages/Actions as the operational home.

---

## 2. Target responsibility split

### Hostinger VPS — runtime/control plane

Intended responsibilities after separate implementation approval:

- V3/FIE application server;
- internal controller/reconciler;
- bounded worker processes;
- queue/admission layer;
- scheduler orchestration where approved;
- internal API/control endpoints;
- public read API gateway where appropriate;
- health/status aggregation;
- structured application/worker logs;
- local process supervision;
- reverse proxy/TLS termination or equivalent managed ingress;
- deployment target for approved application/runtime code.

The VPS must not become the sole durable authority store. Restarting or replacing it must be recoverable from durable state.

### Supabase — durable truth/data platform

Retained responsibilities:

- production football/FPL data;
- durable manager/projection/decision/result evidence;
- future approved control-plane event/work state where appropriate;
- append-only audit and lineage records;
- authentication/authorization data where selected;
- public/internal database APIs where contractually safe;
- canonical authority records and CAS-style transitions where approved;
- database-side integrity constraints and reconciliation evidence.

Supabase is not merely a cache behind the VPS. Durable semantic truth must survive VPS loss.

### GitHub — engineering system of record

Retained responsibilities:

- source code;
- planning and architecture documents;
- change history;
- pull requests/code review;
- CI/build/test source;
- release/deployment definitions;
- disaster-recovery source/version history;
- governance/decision documentation.

GitHub must not be required for ordinary live engine operation, website data freshness, FPL finalization, result settlement, or controller recovery.

---

## 3. Revised logical topology

```text
                         USERS / BROWSER
                               |
                         FIE V3 WEBSITE
                               |
                      PUBLIC READ/API LAYER
                               |
                 +-------------+-------------+
                 |                           |
          PRODUCT READS                 CONTROL STATUS
                 |                           |
                 +-------------+-------------+
                               |
                    HOSTINGER VPS RUNTIME
              +----------------+----------------+
              |                |                |
       Controller/Reconciler   |          Bounded Workers
              |                |                |
        Admission/Queue        |          Source/Compute Jobs
              |                |                |
              +----------------+----------------+
                               |
                           SUPABASE
              Durable data / lineage / authority
                               |
                       External Providers

GITHUB
  -> source control / docs / CI-CD source / release history
  -> no normal-path dependency for live data freshness or decisions
```

---

## 4. Control-plane product principle

C0273 is no longer framed only as “an autonomous website.” The target product is:

> **a dedicated FIE application with an observable autonomous control plane.**

The website should expose, at minimum, human-readable state such as:

```text
GW5
Deadline authority: VERIFIED
Source readiness: DEGRADED / HEALTHY
Manager state: CURRENT / UNOBSERVABLE / STALE
Projection: COMPLETE_CURRENT
Planner: COMPLETE_CURRENT
Peer verification: COMPLETE_CURRENT
Authorization: PASS / BLOCKED
Publication: CURRENT_VERIFIED / SUPERSEDED / NO_TRUSTWORTHY_CURRENT_DECISION
Result state: LIVE_PARTIAL / SETTLEMENT_WAIT / SETTLED
Operational state: RUN / PAUSE / DRAIN / EMERGENCY_BLOCKED
```

This UI is an observation/control surface over the contracts already defined in C0273; it must not invent alternate authority semantics.

---

## 5. Operational separation requirements

A single VPS is acceptable as the initial hosting target only if the architecture preserves logical isolation.

At minimum, future implementation design must separate:

- public web/API process;
- controller/reconciler process;
- deadline-critical workers;
- ordinary production workers;
- research/shadow workers;
- maintenance/backfill work;
- deployment process;
- database connections/pools where practical.

A process crash or overload in research/shadow work must not be able to starve final-window authorization work.

Checkpoint 15 workload classes remain binding.

---

## 6. VPS must be replaceable

The VPS is an execution host, not the semantic source of truth.

Required future property:

> A newly provisioned replacement host must be able to reconstruct controller intention from Supabase durable state and resume safely without relying on local disk, browser state, ChatGPT conversation context, or the previous host's memory.

Local VPS disk may hold caches/log buffers/build artifacts, but no unique authority evidence may exist only there.

---

## 7. Deployment architecture

Future approved deployment should follow:

```text
GitHub approved commit/tag
        -> CI/test/build
        -> immutable/versioned release artifact
        -> controlled deployment to VPS
        -> startup/readiness checks
        -> smoke tests
        -> traffic/current-release switch
        -> rollback to prior known-good release if required
```

Important constraints:

- deployment is not the same as model promotion;
- no autonomous production code deployment;
- no autonomous production model promotion;
- deployment freeze around the FPL deadline remains binding;
- an application deploy must not rewrite historical football evidence;
- rollback must not roll back Supabase semantic history.

---

## 8. Website/data freshness boundary

This decision strengthens the prior C0273 rule:

> website code release and football-data freshness are separate systems.

The VPS frontend/API must consume current durable/publication state without needing a GitHub rebuild/deployment whenever FPL data changes.

A GitHub outage must not make the engine unable to:

- refresh approved sources;
- run an already-approved finalization chain;
- reconcile work;
- publish a new durable semantic state;
- serve current data from the running application.

---

## 9. Security boundary

Future implementation planning must include:

- no Supabase service-role/secret keys in browser bundles;
- private controller/admin endpoints inaccessible to public clients;
- least-privilege database credentials/roles by process class where practical;
- authenticated operator actions;
- audited control actions;
- secret storage outside Git history;
- firewall/network restrictions for internal services where practical;
- explicit authorization for PAUSE/DRAIN/EMERGENCY_BLOCKED and any future retry/recompute action;
- no UI control capable of bypassing semantic generation/fencing/deadline/C0234 authority rules.

A button in the control plane is a request to the governed controller, not a privileged shortcut around it.

---

## 10. Observability target

The dedicated runtime should eventually expose operational evidence for:

- process health/restarts;
- work queue depth;
- per-class concurrency;
- dispatch/start/completion/reconcile timestamps;
- database connection pressure;
- external-provider latency/error rates;
- controller generation/fencing state;
- current blockers;
- deadline remaining;
- current publication validity;
- incident history;
- release version currently running.

GitHub logs alone are insufficient for a continuously autonomous runtime.

---

## 11. Backups and disaster recovery

Planning requirements:

- Supabase backup/PITR capability must be treated as the primary durable-data recovery plane;
- GitHub preserves source and release history;
- VPS configuration/deployment must be reproducible from documented infrastructure/configuration;
- no unique secrets/configuration should exist only in an operator's browser/session;
- replacement-host recovery must be tested in a non-production environment before autonomous cutover.

Exact Hostinger snapshot/backup features, retention and restore guarantees must be verified against the selected VPS plan before implementation approval.

---

## 12. Hostinger selection status

**Hostinger VPS is the preferred target host, not yet an implemented or irrevocable dependency.**

Before provisioning/cutover approval, validate the selected plan against actual C0273 needs:

- vCPU and RAM envelope;
- storage/IOPS;
- outbound bandwidth/traffic limits;
- region/latency to Supabase and major providers;
- snapshot/backup behavior;
- recovery workflow;
- network/firewall controls;
- IPv4/IPv6 requirements;
- Docker/container/process support;
- monitoring integration;
- scaling/resize downtime semantics;
- SLA/support expectations;
- cost.

If the concrete Hostinger plan cannot satisfy these requirements, the architecture permits another VPS/container host without changing the Supabase/GitHub responsibility split.

---

## 13. Migration principle

Do not perform a big-bang move.

Future implementation should use staged cutover:

1. provision isolated non-production VPS;
2. deploy read-only V3/control-plane shell;
3. connect read-only to current Supabase evidence;
4. add shadow controller/reconciler with zero production authority;
5. replay historical/digital-twin scenarios;
6. run live shadow soak;
7. move approved noncritical workers;
8. validate resource/telemetry budgets;
9. enable production controller authority only after explicit approval and gates;
10. keep legacy/V2 fallback until production QA/soak criteria pass.

No step implies automatic approval of the next.

---

## 14. Red-team findings introduced by dedicated VPS hosting

### A. New single-host failure risk

A dedicated VPS simplifies operations but creates a host-level blast radius.

Mitigation contract:
- durable truth remains in Supabase;
- process supervision/restart;
- recoverable host configuration;
- replacement-host drill;
- fail-closed semantic authority during uncertain recovery.

### B. VPS resource contention

Website traffic, workers and research could compete on one host.

Mitigation contract:
- workload/process isolation;
- class-based concurrency from Checkpoint 15;
- reserved final-window capacity;
- optional future second worker host if evidence requires it.

### C. Deployment can disrupt finalization

A restart/deploy near deadline could interrupt workers or stale controller state.

Mitigation contract:
- deployment freeze;
- graceful drain;
- durable reconciliation;
- release readiness checks;
- explicit emergency-deploy governance.

### D. Local scheduler duplication

If legacy Supabase cron and new VPS scheduler both dispatch the same semantic work during migration, duplicate work can occur.

Mitigation contract:
- migration registry for work-family ownership;
- one approved dispatcher authority per semantic work family;
- generation/fencing/idempotency remain mandatory;
- no scheduler cutover without per-family reconciliation test.

### E. False assumption that dedicated hosting solves data authority

Moving runtime to a VPS does not fix missing private manager state, official settlement authority, deadline contracts or source-readiness gaps.

Mitigation contract:
- all prior C0273 P0 blockers remain binding.

---

## 15. Open questions preserved for user review

1. Exact Hostinger VPS plan/specification is not selected.
2. Single VPS vs separate web/controller/worker VPS topology remains evidence-driven; initial preference is one VPS with logical isolation, scale out only when telemetry requires it.
3. Containerization choice and process supervisor are not selected.
4. Public API location — VPS-only gateway vs selective Supabase direct reads — requires security/performance design.
5. Exact observability stack is not selected.
6. Backup/PITR/snapshot recovery objectives (RPO/RTO) are not yet approved.
7. DNS/domain/subdomain structure is not selected.
8. Exact secrets-management mechanism is not selected.
9. Migration order for the 29 currently active jobs requires per-work-family ownership mapping before cutover.
10. Private-current FPL manager-state visibility remains unresolved and is not solved by VPS hosting.
11. Official FPL scoring-settlement authority remains unresolved.
12. Numeric final-window/concurrency budgets remain unresolved pending measurement telemetry.
13. Public cache/coherency contract remains the next planned C0273 batch and becomes more important with a dedicated VPS/API layer.

---

## 16. Architecture decision summary

C0273 now adopts this target responsibility model:

```text
HOSTINGER VPS = application + runtime + autonomous control plane
SUPABASE      = durable data + semantic authority + audit/state platform
GITHUB        = source + docs + CI/CD source + version/disaster-recovery history
```

GitHub is therefore **demoted from any implied normal-path operational role**. It remains essential to engineering governance but the already-running engine should continue operating safely if GitHub is temporarily unavailable.

This decision does not authorize provisioning, migration or implementation.

## Final status

**PLANNING DECISION ACCEPTED. IMPLEMENTATION NOT AUTHORIZED.**

All production changes remain explicitly approval-gated.
