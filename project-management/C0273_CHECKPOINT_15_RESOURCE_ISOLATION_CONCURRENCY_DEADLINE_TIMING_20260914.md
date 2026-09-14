# C0273 — Checkpoint 15: Resource Isolation, Concurrency Budgets & Deadline Critical-Path Timing

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Convert the earlier generic requirement for workload isolation/backpressure into an evidence-backed planning contract using current production telemetry. This batch measures only what the existing system actually records, distinguishes transport/dispatch latency from true work completion latency, red-teams the current cron topology, and defines the evidence required before any autonomous controller can receive a concurrency or final-window execution budget.

This checkpoint does **not** alter cron schedules, database settings, workers, Edge Functions, model behavior, C0234/C0237/C0248, deployment, source ingestion, or FPL account behavior.

---

## 1. Current live scheduling surface

Read-only inspection shows 29 active cron jobs in the current production database.

The schedules are heterogeneous:

- multiple 5-minute jobs;
- many 15-minute jobs;
- several hourly jobs;
- several 4-hourly refreshes;
- daily storage/retention work;
- a mixture of direct SQL work and asynchronous HTTP/Edge dispatch.

Important distinction:

> cron runtime is not automatically worker runtime.

Several jobs call `private.invoke_engine_ingest(...)` or `net.http_get(...)`. For those jobs, the cron row may finish after dispatch/request handling while the underlying Edge worker continues independently. Their 50–150 ms cron duration therefore cannot be used as finalization latency.

The controller must classify every work family as one of:

- `IN_PROCESS_SQL` — cron/function duration approximates server-side completion;
- `ASYNC_DISPATCH` — cron duration is transport/enqueue evidence only;
- `SYNC_HTTP_REQUEST` — request duration may include some remote execution, but completion contract must still be worker-specific;
- `AUTHORITY_CAS` — semantic authority transition, not generic workload;
- `READ_ONLY_DIAGNOSTIC` — noncritical to finalization authority.

No deadline budget may mix these latency classes.

---

## 2. Database resource envelope observed now

Read-only `pg_settings` evidence:

- `max_connections = 60`;
- `max_worker_processes = 6`;
- `max_parallel_workers = 2`;
- `max_parallel_workers_per_gather = 1`;
- `statement_timeout = 120000 ms`;
- `shared_buffers = 28672 * 8kB` (~224 MiB);
- `work_mem = 2184 kB`;
- `maintenance_work_mem = 32768 kB`.

These values describe the current database configuration, not a safe autonomy budget.

Critical rule:

> a configured capacity ceiling is not an admissible controller concurrency target.

Connection slots are shared with application/API traffic, cron, user traffic, Supabase internals, and other engine work. Likewise `max_worker_processes` is not a controller-worker allowance.

---

## 3. Seven-day cron timing evidence

For direct SQL-heavy jobs, recent p95 runtimes are materially nontrivial:

| Job | Runs | p50 | p95 | Max | Recent failures |
|---|---:|---:|---:|---:|---:|
| `c0239_engine_diagnostics_cache_v01` | 462 | 7.20s | 18.82s | 120.35s | 1 |
| feature snapshot refresh | 42 | 6.59s | 9.78s | 15.06s | 0 |
| C0213 lineage capture | 168 | 4.71s | 9.05s | 81.85s | 0 |
| C0213 full-pool optimizer orchestration | 672 | 4.79s | 8.32s | 105.91s | 1 |
| C0159 production fixture refresh | 672 | 5.66s | 8.29s | 120.42s | 2 |
| C0147 matchup capture | 672 | 3.41s | 8.23s | 46.44s | 0 |

These distributions contain heavy tails. Median performance alone is therefore unsafe for deadline planning.

Recent concrete failures include:

- `c0159_production_fixture_refresh`: 120.42s statement timeout;
- `football_intelligence_fpl_upcoming_snapshot`: 120.20s statement timeout;
- `c0239_engine_diagnostics_cache_v01`: 120.35s statement timeout;
- `football_intelligence_c0213_full_pool_optimizer`: job startup timeout;
- `football_intelligence_c0136_football_data`: job startup timeout;
- another C0159 run: job startup timeout.

There are also successful tail events around 40–111 seconds for optimizer/snapshot/diagnostic work.

Conclusion:

> current production already exhibits both execution-time pressure and scheduler-start pressure without an autonomous controller adding additional concurrency.

---

## 4. Observed cron overlap

Using seven days of `cron.job_run_details`, the observed peak overlapping cron executions is **8 concurrent runs**.

This number must not be interpreted as “8 is safe.” It is only evidence that the current schedule can produce at least eight overlapping cron executions.

The overlap metric is itself incomplete because:

- asynchronous Edge work may continue after its cron dispatch row closes;
- API/frontend traffic is not represented;
- Supabase internal activity is not represented;
- external provider request concurrency is not represented;
- worker CPU/memory usage is not available in this historical cron table;
- queueing before job start is visible only indirectly through startup-timeout failures.

Therefore C0273 must not adopt a global `max_concurrency=8` or any other number from this observation.

---

## 5. Transport latency must not masquerade as completion latency

Several jobs have apparent p95 cron durations below 200 ms, including availability refresh, current-player-state refresh, actual-decision sync dispatch, realized-role refresh, Understat dispatch and C0272 watch.

For `invoke_engine_ingest`/HTTP-dispatched families, this primarily measures request/dispatch overhead.

The future controller requires three separate timestamps where applicable:

1. `dispatch_requested_at`;
2. `worker_started_at` / independently proven work-start evidence;
3. `completion_proven_at` using the work-family completion invariant.

Required latency metrics:

- queue/start latency = worker start − dispatch request;
- execution latency = proven completion − worker start;
- end-to-end reconciliation latency = canonical completion/reconcile − dispatch request.

A work family without these semantics cannot receive a trusted final-window runtime budget.

---

## 6. Current final-window evidence from GW4

The strongest modern historical control chain is GW4.

Stored deadline evidence in the inspected prediction lineage is `2026-09-12 12:30:00+00` (notwithstanding the already-documented C0273 problem that legacy production derives this deadline rather than using the future required official-authority contract).

Relevant observed artifacts before that deadline include:

- prediction run 1363 at ~10:32:53 UTC;
- prediction run 1364 at ~11:00:01 UTC;
- prediction run 1365 at ~11:02:01 UTC;
- planner run 29 at ~11:16:47 UTC;
- gate run 17 at ~11:18:45 UTC;
- publication 25 at ~11:19:15 UTC, still `DECISION_NOT_READY`/contested.

No valid inference should be made that ~11:19 was a complete autonomous critical path from 11:02. These timestamps are observational artifacts from the existing architecture, not generation-bound controller stages, and other required layers may have pre-existed.

Post-deadline closure appeared much later (~16:27–16:28 UTC) and must not be interpreted as predeadline execution authority.

Planning conclusion:

> GW4 gives useful order-of-magnitude evidence, but it does not yet provide a trustworthy measured finalization critical-path distribution.

---

## 7. Proposed workload isolation classes

The future controller should reason over workload classes rather than a single queue.

### P0-A — deadline authority and commit guards

Examples:

- official deadline refresh/verification;
- generation validity checks;
- authority CAS transitions;
- canonical-public pointer commit.

Requirements:

- tiny bounded queries;
- reserved database capacity;
- never queued behind research/storage/diagnostic work;
- fail closed if commit guard cannot execute before deadline.

### P0-B — finalization compute

Examples:

- final projection refresh;
- required optimizer/planner path;
- required peer verification;
- C0234-equivalent final gate;
- C0237 publication construction.

Requirements:

- isolated priority lane;
- workload-specific concurrency caps;
- generation/fencing contract;
- final-window admission control.

### P1 — source-critical refresh

Examples:

- manager state where observable;
- availability/team news;
- current player state;
- price/fixture evidence when decision-material.

Requirements:

- deadline-aware freshness budgets;
- may preempt/defer lower-priority work near deadline.

### P2 — ordinary production refresh

Examples:

- nonurgent fixture/statistical refreshes;
- standard forward enrichments;
- routine diagnostics needed outside final window.

### P3 — research/shadow/evaluation

Must yield to all decision-critical workloads.

### P4 — storage/maintenance/backfill

Must not compete with a deadline-critical finalization window unless proven harmless.

This classification is planning only. No current cron classification/schedule is changed.

---

## 8. Concurrency budget contract

C0273 must not hard-code a universal concurrency count.

A future approved implementation should maintain at least:

- per-work-class concurrency limit;
- per-work-family concurrency limit;
- database-heavy token budget;
- external-provider token/rate budget;
- Edge/runtime token budget where measurable;
- reserved P0 capacity;
- per-GW dedupe/fencing constraint;
- global backpressure state.

Conceptually:

`admit(work) = priority_allowed AND tokens_available AND dependency_ready AND generation_current AND deadline_budget_sufficient`.

Concurrency tokens are operational controls only. They do not create semantic readiness.

---

## 9. Deadline critical-path timing model

A final-window admission decision must use an end-to-end bound, not one worker runtime.

Conceptual required budget:

`T_required = T_source_refresh + T_queue + T_projection + T_decision_stack + T_peer_verification + T_gate + T_publication + T_reconcile + T_commit_guard + T_safety_margin`.

Where work can truly run in parallel, use the critical DAG path rather than blindly summing every task. But parallelism may only be credited after dependency and resource-isolation tests prove it does not increase tail latency/failure rate.

Admission rule concept:

`remaining_official_time > conservative_bound(T_required)`

must be true before initiating a hard-invalidated replacement cycle that is intended to become current actionable authority.

If false:

- do not fabricate freshness;
- block new execution authority;
- use Checkpoint 08 fallback semantics;
- expose `NO_TRUSTWORTHY_CURRENT_DECISION` when hard-invalidated and no safe replacement can finish.

---

## 10. Which percentile may govern final-window admission?

Not resolved yet.

Current p95 SQL timings are useful diagnostic evidence but insufficient to choose a production deadline bound because:

- critical Edge worker completion latency is not comprehensively measured;
- data volume varies by GW/horizon;
- contention is nonstationary;
- failures/timeouts create censored tails;
- final-window source refresh may have external-provider variance;
- correlated tasks invalidate simple independent-percentile multiplication.

Candidates for future approval include:

- measured high-percentile end-to-end critical path plus fixed guard;
- maximum of a recent rolling tail and a historical stress bound;
- empirical worst-case from shadow-soak windows with explicit cap;
- a policy combining p99/p99.9 with deterministic timeout envelopes.

No percentile is selected in this checkpoint.

---

## 11. Final-window capacity reservation

C0273 should plan a deadline protection window in which lower-priority work may be deferred, rate-limited or denied admission.

But the exact duration is deliberately unresolved.

A future policy must derive the window from observed critical-path and resource telemetry, not a guessed “T-30/T-60” convention.

Within the protection window, conceptual behavior should be:

- reserve P0 DB/worker capacity;
- deny new P3/P4 work;
- avoid starting optional P2 work whose worst-case occupancy overlaps required P0 work;
- prioritize source-critical P1 only when it can change the active finalization generation;
- preserve result/website read availability;
- prohibit deployments/schema changes under the separate deployment-freeze contract.

---

## 12. Scheduler collision red-team

### Finding 1 — minute-based cron staggering is not isolation

Current jobs are often offset at minutes such as :03, :07, :12, :14, :17, :18, etc. Heavy-tail durations can cross those boundaries, and asynchronous work can outlive dispatch.

**Rule:** temporal staggering is helpful but cannot substitute for explicit admission/backpressure.

### Finding 2 — startup timeout is evidence of scheduler pressure

Recent `job startup timeout` failures occurred for optimizer/ingestion and fixture refresh jobs.

**Rule:** future autonomy must treat start/queue latency as first-class, not only function runtime.

### Finding 3 — statement timeout converts overload into semantic ambiguity

A 120-second database timeout may leave partial or ambiguous work depending on the worker transaction structure.

**Rule:** timeout must route through the work-family reconciliation contract from Checkpoints 10–12.

### Finding 4 — diagnostics can become production competitors

C0239 diagnostics has p95 ~18.8s and historical 120s timeout behavior.

**Rule:** a task being “diagnostic” does not mean it is cheap. Priority and resource class must reflect measured cost.

### Finding 5 — the optimizer cron entry is orchestration, not necessarily compute duration

Its DB duration includes orchestration logic and may dispatch other work; its timing cannot be treated as full optimizer end-to-end latency without exact worker evidence.

### Finding 6 — Edge and database bottlenecks can be different

Protecting Postgres alone is insufficient if Edge/runtime/external-provider capacity is saturated.

**Rule:** isolation budgets must be multi-resource.

---

## 13. Minimum telemetry required before implementation approval

For every P0/P1 dispatchable work family:

- semantic work key;
- dispatch timestamp;
- worker start timestamp or start evidence;
- completion-proven timestamp;
- reconcile/canonical timestamp;
- success/failure/timeout disposition;
- generation vector;
- fencing epoch;
- input/output row counts where material;
- DB query/runtime bucket if available;
- external provider latency/status where applicable;
- retry count;
- concurrency observed at dispatch/start;
- deadline remaining at dispatch and completion;
- whether lower-priority work overlapped.

Without these metrics, a “safe concurrency budget” would be guesswork.

---

## 14. Future measurement tests

Read-only/shadow testing after implementation approval should determine:

1. baseline end-to-end latency per P0 work family;
2. latency under one competing P2 SQL-heavy job;
3. latency under multiple P2/P3 jobs;
4. queue/start latency under cron collision;
5. latency after stale-generation invalidation and recompute;
6. behavior when one task reaches statement timeout;
7. behavior when a worker succeeds but dispatch caller times out;
8. resource use for two overlapping GWs;
9. finalization with optional research disabled vs enabled;
10. finalization under deliberately injected source/provider latency;
11. canonical commit latency at the official-deadline boundary;
12. public API/read latency during finalization.

No destructive load test should run against production merely to satisfy this planning program.

---

## 15. Initial planning policy — conservative, not numeric

Until completion telemetry exists, C0273 should assume:

- database-heavy P0 work is scarce-resource work;
- no blind fan-out of finalization workers;
- at most one authority transition writer per semantic authority/GW;
- same-semantic-work duplicates are fenced/deduped, not used for throughput;
- optional research/maintenance yields during finalization;
- asynchronous dispatch does not count as completion;
- observed p50/p95 transport latency is not a deadline guarantee;
- hard invalidation near deadline uses fail-closed fallback if conservative completion cannot be proven.

This is a contract stance, not an implementation configuration.

---

## 16. Contradictions / unresolved questions preserved for review

1. **Exact final-window protection duration:** unresolved until end-to-end shadow timing exists.
2. **Exact per-class concurrency counts:** unresolved; current peak overlap of 8 is not a safe-budget proof.
3. **Database vs Edge bottleneck:** Edge/runtime historical completion telemetry is incomplete.
4. **C0213/C0248 real compute duration:** DB orchestration timestamps do not by themselves prove downstream worker completion duration.
5. **Provider rate budgets:** current planning does not yet contain complete verified provider quotas/latency distributions.
6. **Public website capacity reservation:** exact API/cache serving architecture remains open.
7. **Whether P2 work should be paused globally or only token-limited inside final window:** open.
8. **Use of statement_timeout:** existing 120s setting is evidence only; no recommendation to alter it is authorized here.
9. **Admission percentile:** p95 is not accepted as sufficient; final percentile/guard policy remains open.
10. **Cross-GW resource reservation:** independent lifecycle state does not imply unlimited simultaneous finalization compute.
11. **Official deadline source migration:** resource timing must ultimately bind to the official deadline generation contract, not current derived legacy deadline lineage.
12. **Private manager state:** a perfectly timed pipeline still cannot manufacture observability of manual predeadline transfers.

---

## 17. Acceptance criteria for this planning batch

PASS if this checkpoint establishes that:

- cron transport latency and true work completion latency are separated;
- current resource ceilings are not mistaken for safe controller budgets;
- current tail/timeout evidence is documented;
- workload isolation classes and capacity-reservation semantics are explicit;
- deadline admission is defined as a critical-DAG timing problem;
- no unsupported numeric concurrency/deadline margin is invented;
- unresolved questions remain visible;
- no production behavior is changed.

Status: **PASS — PLANNING CONTRACT ONLY**.

---

## 18. Next bounded planning batch

Recommended next batch:

**Public API / website freshness, cache coherency and failure-surface contract.**

Reason: Checkpoints 08–15 now define semantic publication authority and resource/deadline behavior, but the V3 product must prove that stale caches/CDN/API responses cannot display a superseded or hard-invalidated recommendation as current, especially during failover and final-window recomputation.

That batch should specify:

- versioned status/data API semantics;
- authority-generation ETags/version keys;
- cache invalidation/freshness rules;
- stale-if-error behavior by publication state;
- website degraded/no-current-decision rendering;
- consistency between status endpoint and plan payload;
- rollback behavior independent of V2;
- digital-twin tests for cache lag and split-brain API reads.

---

## Explicit non-changes

This checkpoint made no change to:

- cron schedules or enablement;
- database configuration;
- SQL functions/procedures;
- schema/indexes;
- Edge Functions;
- workers or ingestion;
- model/optimizer logic;
- C0234/C0237/C0248 behavior;
- production/shadow promotion state;
- frontend/API runtime;
- deployments;
- historical forecasts;
- FPL account state.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT YET.**