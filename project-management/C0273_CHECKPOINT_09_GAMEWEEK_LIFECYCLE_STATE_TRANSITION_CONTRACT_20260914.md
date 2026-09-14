# C0273 — Checkpoint 09: Gameweek Lifecycle & State-Transition Contract

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define the legal lifecycle semantics for one FPL Gameweek without collapsing independent concerns into one oversized status enum. This checkpoint joins the prior deadline, source-readiness, manager-state, generation/invalidation, publication-authority, actual-submission and result-settlement contracts into an explicit transition model suitable for later digital-twin testing.

This document is planning only. It does **not** authorize schema changes, controller code, cron changes, function changes, model changes, website changes, deployments, source changes, shadow promotion/kill, or FPL-account execution.

---

## 1. Live architecture evidence re-verified

Read-only production inspection on 2026-09-14 confirms:

- C0273 remains `Open / Planned / P0`, with `model_effect=None` and explicit human approval required before implementation.
- Current autonomous-gate evidence contains states including `DECISION_NOT_READY` and `FINAL_POST_DEADLINE_CLOSURE`.
- Current publication evidence contains `CONTESTED` and `FINAL` rows; Checkpoint 08 already proved current selection is insertion-order based rather than semantic canonical authority.
- `gameweek_prediction_runs` contains many `pre_deadline` rows plus explicit development/test rows; prediction-run existence is therefore not itself a lifecycle authority.
- `fpl_actual_manager_decisions` is a separate append-style actual lane with explicit `source` and `correction_of_id`; current evidence includes a locked public-FPL-api GW4 capture and an earlier manager-confirmed GW2 capture.
- `gameweek_result_runs` is a separate result-observation lane whose existing `is_final` semantics were already proven insufficient to mean settled FPL scoring.
- `fpl_manager_state_snapshots` is also independent from recommendation/publication and, as established in Checkpoint 05, currently cannot prove live private predeadline account state after unseen manual transfers.

These live facts reinforce the design conclusion below: **the future autonomous control plane must not model an entire Gameweek as one linear status.**

---

## 2. Core design decision: use orthogonal lifecycle planes

A Gameweek has multiple partially independent lifecycles.

Minimum P0 planes:

1. **Deadline Authority Plane** — what deadline evidence is authoritative?
2. **Planning / Decision Plane** — how far has current-generation decision work progressed?
3. **Publication Authority Plane** — is there a trustworthy current public recommendation?
4. **Manager-State Plane** — what account state is actually observable/verified?
5. **Actual Submission Plane** — has the locked submitted team been independently captured?
6. **Result / Settlement Plane** — how mature are match/result observations and official scoring?
7. **Operational Control Plane** — is the controller allowed to dispatch/commit work?

Each plane has its own state and generation. A compact aggregate Gameweek status may be derived for UI/operator convenience, but it must never replace the underlying plane states or become the sole authorization source.

### Rejected design

A single enum such as:

`OPEN -> PLANNING -> FINAL -> PLAYING -> COMPLETE`

is insufficient because, for example:

- GW N may be in `SETTLEMENT_WAIT` while GW N+1 is actively planning;
- a recommendation may be `HARD_INVALIDATED` while deadline authority remains healthy;
- actual submitted state may be captured after deadline even if the website had no trustworthy final recommendation;
- operational `PAUSE` must stop new work without changing football evidence;
- a settlement correction must not move the predeadline decision plane backwards.

---

## 3. Deadline Authority Plane

Proposed semantic states:

### `DEADLINE_UNKNOWN`
No current official authority is available or parseable.

Effect:
- predeadline finalization cannot be authorized;
- existing historical artifacts remain preserved;
- rolling research may continue only if policy explicitly permits and no deadline-sensitive claim is made.

### `DEADLINE_VERIFIED`
Official FPL `deadline_time` is present, valid and is the sole timing authority.

### `DEADLINE_CHANGED`
A previously verified official deadline has materially changed, creating a new `deadline_generation`.

Effect:
- invalidate affected deadline-bound in-flight/frozen candidates;
- recompute budget/finalization schedule;
- no silent reuse of old-generation authority.

### `DEADLINE_CLOSED`
Current official time is at or beyond the authoritative deadline.

Effect:
- no new predeadline execution authorization;
- predeadline publication lineage freezes into audit/history semantics;
- actual-submission capture lane becomes eligible when public locked picks are available.

### Legal transitions

- `UNKNOWN -> VERIFIED`
- `VERIFIED -> CHANGED -> VERIFIED`
- `VERIFIED -> CLOSED`
- `CHANGED -> CLOSED` if the new deadline is already past
- `CLOSED -> VERIFIED/CHANGED` only for an official correction that legitimately moves/reopens the deadline; such a rare event must create new evidence generation and never resurrect old authority without revalidation.

Illegal shortcut:
- `UNKNOWN -> FINAL_DECISION_AUTHORIZED`

---

## 4. Planning / Decision Plane

This plane describes current-generation decision work, not website visibility.

Proposed states:

### `PLANNING_NOT_READY`
Required hard sources/manager baseline/decision prerequisites are incomplete.

### `ROLLING_ANALYSIS_READY`
Enough evidence exists for a current rolling plan, but final-window requirements are not yet satisfied.

### `FINALIZATION_ELIGIBLE`
Official deadline healthy; all required P0 final-window sources, manager-state policy and generation bindings satisfy the finalization contract; sufficient measured execution budget remains.

### `FINALIZATION_IN_PROGRESS`
A fenced current-generation finalization cycle is running.

### `DECISION_VERIFIED`
Decision candidate passed all required model/layer/adversarial/consistency checks for its current generation vector.

### `DECISION_AUTHORIZED`
C0234-equivalent final authority passed under the current official deadline generation and current commit guards.

This remains recommendation authorization only. It is **not account execution**.

### `DECISION_INVALIDATED`
A hard-bound dependency changed after a previously verified/authorized decision.

### `DECISION_CLOSED_AUDIT`
Deadline has passed; predeadline decision lineage is frozen for historical evaluation. No retroactive authorization.

### Main transitions

- `NOT_READY -> ROLLING_ANALYSIS_READY`
- `ROLLING_ANALYSIS_READY -> FINALIZATION_ELIGIBLE`
- `FINALIZATION_ELIGIBLE -> FINALIZATION_IN_PROGRESS`
- `FINALIZATION_IN_PROGRESS -> DECISION_VERIFIED`
- `DECISION_VERIFIED -> DECISION_AUTHORIZED`
- any predeadline state -> `DECISION_INVALIDATED` on relevant `HARD_INVALIDATE`
- `DECISION_INVALIDATED -> FINALIZATION_ELIGIBLE` only after current-generation readiness is restored and safe budget exists
- any predeadline state -> `DECISION_CLOSED_AUDIT` once deadline closes

### Important rule

A state transition to `DECISION_AUTHORIZED` requires atomic/equivalent commit-time proof that deadline generation, all hard-bound component generations, manager-state policy, fencing epoch, state version and decision lineage are still current.

Historical booleans cannot be treated as continuing authority.

---

## 5. Publication Authority Plane

Checkpoint 08 semantics are adopted directly.

States:

- `NO_CURRENT_PUBLICATION`
- `CURRENT_VERIFIED`
- `SOFT_STALE_CURRENT`
- `REVALIDATING_BLOCKED`
- `NO_TRUSTWORTHY_CURRENT_DECISION`
- `SUPERSEDED`
- `REVOKED_INTEGRITY`
- `DEADLINE_CLOSED_AUDIT`

Key invariants:

1. newest inserted publication != canonical authority;
2. `HARD_INVALIDATE` immediately removes actionable-current authority even before a replacement payload exists;
3. old publication remains immutable history;
4. canonical publication must point to a current `DECISION_VERIFIED` or `DECISION_AUTHORIZED` lineage according to product policy;
5. any account-execution adapter, if ever separately approved, must re-resolve current authorization rather than trust the publication row's historical boolean.

### Deadline fallback transition

`CURRENT_VERIFIED -> HARD_INVALIDATE` does not directly become `SOFT_STALE_CURRENT`.

Instead:

- if safe recompute budget exists: `REVALIDATING_BLOCKED -> CURRENT_VERIFIED` after successful replacement;
- if safe budget does not exist: `NO_TRUSTWORTHY_CURRENT_DECISION -> DEADLINE_CLOSED_AUDIT` at deadline.

---

## 6. Manager-State Plane

Adopt the four-lane model from Checkpoint 05 rather than a single status.

### State lanes

- `OPENING_LOCKED_BASELINE`
- `CURRENT_PRIVATE_STATE`
- `ENGINE_HYPOTHETICAL_STATE`
- `ACTUAL_SUBMITTED_STATE`

Each lane may separately be:

- `UNKNOWN`
- `OBSERVED`
- `VERIFIED`
- `STALE`
- `SUPERSEDED`
- `CONTRADICTED`

### Critical invariant

`ENGINE_HYPOTHETICAL_STATE` can **never** transition into or substitute for `CURRENT_PRIVATE_STATE` merely because the engine recommended those transfers.

Likewise:

`recommendation != account state != actual locked submission`.

### Current autonomous boundary

Without authenticated/private predeadline state visibility, `CURRENT_PRIVATE_STATE` may remain `UNKNOWN/UNOBSERVABLE` after manual changes. The website may still operate under an explicitly labeled opening/last-verified baseline policy if approved, but it cannot claim private-state certainty.

---

## 7. Actual Submission Plane

This plane begins independently after the official deadline when locked picks become observable.

Proposed states:

### `ACTUAL_NOT_AVAILABLE`
Deadline may be open, or public locked picks are not yet available.

### `ACTUAL_CAPTURE_PENDING`
Deadline closed and capture should be attempted/reconciled.

### `ACTUAL_CAPTURED`
A complete locked submission was captured with explicit source/evidence.

### `ACTUAL_CORRECTED`
A later authoritative correction supersedes an earlier captured actual; old evidence remains immutable and linked through correction lineage.

### `ACTUAL_UNRESOLVED`
Expected locked submission cannot be proven complete after bounded retries/reconciliation.

Important invariant:

A missing/failed recommendation does not prevent capturing the real actual submission. Actuals are independent evidence.

---

## 8. Result / Settlement Plane

Adopt Checkpoint 06 semantics.

States:

- `NO_RESULTS`
- `LIVE_PARTIAL`
- `FIXTURES_COMPLETE_PROVISIONAL`
- `SETTLEMENT_WAIT`
- `SETTLED`
- `CORRECTED_AFTER_SETTLEMENT`

### Main transitions

- `NO_RESULTS -> LIVE_PARTIAL`
- `LIVE_PARTIAL -> FIXTURES_COMPLETE_PROVISIONAL`
- `FIXTURES_COMPLETE_PROVISIONAL -> SETTLEMENT_WAIT`
- `SETTLEMENT_WAIT -> SETTLED` only on proven official FPL scoring-finality authority plus completeness invariant
- `SETTLED -> CORRECTED_AFTER_SETTLEMENT -> SETTLED(new settlement_generation)` when official correction occurs

No settlement transition may rewrite frozen prediction/decision/publication history.

Post-GW evaluation/calibration binds to explicit `settlement_generation` and `as_known_at` chronology.

---

## 9. Operational Control Plane

Football evidence and operational control must remain separate.

Proposed states:

### `RUN`
Normal bounded dispatch/reconciliation is permitted according to all semantic gates.

### `PAUSE`
Do not dispatch new nonessential work. Existing safe work may finish, but canonical commits still require current semantic guards.

### `DRAIN`
Do not start new work; allow bounded in-flight work to finish/reconcile. Useful for maintenance/deployment preparation.

### `EMERGENCY_BLOCKED`
Fail closed. No new decision/publication/execution authority may be granted. Read-only evidence/status surfaces should remain available where safe.

### Required rule

Operational mode can restrict transitions but cannot manufacture semantic readiness.

For example, switching `PAUSE -> RUN` cannot convert `DECISION_NOT_READY` into `DECISION_AUTHORIZED`.

Likewise an operator cannot bypass C0234-equivalent final authority via an emergency control.

---

## 10. Derived Gameweek aggregate for product/operator UI

A compact aggregate may be derived from the seven planes, but it is descriptive only.

Suggested display states:

- `UPCOMING_BUILDING`
- `UPCOMING_READY`
- `FINALIZING`
- `CURRENT_RECOMMENDATION_READY`
- `CURRENT_RECOMMENDATION_BLOCKED`
- `DEADLINE_CLOSED_AWAITING_ACTUAL`
- `LIVE_GAMEWEEK`
- `AWAITING_SETTLEMENT`
- `SETTLED`
- `OPERATIONALLY_BLOCKED`

The aggregate state must expose the underlying blockers and generation fingerprint. It must never be used as the sole authorization predicate.

---

## 11. Cross-plane invariants

The future controller/digital twin must enforce at least these invariants.

### I1 — deadline authority
`DECISION_AUTHORIZED` requires `DEADLINE_VERIFIED` and predeadline commit time under the same `deadline_generation`.

### I2 — publication authority
`CURRENT_VERIFIED` publication requires a decision artifact valid against current hard-bound generation lineage.

### I3 — hard invalidation
A hard change can move planning/publication authority backwards without mutating historical artifacts.

### I4 — actual independence
`ACTUAL_CAPTURED` is independent of whether a recommendation was ever final/authorized.

### I5 — settlement independence
GW N settlement waiting must not prevent GW N+1 planning.

### I6 — operational separation
`PAUSE/DRAIN/EMERGENCY_BLOCKED` may restrict work but never alter semantic evidence generations.

### I7 — no retroactive execution
Postdeadline closure, actual capture or settlement cannot create retroactive predeadline execution authority.

### I8 — private-state honesty
If `CURRENT_PRIVATE_STATE` is unknown, personalized claims must explicitly identify the verified baseline they use.

### I9 — chronology
No artifact may consume evidence whose `known_at/effective_at` lies after the artifact's frozen `as_known_at` boundary unless the artifact is explicitly a later superseding generation.

### I10 — stale-worker exclusion
A worker begun under an older generation/control epoch may finish for diagnostics but cannot advance any canonical plane state after a mismatch.

---

## 12. Transition ownership

No worker should be allowed to arbitrarily set aggregate state.

Conceptual ownership rules:

- source/deadline reconcilers produce evidence and propose semantic generation changes;
- lifecycle reconciler evaluates legal transitions from durable facts;
- bounded workers produce outputs but do not self-declare overall Gameweek readiness;
- C0234-equivalent authority owns final decision authorization;
- canonical publication selector owns publication authority;
- actual-capture reconciler owns actual-submission evidence lane;
- settlement reconciler owns settlement generation;
- operational-control command owns only `RUN/PAUSE/DRAIN/EMERGENCY_BLOCKED`.

Every transition should record:

- previous state/version;
- next state/version;
- causal evidence IDs/hashes;
- semantic generation vector or affected axes;
- `known_at` / transition timestamp;
- controller/fencing epoch when operationally relevant;
- reason code;
- actor (`SYSTEM_RECONCILER`, approved operator, etc.);
- policy/config version.

---

## 13. No illegal state mutation on retry

Retries must be reconcile-first.

A retry does not repeat a transition because a prior RPC timed out.

Required pattern:

1. read current durable plane state/version;
2. inspect output/completion invariant;
3. determine whether the intended semantic transition already happened;
4. if yes, return reconciled success;
5. if no, prove work is still valid under current generations/fencing;
6. only then retry/continue;
7. atomically compare-and-swap the next transition.

This is particularly important for result sync, current-player-state, actual capture and publication canonicalization.

---

## 14. Red-team findings

### Finding 1 — giant state machine explosion

Combining all dimensions yields hundreds of meaningless Cartesian-product states.

**Decision:** model orthogonal planes and cross-plane invariants; derive a compact display state only for UX.

### Finding 2 — 'FINAL' is dangerously overloaded

Current architecture uses `FINAL`/`FINAL_POST_DEADLINE_CLOSURE` in contexts that do not all mean the same thing.

**Decision:** future contracts must qualify finality: decision-authorized, publication-current, actual-captured, fixture-complete, scoring-settled, or audit-closed. Generic `FINAL` is not sufficient as a machine authorization signal.

### Finding 3 — operational pause could accidentally look like stale data

If the controller is paused, source evidence may remain semantically valid while refresh cadence stops.

**Decision:** UI/operator status must distinguish `OPERATIONALLY_PAUSED` from `SOURCE_STALE` and from `HARD_INVALIDATED`.

### Finding 4 — deadline close while finalization is running

A worker may begin safely predeadline and finish afterward.

**Decision:** predeadline authority requires commit-time official-deadline check. Postdeadline output may be diagnostic/audit evidence only.

### Finding 5 — actual capture may contradict assumed manager state

Locked picks can reveal unseen predeadline transfers.

**Decision:** record contradiction against prior manager-state confidence/baseline; do not rewrite recommendation lineage. Use it for postmortem of the information boundary.

### Finding 6 — settlement corrections can arrive while next GW already finalizes

**Decision:** explicit cross-GW dependency declarations decide whether new settlement evidence affects the next forecast. Never globally rewind all Gameweeks.

### Finding 7 — reopening a deadline is rare but must be modelable

Hard-coding `DEADLINE_CLOSED` as permanently terminal could fail under an official reschedule/correction.

**Decision:** allow a new deadline generation to reopen timing semantics only from new official authority; nothing old is automatically re-authorized.

### Finding 8 — operator override temptation

Emergency UI controls can evolve into a hidden bypass around decision safety.

**Decision:** no operational control can grant model/decision/publication authority. Overrides may only restrict, pause, drain, block, or—if a later program explicitly designs it—select among already valid canonical candidates with immutable audit evidence.

---

## 15. Digital-twin / replay acceptance suite additions

Before controller implementation approval, replay must prove at minimum:

1. normal upcoming -> rolling -> finalization -> authorized -> publication -> deadline-close flow;
2. hard injury invalidation during finalization;
3. hard invalidation after publication with safe recompute budget;
4. hard invalidation after publication without safe budget;
5. deadline moves earlier while worker is running;
6. deadline moves later/reopens after prior close;
7. manager private state unobservable but opening baseline valid;
8. actual locked picks contradict assumed/private baseline after deadline;
9. publication exists but canonical authority is blocked;
10. controller `PAUSE` during healthy semantic state;
11. `DRAIN` with in-flight work and no new dispatch;
12. `EMERGENCY_BLOCKED` while historical website evidence remains readable;
13. stale worker completes after generation change;
14. GW N settlement correction while GW N+1 planning/finalization is active;
15. result parent exists but child completeness invariant fails;
16. actual-capture retry after ambiguous timeout does not duplicate/conflict silently;
17. identical-content revalidation advances validation evidence without false recommendation change;
18. postdeadline closure never grants retroactive execution authority;
19. lifecycle aggregate display state disagrees with an underlying plane — authorization must follow planes/invariants, not aggregate;
20. controller restart increments fencing epoch without semantic lifecycle churn.

---

## 16. Open questions preserved for user/implementation review

This checkpoint deliberately does not resolve:

1. exact database representation: separate tables, event ledger + projections, or hybrid;
2. exact names/enums of the proposed plane states;
3. exact measured deadline safety/recompute budgets;
4. whether `SOFT_STALE_CURRENT` can ever remain actionable for any future execution adapter;
5. exact official 2026/27 FPL scoring-settlement authority field/transition;
6. authoritative automated press-conference/team-news source strategy;
7. whether independent external predicted-XI evidence is mandatory or confidence-enhancing;
8. authenticated/private manager-state acquisition strategy;
9. canonical publication pointer/materialized-selection design;
10. cache/CDN invalidation mechanics;
11. exact SEV0/SEV1 alert transport/channel;
12. exact soak duration and statistical pass thresholds for the digital twin;
13. whether a deadline reopening should permit a new decision finalization cycle automatically or require explicit policy/operator acknowledgement;
14. whether an operational `PAUSE` should allow source ingestion while blocking only derived work, or pause all noncritical writes;
15. whether identical-content revalidation should create a new publication row or a separate immutable validation envelope.

All remain approval-gated.

---

## 17. Current recommendation

**DO NOT IMPLEMENT YET.**

The lifecycle contract is now coherent enough to support the next bounded planning work, but implementation should remain blocked until the remaining P0 authority/source/reliability questions are reduced further and the read-only digital-twin plan is concrete.

Recommended next batch:

**Controller event ledger + reconciliation contract** — define the minimum immutable event envelope (`observed_at`, `effective_at`, provider revision, known-at chronology, semantic classification, generation effects, dedupe key, causality, work key, completion/reconciliation evidence) and prove how lifecycle transitions can be rebuilt deterministically from it after restart/failover.

---

## Explicit non-changes

This batch changed no:

- production schema;
- cron/scheduler;
- Edge Function;
- model/projection numeric behavior;
- C0234/C0237/C0248 runtime logic;
- source provider;
- shadow model status;
- website/frontend runtime;
- historical forecast;
- FPL account state/action.

Only planning documentation and the C0273 documentation/tracker checkpoint are permitted.
