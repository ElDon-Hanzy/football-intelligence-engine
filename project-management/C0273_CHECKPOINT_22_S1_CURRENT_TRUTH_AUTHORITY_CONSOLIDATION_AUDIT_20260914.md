# C0273 — Checkpoint 22: S1 Current Truth & Authority Consolidation Audit

Date: 2026-09-14  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / READ-ONLY AUDIT ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Execute the first bounded Pre-VPS stabilization audit requested by Checkpoint 21: consolidate current live truth/authority contradictions across deadline, manager state, C0248/C0234/C0237 publication authority, actual submission and result settlement before proposing any production repair.

This checkpoint performs no deployment, schema/cron/function/model/frontend change, promotion, retirement, scheduler change, FPL action or historical rewrite.

## Evidence re-read / re-verified

Planning continuity:
- Checkpoint 21 Pre-VPS stabilization program;
- Checkpoint 04 deadline-authority audit;
- Checkpoint 05 manager-state autonomy contract;
- prior C0273 publication, result-settlement, identity and completion-invariant findings;
- live C0273 tracker state (`Open / Planned / Pre-VPS Stabilization Planning / zero model effect`).

Current deployed Edge Functions inspected read-only:
- `gameweek-status-api` v8;
- `fpl-v3-workspace-api` v3;
- `fpl-v3-actual-live-api` v2;
- `fpl-manager-plan-api` v8;
- `fpl-api` v18;
- `fpl-autonomous-gate` v7;
- `fpl-sequential-planner` v6;
- `sync-fpl-manager-state` v1;
- `sync-fpl-actual-decision` v2;
- `sync-gw-results` v5.

No live function was changed.

---

## Executive judgment

The engine has improved semantic separation in several newer APIs, but **S1 is not closed**. The most important loose end is not one bug; it is that multiple production surfaces independently reconstruct `current`, `deadline`, `final`, and `verified` using different rules.

The current system therefore has local truths that are individually plausible but not globally authoritative.

Pre-VPS stabilization should converge these semantics before infrastructure migration.

### Current S1 status

- Deadline authority: **DEFECT CONFIRMED**.
- Manager-state truth: **KNOWN LIMITATION + READINESS DEFECT**.
- C0248 selected authority identity: **SEMANTIC AMBIGUITY CONFIRMED**.
- C0234 authorization: **FAIL-CLOSED STRUCTURE POSITIVE, DEADLINE/MANAGER AUTHORITY DEFECTS REMAIN**.
- C0237/current publication: **SEMANTIC AMBIGUITY CONFIRMED**.
- Actual submitted state: **STRONGEST CURRENT TRUTH LANE; RACE-PROOF IDENTITY STILL INCOMPLETE**.
- Result completeness/settlement: **DEFECT CONFIRMED**.
- V3/app truthfulness: **NEW CROSS-SURFACE CONTRADICTIONS FOUND**.

---

## 1. Deadline authority — P0 defect remains live

### Correct lane

`sync-fpl-actual-decision` v2 reads official FPL `bootstrap-static.events[].deadline_time`, hides picks before that deadline, and only captures the locked actual afterward.

This remains the correct reference authority behavior.

### Incorrect / derived lanes still live

`fpl-autonomous-gate` v7 loads first FPL fixture kickoff and computes:

`deadline = first_kickoff - 90 minutes`

It uses that derived value for `FINAL_T_MINUS_2H_REFRESH` and returns it as `deadline_state.deadline_at`.

`fpl-v3-workspace-api` v3 uses `predictionRun.deadline_at` if available, otherwise derives first kickoff minus 90 minutes. It then labels lifecycle from that value.

`fpl-api` v18 similarly uses stored prediction-run `deadline_at` or derived first kickoff minus 90 minutes for lifecycle/snapshot-stage semantics.

`gameweek-status-api` v8 does not expose official FPL deadline authority at all; its navigation state is fixture-window based.

### Consolidated finding

The previously documented split is not merely an internal scheduler issue. It now leaks into the application/API contract.

A user can therefore receive:
- actual-submission visibility governed by the official FPL event deadline;
- final-gate freshness governed by derived kickoff-minus-90;
- V3 lifecycle governed by prediction/derived deadline;
- navigation governed by fixture timing.

These are different concepts but are not consistently named as such.

### Required future repair — NOT AUTHORIZED

Create one canonical official deadline evidence contract and require every authority-sensitive consumer to use it. Fixture timing may continue to drive match/live navigation, but it must not masquerade as FPL deadline authority.

---

## 2. Manager-state truth — P0 limitation and readiness defect remain

`sync-fpl-manager-state` v1 still attempts public reconstruction from locked picks, transfers, `transfers-latest`, and public history. It calls `my-team/{entry}` without authentication and does not consume that response as private account state.

The function's `currentVisibilityProven` becomes true when `transfers-latest` succeeds or target-event transfers appear publicly. This is not equivalent to an authenticated proof of all current private account mutations.

The function correctly refuses to persist unless its own `stateProven` conditions pass, which is positive. However, downstream consumers still primarily identify manager state by latest row/non-null evidence rather than a canonical authority lane/generation.

`fpl-sequential-planner` v6 selects the latest manager snapshot for the target GW and consumes its 15-player evidence, bank and FT count. It does not independently require a `CURRENT_PRIVATE_VERIFIED` authority state because that state contract is not yet physically represented.

`fpl-autonomous-gate` v7 similarly selects latest manager snapshot and checks lineage ID against the adversarial run, but it does not prove private-current visibility/freshness semantics.

### Consolidated finding

The engine can have internally consistent lineage around a manager-state row that is semantically the wrong lane for the user's current private account.

This is a correctness issue independent of VPS hosting.

### Required future repair — NOT AUTHORIZED

Physically distinguish at least:
- `OPENING_LOCKED_BASELINE`;
- `CURRENT_PRIVATE_STATE`;
- `ENGINE_HYPOTHETICAL_STATE`;
- `ACTUAL_SUBMITTED_STATE`;

and make decision readiness consume authority/freshness/generation, not merely latest manager-state row identity.

Authenticated private-current access remains a product-policy question; recommendation-only operation can remain viable if the limitation is explicit and fail-closed.

---

## 3. C0248 selected authority — semantic identity remains incomplete

`fpl-sequential-planner` v6 itself writes new runs as:

- `shadow_only=true`;
- `production_selected=false`.

Its input signature includes manager-state ID, prediction-run IDs, prices and root configuration, which is useful content/work deduplication.

However, prior live audit established multiple C0248 rows can later carry `production_selected=true` for the same broad manager/prediction lineage with different artifacts. The boolean is therefore not a unique canonical authority identity.

`fpl-autonomous-gate` v7 consumes the C0248 decision-control bridge and treats `selector_cutover_candidate_ready` plus `decision_control_ready` as selector readiness, but it still lacks the C0273 generation-bound canonical authority key planned in Checkpoints 07/13.

### Consolidated finding

C0248 has a usable planner-run identity and signatures, but **production selection is still a state label, not a singular semantic authority primitive**.

Future stabilization must fix selection identity before moving orchestration to another host.

---

## 4. C0234 autonomous gate — good fail-closed pattern, wrong upstream truth can still be green

Positive current properties in `fpl-autonomous-gate` v7:

- checks multiple upstream layers;
- checks decision and prediction lineage IDs;
- checks C0248 readiness;
- checks model-error/noise-control conditions;
- can return `DECISION_NOT_READY`;
- explicitly sets action `authorized:false`;
- does not execute transfers;
- writes immutable-ish gate-run evidence keyed by input signature.

But two P0 weaknesses remain:

1. final T-2 timing is derived from first kickoff minus 90 minutes rather than official FPL deadline authority;
2. manager-state lineage equality proves row consistency, not semantic current-private authority/freshness.

### Consolidated finding

C0234 is structurally fail-closed, but a gate cannot manufacture truth from semantically weak upstream facts. It should remain the authorization boundary conceptually, while its authority inputs are tightened.

---

## 5. C0237/current publication — currentness is still latest-row based

Prior read-only audit established:
- `fpl_live_plan_publications` is append-only;
- `current_fpl_live_plan_v01` selects the latest row by `captured_at/id`;
- no explicit generation-valid canonical authority pointer/revision exists.

The newly inspected APIs show this ambiguity is actively propagated:

### `fpl-manager-plan-api` v8

It returns `current_fpl_live_plan_v01` as the primary plan and declares:

`live_plan_is_best_current_fully_evaluated_plan: true`

This claim is stronger than the underlying current-view contract can presently prove.

### `fpl-v3-workspace-api` v3

It reads the same current view and labels recommendation authorization from publication status + `execution_authorized`, but does not independently validate generation/current-authority revision.

### `fpl-api` v18

It overlays the current live publication only when its prediction run aligns with the selected frozen run. This is a useful extra guard, but prediction-run alignment alone does not prove current manager/deadline/source/gate generation validity.

### Consolidated finding

The application currently has **three levels of currentness checking**:
1. latest publication row;
2. latest publication + status/authorization fields;
3. latest publication + prediction-run alignment.

None yet implements the planned canonical `authority_revision` / generation-valid current pointer.

### Required future repair — NOT AUTHORIZED

One canonical current-publication read contract should feed all V3/current recommendation APIs. The UI should not have to infer authority by combining timestamps, status strings and prediction IDs independently.

---

## 6. Actual submitted state — strongest current lane, but semantic uniqueness still incomplete

`sync-fpl-actual-decision` v2 is comparatively strong:

- uses official FPL deadline;
- never infers actual from engine recommendation;
- requires exactly 15 positions, XI 11, bench 4, captain and vice;
- maps all FPL players to internal IDs;
- freezes the first complete locked selection and reuses DB evidence on later calls;
- stores a content signature in notes;
- has application-level pre/post-fetch race guards.

`fpl-v3-actual-live-api` v2 also refuses comparison unless the stored actual is a complete 11+4 unique squad.

Remaining weakness:
- semantic uniqueness is not enforced by a dedicated DB authority key; concurrent first writers are guarded in application logic rather than a race-proof unique semantic constraint/CAS.

### Consolidated finding

Do not redesign this lane unnecessarily. It should be used as the pattern for other truth lanes: official source, explicit completeness, fail closed, immutable capture, never infer actual from recommendation.

---

## 7. Result completeness and settlement — P0 defect remains and leaks into V3

`sync-gw-results` v5 still:

1. updates fixture rows;
2. inserts a `gameweek_result_runs` parent;
3. then inserts player actual children in batches.

If child insertion fails after parent creation, a durable parent can remain incomplete. This exact historical condition was already observed in prior C0273 audit.

Its unchanged-payload short circuit compares the latest parent payload hash and can return early without proving child completeness. Therefore an incomplete prior run can suppress repair.

Its `is_final` is true when every fixture is `finished` **or `finished_provisional`**. That is fixture completion, not proven official FPL scoring settlement.

### New V3 leakage found

`fpl-v3-workspace-api` v3 exposes `realized.is_final = gameweek_result_runs.is_final` and marks a player's row `status: FINAL` when its fixture IDs are in the result snapshot's finished-fixture set.

`fpl-v3-actual-live-api` v2 similarly sets player `status: FINAL` and `points_are_final=true` when the player's fixtures are finished.

These labels overstate settlement semantics. A fixture/player observation can be complete for the currently observed payload while official FPL scoring remains correctable.

### Required future semantic split — NOT AUTHORIZED

Use distinct terms such as:
- `FIXTURE_OBSERVATION_COMPLETE`;
- `GAMEWEEK_FIXTURES_COMPLETE_PROVISIONAL`;
- `SCORING_SETTLEMENT_WAIT`;
- `SETTLED`;
- `CORRECTED_SUPERSEDED`.

The app may show observed/live/final-fixture points, but must not call them settlement-final unless official settlement authority is proven.

---

## 8. New cross-surface contradiction matrix

| Domain | Surface A | Surface B | Risk | Classification |
|---|---|---|---|---|
| Deadline | actual capture uses official `events[].deadline_time` | gate/V3/FPL API use stored/derived kickoff-minus-90 | authority disagreement | P0 defect |
| Live GW navigation | `gameweek-status-api` fixture-window semantics | decision APIs use publication/prediction availability | user can navigate a different GW concept than decision authority | semantic distinction needed |
| Manager currentness | manager sync has partial visibility semantics | planner/gate consume latest manager row | stale/wrong-lane state can be internally consistent | P0 readiness defect |
| Current recommendation | current view = latest publication | manager API claims best current fully evaluated | API claim stronger than storage proof | P0/P1 truthfulness defect |
| Recommendation validity | FPL API checks prediction alignment | V3 workspace does not add same alignment/generation checks | different APIs can disagree on actionability | P0/P1 contract drift |
| Result finality | result sync `is_final` = fixtures finished/provisional | V3 APIs expose `FINAL` / `points_are_final` | settlement overclaim | P0 semantic defect |
| Actual submission | official locked-picks immutable capture | application-level race guard only | low-frequency duplicate authority possibility | P1 hardening |

---

## 9. What is already good and should be preserved

1. Recommendation and actual submission are not inferred from one another in the newer V3 APIs.
2. `sync-fpl-actual-decision` uses official deadline authority and strong completeness checks.
3. C0234 remains fail-closed and does not execute transfers.
4. C0248 planner run signatures bind meaningful input lineage.
5. V3 APIs use `Cache-Control: no-store`, which reduces transport-cache risk today even though semantic authority revision remains unresolved.
6. `fpl-api` requires live publication/prediction-run alignment before overlaying a current active decision, a useful defensive check that should be generalized rather than discarded.
7. Historical forecasts remain append-only under inspected paths.

---

## 10. Stabilization repair order recommended after separate approval

This checkpoint does not authorize repairs. If implementation is later approved, do not fix each API independently.

Recommended order:

### S1-R1 — Canonical official deadline fact

Make one official FPL event deadline evidence primitive and convert all authority-sensitive consumers to it. Keep fixture timing as a separately named navigation/match clock.

### S1-R2 — Manager-state authority classification

Add explicit state lane + visibility/freshness/generation semantics and make readiness consume them. Do not require authenticated private state if product scope remains recommendation-only; instead expose `CURRENT_PRIVATE_UNOBSERVABLE` honestly.

### S1-R3 — Canonical current publication authority

Define generation-valid canonical publication/currentness, then have all app APIs consume one read contract. Do not patch three APIs with three new ad-hoc checks.

### S1-R4 — Result-run completeness + settlement split

First make result-run parent/children reconciliation safe. Then separate fixture-complete observation from official scoring settlement. Rename/reshape V3 result statuses accordingly.

### S1-R5 — Authority identity hardening

Bind C0248 selected authority, C0234 authorization, C0237 publication and actual capture to explicit semantic/generation identities with race-proof canonicalization.

This ordering minimizes repeated work and prevents UI fixes from hiding backend ambiguity.

---

## 11. Red-team against the repair plan

### Risk A — one giant authority table

Centralizing every semantic into one mutable row would recreate the overloaded Gameweek-state problem.

**Guard:** use shared authority contracts/identities while preserving orthogonal deadline, manager, publication, actual and settlement planes.

### Risk B — treating official deadline as live-match clock

The official FPL deadline and first kickoff are related but not interchangeable.

**Guard:** canonical deadline for decision authority; fixture clocks for match navigation.

### Risk C — marking manager state red all week and making product unusable

If private-current state is intentionally out of scope, permanent blocking could be unnecessarily strict.

**Guard:** distinguish recommendation baseline validity from private-current verification; communicate degraded scope rather than inventing certainty.

### Risk D — fixing labels only

Changing `FINAL` to `PROVISIONAL` in V3 without repairing result completeness would be cosmetic.

**Guard:** result-run completion invariant precedes settlement/UI semantics.

### Risk E — duplicating currentness checks in every API

This creates drift again.

**Guard:** one canonical current-publication read contract, thin API consumers.

### Risk F — rewriting historical rows to new semantics

Would destroy evidence of what the engine knew then.

**Guard:** new authority/settlement interpretation must supersede/join historical evidence, never rewrite frozen forecasts.

---

## 12. Open questions preserved for user review

1. Should recommendation-only operation be allowed from `OPENING_VERIFIED` while current private account state is unobservable, with an explicit warning, or should optimizer readiness block entirely after any possibility of manual mutation?
2. Exact official FPL scoring-settlement authority remains to be proven before implementation.
3. Exact physical canonical-publication primitive remains open: pointer row, authority table/view, or deterministic reducer/materialized state.
4. Whether actual-decision semantic uniqueness should be DB unique key, CAS authority row, or both.
5. Whether V3 should expose two separate concepts to users: `fixture points complete` and `official scoring settled`.
6. Whether `gameweek-status-api` should remain purely navigation-oriented or also expose the canonical official FPL deadline fact after S1-R1.
7. Whether current manager-state public `transfers-latest` behavior is reliable enough for any `CURRENT_PRIVATE_VERIFIED` claim; current planning answer remains no without stronger proof.
8. Exact generation invalidation rules remain those from C0273 Checkpoint 07 and should not be collapsed into one global generation.

---

## 13. Decision / next bounded batch

S1.1 audit is complete as planning evidence. S1 is **not closed**.

The next bounded planning batch should be **S1.2 — Canonical Truth Contract & Repair Dossier**, converting the five repair groups above into implementation-sized change sets with dependency order, acceptance tests, rollback/non-rewrite guarantees, and explicit model-effect classification. It should still perform no implementation.

Production implementation remains explicitly approval-gated.

**DO NOT IMPLEMENT, DEPLOY, ALTER RUNTIME/MODEL BEHAVIOR, PROMOTE, KILL, CHANGE CRONS, OR REWRITE HISTORICAL FORECASTS UNDER THIS CHECKPOINT.**
