# C0273 — Checkpoint 14: Digital-Twin Replay Modes & Historical-Era Contracts

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define the digital-twin/replay contract required before any C0273 autonomous-controller implementation can be approved. This checkpoint separates forensic replay from counterfactual simulation, formalizes historical-era boundaries, defines evidence-frontier semantics, and establishes implementation pass/fail gates.

This checkpoint extends C0273 Checkpoints 01–13. It does **not** create schema, alter functions, deploy code, change cron/runtime/model behavior, promote/kill any model, rewrite history, or execute FPL actions.

---

## 1. Core decision: one replay mode is insufficient

C0273 must support several explicitly different replay modes. A single command called `replay` would hide incompatible semantics.

Required conceptual modes:

1. **FORENSIC_AS_WAS** — reconstruct what the historical system could legitimately know and decide under the contracts that existed at that time.
2. **CONTROL_REDUCER_REPLAY** — prove that the future controller event ledger + reducer deterministically reconstruct the same lifecycle/canonical state.
3. **CURRENT_POLICY_COUNTERFACTUAL** — apply current approved policy/model/controller logic to historical evidence for research only.
4. **FAILURE_INJECTION_TWIN** — inject crashes, stale workers, split-brain, deadline moves, source degradation, partial writes and correction events into a read-only twin.
5. **SHADOW_FORWARD_TWIN** — after implementation is approved but before dispatch authority, run the controller against live evidence while suppressing all production side effects.

These modes must never be mixed in one result without explicit labels.

Core rule:

> forensic truth != current-policy counterfactual != failure simulation != live shadow operation.

---

## 2. Why historical-era contracts are mandatory

Read-only live evidence confirms the engine architecture materially changed during GW1–GW4.

### Prediction evidence

- GW1: 3 prediction runs; 0 eligible frozen predeadline rows.
- GW2: 10 prediction runs; 10 eligible frozen predeadline rows.
- GW3: 39 prediction runs; 39 eligible frozen predeadline rows.
- GW4: 51 prediction runs; 51 eligible frozen predeadline rows.

### Modern finalization-stack evidence

- `fpl_sequential_planner_runs` exists only for GW4 in the inspected scope: 29 rows, first captured 2026-09-11.
- `fpl_autonomous_gate_runs` exists only for GW4 in the inspected scope: 18 rows, first captured 2026-09-08.
- `fpl_live_plan_publications` exists only for GW4 in the inspected scope: 29 rows, first captured 2026-09-09.

### Actual locked-manager evidence

- GW2: one durable actual-manager decision row.
- GW4: one durable actual-manager decision row.
- GW1/GW3: no row in the inspected `fpl_actual_manager_decisions` table.

Therefore a present-day controller cannot legitimately demand C0248/C0234/C0237 lineage from GW1–GW3 and then call the missing rows historical integrity failures.

---

## 3. Historical-era taxonomy — planning draft

The exact naming may change, but replay must bind every historical interval/Gameweek to an explicit contract era.

### ERA A — legacy pre-frozen operating period

Observed example: GW1.

Characteristics:

- prediction evidence exists;
- current frozen-predeadline contract is not present;
- modern finalization controls are not present;
- modern C0273 generation/authority concepts did not exist.

Permitted forensic conclusion:

`LEGACY_EVIDENCE_AVAILABLE` / `LEGACY_EVIDENCE_NOT_AVAILABLE`.

Forbidden conclusion:

`CURRENT_CONTRACT_VIOLATION` merely because a later control did not yet exist.

### ERA B — frozen forecast chronology, pre-modern finalization stack

Observed examples: GW2–GW3.

Characteristics:

- frozen predeadline forecasts exist;
- historical chronology can be evaluated more strongly;
- C0248/C0234/C0237 control evidence is absent in inspected tables;
- actual-submission evidence may be incomplete.

Forensic replay may evaluate forecast chronology and available manager/result evidence, but cannot invent modern promotion/gate/publication transitions.

### ERA C — modern pre-C0273 finalization stack

Observed example: GW4.

Characteristics:

- frozen forecast history;
- C0248 sequential planner evidence;
- C0234 gate evidence;
- C0237 publication evidence;
- actual locked manager evidence;
- result observation history;
- but no C0273 event ledger/generation-vector/fencing/canonical-authority implementation.

This is the strongest historical era for validating C0273 semantic adapters and reconciliation logic.

### ERA D — future C0273 shadow era

Begins only after implementation approval and deployment of read-only/shadow controller infrastructure.

Characteristics:

- controller causal ledger available;
- semantic keys/generation vectors available;
- no autonomous production authority yet;
- compare twin state with production existing pipeline.

### ERA E — future C0273 production era

Can exist only after all autonomy approval gates pass and explicit user approval authorizes production changes.

---

## 4. Era membership must be evidence-based

Era boundaries must not be inferred only from Gameweek number.

Future replay registry should bind an era using durable evidence such as:

- first/last availability of required table/function/version;
- first row produced under a contract/version;
- documented deployment/change ID;
- frozen artifact metadata/version;
- known schema/behavior transition.

A Gameweek may contain transitional artifacts from more than one era. Replay should then use the contract attached to each artifact/time boundary rather than forcing one global label.

---

## 5. FORENSIC_AS_WAS contract

Purpose: answer:

> Given only evidence provably available by time T, and only controls/policies known to exist then, what can we reconstruct without look-ahead or invented authority?

Required constraints:

- strict `known_at` / `as_known_at` frontier;
- historical model/config/control version where available;
- no use of later corrections unless replay timestamp is after they became known;
- no use of current injury/news/player-role facts to fill historical gaps;
- no invented C0248/C0234/C0237 events before those controls existed;
- no retroactive generation/fencing IDs fabricated into legacy rows;
- missing evidence remains explicitly missing.

Allowed outputs include:

- `PROVEN`;
- `PROVEN_PARTIAL`;
- `LEGACY_EVIDENCE_NOT_AVAILABLE`;
- `AMBIGUOUS`;
- `CONTRADICTORY_EVIDENCE`;
- `NOT_REPLAYABLE_FROM_RETAINED_EVIDENCE`.

`PASS` must never mean “the current controller would have done the same thing.” It means the historical reconstruction is internally consistent under its historical contract.

---

## 6. CONTROL_REDUCER_REPLAY contract

Purpose: verify deterministic recovery of the future C0273 control plane.

Inputs:

- immutable controller events;
- referenced immutable/versioned domain evidence;
- reducer/policy version;
- historical materialized-state checkpoint if used.

Required invariant:

`same ordered accepted events + same evidence versions + same reducer/policy version => identical per-plane state versions, generation vector, canonical authorities and state hash`.

Failure conditions:

- replayed canonical authority differs;
- lifecycle plane state differs;
- generation vector differs;
- identical inputs yield different hashes;
- reducer depends on wall-clock-now or hidden mutable state;
- latest-row ordering changes authority outcome;
- stale fencing epoch can become canonical during replay.

This mode becomes mandatory only for ERA D/E, because earlier eras do not have the C0273 event ledger.

---

## 7. CURRENT_POLICY_COUNTERFACTUAL contract

Purpose: research what current policy/model/controller would have recommended using historical evidence.

This is useful for evaluating whether C0273 rules improve reliability, but it is **not forensic reconstruction**.

Required labels:

- `COUNTERFACTUAL`;
- current policy/config version;
- historical evidence frontier used;
- any unavailable evidence substitution policy;
- whether current source families would have been unavailable historically.

Forbidden uses:

- rewriting the historical recommendation;
- claiming the output was knowable at the time if required evidence was not retained;
- treating counterfactual selection as actual decision authority;
- using realized results in predeadline feature construction.

Historical rows remain immutable.

---

## 8. FAILURE_INJECTION_TWIN contract

The failure twin must test causal/control safety rather than football prediction accuracy.

Minimum P0 scenarios:

1. controller crashes after enqueue but before durable completion observation;
2. worker succeeds but controller times out;
3. worker writes parent output then crashes before children;
4. duplicate workers complete the same semantic work;
5. stale worker returns after lease takeover;
6. split-brain controllers hold different epochs;
7. official deadline moves earlier while finalization is in flight;
8. official deadline moves later after old work was invalidated;
9. source becomes P0-degraded inside final window;
10. manager state changes after projection but before decision;
11. private manager state becomes unobservable;
12. C0248 primary exists but peer is missing/partial;
13. multiple plausible production-selected artifacts exist;
14. C0234 completes against stale generation;
15. publication row exists but cannot become canonical;
16. cache/API still carries superseded publication;
17. actual submission capture is missing after deadline;
18. result parent exists with incomplete children;
19. provisional final result payload later changes;
20. settlement correction occurs after postmortem/calibration;
21. controller restarts in PAUSE/DRAIN/EMERGENCY_BLOCKED;
22. GW N settlement is pending while GW N+1 planning proceeds;
23. reducer/materialized-state mismatch on restart;
24. content-identical output has different lineage generation;
25. two events share timestamps but have different state-version order.

Each case must have a deterministic expected disposition, not merely “no crash.”

---

## 9. Evidence frontier

Every replay must expose an `evidence_frontier` conceptually containing:

- replay mode;
- season/GW;
- cutoff/known-at timestamp;
- historical era/contract versions;
- authoritative deadline evidence available by cutoff;
- source families available and freshness at cutoff;
- manager-state lane and visibility;
- prediction/model versions available;
- decision-control families available;
- actual-submission evidence available;
- result/settlement evidence available;
- explicitly missing evidence;
- prohibited future evidence.

A replay result without an evidence frontier is not auditable.

---

## 10. Missing evidence is first-class state

Historical gaps must not be silently imputed.

Required categories:

- `NOT_YET_EXISTED` — control/source did not exist in that era;
- `NOT_RETAINED` — it may have existed, but durable evidence was not retained;
- `NOT_OBSERVABLE` — e.g. private predeadline manager state;
- `SOURCE_UNAVAILABLE` — expected provider evidence unavailable at that time;
- `NOT_APPLICABLE` — control irrelevant to that era/mode;
- `UNKNOWN_REASON` — evidence absent with no proven explanation.

These categories materially differ for audit conclusions.

---

## 11. Look-ahead protection

Digital-twin replay is dangerous if historical and current tables are joined without chronology controls.

Mandatory rules:

- every input must have an `as_known_at` eligibility test;
- later settled results cannot leak into predeadline replay;
- later role/xMins recalibration cannot replace historical role evidence unless explicitly counterfactual;
- current player/team IDs may be used for stable entity mapping only when mapping itself is chronology-safe;
- postdeadline actual team cannot influence predeadline decision reconstruction;
- future official deadline corrections cannot be treated as historically known before their publication;
- current source metadata must not be mistaken for historical source availability.

Any unavoidable chronology ambiguity must downgrade replay confidence rather than infer the convenient answer.

---

## 12. Semantic adapter layer for legacy evidence

Legacy rows should remain untouched.

For replay, C0273 may define read-only adapters that derive descriptors such as:

- `legacy_prediction_descriptor`;
- `legacy_planner_descriptor`;
- `legacy_gate_descriptor`;
- `legacy_publication_descriptor`;
- `legacy_actual_descriptor`;
- `legacy_result_observation_descriptor`.

Adapters may calculate best-effort semantic keys/hashes from existing immutable evidence, but must expose:

- fields proven from the row;
- fields inferred deterministically;
- fields unavailable;
- confidence/completeness class;
- adapter version.

Adapters do **not** retrofit C0273 authority into historical rows.

---

## 13. Red-team findings

### Finding 1 — replay equality can become a false goal

Current policy may intentionally differ from historical policy.

**Rule:** forensic replay targets historical consistency; counterfactual replay measures differences. Different answers are not automatically defects.

### Finding 2 — GW4 is valuable but not sufficient

GW4 contains the richest modern chain but only one Gameweek cannot validate rare edge cases.

**Rule:** supplement historical replay with synthetic/failure-injection scenarios before implementation approval.

### Finding 3 — historical evidence density is biased toward successful paths

Crashes/partial states may be under-retained except for some result-sync evidence.

**Rule:** do not infer retry safety because history lacks failures; inject failures deterministically.

### Finding 4 — current DB state can contaminate replay

Queries such as “latest player state” are unsafe for historical replay unless time-bounded.

**Rule:** every adapter/query declares chronology semantics and fails closed if a time-bounded historical state cannot be proven.

### Finding 5 — counterfactual model tests can create hindsight leakage

Using models trained on later Gameweeks invalidates claims about what would have been predicted then.

**Rule:** distinguish `CURRENT_MODEL_ON_HISTORICAL_FEATURES` from `HISTORICAL_MODEL_AS_WAS`; both are research-only unless the latter has exact historical model artifacts.

### Finding 6 — missing actual-submission rows prevent some manager-specific score comparisons

GW1/GW3 actual-manager authority is not proven by the inspected table.

**Rule:** manager-specific realized-decision evaluation for those GWs must be marked incomplete unless an independent authoritative source is found.

### Finding 7 — replay infrastructure itself can overreach

Building a universal historical simulator could become a second engine.

**Rule:** C0273 twin should validate control contracts and chronology using existing engine/model workers/adapters, not duplicate model logic.

---

## 14. Implementation approval gates — P0 draft

C0273 implementation should remain blocked until the planning program can specify evidence for all of the following.

### Gate A — historical-era registry

PASS requires:

- documented era boundaries/contracts;
- deterministic mapping rule;
- explicit treatment of transitional periods;
- no fabricated later controls in earlier eras.

### Gate B — chronology/evidence-frontier contract

PASS requires:

- `known_at`/cutoff policy for every P0 fact family;
- explicit missing-evidence states;
- tests proving later data cannot leak into predeadline replay.

### Gate C — semantic legacy adapters

PASS requires:

- versioned read-only adapters for required historical artifacts;
- no legacy-row mutation;
- provenance showing which identity fields are proven/inferred/unavailable.

### Gate D — deterministic reducer replay

Applicable to C0273 shadow/production eras.

PASS requires repeated replay to produce identical lifecycle state, generation vectors, canonical authorities and state hashes from the same event/evidence sequence.

### Gate E — reconciliation/failure twin

PASS requires all P0 failure scenarios to resolve to expected deterministic dispositions, with zero unauthorized canonical commits.

### Gate F — deadline safety

PASS requires earlier/later/missing/contradicted deadline scenarios and predeadline-start/postdeadline-finish races to fail closed correctly.

### Gate G — authority separation

PASS requires digital-twin proof that:

- recommendation != manager state;
- publication evidence != canonical public authority;
- final audit closure != execution authorization;
- fixture completion != settlement;
- newest row != semantic authority.

### Gate H — cross-GW independence

PASS requires GW N settlement/corrections not to block GW N+1 planning unless an explicit dependency exists.

### Gate I — shadow soak

Before any dispatch authority, future approved implementation must complete a measured shadow soak across multiple decision windows/Gameweeks and include at least one final-window period. Exact duration/number remains open and must be approved from observed stability, not guessed now.

### Gate J — zero unauthorized side effects

PASS requires shadow/twin mode to prove it cannot:

- alter production model selection;
- change C0234/C0237 authority;
- execute FPL account actions;
- mutate historical forecasts;
- write production canonical pointers;
- deploy frontend/runtime changes.

---

## 15. Replay pass/fail vocabulary

Avoid vague `green/red` without semantics.

Use:

- `PASS_EXACT` — deterministic expected state exactly reproduced;
- `PASS_LEGACY_PARTIAL` — available historical evidence reconciles, but era lacks later controls/evidence;
- `PASS_EXPECTED_DIVERGENCE` — counterfactual intentionally differs from historical path and is fully explained;
- `FAIL_CHRONOLOGY_LEAK`;
- `FAIL_NONDETERMINISTIC`;
- `FAIL_AUTHORITY_AMBIGUITY`;
- `FAIL_UNSAFE_RETRY`;
- `FAIL_STALE_COMMIT`;
- `FAIL_INVENTED_EVIDENCE`;
- `FAIL_UNEXPLAINED_STATE_MISMATCH`;
- `NOT_REPLAYABLE_FROM_RETAINED_EVIDENCE`.

---

## 16. What historical GW1–GW4 can validate now

### GW1

Useful for:

- legacy-era adapter behavior;
- handling absence of current frozen-predeadline contract;
- result observation/correction semantics where retained.

Not sufficient for:

- modern finalization control replay.

### GW2

Useful for:

- frozen forecast chronology;
- actual-manager evidence where retained;
- result chronology.

Not sufficient for:

- C0248/C0234/C0237 replay.

### GW3

Useful for:

- dense frozen forecast chronology;
- result chronology;
- missing-actual evidence behavior.

Not sufficient for:

- modern finalization control replay.

### GW4

Useful for:

- strongest available pre-C0273 end-to-end lineage exercise;
- C0248 multiplicity and authority ambiguity;
- C0234 gate chronology;
- C0237 append-only publication history;
- actual submission separation;
- partial result-parent failure evidence;
- postdeadline closure semantics.

Still insufficient alone for:

- event-ledger reducer replay;
- fencing/split-brain tests;
- robust multi-GW shadow validation.

---

## 17. Open questions preserved for user/implementation review

1. Exact historical-era boundary registry format and storage location.
2. Which legacy artifacts have reliable `known_at` vs only `captured_at` timestamps.
3. Whether historical source payloads are retained deeply enough to reconstruct all P0 source manifests.
4. Exact treatment of model binaries/configuration snapshots unavailable historically.
5. Whether counterfactual replay may use today's source adapters against archived raw provider payloads, if available.
6. Minimum acceptable number of Gameweeks/final windows for future shadow soak.
7. Whether one deliberate game-day chaos drill should be required before production approval.
8. Exact tolerance policy for numeric floating-point replay equality.
9. Whether reducer state hashes should be cryptographically chained across checkpoints.
10. Alert/incident channel and human escalation path for replay/twin P0 failures.
11. Exact official FPL settlement-finality authority remains unresolved from prior checkpoints.
12. Private predeadline manager-state observability remains unresolved from prior checkpoints.

None of these questions authorizes implementation by implication.

---

## 18. Recommended next bounded planning batch

The strongest next C0273 batch is **resource isolation, concurrency budgets and deadline critical-path timing**.

Reason: after defining what work is safe, replayable and authoritative, the remaining autonomy design still needs measured limits for how much work can safely execute concurrently and how much verified time is required to recompute the final chain after late invalidation.

That batch should remain planning/read-only and should measure current job durations/resource pressure where durable telemetry exists, then produce conservative planning budgets without changing cron/runtime behavior.

---

## 19. Explicit non-changes

Checkpoint 14 did not:

- create or alter database schema;
- change runtime functions;
- change cron jobs;
- deploy Edge Functions;
- alter model calculations;
- promote or kill any model/shadow;
- modify C0248/C0234/C0237 behavior;
- create canonical pointers;
- change website/frontend behavior;
- rewrite predictions/results/publications;
- execute FPL account actions.

Production implementation remains explicitly approval-gated.

## Recommendation

**DO NOT IMPLEMENT C0273 YET.**

The digital-twin contract is now structurally defined, but implementation approval remains blocked by unresolved P0 source/manager/settlement issues, worker wrappers/reconciliation requirements, unmeasured runtime resource/timing budgets, and the need for future deterministic shadow evidence.