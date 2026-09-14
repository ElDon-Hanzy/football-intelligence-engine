# C0273 — Checkpoint 24: S2 Projection Completeness & Decision-Chain Integrity Audit

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / AUDIT ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Perform the next bounded pre-VPS stabilization audit after S1 truth/authority planning. This checkpoint tests two questions without changing production behavior:

1. Is the projected FPL player universe actually complete, rather than merely self-consistent?
2. Does the live decision chain preserve a clear semantic distinction between projection evidence, planner candidates, production selection, autonomous gate status, publication, locked actual decision and realized result evidence?

No runtime code, schema, cron, model, source, frontend, deployment, publication, promotion, kill or FPL-account behavior is changed by this checkpoint.

## 1. Current planning baseline

Checkpoint 23 remains binding. S1 repairs stay ordered as:

`R1 official deadline -> R2 manager-state authority -> R3 canonical publication authority -> R4 result completeness/settlement -> R5 finalization-chain authority identity`.

S2 does not bypass that sequence. Its purpose is to expose additional chain-integrity requirements before implementation is authorized.

## 2. Projection completeness — live evidence

The latest inspected GW5 prediction run is `gameweek_prediction_runs.id=1368`.

Observed internal coverage:

- prediction rows: 604;
- distinct projected players: 604;
- coverage-audit projectable players: 604;
- governed exclusions: 54;
- ungoverned missing: 0;
- coverage-audit total FPL players: 658.

A separate read of `public.players` shows:

- 658 rows with non-null FPL player IDs;
- 658 distinct FPL player IDs;
- all inspected rows share the same current refresh timestamp (`2026-09-14 20:10:01.514+00`);
- status split: 466 available, 16 doubtful, 67 injured/unavailable, 4 suspended, 105 unavailable/other status (`u`), totaling 658.

This is materially stronger than the previous row-count-only completeness check. The prediction coverage total agrees exactly with the independently stored current FPL player registry.

### Judgment

Current projection coverage is best classified as:

**INTERNALLY COMPLETE + REGISTRY-RECONCILED, but not yet FULLY INDEPENDENTLY PROVEN.**

Why not call it fully independently proven yet?

The `players` registry and projection coverage may ultimately share the same upstream FPL bootstrap observation. Therefore the audit now proves that the prediction universe reconciles to the engine's current canonical player registry; it does not yet prove that the registry itself cannot silently omit an upstream player.

### Required eventual completeness invariant

For a prediction run to become `COMPLETE_CURRENT`, all of the following should hold:

1. one versioned source-player-universe observation exists;
2. registry count and unique FPL IDs reconcile to that observation;
3. every source-universe player is classified exactly once as PROJECTED or GOVERNED_EXCLUDED;
4. `PROJECTED ∩ GOVERNED_EXCLUDED = ∅`;
5. `PROJECTED ∪ GOVERNED_EXCLUDED = SOURCE_UNIVERSE`;
6. no ungoverned missing players exist;
7. no duplicate projected player IDs exist;
8. exclusion reasons are explicit, versioned and queryable;
9. the projection run binds to the exact source-universe identity used by this proof.

A plain `604 rows == 604 expected` check remains insufficient.

## 3. C0248 planner identity — live GW4 evidence

GW4 still demonstrates why a boolean `production_selected` is not a sufficient canonical authority identity.

Examples:

- planner run 10: `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`, manager state 4, prediction-run vector `[1356,1348,1350,1352,1353]`, `production_selected=true`;
- planner run 13: same manager-state and prediction-run vector, also `production_selected=true`, but a different input signature and later capture;
- planner run 25: `C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE`, manager state 4, newer prediction vector `[1357,1358,1359,1360,1361]`, `shadow_only=true`, `production_selected=false`.

Therefore:

- multiple production-selected artifacts can coexist;
- identical high-level manager/prediction lineage does not imply one exact authority artifact;
- a later cutover candidate can exist without production-selection authority.

This confirms the need for the S1-R5 generation-bound/CAS authority identity rather than relying on `production_selected=true` alone.

## 4. C0234 autonomous gate lineage — important limitation

GW4 gate history contains many `DECISION_NOT_READY` evaluations and a later gate run 18 with:

- `final_status=FINAL_POST_DEADLINE_CLOSURE`;
- result status `AUTONOMOUS_GATE_POST_DEADLINE_CLOSURE`.

The inspected gate table has no dedicated planner/optimizer-run foreign-key column. The generic JSON result fields queried did not expose a planner-run ID in these rows.

This means the gate artifact is not, at the relational-contract level inspected here, a self-evident exact pointer to the C0248 artifact whose authority it evaluated.

That does not prove the gate is wrong; it proves exact decision-chain lineage is not sufficiently obvious/queryable for autonomous reconciliation.

Required eventual invariant:

> Every authority-bearing gate evaluation must bind to one exact candidate/selection authority identity and its generation vector, not merely to loosely corresponding same-Gameweek evidence.

## 5. C0237 publication lineage exposes a semantic trap

GW4 publication history provides the clearest decision-chain issue in this audit.

The later publication rows reference `optimizer_run_id=25`, while planner run 25 is explicitly:

- `shadow_only=true`;
- `production_selected=false`;
- a `CUTOVER_CANDIDATE`.

Publication rows 32–34 later use that optimizer run together with gate run 18. Row 34 is labelled:

- `publication_stage=FINAL`;
- `publication_status=FINAL`;
- `final_status=FINAL_POST_DEADLINE_CLOSURE`;
- `execution_authorized=false`.

This appears consistent with a post-deadline closure/audit pathway rather than an executable production recommendation. The problem is therefore not necessarily that publication of run 25 is invalid.

The important semantic finding is:

> **A latest C0237 publication can legitimately reference a non-production-selected planner artifact and still be labelled FINAL, provided it is a non-executable post-deadline closure artifact. Therefore “latest publication”, “FINAL publication” and “current actionable production decision” are demonstrably different concepts.**

This directly reinforces S1-R3. Any current/public API that treats the latest C0237 row as the best/current actionable decision without evaluating authority state can overclaim.

## 6. Actual locked manager decision remains a separate strong truth lane

For GW4, `fpl_actual_manager_decisions` contains one inspected locked capture:

- captured at `2026-09-12 22:58:26.961+00`;
- source `public_fpl_api_locked_picks_c0257`;
- exact XI count = 11;
- exact bench count = 4;
- captain and vice-captain IDs present;
- no correction row in the inspected record.

This supports the earlier S1 finding: actual locked submission is a comparatively strong observation of what happened, but it is intentionally separate from recommendation authority.

The engine must never infer that the actual team was recommended merely because it resembles a planner/publication artifact.

## 7. Decision-chain semantic model

The audit supports retaining the following distinct identities:

1. **Source player universe identity** — who exists in the FPL universe at observation time.
2. **Projection-run identity** — projected/excluded classification and player forecasts.
3. **Planner candidate identity** — a C0248 optimization artifact.
4. **Planner authority identity** — the one candidate, if any, canonically selected under a generation/authority contract.
5. **Gate evaluation identity** — evaluation of one exact planner authority against readiness/deadline/generation constraints.
6. **Publication evidence identity** — immutable representation of a recommendation/audit state.
7. **Canonical current-publication authority** — if any, the artifact currently allowed to claim current recommendation authority.
8. **Actual submitted decision identity** — what the FPL account actually locked.
9. **Result observation identity** — observed points/results at a polling generation.
10. **Settlement identity** — officially settled scoring generation.

These identities may refer to related football content but must not be collapsed into one `FINAL`, latest-row, or same-Gameweek concept.

## 8. Red-team findings

### A. Coverage self-consistency masquerading as completeness

The new registry reconciliation substantially improves confidence, but shared upstream provenance can still create correlated omission.

**Guard:** bind prediction completeness to a versioned source universe and prove exact set equality, not only counts.

### B. Multiple production-selected C0248 rows

A boolean can be true on more than one historical artifact.

**Guard:** one generation-bound canonical authority key/pointer with CAS/fencing semantics; historical rows remain immutable.

### C. Gate lineage not directly queryable enough

A gate can be temporally associated with a planner without an obvious exact relational authority key.

**Guard:** exact gate input authority identity must be durable and queryable.

### D. FINAL is overloaded

GW4 shows a FINAL publication that is explicitly `execution_authorized=false` and post-deadline closure.

**Guard:** UI/API and controller logic must use semantic states, never `FINAL` alone as execution/currentness proof.

### E. Latest publication may be non-actionable by design

Post-deadline audit closure can supersede the latest row ordering without creating a current recommendation.

**Guard:** canonical-current authority is separate from latest immutable evidence.

### F. Actual similarity can create hindsight leakage

Locked actual picks observed after deadline must not be allowed to alter the historical recommendation lineage or retroactively validate a planner artifact.

**Guard:** actual and result lanes remain append-only downstream evidence.

## 9. S2 repair implications — planning only

No implementation is authorized, but the audit suggests the following future work items after S1 contracts are approved:

### S2-R1 — Source-universe-bound projection completeness

Bind each prediction run to an exact source-player-universe observation and explicit projected/excluded set proof.

### S2-R2 — C0248 canonical planner authority identity

Replace semantic dependence on `production_selected` boolean with one exact generation-bound authority identity while preserving all historical planner rows.

### S2-R3 — Exact gate input lineage

Make the C0234-equivalent gate bind durably to the exact planner authority and generation vector it evaluated.

### S2-R4 — Publication semantic-state contract

Ensure publication stage/status cannot be interpreted as actionable authority without canonical-authority and execution/deadline state.

### S2-R5 — Recommendation-to-actual evaluation bridge

Create an evaluation mapping that compares recommendation authority to actual locked submission/results without rewriting either lane or conflating them.

These are repair dossiers, not implementation authorization.

## 10. Dependencies

Recommended implementation dependency order remains:

`S1-R1 deadline -> S1-R2 manager truth -> S1-R3 publication authority -> S1-R4 result/settlement -> S1-R5 finalization identity`

Then:

`S2-R1 projection completeness -> S2-R2 planner authority -> S2-R3 gate lineage -> S2-R4 publication semantics -> S2-R5 evaluation bridge`.

S2-R2/R3/R4 may be designed in parallel, but production migration should respect upstream authority dependencies.

## 11. Open questions preserved

1. What exact FPL-bootstrap/source observation becomes the canonical source-player-universe identity?
2. Are the 54 governed exclusions fully queryable with stable reason codes and policy version, or partly embedded in audit JSON/function logic?
3. Should transferred-out/historical players remain in the source universe for the current GW or move to an era-aware non-current registry lane?
4. What exact authority primitive will replace semantic reliance on multiple `production_selected=true` rows?
5. Should the gate store a direct FK to planner authority, an immutable semantic authority key, or both?
6. Which post-deadline C0237 publication states should remain visible as historical audit evidence versus hidden from the normal “current plan” product surface?
7. Does every publication referencing a shadow/cutover planner correctly remain `execution_authorized=false` under all historical cases, not only the inspected GW4 case?
8. Exact result-parent/child completeness and official settlement closure remain governed by S1-R4 and need their own implementation evidence.
9. Current private manager-state observability remains unresolved under S1-R2; exact lineage cannot make an unobservable current private state authoritative.

## 12. Decision

S2.1 audit is complete for the bounded questions inspected.

Current judgment:

- **Projection universe:** strong registry-reconciled completeness evidence; full independent source-universe proof still pending.
- **C0248:** semantic canonical authority remains ambiguous because multiple historical production-selected artifacts can coexist.
- **C0234:** fail-closed status behavior is useful, but exact planner-authority lineage is not sufficiently explicit/queryable in the inspected relational contract.
- **C0237:** latest/FINAL publication is proven not equivalent to current actionable production authority; post-deadline closure can reference a non-production-selected planner while execution remains false.
- **Actual locked decision:** remains a separate strong downstream truth lane and must not be conflated with recommendation authority.

Recommended next bounded planning batch:

> **S2.2 — Model/Layer Consumption & Orphaned-Logic Audit:** trace which projection, tactical, xMins, role, captaincy, defensive-contribution, fixture, peer/red-team and shadow layers are actually consumed by the final planner/gate/publication path; identify duplicated, bypassed or orphaned layers before adding or refactoring models.

**Production implementation remains explicitly approval-gated. DO NOT IMPLEMENT, DEPLOY, CHANGE SCHEMA/CRON/RUNTIME/MODELS, PROMOTE OR KILL ANYTHING under this checkpoint.**