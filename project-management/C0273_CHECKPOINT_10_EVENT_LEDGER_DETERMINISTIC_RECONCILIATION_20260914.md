# C0273 — Checkpoint 10: Controller Event Ledger & Deterministic Reconciliation Contract

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define the future controller's immutable causal event ledger and deterministic reconciliation contract so a crash, timeout, retry, controller failover, split-brain episode, or ambiguous database outcome can be recovered without guessing, replaying unsafe side effects, or allowing stale work to become canonical.

This checkpoint is planning/documentation only. It does **not** authorize schema changes, SQL migrations, Edge Function changes, cron changes, model changes, source-provider changes, frontend changes, deployment, shadow promotion/kill, or any FPL-account action.

---

## 1. Re-read baseline

This checkpoint extends the C0273 chain through Checkpoint 09.

Relevant inherited decisions:

- orthogonal lifecycle planes rather than one global Gameweek state;
- independent semantic generations rather than one global generation;
- fencing/control epoch distinct from semantic generation;
- reconcile-before-retry for ambiguous work;
- canonical publication authority must be explicit and must not mean newest inserted row;
- official FPL deadline is the sole final timing authority;
- hard invalidation immediately removes actionable-current authority;
- historical evidence stays immutable/append-only;
- recommendation != account state != actual submission != realized result;
- production changes remain approval-gated.

---

## 2. Live architecture evidence checked for this batch

Read-only Supabase inspection on 2026-09-14 confirms C0273 remains:

- `Open`;
- `Planned`;
- `P0`;
- phase `Autonomous Website Planning`;
- `model_effect = None. Planning/documentation only; zero runtime/model effect.`

Existing database evidence includes several narrow audit/run structures, notably:

- `public.c0162_fact_refresh_events`;
- `public.c0167_audit_events`;
- `public.source_sync_runs`;
- `public.gameweek_audit_summaries`;
- many worker-specific `*_runs` tables.

The inspected general-purpose/narrow audit tables have useful telemetry fields, for example:

- Gameweek;
- timestamps;
- success/status;
- JSON detail/metadata;
- inserted/updated counts;
- optional errors/result-run IDs.

However, the inspected tables do **not** collectively provide a controller-grade causal ledger contract. In particular, no common inspected structure proves all of:

- globally/stably identifiable controller event identity;
- causal parent event;
- correlation/work key;
- event type/version;
- lifecycle plane;
- before/after state version;
- semantic generation vector;
- fencing/control epoch;
- immutable input lineage hash;
- completion invariant identity;
- provider source revision/effective time;
- deterministic replay ordering;
- canonicalization consequence;
- supersession target;
- reconcile disposition.

The inspected narrow audit tables also have only ordinary primary/index structures; no mutation-blocking triggers were found on `c0162_fact_refresh_events`, `c0167_audit_events`, or `source_sync_runs` in this read-only audit.

### Planning conclusion

Existing audit/run tables remain valuable **source evidence and diagnostics**. They must not be silently reinterpreted as the future authoritative controller event ledger merely because they contain timestamps/status JSON.

---

## 3. Core architectural decision

The future controller needs two distinct concepts:

### A. Domain/source evidence

Facts produced by existing systems and providers, for example:

- official deadline observation;
- player availability observation;
- manager-state observation;
- optimizer run;
- C0234 gate run;
- C0237 publication row;
- actual locked squad capture;
- result observation;
- settlement evidence;
- source-sync telemetry.

These remain in their domain-specific stores where appropriate.

### B. Controller causal events

An immutable append-only record of **what the control plane observed, decided, dispatched, reconciled, committed, invalidated, superseded, blocked, or recovered**, with pointers/hashes to the underlying domain evidence.

The controller ledger does not duplicate every domain payload. It records the minimal causal facts necessary to reconstruct control state deterministically.

### Rule

`domain evidence != controller event != materialized lifecycle state`

The event ledger records causality. Materialized state is a deterministic projection of accepted events plus current domain authorities.

---

## 4. Event-sourcing boundary: not full-database event sourcing

C0273 should **not** event-source the entire Football Intelligence Engine.

Rejected design:

- convert every existing table/update into a universal event stream;
- rebuild all model outputs exclusively from the controller ledger;
- make the ledger the data warehouse.

That would create unnecessary migration risk and couple autonomy to a large rewrite.

### Approved planning direction

Event-source only the **control-plane decisions/transitions and their causal references**.

Existing model/source/result tables remain authoritative for their own domain payloads unless a later approved migration changes that contract.

---

## 5. Proposed P0 controller event envelope

Every future control event should conceptually contain at least:

```json
{
  "event_id": "stable-unique-id",
  "event_type": "WORK_COMPLETION_RECONCILED",
  "event_schema_version": 1,
  "season": "2026/27",
  "gameweek": 5,
  "plane": "PLANNING_DECISION",
  "aggregate_key": "2026/27:GW5",
  "correlation_id": "finalization-cycle-or-request-id",
  "causation_event_id": "parent-event-id-or-null",
  "work_key": "stable-semantic-work-identity-or-null",
  "actor": "SYSTEM_RECONCILER",
  "actor_instance": "controller-instance-id",
  "control_epoch": 42,
  "observed_at": "...",
  "known_at": "...",
  "effective_at": "...",
  "source_revision": "provider-specific-revision-or-null",
  "state_version_before": 17,
  "state_version_after": 18,
  "generation_vector_hash": "...",
  "generation_vector": {
    "deadline_generation": 3,
    "manager_state_generation": 4,
    "availability_generation": 19,
    "role_xmins_generation": 15,
    "projection_generation": 8,
    "decision_generation": 5
  },
  "input_lineage_hash": "...",
  "evidence_refs": ["table:id-or-content-hash"],
  "reason_code": "COMPLETION_INVARIANT_PROVEN",
  "payload_hash": "...",
  "policy_version": "...",
  "materiality_policy_version": "..."
}
```

Exact physical schema is intentionally **not authorized or finalized** in C0273 planning.

---

## 6. Event identity contract

`event_id` must identify one durable causal fact, not one HTTP attempt.

### Required distinction

- **attempt identity** — a process/RPC invocation;
- **work identity** — semantic unit intended to be completed;
- **event identity** — durable statement that something happened/was concluded;
- **artifact identity** — produced domain output;
- **canonical authority** — current selected artifact/state.

A retry after timeout may have a new attempt ID but the same `work_key`.

If reconciliation proves the original attempt already completed, the retry records a reconciliation event rather than manufacturing a second semantic completion.

---

## 7. Required P0 event families

The exact names may evolve, but the following semantic families are required.

### Source/evidence events

- `AUTHORITY_OBSERVED`
- `AUTHORITY_CHANGED`
- `SOURCE_READY`
- `SOURCE_DEGRADED`
- `SOURCE_RECOVERED`
- `MATERIAL_FACT_CHANGED`
- `HARD_INVALIDATION_RAISED`

### Work scheduling/control events

- `WORK_ENQUEUED`
- `WORK_CLAIMED`
- `LEASE_RENEWED`
- `WORK_STARTED`
- `WORK_COMPLETED_OBSERVED`
- `WORK_FAILED_OBSERVED`
- `WORK_ABANDONED`
- `WORK_SUPERSEDED`

### Reconciliation events

- `RECONCILIATION_STARTED`
- `COMPLETION_INVARIANT_PROVEN`
- `COMPLETION_INVARIANT_FAILED`
- `AMBIGUOUS_OUTCOME_DETECTED`
- `OUTPUT_ALREADY_EXISTS`
- `OUTPUT_PARTIAL_DETECTED`
- `REPAIR_REQUIRED`
- `RETRY_SAFE`
- `RETRY_FORBIDDEN`
- `STALE_COMPLETION_REJECTED`

### Lifecycle events

- `PLANE_TRANSITION_PROPOSED`
- `PLANE_TRANSITION_COMMITTED`
- `PLANE_TRANSITION_REJECTED`
- `GENERATION_ADVANCED`
- `CANONICAL_AUTHORITY_SELECTED`
- `CANONICAL_AUTHORITY_WITHDRAWN`
- `ARTIFACT_SUPERSEDED`
- `INTEGRITY_REVOCATION_RECORDED`

### Operational-control events

- `OPERATION_MODE_CHANGED`
- `PAUSE_REQUESTED`
- `DRAIN_REQUESTED`
- `EMERGENCY_BLOCKED_ENTERED`
- `EMERGENCY_BLOCKED_CLEARED`

Operational commands may restrict work but can never create semantic readiness or bypass C0234-equivalent authority.

---

## 8. Causation and correlation rules

Every event must support forensic reconstruction of **why** it exists.

### `causation_event_id`
Points to the immediate event that caused this event when applicable.

Example:

`AUTHORITY_CHANGED(deadline)`
→ `HARD_INVALIDATION_RAISED`
→ `PLANE_TRANSITION_COMMITTED(DECISION_INVALIDATED)`
→ `CANONICAL_AUTHORITY_WITHDRAWN(publication)`
→ `WORK_ENQUEUED(replacement finalization)`

### `correlation_id`
Groups a higher-level business/control episode, for example:

- one finalization generation;
- one source reconciliation cycle;
- one result settlement correction;
- one controller recovery/failover episode.

Correlation must not be used as authorization; it is traceability metadata.

---

## 9. Ordering model: never depend only on wall-clock timestamps

Timestamps alone are insufficient for deterministic replay because:

- distributed clocks can skew;
- multiple events may share identical timestamps;
- provider revisions can arrive late;
- an observation can be recorded after a newer effective fact;
- database commit order may differ from provider effective order.

### Required ordering dimensions

For control-plane transitions, use explicit:

1. aggregate/plane state version;
2. semantic generation numbers;
3. controller fencing epoch where operationally relevant;
4. stable event ID / durable insertion order only as a final deterministic tie-breaker;
5. provider source revision/effective timestamp for provider-fact conflict resolution according to that source's contract.

### Rule

`captured_at DESC` or newest row ID must never by itself determine semantic authority.

This is consistent with Checkpoint 08's publication finding.

---

## 10. Known-at vs effective-at vs observed-at

Autonomy and replay require three different clocks when available.

### `effective_at`
When the external fact is intended to take effect according to the authority/provider.

### `known_at`
Earliest time the engine/control plane can prove it knew the evidence.

### `observed_at`
When the specific controller/source adapter actually fetched/recorded the fact.

These may differ.

Example: a club announces an injury at 13:00, provider exposes it at 13:04, engine polls at 13:08.

Historical replay must not let the 13:08 observation leak into an artifact frozen at 13:05 unless the system can prove equivalent evidence was actually known then.

---

## 11. Deterministic lifecycle projection

Materialized lifecycle-plane states are caches/projections, not primary causal truth.

Conceptual reducer:

```text
previous materialized plane state
+ ordered accepted controller events
+ current referenced domain authority evidence
+ policy/config version
= next deterministic plane state
```

The same accepted event/evidence sequence under the same policy version must produce the same state and canonical authority.

If replay produces a different state, one of these is true:

- reducer/policy drift exists;
- mutable evidence was referenced without an immutable version/hash;
- ordering contract is incomplete;
- hidden side effects influence state;
- historical data was mutated;
- implementation is nondeterministic.

Any of those is a P0 failure for autonomous dispatch.

---

## 12. Reconciliation is authoritative after ambiguity

A timeout or process crash does **not** mean work failed.

Likewise a durable run marker does not mean work completed.

### Required pattern

After ambiguous outcome:

1. stop treating the attempt result as authoritative;
2. emit/record ambiguity evidence;
3. query the domain-specific completion invariant;
4. verify exact immutable input lineage/work key;
5. determine whether output is absent, partial, complete-current, complete-stale, conflicting, or superseded;
6. classify retry/repair/canonicalization behavior;
7. record the reconciliation disposition;
8. only then dispatch additional work or transition lifecycle state.

---

## 13. Reconciliation disposition taxonomy

Every ambiguous work item should resolve to one of a small deterministic set.

### `COMPLETE_CURRENT`
Output exists, completion invariant passes, and current hard-bound generations/fence still match.

Action: accept/reconcile success; no duplicate semantic work.

### `COMPLETE_STALE`
Output is complete but its generation vector or fencing epoch is stale.

Action: preserve as diagnostic evidence; never canonicalize; schedule replacement only if still needed.

### `PARTIAL_REPAIRABLE`
Some expected output exists; contract defines deterministic repair without unsafe duplication.

Action: repair/reconcile under same work identity if still current.

### `PARTIAL_NONREPAIRABLE`
Partial effects exist and no safe deterministic continuation is proven.

Action: fail closed; require compensating/new-generation procedure according to worker contract.

### `ABSENT_RETRY_SAFE`
No material side effect exists and worker retry contract permits replay.

Action: retry under current fence/generations.

### `ABSENT_RETRY_FORBIDDEN`
No complete output exists but replay can have unsafe/non-idempotent side effects.

Action: fail closed/manual or specialized reconciliation path.

### `CONFLICTING_OUTPUTS`
More than one plausible output exists for the same semantic work key.

Action: deterministic canonicalization rule must resolve or enter integrity-blocked state; insertion order alone forbidden.

### `SUPERSEDED`
Work was valid for an older generation but a newer generation is already canonical/in progress.

Action: preserve evidence; do not replay.

---

## 14. Worker completion invariant registry

The event ledger cannot determine completion generically.

Each dispatchable worker must have a versioned contract defining a queryable `completion_invariant`.

Minimum registry fields conceptually:

- worker family/version;
- stable work-key function;
- expected outputs;
- completeness query/assertion;
- semantic equality function;
- partial-output detection;
- retry class;
- repair procedure;
- canonicalization rule;
- deadline sensitivity;
- required generation axes;
- fencing requirement;
- supersession rule;
- side-effect class.

### Example inherited from Checkpoint 02

`sync-gw-results` cannot treat matching payload hash/parent run as completion because a parent can survive while child result rows are incomplete.

Therefore its completion invariant must prove child completeness, identity and canonical result semantics—not simply parent existence.

---

## 15. Recovery bootstrap after controller restart/failover

A new controller instance must not resume from RAM assumptions.

Required conceptual recovery sequence:

1. acquire/establish current control epoch according to the future approved fencing mechanism;
2. load immutable operational mode evidence;
3. enumerate relevant Gameweek aggregates independently;
4. load each plane's latest materialized state plus state version;
5. replay/verify ledger tail after the materialization checkpoint;
6. re-query hard external/domain authorities that have freshness requirements;
7. reconcile all work left in nonterminal or ambiguous states;
8. reject stale leases/completions from older control epochs;
9. recompute canonical authority pointers from current semantic rules;
10. compare reconstructed state fingerprint with persisted materialization;
11. if mismatch exists, enter fail-closed integrity/reconciliation mode rather than guessing;
12. only after convergence may normal dispatch resume.

---

## 16. Materialized-state checkpoint contract

Replaying the entire ledger forever may be inefficient.

A future implementation may maintain deterministic materialized checkpoints, but each checkpoint must bind to:

- aggregate key;
- per-plane state/version;
- generation vector;
- canonical authority IDs;
- last consumed ledger position/event;
- reducer/policy version;
- state hash;
- created/verified timestamp;
- control epoch only where operationally relevant.

### Critical rule

A materialized checkpoint is a cache of replayed truth, not an authority that can contradict the ledger/current domain authorities.

Periodic replay from an earlier checkpoint should reproduce the same state hash in digital-twin tests.

---

## 17. Split-brain reconciliation

Two controller instances may temporarily believe they own work.

The ledger alone does not prevent this; fencing is still required.

### Required behavior

- both instances may emit observations/attempt telemetry;
- only the current fencing epoch may commit canonical transitions/authority;
- stale-epoch completion is recorded as `COMPLETE_STALE` / `STALE_COMPLETION_REJECTED`;
- semantic generations do not increment merely because a controller failover occurred;
- repeated failovers must not create duplicate canonical artifacts when semantic inputs are unchanged.

---

## 18. Ambiguous database commit scenario

Example:

1. worker submits DB transaction;
2. network times out before response;
3. caller cannot know whether commit succeeded.

Forbidden response:

`timeout -> retry insert blindly`.

Required response:

`timeout -> reconcile by stable work key/input lineage/completion invariant -> classify output -> retry only if contract says safe`.

For database operations whose semantic output cannot be queried uniquely, the worker is **not autonomy-ready** until the contract is fixed or wrapped by a safer idempotent boundary.

---

## 19. External side-effect boundary

C0273's immediate target is an autonomous intelligence website/control plane, not autonomous FPL-account execution.

If any future system performs non-database external side effects, such as account mutations or third-party messages, those need an even stronger outbox/idempotency/reconciliation contract.

No such execution adapter is authorized here.

### Rule

A controller event saying `SIDE_EFFECT_REQUESTED` is never proof the external side effect happened.

Success requires independently queryable/authoritative confirmation or a provider idempotency key contract.

---

## 20. Canonical authority reconstruction

After recovery, canonical state must be recomputed semantically, not selected by latest row.

Examples:

### Publication
Choose the publication that:

- is valid against current hard-bound generation lineage;
- satisfies current publication policy;
- is not integrity-revoked;
- has the correct decision authority relationship;
- remains valid under the current deadline state.

### Decision
Choose only current-generation verified/authorized decision lineage satisfying commit guards.

### Settlement
Choose the latest valid settlement generation under proven official finality/correction semantics, not merely the newest result-run row.

---

## 21. Integrity mismatch handling

If replay/reconciliation disagrees with persisted materialized state, the controller must not silently overwrite state and continue.

Proposed severity classes:

### `REPLAY_DRIFT_RECOVERABLE`
Materialized cache is stale but ledger/current authorities unambiguously reconstruct one state.

Future implementation may repair the materialization after recording the drift event.

### `REPLAY_CONTRADICTION`
Two or more incompatible authoritative histories/outputs exist and policy cannot uniquely resolve them.

Enter `EMERGENCY_BLOCKED` for affected canonical transitions; preserve public read-only/history surfaces where safe.

### `LEDGER_INTEGRITY_FAILURE`
Ledger ordering/hash/immutability assumptions themselves are violated.

System cannot claim autonomous trustworthiness. Fail closed and require operator review.

---

## 22. Hashing and tamper-evidence: planning position

Cryptographic hash chaining of ledger events may improve forensic integrity, but C0273 does **not** yet require a blockchain-style design.

Minimum P0 requirement is:

- immutable event payload after append;
- stable event ID;
- payload hash;
- immutable evidence references/content hashes where needed;
- replayable deterministic ordering;
- mutation prevention/privilege separation;
- audit of any exceptional administrative correction mechanism.

Open question: whether each aggregate should use a previous-event hash chain for stronger tamper evidence. This should be decided after operational complexity/security review.

---

## 23. Retention and compaction

Controller causal events needed to reproduce historical decision authority cannot be casually pruned.

Potential future approach:

- retain full P0 lifecycle/authority/invalidation/reconciliation events for the season and historical audit horizon;
- allow high-volume attempt/heartbeat telemetry to live in separate operational logs with shorter retention;
- never compact away evidence required to explain why a final recommendation was or was not authoritative.

Exact retention periods remain unresolved.

---

## 24. Sensitive/private data boundary

The controller ledger should store references/hashes rather than copying unnecessary private manager-state payloads.

A future authenticated manager-state adapter may contain sensitive account information. The causal ledger should record only the minimum fields required to establish:

- which immutable manager-state evidence/version was consumed;
- whether it passed freshness/completeness policy;
- generation/hash;
- not the full private payload unless required and separately governed.

---

## 25. Red-team findings

### Finding 1 — a ledger can create false confidence

Simply recording every action does not make recovery deterministic if events reference mutable rows or hidden application state.

**Requirement:** event evidence refs must resolve to immutable/versioned payloads or content hashes sufficient to reproduce the decision.

### Finding 2 — event ordering can become a hidden single global bottleneck

A global total-order sequence across every Gameweek/source/work item would harm scalability and is unnecessary.

**Requirement:** ordering is primarily per aggregate/plane/work key. Cross-aggregate dependencies are explicit causal references, not one giant serial sequence.

### Finding 3 — retry events can explode volume

Recording every heartbeat/attempt in the same long-term semantic ledger would make replay noisy and expensive.

**Requirement:** distinguish semantic causal ledger from high-volume operational telemetry. Only events needed for authority/reconstruction belong in the semantic ledger.

### Finding 4 — materialized state can accidentally become hidden authority

Teams may optimize queries by reading a lifecycle-state table and later forget replay/current-authority validation.

**Requirement:** materialized state must carry reducer version, last ledger position and state hash; digital-twin tests must prove rebuild equivalence.

### Finding 5 — late source evidence can reorder football truth incorrectly

An older provider fact arriving late must not automatically supersede a newer fact just because it was inserted later.

**Requirement:** provider-specific source revision/effective-at conflict policy.

### Finding 6 — dedupe by payload hash is not enough

Two semantically different contexts can produce identical payload bytes; conversely an irrelevant metadata difference can alter payload hash without changing semantic state.

**Requirement:** stable semantic work key plus declared semantic equality/completion function; hashes assist identity/integrity but are not the entire contract.

### Finding 7 — a controller restart can accidentally increment semantic generations

If recovery code treats "observed again" as "changed," every restart could churn downstream lineage.

**Requirement:** generation increment occurs only after semantic comparison proves material state change.

### Finding 8 — stale work may be correct but no longer authoritative

A worker can produce a perfectly valid output for inputs that became obsolete during execution.

**Requirement:** preserve output diagnostically, classify `COMPLETE_STALE`, reject canonical commit, do not relabel as failure.

### Finding 9 — old narrow audit tables should not be overloaded

Retrofitting generic controller semantics into C0162/C0167/source-sync logs risks breaking their existing meaning and still leaves missing invariants.

**Requirement:** treat them as referenced domain/operational evidence unless future implementation review proves a safe explicit migration.

### Finding 10 — reconciliation itself can race

Two reconcilers may inspect the same ambiguous work and both attempt recovery transitions.

**Requirement:** reconciliation transition commits need the same state-version CAS/fencing protections as normal work.

---

## 26. Digital-twin acceptance scenarios

Before any controller dispatch is authorized, the read-only digital twin should prove at minimum:

1. worker commits successfully but caller times out; reconciliation returns `COMPLETE_CURRENT` without duplicate work;
2. worker writes only parent marker then crashes; completion invariant detects partial output;
3. partial output is repairable; one deterministic repair occurs;
4. partial output is nonrepairable; system fails closed without blind retry;
5. stale worker completes after control-epoch takeover; output is preserved but canonical commit rejected;
6. hard source generation changes mid-work; completion becomes `COMPLETE_STALE`;
7. duplicate identical source observations do not increment semantic generation;
8. older provider revision arrives late; canonical fact remains newer effective/revision authority;
9. two controller instances reconcile the same ambiguous work; one legal transition wins under CAS/fence;
10. controller restarts with several in-flight jobs; reconstructed state matches precrash semantic state;
11. materialized lifecycle state is deleted in test environment; replay reconstructs identical state hash;
12. corrupted/contradictory materialized state is detected rather than silently trusted;
13. publication latest-row order differs from semantic canonical authority; replay chooses semantic authority;
14. GW N settlement correction occurs while GW N+1 planning is active; only declared downstream dependencies change;
15. operational `PAUSE`/`DRAIN` survives restart without altering football generations;
16. controller failover increments fencing epoch but no semantic generation;
17. a deadline changes during finalization; old work cannot become current even if it finishes cleanly;
18. external/domain worker has no queryable completion invariant; digital twin marks it not autonomy-ready;
19. replay under a changed reducer/policy version does not rewrite historical state silently; version mismatch is explicit;
20. evidence referenced by an event has been mutated unexpectedly; integrity failure is raised.

---

## 27. Proposed autonomy-readiness gate for dispatchable work

A work family is not controller-dispatchable until all of these are documented and proven:

- stable semantic `work_key`;
- immutable input lineage;
- required generation axes;
- fencing requirement;
- completion invariant;
- semantic equality rule;
- retry classification;
- partial repair behavior;
- ambiguous outcome reconciliation procedure;
- canonicalization rule;
- supersession rule;
- deadline guard where relevant;
- external side-effect classification;
- digital-twin recovery tests.

This extends Checkpoint 02 rather than replacing it.

---

## 28. Contradictions/open questions preserved for user review

### OQ1 — dedicated controller ledger table vs narrower per-aggregate stores

A dedicated semantic ledger is the clearest design, but exact physical partitioning remains undecided.

### OQ2 — hash-chain integrity

Should events include `previous_event_hash` per aggregate for stronger tamper evidence, or are append-only privilege controls + payload hashes sufficient?

### OQ3 — ledger retention horizon

Exact retention/archival period for semantic events is unresolved.

### OQ4 — materialization cadence

How often should deterministic lifecycle snapshots/checkpoints be materialized versus reconstructed on demand?

### OQ5 — event ID format

UUID/ULID/database-generated identity is an implementation choice; semantic ordering must not depend on wall-clock-sortable IDs alone.

### OQ6 — provider revision semantics

Each source family still needs explicit conflict rules when provider revision IDs are absent or ambiguous.

### OQ7 — current private manager state

Perfect reconciliation cannot reconstruct an account mutation the system never observed. The manager-state visibility boundary from Checkpoint 05 remains unresolved.

### OQ8 — official FPL settlement authority

Exact official event/finality evidence remains unresolved from Checkpoint 06 and remains necessary for deterministic settlement transitions.

### OQ9 — operational alert channel

A deterministic controller can detect SEV0/SEV1 but the human notification channel is still not selected.

### OQ10 — reducer evolution

Future policy/reducer versions need a migration/replay policy: historical state should remain explainable under the policy that was active then, while current state uses the current approved policy.

---

## 29. Explicit non-changes

This batch did **not**:

- create an event-ledger table;
- create or alter lifecycle-state tables;
- add triggers;
- alter existing audit/run tables;
- change any Edge Function;
- change any cron/scheduler;
- change any model or optimizer;
- change C0234/C0237/C0248;
- change source ingestion;
- change manager-state behavior;
- change result settlement behavior;
- change V2/V3 website behavior;
- deploy anything;
- promote/kill any shadow or production model;
- execute an FPL action.

All future production changes remain explicit human-approval gated.

---

## 30. Recommended next bounded C0273 batch

The strongest next planning/red-team batch is the **dispatchable-work contract matrix + autonomy readiness classification**.

Goal:

- enumerate each worker/function the future controller may need to dispatch;
- bind it to the generic contract from Checkpoints 02/10;
- classify `READY_BY_CONTRACT`, `RECONCILE_REQUIRED`, `WRAPPER_REQUIRED`, `NOT_AUTONOMY_READY`, or `READ_ONLY_ONLY`;
- document exact completion invariants and blockers;
- prevent controller design from assuming every existing worker is safe merely because it already runs manually or from cron.

Implementation recommendation remains **DO NOT IMPLEMENT YET** until the P0 contracts and digital-twin plan are closed and the user explicitly approves production work.
