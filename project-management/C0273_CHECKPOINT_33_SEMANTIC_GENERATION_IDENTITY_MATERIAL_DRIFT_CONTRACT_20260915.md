# C0273 — Checkpoint 33: Semantic Generation Identity & Material-Drift Contract

Date: 2026-09-15  
Program: C0273 Pre-VPS Engine/App Stabilization  
Status: PLANNING / RED-TEAM / DOCUMENTATION ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Continue Checkpoint 32 by determining whether the current live data surfaces can support semantic-generation comparison, and define the minimum target identity contract required before PRE-FINAL orchestration may treat upstream drift as material or harmless. No schema, function, cron, projection, planner, model, API/UI or publication behavior is changed.

## 1. Baseline re-read and live re-verification

Checkpoint 32 remains binding: cadence freshness, chronological upstream drift and material semantic drift are different concepts. `upstream_drifted_since_snapshot=true` is evidence that newer upstream observations exist, not proof that the projection is semantically stale.

Read-only live verification at 2026-09-15 05:15 UTC shows the same GW5–GW7 condition persists:

- GW5 run 1368: `projection_ready=true`, `cadence_valid=true`, `upstream_drifted_since_snapshot=true`;
- GW6 run 1359: same;
- GW7 run 1360: same;
- `projection_horizon_ready=true`;
- `ready_for_optimizer=false` independently because manager state is absent.

The latest fixture-upstream timestamp advanced to approximately 05:03 UTC while the prediction identities remain unchanged. This reinforces that timestamp drift is frequent enough that it cannot safely be equated to hard invalidation.

## 2. Live identity-surface finding

A targeted information-schema audit of the relevant production surfaces found no general `generation`, `signature`, or `hash` identity columns on:

- `gameweek_prediction_runs`;
- `player_state` / `current_player_state_latest`;
- `fixture_prediction_snapshots` / `current_production_fixture_prediction_v01`.

Two important upstream observation families do already expose content identity:

- `player_fixture_availability_observations.observation_hash`;
- `realized_player_role_observations.observation_hash`.

Most inspected surfaces otherwise expose timestamps such as `captured_at` / `generated_at` rather than a durable semantic generation identity.

Therefore Checkpoint 32's desired consumed-vs-current generation-vector comparison **cannot currently be implemented uniformly from existing first-class columns**. Some domains can use observation hashes; others need an adapter/derived identity or future explicit generation contract.

This is an architecture gap, not authorization to add columns.

## 3. Identity hierarchy

The target controller must distinguish four identities.

### I1 — Observation identity

Answers: “Which exact provider/internal observation did we ingest?”

Examples:
- observation hash;
- provider revision/effective-at tuple;
- immutable snapshot row identity.

Observation identity is evidence provenance. A new observation does not necessarily imply changed semantics.

### I2 — Semantic content identity

Answers: “Did the decision-relevant meaning change?”

Examples:
- normalized availability/xMins state hash;
- normalized fixture/opponent/schedule hash;
- normalized role/set-piece hierarchy hash;
- normalized governed player-universe hash.

Two observations with different timestamps but the same normalized semantic identity are decision-equivalent for that domain.

### I3 — Domain generation

A monotonic or otherwise ordered authority identity that advances when the canonical semantic state for a domain changes.

Examples:
- `availability_generation`;
- `fixture_generation`;
- `role_generation`;
- `player_universe_generation`;
- `deadline_generation`;
- `model_generation`.

A generation is an authority/control primitive, not merely a timestamp.

### I4 — Consumed generation vector

The exact set of domain generations consumed by a projection/planner/publication artifact.

This is what allows commit-time validation:

`artifact consumed vector == currently allowed vector under invalidation policy`

without requiring timestamp parity.

## 4. Domain-specific target identity contract

### Availability / injury / suspension

Current observation hash is a useful starting primitive. The future semantic adapter should normalize only decision-relevant fields and distinguish provider refresh from material state change.

Material examples:
- availability class changes;
- chance-of-playing / expected-minutes-relevant change;
- suspension/return evidence change.

### Realized role

Current observation hash is also useful, but role semantic identity should be tied to the canonical realized-role state actually consumed by projections, not every raw validation observation.

Material examples:
- role family/position regime changes;
- evidence crosses the numeric-adaptation gate;
- set-piece/advanced-role responsibility changes where consumed.

### Fixture / matchup forecast

Current inspected production surfaces expose captured timestamps but no first-class semantic hash/generation. Target normalized identity should include only fields that can alter the relevant forecast/decision contract, such as fixture identity, opponent, kickoff/schedule authority, canonical forecast/model identity and materially consumed tactical forecast outputs.

### Player state / universe

Current player-state surface has no inspected first-class generation/hash. Target identity must distinguish:

- provider refresh with no relevant change;
- player price/status/team/position/eligibility change;
- addition/removal from governed universe;
- current projection-eligibility state.

### Official deadline

Governed by S1-R1. Deadline generation advances on authoritative official FPL deadline change. Derived first-kickoff-minus-90m must not define this generation.

### Model / definition

Model/version/definition identity must be immutable enough that a projection cannot claim currentness after a production model definition changes without governed compatibility/replay semantics.

## 5. Material-drift decision table

The future reconciler should map domain-generation changes to one of the existing Checkpoint 07 dispositions:

| Change | Default target disposition | Rationale |
|---|---|---|
| newer observation, same normalized semantic identity | NO_EFFECT | chronology only |
| small/non-authoritative evidence change not crossing consumed contract | SOFT_STALE or NO_EFFECT | policy dependent |
| availability/xMins change that affects projection assumptions | HARD_INVALIDATE affected projection | decision-relevant |
| fixture/opponent/reschedule change | HARD_INVALIDATE affected horizon | structural |
| player-universe eligibility change | HARD_INVALIDATE affected candidate universe | optimizer completeness |
| official deadline generation change | HARD_INVALIDATE deadline-bound authority | authority change |
| model generation change | HARD_INVALIDATE or governed SUPERSEDE_ONLY | version policy dependent |
| representation-only/API formatting change | NO_EFFECT | no semantic effect |

These are target defaults, not implemented rules. Exact thresholds remain evidence-driven.

## 6. Important design constraint: do not create one giant global generation

A single `engine_generation` incremented for every observation would recreate timestamp parity under another name and cause unnecessary invalidation.

The generation vector must remain domain-specific so that:

- unchanged GW7 can survive a GW6-only fixture change;
- representation refresh does not invalidate projections;
- availability changes can target affected players/horizons;
- deadline authority can invalidate finalization without pretending the football model changed.

A compact aggregate signature may be computed for convenience, but it must be derived from explicit domain identities and never replace them as audit evidence.

## 7. Historical compatibility

Do not retrofit invented generations into historical artifacts as though they existed at decision time.

For older rows:

- preserve original timestamps/hashes/lineage;
- derive replay-era comparison identities only when evidence permits;
- label derived identities as reconstructed;
- do not use reconstructed generations to overclaim historical autonomous guarantees.

This follows the C0273 historical non-rewrite rule.

## 8. Red-team

### Failure A — hash the entire raw provider payload

Harmless provider ordering/text changes can create false semantic drift.

Guard: normalized decision-relevant domain identity.

### Failure B — omit a consumed field from semantic identity

A real model-relevant change can appear identical and stale projections remain current.

Guard: identity definition must be bound to the exact consumer contract and behaviorally tested.

### Failure C — use timestamps as generation IDs

Recreates current coarse drift behavior.

Reject as semantic authority design.

### Failure D — global generation increments on any change

Causes full-horizon churn and defeats partial reconciliation.

Guard: domain/horizon scoped generations.

### Failure E — content hash changes but downstream numeric result happens to remain equal

Decision equivalence at one output does not necessarily prove safe semantic equivalence for all consumers.

Guard: semantic identity belongs at the consumed input contract, not inferred only from equal final xPts.

### Failure F — stale worker commits after generation advances

Guard: commit-time vector comparison + fencing/CAS from Checkpoints 01/07/25.

## 9. Planned repair packages — NOT AUTHORIZED

### S2-R26 — Domain semantic-identity adapters

Define normalized, versioned semantic identity for availability, roles, fixtures, player state/universe, deadline and model definition. Reuse existing observation hashes where they actually represent the needed semantics; do not duplicate them blindly.

### S2-R27 — Domain generation registry

Expose current canonical generation identities and their provenance/effective-at state without making one global generation authoritative.

### S2-R28 — Projection consumed-generation vector

Future prediction artifacts should durably bind the exact domain generations they consumed.

### S2-R29 — Planner/publication generation propagation

C0248, C0234 and C0237 should carry forward the relevant consumed vector or immutable reference to it, enabling commit-time authority validation.

### S2-R30 — Semantic drift reconciler

Compare artifact-consumed generations with current canonical generations and emit typed `NO_EFFECT / SOFT_STALE / HARD_INVALIDATE / SUPERSEDE_ONLY` evidence.

## 10. Acceptance scenarios

Future implementation should prove:

- provider refresh with identical normalized availability state does not invalidate projection;
- injury/xMins material change does invalidate affected projection;
- fixture reschedule invalidates only affected horizons where possible;
- GW6-only material drift does not automatically invalidate unchanged GW7;
- player-universe addition/removal triggers candidate-universe reconciliation;
- official deadline revision invalidates deadline-bound authority without changing model generation;
- model definition change cannot be hidden behind unchanged timestamps;
- stale worker cannot canonical-commit after a required generation advances;
- historical rows remain untouched and reconstructed replay identities are explicitly labeled;
- semantic identity definition changes are themselves versioned.

## 11. Contradictions / open questions preserved

1. Existing availability and realized-role observation hashes may hash more or less than the future semantic contract requires; their exact normalization definitions still need inspection before reuse.
2. Fixture/player-state surfaces currently lack inspected first-class semantic generation/hash columns; exact adapter storage is unresolved.
3. Exact xMins/material forecast thresholds remain replay/telemetry questions and must not be guessed.
4. Exact scope granularity is unresolved: per-domain, per-GW, per-fixture, per-player or hybrid. Prefer the narrowest granularity justified by workload and lineage complexity.
5. Partial horizon refresh capability/cost remains unverified.
6. Manager state remains absent for GW5 and independently blocks optimizer readiness.
7. Official deadline authority remains unresolved under S1-R1.
8. Canonical publication authority remains unresolved under S1-R3.
9. C0213 full-pool optimizer remains a live hard dependency pending Checkpoint 26 closure evidence.
10. No account execution is authorized.

## 12. Decision

C0273 records that the current production data model has **partial semantic identity primitives, not a uniform generation-vector contract**. Observation hashes exist for at least availability and realized-role evidence, while major fixture/player-state/prediction surfaces still rely primarily on timestamps/row identity for freshness comparison.

The future PRE-FINAL controller therefore must not pretend current timestamp drift can already be safely adjudicated as semantic drift. The target is versioned domain semantic identities, domain generations, consumed-generation vectors and commit-time reconciliation.

No production behavior changed.

**All implementation, deployment, schema, scheduler, cadence, source, projection, model, planner, gate, publication, API/UI and account-execution changes remain explicitly approval-gated.**
