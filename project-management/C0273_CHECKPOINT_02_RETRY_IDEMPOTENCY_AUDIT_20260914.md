# C0273 — Checkpoint 02: Retry / Idempotency Audit

Date: 2026-09-14  
Program: Autonomous Website / Engine Control Plane  
Status: Planning evidence only  
Runtime/model effect: NONE

## Purpose

Replace the initial `AUDIT_REQUIRED` assumptions for the highest-risk autonomous entrypoints with evidence-backed classifications from the current live Supabase Edge/runtime and database uniqueness contracts. This is a planning audit only. It authorizes no implementation, dispatch or runtime change.

## Audit scope

Inspected live production definitions for:

- `sync-gw-results` v5;
- `sync-fpl-data` v3;
- `refresh-availability-intelligence` v4;
- `refresh-current-player-state` v8;
- `sync-fpl-actual-decision` v2;
- `fpl-sequential-planner` v6;
- uniqueness/primary-key contracts on the principal output tables;
- existing C0248/C0234/C0237 signature-based run/publication surfaces.

The live cron inventory also confirms these source/state jobs remain independently scheduled today; C0273 has not changed those schedules.

## Classification vocabulary

- `RETRY_SAFE_BY_KEY` — repeated execution with the same semantic input is deduplicated by a stable database key/signature.
- `RECOVERABLE_APPEND` — repeats may create additional observations, but partial completion can be safely completed/reconciled without corrupting canonical current state.
- `RECONCILE_BEFORE_RETRY` — blind retry after ambiguous failure can create duplicate/incomplete semantic state or suppress repair; controller must first inspect durable output.
- `SINGLE_WRITER_REQUIRED` — current race guards are insufficient under concurrent workers; autonomy needs lease/fencing and/or a database uniqueness contract before dispatch.
- `OBSERVATION_APPEND` — duplicate invocation is intentionally a new timestamped observation; it must not be treated as idempotent work.

## Evidence-backed results

| Work family | Current behavior | Classification | Autonomous-planning implication |
|---|---|---|---|
| `sync-gw-results` | Updates fixture rows, refreshes team intelligence, checks latest payload hash, then inserts a new `gameweek_result_runs` row followed by player actual rows. `gameweek_result_runs` has no semantic unique key. | **RECONCILE_BEFORE_RETRY — P0** | A crash after result-run insert but before all player rows are inserted is dangerous: the next invocation may see the latest matching payload hash and return `unchanged`, leaving an incomplete result run. Concurrent equal-payload workers can also create multiple runs. Must not be blindly retried by the future controller. |
| `sync-fpl-data` | Team/player current dimensions are upserted, while `fpl_prices` is append-only with fresh `captured_at`; every invocation also creates a source-sync run. | **OBSERVATION_APPEND** | It is not semantically idempotent by invocation. Retries create another legitimate-but-duplicate-in-purpose timestamped market snapshot. The controller needs an invocation/source-payload identity and freshness policy rather than generic retry. |
| `refresh-availability-intelligence` | Player metadata upsert; availability observations use unique `(match_id, player_id, observation_hash)` and `ignoreDuplicates=true`. Hash excludes capture timestamp and represents semantic evidence. | **RETRY_SAFE_BY_KEY / RECOVERABLE_APPEND** | Strong current candidate for controlled retries. Partial chunk completion is naturally repairable because already-written observations conflict by semantic hash while missing rows can be added. A changed upstream FPL payload correctly becomes new evidence. |
| `refresh-current-player-state` | Reads latest state/evidence, skips unchanged latest evidence hash, then appends new `player_state` rows using a new `as_of`. Table uniqueness is `(player_id, as_of, model_version_id)`, not evidence hash. | **RECONCILE_BEFORE_RETRY — P0** | Concurrent invocations with the same evidence can both pass the latest-state check and insert semantically duplicate states with different timestamps. A partial batch failure followed by retry can duplicate the already-completed subset. Needs deterministic run identity/output reconciliation before controller dispatch. |
| `sync-fpl-actual-decision` | Uses official FPL `deadline_time`, checks for an existing complete frozen decision before and after bootstrap fetch, then inserts first complete locked snapshot. Table has only PK on `id`. | **SINGLE_WRITER_REQUIRED — P0** | Excellent semantic guards and correct official-deadline authority already exist, but two workers can still both pass the second race guard before either insert commits and create twin frozen decisions. The future control plane must serialize/fence this operation or add a later approved uniqueness contract. |
| `fpl-sequential-planner` v6 | Computes deterministic `input_signature`; table enforces `UNIQUE(input_signature)`; reads existing run before insert. | **RETRY_SAFE_BY_KEY, with race handling caveat** | Semantically strong for one input lineage. However the read-before-insert pattern can still surface a duplicate-key error during simultaneous identical inserts rather than returning the winner. The future controller should reconcile on unique conflict instead of treating it as a failed plan. No model change is required for the planning design. |
| C0248 verified promotion | Existing promotion path uses deterministic signature and conflict-safe lookup/insert semantics. | **RETRY_SAFE_BY_KEY candidate** | Keep unchanged as the authority contract; autonomy wrapper must bind it to generation/fencing and reconcile the returned production run. |
| C0234 autonomous gate | `fpl_autonomous_gate_runs` has `UNIQUE(input_signature)` and the live gate already deduplicates by signature before insert. | **RETRY_SAFE_BY_KEY** | Suitable for generation-bound dispatch after dependencies are ready. Still requires deadline/state-version commit guards at orchestration level. |
| C0237 publication | `fpl_live_plan_publications` has `UNIQUE(input_signature)` and publication functions use conflict-safe insert/lookup. | **RETRY_SAFE_BY_KEY** | Suitable for retry after canonical-lineage reconciliation. Publication canonical-pointer/supersession semantics remain a separate C0273 contract. |

## P0 defect pattern discovered: durable marker before durable completion

`sync-gw-results` demonstrates a critical general failure mode for autonomous systems:

1. create a durable parent/run marker;
2. write child facts in later statements/batches;
3. crash after the parent exists but before children are complete;
4. retry logic sees the parent/input marker and concludes work is already complete.

Therefore C0273 must distinguish:

- **work identity**;
- **work started**;
- **output complete**;
- **output canonical**.

A matching input signature or parent run ID alone must never be treated as proof of completion unless the work family defines an explicit completeness invariant.

## Required generic autonomous-work contract

Before a work family can be controller-dispatched, it must declare:

1. `work_key` — stable semantic identity of the requested work;
2. `input_lineage` — immutable IDs/hashes read by the worker;
3. `generation_id` — finalization/decision generation to which the work belongs;
4. `fencing_token` — monotonically increasing ownership epoch for mutating completion;
5. `completion_invariant` — queryable condition proving all expected outputs exist and are internally consistent;
6. `retry_class` — one of the classifications above;
7. `reconcile()` — deterministic inspection executed after timeout/ambiguous failure;
8. `canonicalization_rule` — how one output becomes current/canonical when multiple valid observations/runs exist;
9. `deadline_guard` — whether commit is forbidden after official deadline/state transition;
10. `supersession_rule` — whether later evidence replaces, supplements or cannot alter prior output.

## Entry-point-specific completeness invariants proposed for later implementation design

These are contracts only, not code changes.

### Result sync

A result run is complete only when:

- its payload/source identity is known;
- expected player-result population is present under the same run;
- every finished fixture in its metadata is represented consistently;
- no required child batch is missing;
- any downstream team-state refresh records the same or later source lineage.

Until this invariant is defined precisely and replay-tested, autonomous blind retry is prohibited.

### Current player state

A refresh is complete only when the target player universe and source evidence signature are frozen for the invocation and every expected player is classified as either `UNCHANGED` or has exactly one accepted output for that work key. Timestamp alone is not identity.

### Actual locked decision

A Gameweek/entry may have only one first-complete immutable canonical locked snapshot. Any later correction must be an explicit correction lineage, never a second accidental "first" snapshot. Controller dispatch must be single-writer even before any future schema hardening is approved.

## Positive finding: official deadline authority already exists in one critical path

`sync-fpl-actual-decision` already obtains and enforces the official FPL event `deadline_time` before attempting locked picks. This supports the C0273 design decision to make official FPL event time the final authority. The remaining task is to map and eliminate *planning dependence* on other consumers that still infer deadline from first kickoff; no runtime change is authorized in C0273 planning.

## Revised control-plane retry policy

The controller must never expose a generic "retry failed job" primitive. It should execute:

`timeout/failure → reconcile durable state → classify complete/incomplete/contradicted → retry only if work-family policy permits → bind completion to current fencing token + generation`.

For observation-append jobs, retry means **request a fresh observation only if freshness still requires one**, not replay the old invocation.

## New digital-twin scenarios

Add these mandatory tests:

1. result-sync crash after parent run insert but before first player batch;
2. result-sync crash after some player batches;
3. equal-payload concurrent result-sync workers;
4. player-state partial batch failure then retry;
5. concurrent identical player-state refreshes;
6. actual-decision double worker passes both application-level race guards;
7. sequential-planner simultaneous identical input-signature inserts;
8. source-data observation retry where upstream payload changes between attempts;
9. timeout response where worker actually committed successfully;
10. stale worker completes after generation invalidation.

## Current recommendation

**DO NOT IMPLEMENT YET.**

The audit reduces uncertainty but increases the importance of the reconciliation/fencing design. In particular, `sync-gw-results`, `refresh-current-player-state`, and first-write actual-decision capture must not be placed behind an autonomous retry queue unchanged without explicit safety wrappers/contracts.

## Explicit non-changes

This checkpoint changed no runtime, schema, cron, Edge Function, model, optimizer, gate, publication, shadow lifecycle, V2/V3 application or historical forecast.
