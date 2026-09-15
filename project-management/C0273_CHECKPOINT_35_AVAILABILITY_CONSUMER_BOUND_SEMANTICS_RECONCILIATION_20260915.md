# C0273 — Checkpoint 35: Availability Consumer-Bound Semantics & Reconciliation

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 34 by tracing actual live consumption of availability/xMins observations far enough to define a safer consumer-bound semantic-normalization contract. This checkpoint does not change schema, functions, hashes, projections, planners, models, schedulers, APIs/UI, publications, promotions or retirements.

## 1. Continuity

Checkpoint 34 remains binding: current availability and realized-role `observation_hash` values are provenance/version identities, not proven decision-semantic identities. Target architecture uses member-level normalized semantic identities, compact domain/GW generations, changed-member evidence, partial projection invalidation and full sequential-planner reconciliation when any consumed horizon materially changes.

C0273 remains Open / Planned / P0 / Pre-VPS Stabilization Planning with zero runtime/model effect.

## 2. Live consumer trace — availability

Live function discovery shows several current SQL consumers of `player_fixture_availability_observations`, including fixture-team feature generation and replacement/absence-consequence paths.

The clearest bounded consumer is `public.generate_fixture_team_feature_snapshots_v01()`.

Its `availability_latest` selector chooses the latest observation per `(match_id, team_id, player_id)` subject to chronology constraints. Its aggregate feature vector consumes these availability fields:

- `availability_status`;
- `chance_of_playing`;
- `base_start_probability`;
- `base_expected_minutes`;
- `xi_score`;
- `expected_xi`;
- `xi_rank_within_position`;
- `confidence`.

It also records source observation IDs and `max(captured_at)` in `source_manifest`.

The snapshot hash is currently computed from the complete `feature_vector` **and** complete `source_manifest`. Therefore even when the eight football/decision feature fields remain identical, a refreshed source observation ID or known-at timestamp can change the fixture-team snapshot hash.

This provides a concrete explanation for why existing hash identity is unsuitable as semantic materiality authority: provenance identity is intentionally mixed into immutable snapshot identity.

Important nuance: `news`, `expected_xi_formation`, FPL status code and several raw availability fields are **not** directly included in this particular availability feature-vector consumer. That does not prove they are globally irrelevant; other production consumers must be traced before excluding them from the canonical availability semantic contract.

## 3. Consumer-bound identity principle

A single raw-row semantic hash should not be guessed from the source table. Materiality must be defined from what authoritative consumers actually use.

Target principle:

> A domain semantic identity is the versioned normalized set of fields whose change can alter a current production consumer's numerical output, legality, selection, blocking or publication authority.

For availability this implies two levels.

### A. Core availability/xMins semantic state

Candidate fields already proven consumed by fixture-team feature generation:

`availability_status, chance_of_playing, base_start_probability, base_expected_minutes, xi_score, expected_xi, xi_rank_within_position, confidence`

This is a **candidate**, not yet an authorized final field set.

### B. Consumer-specific extensions

Other authoritative consumers may require additional normalized fields such as FPL status/eligibility, news-derived state, formation evidence or replacement relationships. Those should extend the domain contract only when behavioral tracing proves they affect production semantics.

This prevents both under-normalization and blindly hashing every provider field.

## 4. Provenance identity versus semantic identity

The current fixture-team snapshot design intentionally embeds provenance in `source_manifest`, including exact observation IDs and known-at times. That is valuable for replay/audit.

Target architecture should preserve both identities separately:

- **evidence/provenance identity:** exact rows, timestamps, source revisions and immutable snapshot hash;
- **semantic identity:** normalized consumer-relevant football state only;
- **domain generation:** advances only when semantic identity changes according to versioned policy.

No historical hash should be rewritten. New semantic identities should be additive metadata/contract if implementation is later approved.

## 5. Materiality and rounding

Checkpoint 34 left thresholds unresolved. Consumer tracing sharpens the rule:

- If a consumer uses a numeric field continuously, semantic normalization must not silently round away a change that can alter its output beyond accepted numerical tolerance.
- Thresholds should be derived from counterfactual behavioral sensitivity, not chosen for convenience.
- A field can have a raw semantic identity and a separate **decision-materiality classification**. For example, xMins 79.00 -> 78.99 may be semantically different but decision-equivalent under tested tolerances.

Therefore do not conflate `semantic change` with `must rerun every downstream layer`.

Target sequence:

`raw observation change -> normalized semantic change? -> affected consumer set -> behavioral/materiality test -> dependency closure -> reconcile`

For correctness, unknown materiality fails toward reconciliation until evidence supports a bounded equivalence rule.

## 6. Reconciliation implications

The existing fixture-team feature snapshot hash can change solely because source-manifest provenance changed. A future autonomy controller must not treat every such snapshot-hash change as proof that football semantics changed.

Conversely, the controller must not compare only a small handpicked field subset if another authoritative consumer uses omitted fields.

Recommended planning contract:

1. retain immutable current snapshots/hashes for evidence;
2. introduce versioned consumer-bound semantic normalization per canonical domain capability;
3. expose which canonical consumers are covered by each semantic definition;
4. advance domain generation only when normalized semantic state changes;
5. retain changed-member evidence;
6. use behavioral equivalence rules only after replay/counterfactual validation;
7. if a new production consumer starts using a previously excluded field, advance the semantic-policy version and invalidate/reconcile affected authority accordingly.

## 7. Red-team

### Failure A — use fixture-team feature fields as the entire global availability contract

Other production consumers may use `news`, FPL status or replacement-specific fields.

**Guard:** consumer registry and coverage proof before declaring completeness.

### Failure B — include source IDs/timestamps in semantic identity

Equivalent football state would constantly advance generations.

**Reject.** Keep them in provenance identity only.

### Failure C — remove provenance from immutable snapshots

Would damage audit/replay and chronology proof.

**Reject.** Separation, not deletion.

### Failure D — round xMins/start probability aggressively

Could hide changes near captaincy/start/bench/transfer thresholds.

**Guard:** counterfactual sensitivity tests; unknown cases reconcile.

### Failure E — semantic change always forces whole-engine refresh

Would waste work and recreate timestamp parity.

**Guard:** dependency-closure mapping and materiality classification.

### Failure F — decision-equivalent today becomes non-equivalent after model change

A tolerance calibrated to one consumer version may become unsafe after model/policy update.

**Guard:** bind equivalence policy to exact consumer/model definition identity.

## 8. Planned repair packages — NOT AUTHORIZED

### S2-R36 — Availability canonical-consumer registry

Enumerate every production numerical/selection/blocking consumer of availability state and the exact fields/transformations consumed.

### S2-R37 — Availability semantic policy v1

After S2-R36, define the normalized field set and canonicalization rules with explicit consumer coverage.

### S2-R38 — Provenance/semantic dual identity

Preserve existing immutable evidence hashes while adding a separate semantic identity/generation contract.

### S2-R39 — Counterfactual materiality suite

Test xMins/start-probability/status/expected-XI changes against projection and decision outputs to derive safe equivalence classes/tolerances.

### S2-R40 — Consumer-version invalidation

Changing a production consumer or semantic-policy definition must invalidate prior equivalence assumptions and trigger bounded reconciliation.

## 9. Acceptance scenarios

Future implementation should prove:

- two availability observations with identical consumed football state but different IDs/capture times preserve the same semantic identity while retaining distinct provenance;
- fixture-team immutable snapshot identity may differ while its normalized availability semantic identity remains equal;
- a material xMins/status/expected-XI change advances semantic identity and maps to affected projection work;
- omitted provider metadata does not affect authority unless a registered production consumer uses it;
- adding a new production consumer/field advances semantic-policy identity;
- numerical tolerance cannot suppress a counterfactually material decision change;
- unchanged horizons remain reusable while C0248 reconciles if any consumed horizon materially changes;
- historical rows/hashes remain untouched.

## 10. Contradictions / open questions preserved

1. The full availability consumer inventory is not yet complete. The inspected live function proves eight fields are consumed by fixture-team feature generation, but other production paths remain to be traced.
2. `news`, `fpl_status_code`, `expected_xi_formation` and raw player-state timestamps may matter through other consumers; no exclusion is authorized yet.
3. Exact semantic tolerance for `base_expected_minutes`, `base_start_probability`, `xi_score` and `confidence` remains data-driven and unresolved.
4. Current fixture-team snapshot hash mixes semantic feature content with provenance manifest by design; it remains valid as immutable snapshot identity but not semantic generation authority.
5. Exact hash-generation code for the source availability `observation_hash` itself remains unresolved; this checkpoint no longer needs that code to establish the separation requirement.
6. Realized-role consumer-bound normalization remains to be traced separately.
7. Manager-state authority remains unresolved under Checkpoint 29.
8. Official deadline authority remains unresolved under S1-R1.
9. Canonical publication authority remains unresolved under S1-R3.
10. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
11. No FPL account execution is authorized.

## 11. Decision

C0273 records that semantic materiality must be **consumer-bound**, not inferred from raw source-table hashes. Live fixture-team feature generation proves a concrete availability consumer set and also proves that current immutable snapshot hashing mixes football features with exact provenance IDs/timestamps. The future autonomy contract must preserve provenance while introducing a separate versioned semantic identity and consumer-coverage registry.

No production behavior changed.

**All implementation, deployment, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI, promotion/retirement and account-execution changes remain explicitly approval-gated.**
