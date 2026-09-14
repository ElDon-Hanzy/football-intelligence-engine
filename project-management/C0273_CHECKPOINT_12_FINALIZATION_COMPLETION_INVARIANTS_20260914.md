# C0273 — Checkpoint 12: Finalization-Chain Completion Invariants

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Turn Checkpoint 11's worker classifications into explicit reconciliation/completion semantics for the critical Gameweek finalization chain:

1. final predeadline projection;
2. C0248 primary planner candidate;
3. C0248 cross-beam peer;
4. C0248 production selection;
5. C0234 autonomous gate;
6. C0237 publication;
7. locked actual-submission capture;
8. result observation;
9. later settlement authority.

This document defines how a future controller should classify durable evidence as:

- `ABSENT`
- `PARTIAL`
- `COMPLETE_CURRENT`
- `COMPLETE_STALE`
- `CONFLICTING`
- `SUPERSEDED`

It does not implement these classifications.

---

## 1. Re-read / inherited constraints

This checkpoint extends C0273 Checkpoints 01–11. Hard rules remain:

- production changes require explicit human approval;
- official FPL deadline must become sole final deadline authority before autonomous finalization;
- recommendation != manager state != actual submitted state != realized result;
- immutable evidence is not automatically canonical authority;
- transport success/request ID is not work completion;
- stale workers may finish diagnostically but cannot commit authority;
- no historical forecast may be rewritten;
- C0234-equivalent final authority cannot be bypassed;
- C0237 append-only publication is distinct from canonical-publication selection;
- settlement authority remains distinct from fixture/result observation.

---

## 2. Live evidence re-verified in this batch

Read-only production inspection confirms:

### Final prediction

`gameweek_prediction_runs` stores immutable/frozen prediction-run parents and `model_predictions` stores child player rows.

For the latest inspected GW4 predeadline run (`prediction_run_id=1365`):

- `frozen=true`;
- `excluded_from_backtest=false`;
- metadata reports `projection_rows=604`;
- actual child row count is also `604`;
- metadata still records `deadline_source=derived_first_kickoff_minus_90m`.

Current uniqueness is not a semantic finalization key. `gameweek_prediction_runs` is unique on `(model_version_id, gameweek, generated_at)`, while child predictions use their own model/player/match/generated-at uniqueness.

### C0248 planner

`fpl_sequential_planner_runs` has a unique `input_signature` and carries:

- `manager_state_id`;
- `prediction_run_ids[]`;
- planner version;
- search config;
- result payload;
- `shadow_only`;
- `production_selected`.

The latest inspected GW4 candidate runs are V06 cutover candidates with explicit prediction-run arrays and manager-state ID.

### C0248 production promotion

Live `private.c0248_promote_verified_candidate_v01`:

1. selects the latest V06 cutover candidate by `(captured_at,id)`;
2. finds a peer with the same manager state and same prediction-run array but a different beam width;
3. compares selected/best roots and utilities;
4. checks hardening conditions;
5. appends a new `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED` row under a deterministic signature.

This is append-only promotion evidence, which is good.

However, the function does **not** currently bind selection/promotion to:

- official `deadline_generation`;
- current `manager_state_generation` identity beyond raw row ID;
- source-readiness component generations;
- finalization generation;
- fencing/control epoch;
- commit-time current-authority comparison.

Therefore a candidate can be computationally verified without yet being proven **currently promotable** under C0273's future contract.

### C0234 gate

`fpl_autonomous_gate_runs` has unique `input_signature`, lineage run IDs and `final_status`.

The inspected GW4 history includes several `DECISION_NOT_READY` runs and a later `FINAL_POST_DEADLINE_CLOSURE` run. These statuses are evidence states; postdeadline closure is explicitly not retroactive execution authority.

### C0237 publication

`fpl_live_plan_publications` has unique `input_signature` and immutable update/delete blockers. Publications bind prediction, manager, optimizer and gate IDs.

Current canonical selection is still not generation-aware (Checkpoint 08).

### Actual submission

`fpl_actual_manager_decisions` is append-only through mutation blockers but has no Gameweek/signature uniqueness. The inspected GW4 locked actual row contains exactly 11 starters + 4 bench players plus captain/vice and FPL deadline/source evidence in notes.

### Results

`gameweek_result_runs` parent rows have no payload uniqueness. Child rows live in `player_gameweek_actuals`.

The current live GW4 result history again demonstrates the partial-parent problem directly:

- some result parents have `child_count=0`;
- a later result parent for a newer payload has `child_count=658`.

A durable result parent therefore cannot be treated as completion.

---

## 3. Universal reconciliation vocabulary

The controller must apply one semantic vocabulary across workers, while each worker supplies its own exact invariant.

### `ABSENT`
No durable output exists for the exact semantic work key.

This does not mean no HTTP attempt occurred.

### `PARTIAL`
Some durable output exists, but the worker-specific completion invariant is false or cannot be proven.

Examples:

- prediction parent exists but expected children are incomplete;
- result parent exists with missing player children;
- planner result exists but mandatory result sections are absent/invalid.

A partial artifact may be repairable or nonrepairable depending on the worker contract.

### `COMPLETE_CURRENT`
The output satisfies its full completion invariant **and** all hard-bound generations, component lineage, fencing/deadline requirements and authority preconditions still match current canonical state.

Only this classification may advance a current semantic lifecycle transition.

### `COMPLETE_STALE`
The output is internally complete and historically valid but at least one hard-bound upstream generation/authority has changed.

It remains audit evidence but cannot advance current finalization.

### `CONFLICTING`
Two or more durable outputs claim the same semantic work identity/authority but cannot be proven semantically equivalent or deterministically ordered by the contract.

The controller must fail closed until reconciliation produces one unambiguous disposition.

### `SUPERSEDED`
The output was valid/current when produced but a later valid generation or canonical authority explicitly replaced it.

Supersession is not corruption.

---

## 4. Invariant A — final predeadline projection

### Future semantic work key

Conceptually:

`(season, target_gameweek, model/config lineage, deadline_generation, source component lineage, availability_generation, role_xmins_generation, projection policy version)`

The exact physical key remains unresolved.

### `ABSENT`
No prediction parent exists for the exact work key.

### `PARTIAL`
Parent exists but any of the following is unproven:

- frozen/immutable eligibility for the intended lane;
- expected target-GW projection coverage;
- expected child count/content identity;
- child rows all bind to the parent;
- integrity metadata passes;
- no target-GW actual leakage;
- expected model/config lineage is present;
- intended source/readiness lineage is present.

Current metadata `projection_rows` matching child count is useful evidence but cannot by itself define the future expected-coverage contract. Expected coverage must be derived independently from the eligible target-GW universe/fixture contract.

### `COMPLETE_CURRENT`
All completion checks pass and:

- official deadline evidence/generation is current;
- hard-bound source/availability/role-xMins generations remain current;
- commit occurred before the applicable official deadline guard;
- controller fence/epoch is current;
- no newer projection generation has already superseded it for the same semantic lane.

### `COMPLETE_STALE`
Projection is structurally complete but a hard-bound upstream generation changed after it was computed.

### `CONFLICTING`
Multiple same-work-key projections differ semantically without an explicit allowed equivalence/canonicalization rule.

### `SUPERSEDED`
A later complete projection generation becomes canonical for the current planning lane.

Historical frozen rows remain unchanged.

---

## 5. Invariant B — C0248 primary planner candidate

### Future semantic work key

Conceptually:

`(entry_id, season, target_gameweek, horizon, manager_state_generation, ordered prediction generations/IDs, planner version, beam/search config, policy lineage)`

### `ABSENT`
No planner run exists for the exact signature/config.

### `PARTIAL`
Run exists but required result structure cannot be proven complete.

Minimum future structural checks should include:

- `result.ok`/status semantics valid for the planner version;
- search summary exists;
- selected normal root exists when normal-path evaluation is expected;
- branch results required by policy are present;
- no-clairvoyance/regression controls are present;
- canonical fresh Wildcard/Free-Hit squad payloads are structurally valid when required;
- squad outputs used for selection are legal and complete;
- result-declared `planner_version`, `shadow_only`, `production_selected` agree with row semantics;
- exact manager/prediction lineage matches the requested work key.

Presence of a unique `input_signature` proves identity/deduplication, not automatically semantic completeness.

### `COMPLETE_CURRENT`
Full planner invariant passes and every hard-bound manager/prediction/deadline generation remains current.

### `COMPLETE_STALE`
Planner result is complete but manager state, a bound prediction generation, deadline generation or required policy lineage has changed.

### `CONFLICTING`
Two same-semantic-key planner outputs cannot be proven equivalent, or result payload contradicts row metadata.

### `SUPERSEDED`
A later planner generation/config intentionally replaces this candidate for current selection while preserving history.

---

## 6. Invariant C — C0248 cross-beam verification

Cross-beam evidence is not a generic “second run.” It verifies robustness of one candidate under an intentionally different search beam/config.

### `ABSENT`
No qualifying peer exists for the primary candidate's exact manager + prediction lineage.

### `PARTIAL`
Peer exists but:

- is itself incomplete;
- does not differ on the required verification dimension;
- comparison metrics/roots needed by promotion contract are missing.

### `COMPLETE_CURRENT`
Both primary and peer are individually `COMPLETE_CURRENT`, their required lineage identities match, beam/search dimensions satisfy the verification contract, and equivalence/hardening checks pass under the current promotion-policy version.

### `COMPLETE_STALE`
Cross-beam proof was valid for an older candidate/generation vector.

### `CONFLICTING`
Primary and peer both complete but fail equivalence/robustness checks. This is not necessarily a system error; it is a legitimate decision blocker.

### `SUPERSEDED`
A newer primary candidate requires a new peer verification; the old pair remains historical evidence.

---

## 7. Invariant D — C0248 production selection authority

This is an `AUTHORITY_CAS_ONLY` transition, not ordinary computation.

### Critical live red-team finding

Current promotion selects the latest V06 candidate and appends a production-selected row if peer/hardening checks pass. This does **not** yet prove the candidate is current under C0273 generations/fence/deadline at commit time.

### `ABSENT`
No production-selected artifact exists for the exact candidate/peer promotion identity.

### `PARTIAL`
A production-selected row exists but any required promotion evidence is absent or its source candidate/peer cannot be resolved to complete artifacts.

### `COMPLETE_CURRENT`
Future authority transition must prove atomically at commit:

1. primary candidate is `COMPLETE_CURRENT`;
2. cross-beam verification is `COMPLETE_CURRENT`;
3. required promotion-policy/hardening version is current;
4. current manager, prediction, deadline and finalization generations equal the candidate's bound generations;
5. fencing epoch/state version is current;
6. no higher current production-selection authority already exists;
7. official deadline commit guard permits the transition.

### `COMPLETE_STALE`
Production-selected evidence is historically valid but its bound generation vector is no longer current.

### `CONFLICTING`
More than one production-selected authority exists for the same semantic generation without an explicit deterministic supersession ordering.

This must fail closed.

### `SUPERSEDED`
A later authorized production selection explicitly replaces it under a newer generation.

---

## 8. Invariant E — C0234 final gate

C0234 remains the sole final decision-authorization boundary in the intended architecture.

### `ABSENT`
No gate run exists for exact selected-decision lineage.

### `PARTIAL`
Gate row exists but required gate evaluation/result structure or mandatory upstream lineage is incomplete/unresolvable.

### `COMPLETE_CURRENT`
Gate run must:

- bind the exact current production-selected decision lineage;
- include all required hard gates;
- evaluate every required gate rather than omit/null-pass it;
- satisfy current manager/prediction/deadline/finalization generations;
- pass current fencing/state version;
- perform commit-time official deadline authority check;
- explicitly distinguish `FINAL_AUTONOMOUS_DECISION`, `DECISION_NOT_READY`, and postdeadline audit closure semantics.

Only an allowed predeadline authorization state can permit execution/public final authority. `FINAL_POST_DEADLINE_CLOSURE` is audit closure, not retroactive authorization.

### `COMPLETE_STALE`
Gate run is complete but one hard-bound generation/selected path changed.

### `CONFLICTING`
Different gate outcomes claim the same semantic decision generation without deterministic ordering/equivalence.

### `SUPERSEDED`
A later gate generation evaluates a newer selected-decision generation.

---

## 9. Invariant F — C0237 immutable publication + canonical publication authority

These are two different completion questions.

### F1. Publication artifact

`ABSENT`: no publication row for exact decision/gate/publication signature.

`PARTIAL`: row exists but expected plan payload, gate/decision lineage, freshness/blocker/lineage contract or signature resolution is incomplete.

`COMPLETE_CURRENT`: immutable publication row is complete and exact upstream gate/decision generations are current at publication commit.

`COMPLETE_STALE`: publication was completely generated but its bound decision/evidence generations were invalidated.

`CONFLICTING`: same semantic publication identity has differing content with no approved representation rule.

`SUPERSEDED`: later publication generation replaces it for current display.

### F2. Canonical public authority

The current production view `current_fpl_live_plan_v01` uses latest insertion order; Checkpoint 08 already rejects that as a future autonomy authority.

Future canonical selection must independently prove:

- chosen publication is `COMPLETE_CURRENT` or an explicitly allowed soft-stale state;
- generation vector matches current authority;
- no hard invalidation exists;
- deadline/fallback policy permits display/actionability;
- canonical pointer/state transition wins fencing/CAS checks.

A publication artifact may therefore be complete while canonical-publication authority is absent.

---

## 10. Invariant G — locked actual submission

The actual submitted team is evidence of what the manager account submitted, not evidence of what the engine recommended.

### `ABSENT`
No authoritative postdeadline locked-picks capture exists for `(entry, season, GW, official deadline generation)`.

### `PARTIAL`
Any of the following is missing/invalid:

- exactly 15 unique picks;
- exactly 11 starters and four ordered bench players;
- captain and vice identities valid within the 15;
- chip state semantics resolved;
- authoritative source/entry/GW identity;
- proof capture is post official deadline/locked state;
- source signature/evidence revision.

### `COMPLETE_CURRENT`
A single authoritative locked submission is proven for the intended official deadline generation.

Current table append-only protection is good, but lack of a database Gameweek/signature uniqueness means reconciliation must detect races/duplicates explicitly.

### `COMPLETE_STALE`
Normally not used for the locked actual itself after deadline. If official provider later corrects the locked-picks record, prior evidence becomes superseded/corrected rather than silently stale.

### `CONFLICTING`
Two authoritative captures for the same locked submission disagree materially with no provider revision/correction explanation.

### `SUPERSEDED`
A later explicit correction supersedes the prior capture through correction lineage; previous evidence remains immutable.

---

## 11. Invariant H — result observation

Result observation is not settlement.

### `ABSENT`
No parent observation exists for the intended provider payload/source revision.

### `PARTIAL`
Parent exists but expected child realization coverage is incomplete or payload identity cannot be reconciled.

Live production has already exhibited this state: durable GW4 parent result runs with zero child rows.

### Future completion rule

A result observation cannot be `COMPLETE_*` until a queryable invariant proves at minimum:

- parent payload/source identity;
- expected fixture coverage;
- expected/mapped player realization coverage;
- child count/identity matches the normalized provider payload contract;
- no incomplete child batch remains;
- payload hash/source revision matches the observation being classified.

A later equal payload must repair/complete a partial observation rather than short-circuit merely because a parent exists.

### `COMPLETE_CURRENT`
Full observation is complete for the latest current official result payload/revision. This still does **not** imply scoring settlement.

### `COMPLETE_STALE`
Observation is complete but a newer official payload/revision exists.

### `CONFLICTING`
Same provider revision/payload identity yields materially different normalized children.

### `SUPERSEDED`
A newer official payload/revision replaces it as the current result observation.

---

## 12. Invariant I — settlement authority

Settlement remains deliberately unresolved at the provider-authority level.

The future settlement transition can only become `COMPLETE_CURRENT` when:

1. the exact official FPL Gameweek-finality criterion is proven;
2. the bound result observation is `COMPLETE_CURRENT`;
3. settlement generation is atomically allocated;
4. later corrections create new immutable settlement generations rather than rewriting the old one.

Until the exact 2026/27 official finality field/transition is empirically proven, settlement authority remains `NOT_AUTONOMY_READY`.

---

## 13. Cross-step invariant matrix

| Step | Requires structural completeness | Requires generation equality | Requires fence/CAS | Deadline-sensitive | May be complete but stale | Authority-changing |
|---|---:|---:|---:|---:|---:|---:|
| final projection | yes | yes | commit fence | yes | yes | projection canonicalization only |
| C0248 primary | yes | yes | commit fence | yes for final window | yes | no |
| C0248 peer | yes | yes | commit fence | yes for final window | yes | no |
| C0248 production selection | yes | yes | **yes** | **yes** | yes | **yes** |
| C0234 gate | yes | yes | **yes** | **yes** | yes | **yes** |
| C0237 publication artifact | yes | yes | yes | yes | yes | append evidence |
| canonical publication selection | yes | yes | **yes** | **yes** | n/a | **yes** |
| locked actual capture | yes | deadline identity | single-writer/reconcile | postdeadline authority | correction semantics | evidence authority |
| result observation | yes | result revision | reconcile | no | yes | observation canonicalization |
| settlement | yes | settlement/result generation | **yes** | no | correction supersession | **yes** |

---

## 14. Deterministic recovery sequence for the finalization chain

After crash/failover, future controller recovery should not replay C0272-style orchestration blindly.

Conceptual recovery order:

1. resolve official current deadline generation;
2. resolve current source/manager generations;
3. classify final projection;
4. classify primary planner candidate;
5. classify cross-beam peer verification;
6. classify production-selection authority;
7. classify C0234 gate;
8. classify publication artifact;
9. reconstruct canonical publication authority;
10. independently classify actual-submission capture if postdeadline;
11. classify current result observation;
12. classify settlement authority separately.

At each step:

- `COMPLETE_CURRENT` -> continue;
- `ABSENT` -> dispatch only if retry/work policy permits;
- `PARTIAL` -> reconcile/repair before retry;
- `COMPLETE_STALE` -> preserve, then schedule current-generation replacement if still useful and deadline allows;
- `CONFLICTING` -> fail closed;
- `SUPERSEDED` -> follow the explicit newer canonical generation.

---

## 15. Red-team findings

### Finding 1 — row-count equality can create false confidence

Current GW4 final projection has metadata `projection_rows=604` and 604 children. That is encouraging, but a controller must not define completeness as “metadata count equals child count” because both could be wrong in the same way.

**Required future rule:** expected coverage must be derived independently from the target-GW eligible universe/fixture contract.

### Finding 2 — promotion's “latest candidate” lookup is not a current-generation proof

C0248 promotion currently chooses latest V06 candidate by timestamp/id. After a hard invalidation, “latest candidate” may still be stale against a newer generation that has not finished computing.

**Required future rule:** authority transition names the exact candidate work identity and validates current generation/fence/deadline atomically; it must not rediscover the candidate by latest-row semantics.

### Finding 3 — deterministic signatures prevent duplicate identity, not stale authority

Planner/gate/publication unique signatures are strong dedupe mechanisms, but a perfectly unique stale artifact is still stale.

**Required future rule:** signature uniqueness and current-authority validation are separate checks.

### Finding 4 — postdeadline closure can look deceptively “final”

GW4 has C0234/publication rows labeled `FINAL_POST_DEADLINE_CLOSURE` / `FINAL`, while `execution_authorized=false`.

**Required future rule:** generic `FINAL` must never be consumed as execution authority. Consumers use typed semantic status/authority flags.

### Finding 5 — result parent durability is demonstrably not result completion

GW4 includes parent result runs with zero children.

**Required future rule:** result completion is always child-completeness + payload identity, never parent existence.

### Finding 6 — actual-decision append-only evidence still lacks race-proof identity

Mutation is blocked, which protects history, but there is no unique Gameweek/source-signature key.

**Required future rule:** controller reconciliation must classify duplicates/conflicts before any one row is treated as canonical actual submission.

### Finding 7 — publication completion and publication authority are distinct

C0237 can successfully append a valid publication while current canonical authority should still be absent due to hard invalidation or fallback policy.

**Required future rule:** never collapse “publication worker succeeded” into “website may present this as current actionable recommendation.”

---

## 16. Future digital-twin acceptance tests added by this checkpoint

Before dispatch approval, replay/digital-twin testing must prove at least:

1. prediction parent with 90% child coverage -> `PARTIAL`, never complete;
2. prediction parent+children internally complete but manager/source/deadline generation changed -> `COMPLETE_STALE`;
3. primary planner complete, peer absent -> promotion remains `ABSENT/BLOCKED`;
4. complete primary+peer that disagree materially -> `CONFLICTING`, no promotion;
5. old complete candidate remains latest durable row while a new generation is pending -> old candidate cannot promote;
6. promotion call times out after append -> reconciliation finds exact production-selected row and does not blindly append/retry authority;
7. C0234 gate completes after deadline-generation change -> retained as stale evidence, no final authority;
8. C0237 append succeeds after upstream hard invalidation -> artifact retained but cannot become canonical current publication;
9. two identical locked actual captures -> deduplicated semantically/reconciled without hiding evidence;
10. two materially different locked actual captures for same authority revision -> `CONFLICTING` until correction lineage resolves it;
11. result parent with zero children -> `PARTIAL`;
12. result payload complete then later official payload changes -> former observation `SUPERSEDED`/stale, new observation current;
13. fixture completion with unsettled FPL scoring -> result observation current, settlement absent;
14. postdeadline `FINAL_POST_DEADLINE_CLOSURE` -> never execution-authorized;
15. controller restart reconstructs identical classifications from durable evidence without relying on prior in-memory workflow state.

---

## 17. Open contradictions / questions preserved for user review

No assumption is made on the following:

1. exact independently derived expected player coverage formula for a complete prediction run;
2. whether a semantically identical newer projection should allocate a new projection generation or be treated as re-observation/revalidation;
3. exact canonical equivalence tolerance for planner results beyond current C0248 cross-beam utility tolerance;
4. whether planner promotion should reference immutable candidate/peer IDs directly or a future semantic authority object;
5. exact storage representation of generation vector/fence binding for old vs future artifacts;
6. whether predeadline publication artifacts generated after soft-stale events may remain actionable under any approved policy;
7. exact database uniqueness/canonicalization design for actual submitted decisions;
8. exact expected player-result coverage formula when official FPL element universe includes inactive/unregistered/no-fixture players;
9. official FPL 2026/27 event-finality field/transition for settlement;
10. provider correction/revision identity when official APIs change data without explicit revision IDs;
11. exact safety/time budget for starting or abandoning recomputation near deadline;
12. whether legacy artifacts lacking future generation vectors are classified through an adapter as `LEGACY_UNPROVEN` rather than forced into `COMPLETE_STALE`.

These remain approval/design questions. None is silently resolved here.

---

## 18. Updated implementation recommendation

**DO NOT IMPLEMENT YET.**

This checkpoint makes the finalization reconciliation model concrete enough to expose the next planning gap: we now need a **canonical identity / lineage key specification** that defines the exact semantic work keys and generation bindings for these finalization artifacts, including how legacy rows are mapped without rewriting history.

A following bounded planning batch should define that identity contract and test it against GW1–GW4 historical evidence.

---

## 19. Explicit non-changes

This batch did not:

- create or alter schema;
- change any function;
- change any Edge Function;
- change any cron;
- alter deadline behavior;
- alter projection/model behavior;
- alter optimizer/planner behavior;
- promote or kill any model/shadow;
- change C0234/C0237/C0248 runtime behavior;
- alter V2/V3 website runtime;
- alter FPL account state;
- rewrite any historical evidence;
- deploy anything.

All future production changes remain explicitly human approval-gated.
