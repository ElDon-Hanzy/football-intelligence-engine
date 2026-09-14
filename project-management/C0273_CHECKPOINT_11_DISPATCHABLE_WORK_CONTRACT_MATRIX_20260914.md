# C0273 — Checkpoint 11: Dispatchable Work Contract Matrix

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define which existing Football Intelligence Engine work families may eventually be invoked by an autonomous controller, which require reconciliation or wrappers first, and which must remain outside autonomous dispatch until their contracts are repaired.

This checkpoint is deliberately bounded to the P0/P1 Gameweek intelligence → optimizer → gate → publication → actual/result chain plus closely coupled supporting jobs. It is not a claim that every existing Edge Function or maintenance job has been fully audited.

No code, SQL schema, cron, Edge Function, model, website, source, deployment, shadow promotion/kill, or FPL-account behavior is changed by this document.

---

## 1. Re-read baseline

This checkpoint extends C0273 Checkpoints 01–10, especially:

- retry/idempotency audit;
- source-readiness contract;
- deadline-authority contract;
- manager-state autonomy contract;
- result-settlement contract;
- independent semantic generations;
- publication supersession/fallback;
- orthogonal Gameweek lifecycle planes;
- controller event-ledger + deterministic reconciliation contract.

Inherited hard rules remain unchanged:

1. production changes require explicit human approval;
2. controller dispatch must never bypass C0234-equivalent final authority;
3. work identity != HTTP attempt != durable run marker != complete output != canonical authority;
4. official FPL deadline must become the sole final deadline authority before autonomous finalization;
5. historical evidence remains append-only;
6. recommendation != manager account state != actual submitted state != realized result;
7. ambiguous outcomes require reconcile-before-retry;
8. a stale worker may finish diagnostically but may not commit canonical authority.

---

## 2. Live architecture evidence checked in this batch

Read-only production inspection on 2026-09-14 confirmed the active scheduled FPL/decision surface currently includes:

- `sync-fpl-data` every four hours;
- `refresh-availability-intelligence` every four hours;
- `refresh-current-player-state` every four hours;
- `sync-gw-results` every fifteen minutes;
- `sync-fpl-actual-decision` every fifteen minutes offset;
- `private.c0217_projection_horizon_cycle_v01()` every fifteen minutes;
- `private.c0213_p2_orchestrate_optimizer_v01(null,3)` every fifteen minutes offset;
- `private.capture_c0213_p2_lineage_v01(null)` hourly;
- `private.c0272_final_promotion_watch_v01()` every five minutes;
- correct-score cache refresh every fifteen minutes;
- diagnostics-cache refresh every fifteen minutes;
- storage/retention jobs on slower cadences.

The generic `private.invoke_engine_ingest(...)` allowlist can dispatch many Edge Functions, including the relevant production families:

- availability/current-player-state refresh;
- manager-state and actual-decision sync;
- full-pool optimizer;
- squad/structural/forward/OR/red-team layers;
- autonomous gate;
- sequential planner;
- several data/source ingestion families.

### Critical observation

`invoke_engine_ingest` returns a `net.http_post` request ID. That request ID is **attempt/transport evidence only**. It does not prove:

- the worker started;
- the worker completed;
- all expected rows were written;
- the output matches the intended semantic work key;
- the output is current for the intended generations;
- the output is canonical.

The future controller therefore must never treat `request_id` or HTTP 200 alone as a completion invariant.

---

## 3. Readiness classifications

Every future dispatchable work family must have exactly one current contract class.

### `READY_BY_CONTRACT`
Existing semantics are already sufficiently deterministic for eventual controller dispatch **once generic controller fencing/generation/deadline wrappers exist**. This does not mean implementation is authorized now.

### `RECONCILE_REQUIRED`
The worker can remain useful, but ambiguity/partial/concurrent outcomes require a domain-specific completion query and reconcile-before-retry procedure.

### `WRAPPER_REQUIRED`
The worker's domain behavior can be retained, but its current interface does not expose the work identity, generation/fence binding, deadline authority, or canonical commit contract needed by autonomy.

### `NOT_AUTONOMY_READY`
The current worker violates a hard autonomy contract or combines unsafe authority boundaries. It must not be directly dispatched by the future controller until redesigned/repaired and separately approved.

### `READ_ONLY_ONLY`
Useful for diagnostics/materialized telemetry but should not drive semantic control-plane transitions or be treated as an authoritative mutating work item.

A worker may move between classes only through a separately documented, approval-gated change.

---

## 4. P0/P1 dispatchable-work contract matrix

| Work family / current entrypoint | Current role | Classification | Minimum completion invariant | Main blocker / required contract |
|---|---|---|---|---|
| `sync-fpl-data` | Official FPL dimensions + price/history observation | `RECONCILE_REQUIRED` | targeted bootstrap/source observation persisted; required dimension rows normalized; append observations attributable to one semantic source revision/window | observation-append behavior means invocation is not idempotent; distinguish harmless duplicate observation from incomplete semantic sync |
| `refresh-availability-intelligence` | Availability/injury/suspension evidence | `READY_BY_CONTRACT` candidate | all targeted player observations for requested GW/source revision persisted or deterministically proven already present by semantic observation hash | still needs generic work key, generation/fence binding, freshness budget and source-readiness transition wrapper |
| `refresh-current-player-state` | Current xMins/start probability/state synthesis | `RECONCILE_REQUIRED` | complete expected player-state coverage for target generation; semantic duplicate detection; no conflicting current rows for same semantic state | latest-state equality is application-level while persistence is timestamp-oriented; concurrent/partial retries can duplicate semantic states |
| `sync-fpl-manager-state` | Manager squad/bank/FT/purchase economics baseline | `NOT_AUTONOMY_READY` for private-current authority; `WRAPPER_REQUIRED` for opening/public baseline | exact 15-player state + bank + FT + chip lane + 15/15 purchase/selling-value provenance + visibility class + generation | public unauthenticated data cannot generally prove manual current-GW private transfers; must never claim `CURRENT_PRIVATE_STATE` unless observed through an approved authority |
| `c0217_projection_horizon_cycle_v01` | Projection cadence/snapshot orchestration | `NOT_AUTONOMY_READY` | per target GW, requested projection artifact satisfies exact source/deadline/generation lineage and immutable freeze contract | derives deadline as first kickoff − 90m; also mixes cadence selection and generator calls; official-deadline contract not yet implemented |
| predeadline projection/snapshot generators (`c0235` / upcoming snapshot chain) | Freeze forecast inputs/outputs | `WRAPPER_REQUIRED` | one complete immutable prediction run for exact work key/generation; expected child predictions complete; official deadline commit guard passes | deadline/generation/fence binding and child-completeness query must be explicit; historical rows cannot be rewritten |
| `c0213_p2_orchestrate_optimizer_v01` | Readiness + optimizer dispatch | `RECONCILE_REQUIRED` and eventual decomposition preferred | optimizer output for exact input signature/manager state/prediction lineage exists and passes expected output integrity | calls C0217 internally, uses request/HTTP-age heuristics, and conflates readiness/cadence/dispatch; controller should not infer completion from recent request |
| `fpl-full-pool-optimizer` | Full-pool squad/path optimization | `RECONCILE_REQUIRED` | complete optimizer run for exact stable signature, manager-state generation, prediction lineage, policy/config; legal 15-man squad and required scenarios present | exact domain completion invariant/canonicalization required around async Edge Function invocation |
| downstream decision layers: ensemble / structural / forward / OR / red-team | Evaluate candidate plan through mandatory layers | `WRAPPER_REQUIRED` as individual bounded workers | expected run for exact upstream candidate + generation + policy lineage exists; declared status/result payload complete | each must expose stable work key and exact consumed lineage; orchestration must not use “latest row” implicitly |
| `fpl-sequential-planner` / C0248 candidate evaluation | Sequential multi-GW decision path | `RECONCILE_REQUIRED` | deterministic run exists for exact prediction IDs, manager state, horizon, beam/config signature; candidate structure complete | stable signature is strong, but simultaneous equal work/unique conflict and peer-beam reconciliation require explicit handling |
| `c0248_promote_verified_candidate_v01` | Promote verified planner candidate into production-selected path | `NOT_AUTONOMY_READY` as generic worker until promotion policy is explicitly generation/fence-bound | candidate + peer verification + exact current generation vector + single production-selected canonical run proven atomically | semantic promotion is a high-authority transition, not an ordinary retryable job; stale candidate must never promote after invalidation |
| `fpl-autonomous-gate` / C0234 | Final autonomous decision authorization | `WRAPPER_REQUIRED` | gate run for exact selected planner/decision lineage exists; all hard gates evaluated; commit-time official-deadline and generation checks pass | current deadline authority remains derived in live implementation; must be sole final authorization boundary and fail closed |
| `c0237_publish_current_fpl_plan_v01` | Append immutable publication artifact | `WRAPPER_REQUIRED` | publication row for exact authorized decision lineage exists, input signature unique, publication-generation commit guards pass | append-only is strong, but current canonical authority cannot be “latest inserted”; generation-valid canonical pointer/supersession contract needed |
| `c0272_final_promotion_watch_v01` | Current five-minute final-window orchestrator | `NOT_AUTONOMY_READY` as one controller work item | N/A as monolith — must be decomposed into separately reconciled planner, verification/promotion, gate and publication steps | uses prediction `deadline_at`; can dispatch planner, promote production, request gate, and publish in one routine; boundaries are too broad for deterministic recovery |
| `sync-fpl-actual-decision` | Capture locked actual FPL submission | `RECONCILE_REQUIRED` | one canonical actual-submission artifact for `(entry, season, GW, official-deadline generation)` with exact 15 picks/captain/vice/chip and postdeadline authority proven | official deadline use is strong, but first-write race is application-level rather than DB-unique; reconcile concurrent captures |
| `sync-gw-results` | Fixture/player realized-result ingestion | `NOT_AUTONOMY_READY` for blind retry; `RECONCILE_REQUIRED` after repair contract | result parent + all expected player/fixture children complete for exact payload/source revision; no partial parent accepted; settlement is separate | known partial-parent/equal-payload short-circuit can suppress repair; `is_final` currently conflates fixture completion with official scoring settlement |
| settlement evaluator (future explicit authority) | Establish official settled scoring generation | `NOT_AUTONOMY_READY` / authority not yet proven | current official FPL Gameweek-finality criterion observed + complete result generation; correction supersession handled | exact 2026/27 official finality field/transition still unresolved |
| `capture_c0213_p2_lineage_v01` | Snapshot diagnostic lineage | `READ_ONLY_ONLY` for controller authority | row persisted if requested; snapshot can be compared to semantic source state | append-only snapshot is useful telemetry but must not manufacture readiness or canonical authority |
| correct-score price cache refresh | Derived UI/diagnostic cache | `READ_ONLY_ONLY` for control plane | cache represents current source inputs according to cache contract | cache freshness is not decision authority unless a consuming production contract explicitly binds it |
| diagnostics-status cache refresh | Materialized diagnostics cache | `READ_ONLY_ONLY` | cache row reflects deterministic diagnostic status at capture time | operational/UI cache must not become semantic source/gate authority |
| storage/retention jobs | Capacity/maintenance | outside semantic dispatch DAG | job-specific maintenance success | must be workload-isolated and never become prerequisite for FPL decision correctness |

---

## 5. Strongest near-term candidate: availability refresh

`refresh-availability-intelligence` remains the closest current worker to `READY_BY_CONTRACT` because prior live audit showed semantic observations keyed by observation hash, making duplicate semantic writes naturally suppressible/repairable.

However, **no worker is approved for autonomous controller dispatch by this document**.

Even the availability worker still needs generic control-plane wrapping for:

- stable work key;
- target source/readiness generation;
- current fencing epoch;
- declared freshness budget;
- queryable expected coverage;
- stale completion rejection;
- event-ledger reconciliation disposition.

Thus `READY_BY_CONTRACT` means “domain behavior is compatible with the future contract,” not “turn autonomy on.”

---

## 6. `invoke_engine_ingest` contract: transport, not orchestration truth

The current helper provides useful centralized authenticated dispatch to an Edge Function allowlist.

It must remain conceptually below the future controller contract.

### It can prove

- an HTTP request was enqueued/issued;
- target endpoint name was allowlisted;
- an engine admin token was used by the server-side helper;
- a transport request ID exists.

### It cannot prove

- work-key identity;
- semantic deduplication;
- completion;
- partial-output absence;
- output/current-generation match;
- fencing ownership at commit;
- official-deadline validity at commit;
- canonical authority.

### Planning rule

Future controller pseudocode must look conceptually like:

`dispatch(work contract) → transport request → observe domain output → reconcile completion invariant → validate generations/fence/deadline → canonical transition`

and never:

`HTTP 200/request ID → success → advance state`.

---

## 7. Compound-orchestrator red-team

### `c0213_p2_orchestrate_optimizer_v01`

The function currently:

1. captures pending optimizer state;
2. invokes the C0217 projection cadence controller;
3. computes readiness;
4. checks recent HTTP requests;
5. dispatches optimizer work.

This is operationally convenient under cron, but a future deterministic controller should separate:

- projection readiness/cadence reconciliation;
- optimizer readiness decision;
- optimizer dispatch;
- optimizer completion reconciliation.

The current 10-minute recent-request heuristic is anti-duplication telemetry, not a proof of semantic completion.

### `c0272_final_promotion_watch_v01`

The current function can, depending on observed state:

- request primary sequential planner beam;
- request cross-beam peer;
- call production promotion;
- request autonomous gate;
- call C0237 publication.

It also uses `gameweek_prediction_runs.deadline_at`, which earlier C0273 audit proved currently inherits a derived kickoff-minus-90 authority.

### Planning conclusion

C0272 is a valuable description of the intended finalization sequence, but **must not become one opaque controller work item**.

Future controller decomposition should preserve these semantic steps separately:

1. `ENSURE_FINAL_PROJECTION_CURRENT`
2. `ENSURE_PRIMARY_PLANNER_CANDIDATE`
3. `ENSURE_CROSS_BEAM_VERIFICATION`
4. `AUTHORIZE_PRODUCTION_SELECTION`
5. `ENSURE_FINAL_GATE_CURRENT`
6. `AUTHORIZE_PUBLICATION`
7. `SELECT_CANONICAL_PUBLICATION`

Each step receives its own work identity/completion invariant and may fail/reconcile independently.

---

## 8. Promotion is categorically different from computation

A recurring mistake in automation design is treating “generate candidate” and “promote candidate to authority” as equivalent jobs.

C0273 rejects that.

### Computational work
Examples:

- refresh evidence;
- generate projection;
- optimize squad;
- run red-team;
- evaluate planner candidate.

These may often be safely repeated/reconciled under the same semantic work key.

### Authority-changing work
Examples:

- advance semantic generation;
- choose production-selected C0248 path;
- authorize final decision;
- select canonical publication;
- record settled result authority.

These require stronger compare-and-swap semantics, generation equality, current fencing epoch and commit-time policy checks.

**Promotion/authority-changing actions must never be retried blindly merely because a transport call timed out.**

---

## 9. Required future Worker Contract Registry

Before any controller implementation is approved, every `READY_BY_CONTRACT`, `RECONCILE_REQUIRED` or `WRAPPER_REQUIRED` worker must have a versioned registry record containing conceptually:

- `worker_key`;
- `worker_version`;
- `semantic_purpose`;
- `side_effect_class` (`OBSERVATION_APPEND`, `DERIVED_APPEND`, `UPSERT_CACHE`, `AUTHORITY_TRANSITION`, etc.);
- stable work-key function;
- accepted request schema/version;
- required generation axes;
- required evidence component hashes;
- deadline sensitivity;
- fencing requirement;
- expected output identities;
- completion invariant query;
- semantic equality function;
- partial-output detector;
- retry class;
- repair/reconcile procedure;
- conflict canonicalization rule;
- supersession behavior;
- timeout behavior;
- maximum safe concurrency / resource class;
- event-ledger event families emitted;
- whether controller may dispatch while `RUN`, `DRAIN`, `PAUSE`, or `EMERGENCY_BLOCKED`;
- approval/version history.

The physical registry representation remains intentionally unresolved.

---

## 10. Retry classes proposed for the registry

Avoid one generic boolean `idempotent` flag. Use a richer class:

### `PURE_RECOMPUTE`
No durable side effect until atomic commit; same inputs produce semantically equivalent output.

### `IDEMPOTENT_SEMANTIC_UPSERT`
Repeated work converges to one semantic output under enforced key/constraint.

### `APPEND_OBSERVATION_DEDUPABLE`
Multiple observations may exist but semantic duplicate detection prevents false generation churn.

### `RECONCILE_BEFORE_RETRY`
A prior attempt may have created partial/complete output; query first.

### `REPAIR_IN_PLACE_BY_CONTRACT`
Partial output can be deterministically completed under same work identity.

### `NEW_GENERATION_ON_REPAIR`
Partial/invalid prior effects cannot be continued safely; supersede with a new generation/work identity.

### `AUTHORITY_CAS_ONLY`
Changes canonical authority; allowed only through compare-and-swap style current-generation/fence checks. Blind retry forbidden.

### `NEVER_AUTONOMOUS`
Human/approval boundary or unobservable external/private state makes automatic dispatch inappropriate.

---

## 11. Digital-twin tests added by this batch

Future implementation cannot receive approval until replay/digital-twin testing proves at least:

1. HTTP request accepted but worker never starts → controller does not mark complete;
2. worker completes but HTTP response is lost → reconciliation finds existing output and does not duplicate semantic work;
3. worker writes only parent/partial rows then crashes → completion invariant fails;
4. same Edge Function is dispatched twice concurrently → deterministic reconciliation/canonicalization;
5. manager-state changes while optimizer is running → optimizer output preserved diagnostically but cannot become current decision input;
6. deadline generation changes during final planner/gate work → all stale authority transitions rejected at commit;
7. C0248 candidate exists but peer verification belongs to different manager/projection lineage → promotion rejected;
8. production promotion succeeds but caller times out → reconcile authority state before any retry;
9. gate result exists for older production planner → publication cannot use it;
10. C0237 publication row is inserted but source generations invalidate immediately → row remains history but canonical authority withdrawn;
11. actual-decision capture races in two workers → one semantic actual-submission authority selected without contradictory duplicates;
12. result parent exists with missing child rows → result work remains incomplete and repair/retry follows worker contract;
13. diagnostics/cache refresh fails → semantic decision lifecycle does not fail merely because a display cache is stale;
14. storage-retention task is slow → FPL finalization work remains resource-isolated;
15. controller restart with multiple outstanding transport request IDs → all are reconciled through domain completion invariants rather than replayed blindly.

---

## 12. Contradictions and open questions preserved for user review

### A. Should C0213/C0272 remain as compatibility orchestrators after controller introduction?

Two plausible designs remain:

1. controller calls their decomposed underlying steps and old orchestrators remain cron/fallback only;
2. refactor orchestrators into thin policy wrappers that themselves obey controller work contracts.

No choice is approved yet.

### B. How much uniqueness belongs in database constraints versus controller registry logic?

Database uniqueness/CAS is safer for authority transitions, but retrofitting strong constraints onto append-heavy historical tables can have migration/compatibility impact. Needs per-table design.

### C. Exact output completeness for model/optimizer layers

Several workers expose rich run rows, but exact child/cardinality invariants still need worker-by-worker proof before implementation. “Run row exists” is rejected as a generic rule.

### D. Private manager state remains an external observability boundary

No dispatch contract can manufacture knowledge of private manual transfers. Recommendation-only autonomy can fail closed/degrade; account-operation autonomy requires a separately approved private-state/execution authority.

### E. Official result settlement authority remains unresolved

`sync-gw-results` can ingest observations, but the exact official 2026/27 FPL event-finality signal still needs proof.

### F. Resource classes/concurrency limits remain unmeasured

No safe controller concurrency numbers are authorized yet. Workload-isolation measurement remains P0 before dispatch.

### G. Should cache/diagnostic jobs remain independent cron jobs?

Probably yes unless they become semantic prerequisites. Their failure should not create hidden coupling to the decision critical path. Final architecture remains open.

### H. Deadline-window time budgets remain unmeasured

The controller needs empirically measured p95/p99 worker durations before deciding when a final recomputation can still finish safely. No guessed margin is approved.

---

## 13. Updated implementation blockers

C0273 still recommends **DO NOT IMPLEMENT YET**.

Before controller implementation approval, remaining P0 items include at least:

1. define exact worker completion invariants for every P0 worker in this matrix;
2. repair/redesign result-sync partial-completion semantics;
3. implement, after approval, official-deadline authority through projection/gate/finalization paths;
4. decide manager-state private observability policy;
5. prove official FPL result-settlement authority;
6. define production-selection and canonical-publication compare-and-swap contracts;
7. measure resource/concurrency budgets and final-window run-time distributions;
8. finalize source coverage for late qualitative team news and congestion;
9. finalize event-ledger/reducer physical design;
10. execute read-only digital-twin/replay soak before any production dispatch authority;
11. decide operational SEV0/SEV1 alert channel;
12. obtain explicit user approval for implementation after the planning package is reviewed.

---

## 14. Next bounded planning batch

Highest-value next batch:

**P0 completion-invariant specification for the critical finalization chain**, limited to:

1. final projection;
2. C0248 primary/peer planner outputs;
3. production-selection authority;
4. C0234 gate;
5. C0237 publication;
6. actual-submission capture;
7. result observation.

For each, specify the exact read-only SQL/evidence proof that distinguishes:

- absent;
- partial;
- complete-current;
- complete-stale;
- conflicting;
- superseded.

That will turn this matrix from classification into executable future reconciliation contracts without implementing them.

---

## 15. Explicit non-changes

This checkpoint has not:

- changed any SQL function or table;
- added any migration/constraint/index/trigger;
- changed any Edge Function;
- changed any cron schedule;
- dispatched any engine worker as part of planning;
- changed official-deadline behavior;
- changed manager state;
- changed a forecast/model/optimizer output;
- promoted or killed any shadow model;
- selected/promoted a production planner candidate;
- changed C0234/C0237 behavior;
- changed the website;
- deployed anything;
- executed any FPL-account action.

All production changes remain **explicitly approval-gated**.
