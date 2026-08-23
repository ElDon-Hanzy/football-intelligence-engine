# C0050 — Unified pre-match feature snapshot

Status: **Completed / Verified**  
Epic: **C0049 — Validation & sample infrastructure**  
Date: 2026-08-24

## Purpose

Create one canonical, reproducible feature vector per fixture-team that represents only what the engine genuinely knew before that fixture kicked off. This is the foundation for walk-forward evaluation, ablation, learned effects and later model comparison.

## Production objects

- `public.fixture_team_feature_snapshots`
- `public.current_fixture_team_feature_snapshots`
- `public.generate_fixture_team_feature_snapshots_v01(gameweek, match_id)`
- `private.guard_fixture_team_feature_snapshot_insert()`
- `private.block_fixture_team_feature_snapshot_mutation()`
- `private.deduplicate_fixture_team_feature_snapshot_insert()`

Applied production migrations:

1. `c0050_unified_pre_match_feature_snapshot_v01`
2. `c0050_stable_content_dedup_guard`
3. `c0050_fix_append_only_function_search_path`
4. `c0050_add_opponent_fk_index`

Feature schema version: `fixture_team_features_v0.1`.

## Canonical unit

Two rows per fixture: one HOME fixture-team row and one AWAY fixture-team row.

Every row stores:

- fixture/team/opponent/venue identity;
- fixture kickoff;
- snapshot `captured_at` and `evidence_cutoff`;
- canonical `feature_vector` JSON;
- machine-readable `source_manifest` with source row IDs and known-at timestamps;
- `feature_coverage` so missing inputs are explicit;
- stable content fingerprint;
- chronology / forward-valid / model-effect flags.

## Feature families in v0.1

- preserved baseline fixture model, if a genuine pre-kickoff snapshot exists;
- team history recomputed directly from `team_match_intelligence` with source `captured_at <= snapshot cutoff`;
- latest pre-cutoff team state;
- latest tactical profile whose evidence is pre-kickoff;
- fixture-specific tactical snapshot;
- fixture tactical matchup observations;
- player availability, P(start), xMin and Expected XI observations;
- player fixture-role observations;
- rank-1 replacement research per relevant target;
- legacy fixture intelligence signals for traceability.

Market data is intentionally **not** part of the football feature vector v0.1. Odds/market evidence remains a separate research family so later model-vs-market evaluation does not create circular features.

## Chronology controls

The database rejects inserts when:

- the fixture is not FPL-sourced;
- current time is at/after kickoff;
- kickoff/gameweek/team/opponent/venue do not match the fixture;
- snapshot or evidence cutoff is at/after kickoff;
- evidence cutoff is after captured-at;
- chronology-valid or forward-valid is false;
- model effect is enabled.

UPDATE and DELETE are blocked. The table is append-only.

Anon/authenticated access is revoked; service role is the intended reader/writer. RLS is enabled. The current view uses `security_invoker=true`.

## Important source decision

Do not use the existing `team_intelligence_features` view as the canonical historical feature source for experiments. It correctly filters matches by match date, but does not prove when every underlying row became available to the engine.

C0050 therefore rebuilds history directly from `team_match_intelligence` while requiring source `captured_at <= snapshot cutoff`.

This distinction is permanent: **event time is not the same as known-at time**.

## Stable deduplication rule

The initial prototype included the snapshot's own timestamp in the fingerprint. That would create a new row on every rerun even when no football evidence changed.

This was fixed before bulk capture. The stable content fingerprint excludes `source_manifest.snapshot_cutoff`. An unchanged rerun is suppressed; a genuinely richer/different pre-kickoff evidence state appends a new snapshot rather than overwriting the prior one.

The first two Fulham–Chelsea rows created before this fix remain valid historical rows; only their original hash semantics differ.

## Verification

### Fulham–Chelsea — genuine forward capture

`match_id=10`

- eligible fixture-team rows: 2
- inserted: 2
- captured: `2026-08-23T23:01:58.097941Z`
- kickoff: `2026-08-24T19:00:00Z`
- both rows have baseline/history/team-state/tactical-profile/fixture-tactical evidence;
- Expected XI count = 11 for both sides;
- recursive provenance audit: zero nested known-at timestamps after cutoff;
- recursive evidence-cutoff audit: zero nested cutoffs at/after kickoff.

Unchanged rerun after stable-dedup guard left the fixture at two rows.

### GW2 initial capture

Generator call: `generate_fixture_team_feature_snapshots_v01(2, null)`

- 10 fixtures
- 20/20 fixture-team rows inserted
- unchanged immediate rerun inserted **0**
- bad captured-at cutoffs: 0
- bad evidence cutoffs: 0
- bad chronology/model flags: 0
- nested known-at violations: 0
- nested evidence-cutoff violations: 0
- team-history coverage: 20/20
- team-state coverage: 20/20
- tactical-profile coverage: 19/20
- base forecast coverage at this early capture: 0/20
- availability / Expected XI at this early capture: 0
- tactical matchup observations at this early capture: 0

The missing early GW2 families are expected. C0050 records the state that existed at the capture time. When later pre-kickoff sources become available, a subsequent generator run appends a richer version; it does not rewrite the early snapshot.

## Advisor follow-up

The C0050-specific findings were corrected during implementation:

- mutable `search_path` warning on the append-only trigger function — fixed;
- missing index on `opponent_team_id` FK — fixed.

`RLS enabled, no policy` remains an intentional INFO finding because client grants are revoked and the table is service-role-only.

Legacy RLS/security findings on older objects are outside C0050 and must not be mixed into this change.

## Promotion / model effect

C0050 is infrastructure, not a forecast upgrade. `model_effect_enabled=false` is enforced. It exists to make future experiments reproducible and leakage-safe.

## Next change

**C0051 — Experiment registry**: immutable experiment definitions linking Change ID, feature schema, model/outcome version, chronology policy, code commit, train/validation windows and model artifact/coefficient hash.
