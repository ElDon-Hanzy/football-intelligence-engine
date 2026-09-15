# C0273 — Checkpoint 36: Availability Consumer Registry & Effect Boundary

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 35 by expanding the live availability-consumer trace and separating consumers that can affect current production authority from shadow/research/integrity consumers. This checkpoint is documentation only. It changes no function, schema, model, source, projection, planner, scheduler, API/UI, publication, promotion or retirement behavior.

## 1. Continuity and tracker state

C0273 remains `Open / Planned / P0 / Pre-VPS Stabilization Planning` with model effect `None. Planning/documentation only; zero runtime/model effect.`

Checkpoint 35 remains binding: availability semantic identity must be consumer-bound; immutable provenance identity must remain separate from semantic identity; no field may be removed from the candidate semantic contract until authoritative consumer coverage is proven.

## 2. Live consumer inventory expansion

Live SQL-function discovery for `current_player_fixture_availability` / `player_fixture_availability_observations` identifies at least these current consumers:

- `public.generate_fixture_team_feature_snapshots_v01()`;
- `public.refresh_player_fixture_role_snapshots()`;
- `public.refresh_role_tactical_intelligence()`;
- `public.refresh_replacement_quality_v01()`;
- `public.refresh_replacement_quality_v011()`;
- `public.refresh_absence_consequence_v01()`;
- `public.refresh_fixture_tactical_matchups_v01()`;
- `private.c0147_capture_side_feature_v01()`;
- `private.c0223_horizon_player_state_integrity_v01()`;
- `public.generate_blind_gw_v03()`.

This is a bounded SQL consumer inventory, not proof that no Edge Function/API/application consumer exists. Repository/application consumer tracing remains required before declaring S2-R36 complete.

## 3. Effect-boundary adjudication

The discovered consumers do not all belong in the same semantic-authority denominator.

### A. Current integrity/readiness consumer

`private.c0223_horizon_player_state_integrity_v01()` consumes target-GW availability coverage structurally. Its current policy checks fixture/team/player coverage and expected-XI row counts; it does not inspect every availability field. It can affect readiness/integrity semantics even without changing xPts.

Therefore availability semantics have an **E3 decision-blocking/integrity dimension** in addition to numerical consumers.

### B. Role/fixture-state bridge consumers

`refresh_player_fixture_role_snapshots()` and the fixture-role portion of `refresh_role_tactical_intelligence()` consume availability status and expected-XI state and bind exact availability observation IDs into their hashes/evidence. Current returned metadata says `model_effect_enabled=false` and, for the C0272 side-state bridge, `attack_side_numeric_xpts_effect=false`.

These are evidence/state bridge paths. Their existence does not by itself justify treating every availability-observation refresh as a numeric production-generation change.

### C. Replacement/absence consumers

`refresh_replacement_quality_v01/v011()` use availability to select absent/doubtful targets and available non-XI candidates. They consume at least:

- `availability_status`;
- `base_start_probability`;
- `expected_xi`;
- exact availability observation identity;
- player/role/state evidence.

`refresh_absence_consequence_v01()` consumes linked availability status and chance of playing to calculate absence severity, but its current result explicitly reports `model_effect_enabled=false`.

Thus these paths prove additional semantic fields beyond Checkpoint 35's fixture-team feature consumer, but they currently include shadow/supporting effects that must not automatically enter the mandatory production semantic denominator.

### D. Research replay consumer

`generate_blind_gw_v03()` consumes historical availability status/chance-of-playing through replacement evidence, but declares `research_type=RETROSPECTIVE_BLIND_REPLAY`, `forward_valid=false`, `model_effect_enabled=false`.

It must remain outside current production authority generation. Research replay needs exact provenance for reproducibility, not authority-trigger semantics.

## 4. New key distinction — domain semantics versus authority-trigger semantics

Checkpoint 35 used the phrase “canonical consumer registry.” Live tracing now requires two registries/columns, not one:

1. **Domain semantic consumer coverage** — every consumer whose behavior depends on availability state, including shadow/research where needed for reproducibility.
2. **Authority-trigger consumer coverage** — only consumers whose current lifecycle/effect classification can alter numeric forecast authority, decision selection, blocking, or publication authority.

A field can therefore be semantically meaningful to the domain without being allowed to trigger production replanning today.

Example: `chance_of_playing` is clearly meaningful to absence-consequence research. If that consumer is shadow-only, a change used only by that path must not independently invalidate a production C0248 decision unless another authoritative consumer also uses it.

This prevents research expansion from silently increasing production invalidation/workload.

## 5. Candidate availability field map — still provisional

Live tracing now proves the following fields have at least one current SQL consumer:

- `availability_status` — fixture-team features, role bridge, replacement targeting/candidate filtering, absence consequence;
- `chance_of_playing` — fixture-team features and absence consequence;
- `base_start_probability` — fixture-team features and replacement target relevance;
- `base_expected_minutes` — fixture-team features;
- `xi_score` — fixture-team features;
- `expected_xi` — fixture-team features, role bridge, replacement candidate filtering, integrity counts;
- `xi_rank_within_position` — fixture-team features;
- `confidence` — fixture-team features and role/replacement confidence composition.

Checkpoint 35's eight-field candidate core is therefore strengthened, not weakened.

However, `fpl_status_code`, `news`, and `expected_xi_formation` remain unresolved. They exist on the current availability surface, but the bounded SQL trace in this checkpoint did not prove a production-authority consumer for them. They must **not** be deleted or declared irrelevant; application/Edge Function and upstream-generation consumption still needs tracing.

## 6. Provenance-sensitive consumers are not semantic-trigger consumers by default

Several functions embed exact availability observation IDs into downstream hashes. This proves provenance dependency, not football-semantic dependency.

Target rule:

> Exact source-row identity remains required for evidence lineage and deterministic replay, but it advances production semantic generation only when the registered authoritative consumer-relevant normalized state changes.

Therefore a new availability observation with identical normalized authoritative fields may legitimately create new immutable evidence/bridge rows while leaving the production semantic generation unchanged.

This is not a contradiction; it is the intended separation between audit history and decision authority.

## 7. Consumer lifecycle/effect metadata must bind semantic policy

Checkpoint 26 introduced effect classes E1-E7. Availability semantic-policy membership should be derived from the **exact current consumer lifecycle/effect class**, not from function existence alone.

Proposed planning rule:

- E1 numeric forecast consumer → field participates in production semantic generation;
- E2 selection consumer → field participates if consumed directly/indirectly by selection;
- E3 blocker/integrity consumer → field participates in authority-readiness generation, potentially as a separate sub-generation;
- E4 publication consumer → field participates only if publication authority directly consumes it;
- E5 challenger → challenger generation, not canonical production generation unless policy makes disagreement blocking;
- E6 advisory / E7 research → evidence semantic identity only; no canonical authority invalidation.

This avoids one monolithic `availability_generation` doing too much. A future implementation may need `availability_numeric_generation` and `availability_integrity_generation` (or equivalent vector dimensions) if the same domain has different effect boundaries.

No schema design is authorized here.

## 8. Red-team

### Failure A — register every SQL consumer as production-authoritative

Research/shadow functions would cause unnecessary replanning and could accidentally become blockers.

**Reject.** Bind to lifecycle/effect classification.

### Failure B — ignore E3 integrity consumers because they do not change xPts

A structurally incomplete availability universe could remain numerically stable while decision readiness should fail closed.

**Reject.** Integrity semantics are first-class but separate from numeric semantics.

### Failure C — one availability generation for all meanings

A research-only chance-of-playing refresh or provenance-only row refresh could invalidate canonical decisions.

**Guard:** effect-scoped semantic generations/vector dimensions.

### Failure D — exact observation ID change means semantic change

Current role/replacement hashes would recreate perpetual churn.

**Reject for authority triggering.** Preserve exact IDs in provenance lineage.

### Failure E — exclude `news`/`fpl_status_code` because SQL consumers were not found

Edge Functions/application/upstream normalization may consume them.

**Guard:** complete repository/application trace before exclusion.

### Failure F — freeze semantic field set without consumer-version binding

A future promoted consumer could start using an excluded field without advancing semantic policy.

**Guard:** consumer registry/effect-class change must version semantic policy and reconcile affected authority.

## 9. Planned repair package refinement — NOT AUTHORIZED

### S2-R36A — Availability SQL consumer registry

Record exact SQL consumers, fields, transformations, lifecycle/effect class and whether they are provenance-sensitive or semantic-sensitive.

### S2-R36B — Availability non-SQL consumer registry

Trace Edge Functions, repository application code, API/publication/controller paths and upstream source-normalization consumers.

### S2-R36C — Effect-scoped semantic denominator

Define which registered consumers/fields participate in numeric, integrity/blocking, challenger and research semantic generations.

### S2-R37 — Availability semantic policy v1

Remains blocked until R36A/R36B/R36C are complete and contradictions are adjudicated.

### S2-R39 — Counterfactual materiality suite

Remains required before numeric tolerances/equivalence classes are authorized.

## 10. Acceptance scenarios

Future implementation must prove:

- a provenance-only refresh does not advance canonical authority generation;
- a material authoritative xMins/start/status/expected-XI change advances the appropriate generation;
- an integrity-coverage regression can fail readiness even when numeric state is unchanged;
- a research-only consumer cannot silently become a production invalidator;
- promoting a consumer from research/advisory to production advances semantic-policy identity and forces bounded reconciliation;
- exact evidence row IDs remain available for replay/audit;
- no historical hashes are rewritten.

## 11. Contradictions / open questions preserved

1. SQL discovery is not a complete consumer inventory; Edge Function/application/API/controller consumption remains to be traced.
2. `fpl_status_code`, `news`, `expected_xi_formation` remain unresolved; no irrelevance decision is authorized.
3. `c0223_horizon_player_state_integrity_v01()` uses coarse coverage counts, while Checkpoint 31 established that percentage/count completeness alone is not sufficient to judge player materiality. Future integrity policy must reconcile these contracts.
4. Exact lifecycle/effect classification of each discovered supporting function should be reconciled against the C0213 registry before final semantic-denominator assignment.
5. Replacement/absence paths are currently model-effect false, but tactical/fixture consumers may use their outputs elsewhere; transitive effect tracing remains necessary.
6. Availability numeric tolerances remain unresolved and data-driven.
7. Realized-role consumer-bound normalization remains outstanding.
8. Manager-state authority remains unresolved under Checkpoint 29.
9. Official deadline authority remains unresolved under S1-R1.
10. Canonical publication authority remains unresolved under S1-R3.
11. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
12. No FPL account execution is authorized.

## 12. Decision

C0273 records that availability semantic governance requires an **effect-scoped consumer registry**, not merely a list of functions touching the table. Live SQL tracing strengthens the eight-field candidate semantic core and proves separate numeric/supporting, integrity/blocking and research uses. Provenance identity remains exact; authority-trigger identity must be normalized and effect-bound.

No production behavior changed.

**All implementation, deployment, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI, promotion/retirement and account-execution changes remain explicitly approval-gated.**
