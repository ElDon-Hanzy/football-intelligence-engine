# C0273 — Checkpoint 20: Implementation Readiness Blocker Matrix & Staged GO/NO-GO Package

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Consolidate C0273 planning into a staged implementation-readiness decision instead of continuing to expand architecture indefinitely. This checkpoint distinguishes what is safe to build after explicit approval from what remains blocked for production authority, migration and full autonomy.

This document does **not** authorize provisioning, code implementation, schema changes, cron changes, worker dispatch, deployment, model changes, production promotion, research kill/promotion, or FPL-account execution.

## 1. Current planning baseline re-verified

The current working architecture remains Master Plan V0.3:

- Hostinger VPS = application/runtime/control plane;
- Supabase = durable semantic data, authority, audit and suitable DB-native execution;
- GitHub = source/docs/CI-CD/release history, not a normal runtime/data-freshness dependency.

Checkpoint 19 remains binding: 29 active Supabase cron jobs exist in the current live scheduling surface, and migration must transfer semantic scheduler ownership rather than blindly move cron definitions.

Supabase tracker state remains `Open / Planned / P0`, model effect `None`, with explicit human approval required before implementation.

## 2. Critical distinction: one GO/NO-GO is too coarse

C0273 must not ask for one binary approval covering everything.

A safe program needs separate gates:

- **G0 — Planning closure**: architecture/contracts sufficiently specified to stop exploratory design.
- **G1 — Non-production foundation build**: VPS/dev infrastructure, controller skeleton, telemetry, read-only APIs, digital-twin/replay and shadow-no-dispatch work.
- **G2 — Production-observing shadow**: controller may read current production state and record shadow intentions, but cannot dispatch/mutate production authority.
- **G3 — Low-authority production cutover**: selected bounded refresh families may transfer scheduler ownership under canary/fencing.
- **G4 — Decision-support orchestration cutover**: projections/optimizer orchestration may transfer after completion/reconciliation contracts pass.
- **G5 — Finalization authority cutover**: C0248 -> C0234 -> C0237 authority chain may transfer only after all deadline/generation/cache/digital-twin gates pass.
- **G6 — Full covered autonomy**: result/actual/settlement and all declared P0 source families meet their contracts through multi-GW soak.

Approval at one gate does not imply approval at later gates.

## 3. Readiness judgment now

### G0 — Planning closure

**GO, subject to this checkpoint being accepted as the planning baseline.**

The architecture is sufficiently mature that additional broad design expansion now has diminishing value. Remaining questions are predominantly implementation evidence or deliberately deferred policy values.

### G1 — Non-production foundation build

**READY FOR USER APPROVAL, but NOT AUTHORIZED by this document.**

No known blocker requires us to solve private FPL manager state, settlement finality, final-window p99 budgets or production scheduler ownership before building an isolated non-production foundation.

Safe-after-approval G1 scope:

- provision approved Hostinger environment;
- immutable release/deployment path;
- secrets/bootstrap/security baseline;
- controller/reconciler skeleton with no production dispatch authority;
- event/work identity abstractions;
- observability/logging/metrics;
- read-only public/internal API contracts;
- digital-twin/replay harness;
- failure-injection tests against fixtures/synthetic evidence;
- shadow-no-dispatch intention recording;
- cache/authority-revision contract tests using non-authoritative state.

### G2 — Production-observing shadow

**CONDITIONALLY READY after G1 QA.**

Required before G2:

- production credentials are read-only where technically possible;
- shadow mode has a hard no-dispatch/no-authority-write invariant;
- event/work records used for shadow evidence cannot be consumed as production authority;
- production load impact is bounded and measured;
- replay/reconciliation reducer is deterministic for covered scenarios;
- deployment freeze policy is enforced operationally for the shadow service itself where relevant.

### G3 — Low-authority production cutover

**NO-GO today.**

Can become eligible family-by-family after work identity, generation/fencing, completion invariant, reconcile-before-retry, ownership epoch, canary and rollback evidence exist. Availability refresh remains the strongest early candidate from prior audits.

### G4 — Projection/optimizer orchestration cutover

**NO-GO today.**

Blocked by decomposition of C0217/C0213 orchestration, independent projection completeness proof, exact completion/reconciliation semantics, measured critical-path/resource budgets and production shadow equivalence.

### G5 — Finalization authority cutover

**HARD NO-GO today.**

Blocked by official deadline unification, generation-bound C0248 authority identity, canonical-public authority revision, fail-closed cache/browser behavior, final-window critical-path evidence, digital-twin failure tests, and exclusive scheduler ownership.

### G6 — Full covered autonomy

**HARD NO-GO today.**

Additionally blocked by private-current manager-state visibility/contract, official scoring-settlement authority, complete declared P0 source coverage and multi-GW soak.

## 4. P0 blocker matrix

| Blocker | Blocks | Current evidence | Closure evidence required |
|---|---|---|---|
| Official deadline authority split | G5+ | Legacy projection/finalization chain derives first kickoff minus 90m while actual sync uses official event deadline | All authority-sensitive stages consume versioned official FPL deadline identity; contradiction test passes; commit-time deadline guard proven |
| Current private manager state unobservable | G6 and any personalized current-state guarantee | Public reconstruction cannot prove manual predeadline transfers | Approved authenticated observation path or explicit product contract that declares CURRENT_PRIVATE_UNOBSERVABLE and prevents false personalization |
| Result settlement finality unresolved | G6 | Fixture-complete observations can later change | Exact official settlement criterion proven; correction supersession tested |
| Result parent/child partial-run ambiguity | G5/G6 result workflows | Durable parent runs can exist with zero children | Queryable completeness invariant + reconcile/repair tests |
| C0217/C0213 monolithic orchestration | G4+ | Scheduling/readiness/dispatch/completion are mixed | Decomposed bounded work contracts + deterministic reconciliation |
| C0248 canonical authority identity | G5+ | Multiple production-selected artifacts can share manager/prediction lineage | Generation-bound exact candidate/peer/promotion authority key + CAS/fencing tests |
| Canonical publication authority | G5+ | Current view is latest-row based | Explicit canonical authority revision/pointer semantics + supersession/invalidation tests |
| Public cache/browser coherency | G5+ | TTL/latest content cannot prove authority | Revision-aware status/payload convergence; hard invalidation removes actionability immediately |
| End-to-end final-window latency budget | G5+ | DB/cron tails known; Edge/provider completion telemetry incomplete | Queue/start/execute/reconcile telemetry; conservative critical-path bound; overload/failure tests |
| Scheduler exclusive ownership | G3+ | 29 legacy crons remain active | Per-family ownership epoch/fencing; drain/reconcile/canary/rollback proof |
| Source coverage gaps | G6; some may block G5 depending on criticality | Press conferences/team news, independent predicted XI, congestion and transfer completeness not fully proven | Source registry marks each required family automated with authority/freshness/fallback/failure semantics or explicitly approved degraded scope |
| Exact projection completeness | G4+ | Row-count agreement can share same incomplete universe | Independently derived expected-player universe/coverage invariant |
| Control event/reducer physical design | G2+ | Conceptual contract exists only | Implemented append-only causal event/work state with deterministic rebuild tests |
| Secrets/host recovery operational proof | G2+ | Design exists; no deployed evidence | Replacement-host drill from GitHub release + Supabase durable state; secrets rotation/recovery test |

## 5. Non-blockers for beginning G1 after approval

The following unresolved items should **not** prevent an isolated foundation build:

- exact production concurrency count;
- exact final-window freeze duration;
- exact CDN provider/header policy;
- private FPL account authentication design;
- official settlement implementation;
- whether selected legacy Edge Functions remain permanent adapters;
- final multi-host topology;
- research job retirement choices.

These are later-gate decisions. Requiring all of them before writing any isolated controller/observability/replay code would create unnecessary serial dependency.

## 6. Required G1 acceptance package

Before requesting G2, G1 should produce durable evidence for:

1. reproducible Hostinger host/bootstrap definition;
2. immutable release identity and rollback;
3. no privileged secrets in browser/repository;
4. controller starts/restarts without conversation/local-state dependency;
5. synthetic event ledger/work identity/reducer replay deterministic across restart;
6. stale fencing epoch cannot commit in tests;
7. read-only public API cannot mutate control state;
8. authority revision changes independently of visible content in contract tests;
9. P0/P1/P2/P3 workload lanes can be independently throttled/paused in test environment;
10. telemetry records dispatch/start/completion/reconcile rather than dispatch-only success;
11. shadow mode has an enforceable zero-production-dispatch invariant;
12. deployment and recovery runbooks are executable.

## 7. Required G2 shadow acceptance package

Production-observing shadow should run long enough to encounter normal cadence and at least one deadline window before G3 is considered.

Required evidence:

- shadow intentions versus actual legacy scheduler events;
- false-positive/false-negative eligibility mismatches classified;
- no unauthorized writes/dispatches;
- measured production read/load impact;
- queue/start/execute/reconcile telemetry for observable work;
- deadline chronology and invalidation reconstruction;
- restart/recovery during shadow;
- stale-worker/fencing failure injection in non-production twin;
- browser/API authority-revision simulation;
- incident and degraded-state behavior.

Exact soak duration is deliberately not hard-coded until the first telemetry exists, but G5 must include multiple Gameweek deadline windows rather than a short wall-clock test.

## 8. Red-team against premature implementation

### Failure mode A — “We only need a VPS now”

Provisioning a VPS is low risk, but connecting it to production with broad write/service credentials would silently jump from G1 to G3/G5 risk.

**Rule:** G1 credentials and network paths must enforce its non-authoritative scope.

### Failure mode B — shadow controller accidentally becomes second scheduler

A shadow service that calls existing Edge/SQL functions to “verify” them may create duplicate work.

**Rule:** G2 verifies by observation/replay unless a specifically approved non-production endpoint exists.

### Failure mode C — implementation schema becomes authority before semantics stabilize

Creating event/work tables is not itself dangerous, but downstream production code must not consume them as authority during G1/G2.

**Rule:** new control-plane records remain non-authoritative until their gate explicitly promotes their role.

### Failure mode D — migration pressure collapses gates

Once Hostinger is online, there may be temptation to disable old crons quickly.

**Rule:** no family cutover without its own G3+ evidence dossier and explicit approval.

### Failure mode E — “same recommendation” hides stale lineage

A replacement calculation may render the same XI/captain while authority lineage changed.

**Rule:** authority revision/generation equality, not visible content equality, governs currentness.

### Failure mode F — current production success is mistaken for autonomy proof

Legacy jobs working most of the time does not prove retry/restart/fencing/deadline correctness.

**Rule:** autonomy gates require injected-failure and reconciliation evidence, not only happy-path production history.

## 9. Staged approval model

Recommended future approval language should be explicit:

- `APPROVE G1 ONLY` — foundation/non-production build; no production dispatch/cutover.
- `APPROVE G2 ONLY` — production-observing shadow under zero-dispatch contract.
- `APPROVE G3 FAMILY:<name>` — one low-authority family ownership cutover.
- `APPROVE G4` — projection/optimizer orchestration cutover.
- `APPROVE G5` — finalization authority cutover.
- `APPROVE G6` — full covered autonomy.

Never infer later approval from earlier approval.

## 10. Planning closure recommendation

C0273 has reached a useful stopping point for broad planning.

Recommendation:

> **Close exploratory architecture planning after this checkpoint and prepare a concise implementation specification/runbook only if the user approves G1. Do not spend further cycles inventing additional architecture layers without a newly discovered blocker.**

This is not a recommendation to deploy. It is a recommendation to stop over-engineering the planning phase.

## 11. Contradictions/open questions preserved for user review

1. Whether recommendation-only autonomy is acceptable while `CURRENT_PRIVATE_STATE` is unobservable, or whether authenticated private-state access is required before claiming personalized autonomy.
2. Exact official FPL settlement authority/field and correction window.
3. Exact final-window conservative percentile/safety margin after telemetry exists.
4. Exact G2/G3/G5 soak duration; G5 must span multiple deadline windows.
5. Whether Hostinger KVM 4 remains sufficient after measured worker/resource telemetry.
6. Whether a second worker VPS is preferable to KVM 8 if isolation pressure appears.
7. Whether selected Supabase Edge Functions remain permanent adapters or are transitional.
8. Exact canonical authority storage primitive/pointer schema.
9. Exact event-ledger hash-chain/retention policy.
10. Exact CDN/push/poll mechanism and convergence SLO.
11. C0147/C0236/C0239 final production-vs-research/diagnostic ownership classification.
12. Exact research/maintenance retirement policy.

None of these questions authorizes production behavior changes.

## 12. Decision

C0273 planning adopts a staged GO/NO-GO model.

Current state:

- **G0 Planning closure: GO**;
- **G1 Foundation build: READY FOR EXPLICIT USER APPROVAL, NOT YET AUTHORIZED**;
- **G2 Production-observing shadow: CONDITIONAL after G1 QA**;
- **G3 Low-authority production cutover: NO-GO**;
- **G4 Projection/optimizer orchestration cutover: NO-GO**;
- **G5 Finalization authority cutover: HARD NO-GO**;
- **G6 Full covered autonomy: HARD NO-GO**.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT, DEPLOY, CUT OVER, PROMOTE OR KILL ANYTHING under this checkpoint.**