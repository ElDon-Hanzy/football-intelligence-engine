# C0273 — Checkpoint 13: Canonical Semantic Identity & Lineage-Key Contract

Date: 2026-09-14  
Program: C0273 Autonomous Website / Engine Control Plane  
Status: PLANNING ONLY — NO IMPLEMENTATION AUTHORIZED  
Runtime/model effect: NONE  
Production changes: APPROVAL-GATED

## Purpose

Define the semantic identity contract for the durable artifacts and authority transitions in the autonomous Gameweek chain, then red-team the proposed keys against the available GW1–GW4 production evidence without rewriting or backfilling legacy rows.

This checkpoint extends C0273 Checkpoints 01–12. It does **not** create schema, change functions, deploy code, alter runtime behavior, promote/kill models, or mutate historical forecast/result artifacts.

---

## 1. Why this contract is required

The live system already has several useful identifiers:

- database row IDs;
- timestamps;
- `input_signature` values;
- model/planner versions;
- prediction-run IDs;
- manager-state IDs;
- payload hashes;
- append-only/correction links.

None of those should be treated generically as "the semantic identity" of every artifact.

The controller must distinguish at least five concepts:

1. **observation identity** — one durable observation/attempt/evidence occurrence;
2. **semantic work identity** — what deterministic computation was requested;
3. **content identity** — what normalized semantic output was produced;
4. **authority identity** — which semantic output was allowed to advance canonical state;
5. **representation identity** — how an already-authoritative artifact was rendered/published.

Conflating these creates retry ambiguity, duplicate authority, unnecessary invalidation, and historical-replay errors.

Core rule:

> `row_id != timestamp != input_signature != semantic identity != authority identity`.

An existing signature may approximate one of these for a particular worker, but C0273 must not assume that globally.

---

## 2. Identity design principles

### 2.1 Semantic keys use football/control facts, not incidental execution facts

A semantic identity may include:

- season / Gameweek;
- FPL entry identity when manager-specific;
- model/config/policy lineage;
- official deadline generation;
- manager-state generation;
- source component lineage hashes actually consumed;
- prediction generations;
- search configuration when it changes the computation;
- provider revision/payload identity for observations.

It should normally **exclude**:

- database row ID;
- insert timestamp;
- worker request ID;
- HTTP request ID;
- scheduler attempt number;
- lease owner;
- control/fencing epoch;
- retry count.

Those are execution/audit metadata unless a specific contract proves otherwise.

### 2.2 Fencing is a commit guard, not semantic identity

`control_epoch` / fencing token must be checked before an authority transition commits, but restarting the controller must not create a new football decision merely because the epoch changed.

### 2.3 Generations are semantic versions, not invocation counts

A retry producing the same normalized facts under the same semantic key should not manufacture a new semantic generation.

### 2.4 Content equality does not automatically imply authority equality

Two artifacts may render identical squads/captains while being based on different manager/deadline/source generations. They may be content-equivalent but not authority-equivalent.

### 2.5 Authority equality does not require representation equality

A presentation-only website change must not create a new decision generation merely because UI wording/layout changed.

---

## 3. Canonical lineage-key vocabulary

C0273 proposes the following conceptual identifiers. Physical columns/tables remain unapproved.

### A. `semantic_work_key`

Deterministically identifies the requested computation from its declared semantic inputs/configuration.

Used for dedupe/reconcile.

### B. `input_lineage_hash`

Canonical hash of the exact normalized upstream semantic identities consumed.

Used to prove replayability and detect stale work.

### C. `content_hash`

Canonical hash of the normalized semantic output excluding nonsemantic telemetry/timestamps.

Used to distinguish content equality from work/authority identity.

### D. `authority_key`

Identifies one authority transition candidate, including the semantic artifact being authorized and the required authority-policy/generation context.

Used by CAS/fencing transitions.

### E. `representation_key`

Identifies a publication/render representation of an authoritative artifact.

Used for API/UI/cache/versioning without manufacturing a football decision.

### F. `observation_key`

Identifies a provider observation/revision/payload. `observed_at` can remain an occurrence timestamp while repeated identical provider content maps to the same semantic observation identity when policy permits.

---

## 4. Projection semantic identity

### Proposed semantic work key

Conceptually:

`PROJECTION_WORK(season, target_gw, projection_lane, model_lineage_hash, projection_policy_version, official_deadline_generation, consumed_source_manifest_hash, availability_generation, role_xmins_generation, eligible_universe_hash, as_known_at_boundary_policy)`

Notes:

- `generated_at` is **not** the semantic identity;
- row ID is **not** the semantic identity;
- the source manifest must be decomposable to consumed component hashes;
- expected player universe/coverage identity belongs in lineage because 604/604 child-count equality alone does not prove the correct universe was projected;
- `as_known_at` chronology belongs to the semantic contract to prevent look-ahead during replay.

### Projection content identity

Normalize and hash the player-level forecast payload plus model-relevant aggregate metadata, excluding insert timestamps and operational telemetry.

### Current legacy compatibility

Legacy prediction rows remain immutable. A future controller may derive a **legacy lineage descriptor** at read/reconciliation time, but must not rewrite historical rows to retrofit C0273 keys.

---

## 5. C0248 planner-candidate identity

### Proposed semantic work key

`PLANNER_WORK(entry_id, season, target_gw, horizon, manager_state_semantic_id, ordered_prediction_semantic_ids, planner_version, decision_policy_version, canonical_search_config_hash, chip_policy_version)`

Important details:

- prediction order matters when horizon semantics depend on ordered Gameweeks;
- search configuration is semantic when beam width/branch policy can change the result;
- manager row ID alone is insufficient for future autonomy; bind manager-state semantic generation/lineage;
- any random seed or nondeterministic search parameter must be included if the algorithm can produce different content from otherwise equal inputs.

### Cross-beam verification identity

A peer verification should have a separate identity:

`PLANNER_VERIFICATION(primary_candidate_semantic_id, peer_candidate_semantic_id/set, verification_policy_version, equivalence_tolerance_version)`

It is not merely "latest other planner row".

---

## 6. C0248 production-selection authority identity

Production selection is not ordinary compute identity.

### Proposed authority key

`PRODUCTION_SELECTION_AUTHORITY(entry_id, season, target_gw, selected_candidate_semantic_id, verification_set_semantic_id, promotion_policy_version, deadline_generation, manager_state_generation, finalization_generation, required_source_generation_vector)`

Commit additionally requires the **current fencing/state-version guard**, but fencing epoch does not become part of the semantic authority identity.

### Critical live finding

GW4 currently contains **three** rows where:

- `production_selected=true`;
- `shadow_only=false`;
- planner version is `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`;
- `manager_state_id=4`;
- all use the same prediction-run set `[1356,1348,1350,1352,1353]`;
- two record beam width 8 and one beam width 6;
- all have different input signatures.

Therefore:

> `production_selected=true` is evidence of a promotion artifact, but it is not by itself a unique canonical authority identity.

The future controller must know exactly **which candidate + peer verification + generation vector** the authority transition refers to.

Legacy rows are not declared corrupt by this finding; they were produced under the historical contract. The issue is that the historical contract is insufficient for unattended canonical authority.

---

## 7. C0234 final-gate identity

### Proposed semantic work key

`FINAL_GATE_WORK(entry_id, season, target_gw, horizon, production_selection_authority_id, gate_policy_version, deadline_generation, manager_state_generation, finalization_generation, required_generation_vector_hash)`

### Output/content identity

Gate result content includes evaluated gate set and disposition such as:

- `DECISION_NOT_READY`;
- allowed predeadline final-authorization state;
- postdeadline audit-closure state.

The result status is output, not part of the work key.

### Authority rule

Two gate rows with different statuses are not automatically conflicting if they bind different semantic generations/selection authorities. They **are** conflicting if they claim the same exact authority key and cannot be deterministically ordered/explained.

---

## 8. C0237 publication identity vs canonical-public authority

### Publication semantic identity

`PUBLICATION_ARTIFACT(decision_authority_id, publication_contract_version, public_schema_version, normalized_plan_content_hash, blocker/freshness_semantics_hash)`

This identifies the immutable public artifact.

### Representation identity

Presentation-only changes should use a representation key conceptually equivalent to:

`PUBLIC_REPRESENTATION(publication_artifact_id, representation_schema_version, locale, renderer_version)`

A CSS/layout/text-formatting change must not manufacture a new football decision generation.

### Canonical-public authority key

`CANONICAL_PUBLIC_AUTHORITY(entry/scope, season, target_gw, publication_artifact_semantic_id, publication_generation, deadline_generation, finalization_generation, fallback_policy_version)`

Canonical-public selection remains a separate CAS/fencing transition.

This directly preserves Checkpoint 08's rule that append-only publication evidence != current canonical publication authority.

---

## 9. Actual locked-submission identity

Actual submission is account/provider evidence and must not derive identity from the engine recommendation.

### Proposed observation/semantic key

`ACTUAL_SUBMISSION(entry_id, season, gameweek, official_deadline_event_id/generation, provider_locked_state_revision_or_payload_hash)`

Normalized content includes:

- exact 15;
- starter/bench ordering;
- captain/vice;
- chip state;
- authoritative provider/source identity.

### Correction rule

If the provider later corrects the authoritative locked record, create a new observation/correction identity linked to the prior observation. Never rewrite the prior evidence.

### Historical asymmetry

Within GW1–GW4, durable actual-manager rows exist only for GW2 and GW4 in the inspected table. Historical replay must represent GW1/GW3 actual-submission authority as **not proven by this table**, not invent missing evidence.

---

## 10. Result-observation identity

### Proposed observation key

`RESULT_OBSERVATION(season, gameweek, provider/source, provider_revision_if_available, normalized_payload_hash)`

`observed_at` is occurrence/audit metadata, not the semantic payload identity.

Repeated polls with the same payload may generate multiple controller ledger observations while resolving to one semantic result-observation identity.

### Completion identity

A payload hash is not sufficient to claim completion. Completion additionally binds the expected fixture/player child coverage invariant defined in Checkpoint 12.

### Settlement identity

Settlement remains separate:

`SETTLEMENT_AUTHORITY(season, gameweek, canonical_result_observation_semantic_id, official_finality_evidence_revision, settlement_policy_version, settlement_generation)`

A later official correction creates a new settlement generation and supersedes prior settlement authority without rewriting historical forecasts.

---

## 11. Historical GW1–GW4 red-team

The proposed identity model was tested read-only against available production evidence.

### 11.1 Predictions show why `(GW, model, generated_at)` is storage identity, not semantic decision identity

Observed counts:

| GW | prediction runs | distinct model versions | eligible frozen predeadline rows |
|---|---:|---:|---:|
| 1 | 3 | 2 | 0 |
| 2 | 10 | 1 | 10 |
| 3 | 39 | 1 | 39 |
| 4 | 51 | 1 | 51 |

Implications:

- later Gameweeks contain many immutable predeadline generations/observations for one model version;
- timestamp uniqueness safely preserves history but cannot tell the controller which semantic generation is current;
- GW1 predates the later frozen-predeadline operating contract and must not be force-fit into it.

### 11.2 C0248/C0234/C0237 historical evidence exists only for GW4 in the inspected scope

Observed:

- GW4 C0248 planner runs: 29, all with distinct input signatures;
- GW4 production-selected planner rows: 3;
- GW4 C0234 gate runs: 18, with `DECISION_NOT_READY` and `FINAL_POST_DEADLINE_CLOSURE` represented;
- GW4 C0237 publications: 29 distinct signatures across 10 source/version labels, with `CONTESTED` and `FINAL` states.

No corresponding rows were found for GW1–GW3 in these inspected tables.

Therefore the C0273 replay/digital-twin program needs **era-aware replay capability**:

- do not demand nonexistent C0248/C0234/C0237 lineage for Gameweeks before those controls existed;
- distinguish `LEGACY_EVIDENCE_NOT_AVAILABLE` from `CURRENT_CONTRACT_VIOLATION`;
- never backfill invented authority events into historical data.

### 11.3 Production-selected multiplicity proves a boolean cannot be the authority key

As described above, three GW4 `production_selected=true` rows exist against the same manager/prediction set under different promotion artifacts.

The semantic authority key must therefore contain the selected candidate/verification/policy/generation context rather than relying on the boolean or latest row.

### 11.4 Actual-submission coverage is incomplete historically

Inspected `fpl_actual_manager_decisions` rows:

- GW2: one row;
- GW4: one row;
- GW1/GW3: no row in this table.

This is not automatically an engine defect; it is a historical-evidence limitation for replay.

### 11.5 Result polling strongly validates observation-vs-semantic identity separation

GW1 alone contains many result-run observations. After all 10 fixtures had been marked finished, multiple later rows remained `is_final=true` while carrying **different `payload_hash` values**.

Examples from the inspected final period include hashes beginning:

- `847228...`;
- `64fcd4...`;
- `9dd89e...`;
- `7ac67e...`;
- `31ad6d...`.

All were recorded with 10/10 finished fixtures.

This reconfirms two separate requirements:

1. one `is_final=true` row is not scoring settlement authority;
2. repeated polling occurrence is not the semantic result identity — payload/revision identity matters.

---

## 12. Canonicalization rules

Before hashing semantic keys/content, future contracts must define canonical serialization.

Minimum rules:

- stable field ordering;
- explicit null vs absent semantics;
- arrays marked as **ordered** or **set-like** per field;
- stable numeric precision/rounding contract;
- stable timezone/UTC normalization;
- stable player/team/fixture IDs;
- exclusion of observational timestamps/telemetry from semantic content unless explicitly meaningful;
- configuration objects normalized recursively;
- versioned canonicalization algorithm.

Without this, equivalent JSON objects can hash differently due to representation alone.

---

## 13. Equivalence classes

Not all equality is binary. C0273 should distinguish:

### `EXACT_SEMANTIC_EQUAL`
Same semantic key and normalized content hash.

### `CONTENT_EQUAL_LINEAGE_DIFFERENT`
Same output football plan/forecast but different upstream generation lineage.

May be useful for diagnostics, but must not collapse authority history.

### `DECISION_EQUIVALENT`
Different lower-level numeric/search outputs resolve to the same legally actionable squad/transfer/XI/captain/chip decision under a versioned equivalence policy.

May reduce user-visible churn but does not erase lineage differences.

### `REPRESENTATION_ONLY_DIFFERENT`
Same authority/content, different renderer/public schema/locale/presentation.

Must not increment decision generation.

### `NOT_EQUIVALENT`
Material football/actionable or authority difference.

---

## 14. Red-team findings

### Finding 1 — using current raw IDs as future semantic identity would make replay fragile

Row IDs are durable references but do not encode meaning and cannot be reproduced in a digital twin.

**Contract:** keep row IDs as physical evidence references; derive semantic keys from normalized domain/control facts.

### Finding 2 — existing `input_signature` values are useful but heterogeneous

Different functions construct them from different field sets and algorithms. Some are MD5, some longer hashes; their semantic scope differs.

**Contract:** legacy signatures remain evidence. Future controller contracts declare the exact canonical fields and hash version; never assume every current `input_signature` means the same category of identity.

### Finding 3 — canonical key may become too large

Full source manifests/generation vectors can be verbose.

**Contract:** store a canonical descriptor + versioned cryptographic hash, with the underlying descriptor queryable/auditable. Do not retain only an opaque hash.

### Finding 4 — config drift can silently change identity

If policy thresholds/search defaults change without entering the key, equal-looking work keys can produce different outputs.

**Contract:** effective resolved configuration hash, not merely a function version string, must be lineage-visible when config affects semantics.

### Finding 5 — deterministic algorithm assumption may be false

Parallel/nondeterministic optimization could emit different outputs under identical declared inputs.

**Contract:** either make computation deterministic, include semantic seed/solver settings, or classify differing same-key outputs as `CONFLICTING` until an approved canonicalization rule resolves them.

### Finding 6 — content-equal revalidation near deadline needs policy

A hard upstream generation may change, trigger recomputation, and yield the exact same actionable plan.

**Open question:** may the system re-establish current authority by binding identical content to the new generation without a full public-content churn? Recommended direction: yes, but only through a new authority transition/lineage event; do not pretend the old lineage became current retroactively.

### Finding 7 — public caching needs semantic version separation

If the website cache key uses only GW and latest timestamp, stale authority can leak despite correct backend lineage.

**Contract direction:** public status payload should expose authority/publication generation and representation schema version separately.

### Finding 8 — legacy era boundaries must be explicit

GW1–GW3 cannot satisfy controls that did not yet exist.

**Contract:** digital-twin acceptance must distinguish "replay historical evidence under the contract that existed then" from "simulate today's controller against historical source snapshots." These are different tests.

---

## 15. Proposed minimum identity matrix

| Artifact/transition | Semantic subject | Must bind | Must NOT rely on alone |
|---|---|---|---|
| Projection | season/GW/lane | model+config, source lineage, deadline gen, coverage universe, chronology | generated_at, row ID |
| Planner candidate | entry/GW/horizon | manager semantic state, ordered predictions, resolved search/policy config | latest row, signature without field contract |
| Cross-beam verification | primary candidate | qualifying peer/set + tolerance/policy version | "different beam exists" |
| Production selection | selected candidate | verification set + generation vector + promotion policy | `production_selected=true` |
| C0234 gate | selected authority | exact selection lineage + gate policy + current gens | latest gate row/final_status alone |
| Publication artifact | decision/gate authority | public contract + normalized semantic content | insertion order |
| Canonical public authority | GW/public scope | current publication + gens + fallback policy + CAS | latest publication row |
| Actual submission | entry/GW/deadline | provider locked revision/payload | engine recommendation |
| Result observation | GW/provider | payload/revision + complete normalized coverage | observed_at, parent row, is_final |
| Settlement | GW | canonical result + official finality evidence + settlement generation | fixtures finished/is_final alone |

---

## 16. Digital-twin / replay tests added by this checkpoint

Future read-only digital twin must prove:

1. duplicate retry with identical normalized inputs resolves to one semantic work identity;
2. same semantic work key producing divergent content is detected as conflict unless nondeterminism policy explicitly resolves it;
3. content-identical recompute under a newer hard generation creates new authority lineage without rewriting the old artifact;
4. controller fencing restart does not create new semantic identity;
5. presentation-only V3 change does not create a new football decision generation;
6. three historical GW4 `production_selected` rows do not collapse blindly into one authority without reconstructable promotion semantics;
7. historical GW1–GW3 absence of later decision-chain tables is classified as era limitation rather than corruption;
8. repeated equal result payloads dedupe semantically while preserving polling ledger evidence;
9. changed result payload after fixtures finish creates a new observation identity and cannot be hidden under prior `is_final=true`;
10. legacy prediction runs can be referenced without mutating them or inventing missing C0273 generations;
11. ordered arrays (prediction horizon, bench order) and set-like arrays are canonicalized differently and deterministically;
12. effective config changes alter semantic keys only where that config is actually consumed.

---

## 17. Preserved contradictions / open questions

No implementation decision is authorized for these yet:

1. exact physical key storage: explicit columns vs descriptor JSON + digest vs normalized relation;
2. hash algorithm/version for future semantic IDs;
3. whether IDs should be UUIDv5-like deterministic identifiers or opaque IDs plus unique semantic digest;
4. exact canonical JSON/serialization standard;
5. precise definition of `eligible_universe_hash` for projection completeness;
6. whether `as_known_at` is encoded directly or through a frozen causal-ledger frontier identity;
7. deterministic solver seed requirements for C0248 and any future optimizer;
8. how many peers constitute one verification set if cross-beam policy expands;
9. whether content-identical revalidation may reuse the prior publication artifact while creating only a new canonical-authority binding;
10. public API/cache key design for authority generation vs representation version;
11. legacy-era registry boundaries and which control contract applied to each historical GW;
12. exact official FPL settlement/finality authority remains unresolved from Checkpoint 06;
13. private-current manager-state visibility remains unresolved from Checkpoint 05.

---

## 18. Approval boundary

This checkpoint is planning/documentation only.

It does **not** authorize:

- schema/key/index creation;
- historical backfill;
- changes to prediction signatures;
- changes to C0248 promotion;
- changes to C0234 or C0237;
- changes to manager-state capture;
- changes to result sync/settlement;
- controller implementation;
- cron changes;
- website/runtime changes;
- model/shadow promotion or retirement;
- FPL account execution.

All such production changes remain explicitly human approval-gated.

---

## 19. Next bounded planning batch

The strongest next batch is **digital-twin replay modes & historical-era contract**:

- separate forensic replay from counterfactual current-controller simulation;
- define era boundaries for GW1–GW4 and later;
- specify which missing lineage is acceptable legacy absence vs a present-day integrity failure;
- define the minimum snapshots/evidence frontier required to replay a Gameweek deterministically;
- establish pass/fail criteria before any controller implementation is approved.

Current recommendation remains: **DO NOT IMPLEMENT C0273 YET.**