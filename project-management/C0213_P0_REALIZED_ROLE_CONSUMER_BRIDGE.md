# C0213 P0 — Realized Role Consumer Bridge Repair

Date: 2026-09-05 UTC
Change: C0213
Scope: production reliability only; no new model coefficient, no historical rewrite, no retuning.

## Defect

C0212 correctly overlaid realized competitive tactical roles into `public.current_player_role_profiles`, but that view kept the physical base profile `id` while exposing a virtual overlay `observed_at` and `taxonomy_version` such as `event_role_v0.2.1+realized_v0.1`.

`public.refresh_player_fixture_role_snapshots()` persisted those virtual values into `public.player_fixture_role_observations`.

The older tactical matchup consumer `public.refresh_fixture_tactical_matchups_v01()` expects `taxonomy_version='event_role_v0.2.1'` and joins the physical `public.player_role_profile_observations` table by exact `(player_id, profile_observed_at, taxonomy_version)`.

Result: the realized tactical role label survived, but the physical quantitative `feature_vector` used by the matchup engine became unresolvable.

Before P0, for GW4 expected XIs:

- 222 expected-XI fixture-role rows.
- 206 rows carried the C0212 realized overlay.
- 206/206 realized-overlay rows failed the physical profile join.
- Only 14 expected-XI rows still resolved a physical feature profile.
- Tactical matchup average coverage fell from about 0.94 to about 0.29 for the affected tactical families.
- All 10 GW4 `COMBINED_V01` C0147 fixture adjustments moved after the broken overlay entered production.

## Repair

Migration: `20260905230200_c0213_p0_realized_role_consumer_bridge_v01.sql`

The fixture-role refresh now treats the two identities separately:

1. **Tactical role identity** — the realized C0212 role remains the `primary_role` / `secondary_role` consumed by the fixture tactical layer.
2. **Quantitative feature-profile identity** — the physical `player_role_profile_observations.id`, physical `observed_at`, and physical `taxonomy_version` are pinned into the fixture-role snapshot.

The overlay identity is retained in evidence:

- `role_overlay_taxonomy_version`
- `role_overlay_observed_at`
- `realized_role_applied`
- `realized_role_source`
- `realized_role_known_at`

The quantitative provenance is retained separately:

- `quantitative_role_profile_observation_id`
- `quantitative_role_profile_observed_at`
- `quantitative_role_profile_taxonomy_version`
- `consumer_bridge_version = c0213_p0_v01`

No tactical-role coefficient or direct xG/xA multiplier was added. `numeric_role_uplift_enabled=false` remains explicit.

## Production proof

After refreshing GW4 fixture roles:

- 222 expected-XI rows.
- 208 rows currently carry realized-role overlays.
- 208/208 resolve a physical quantitative profile.
- 0 broken quantitative-profile references.
- 0 current rows expose the virtual `+realized_v0.1` taxonomy to the old quantitative consumer.
- 0 rows enable numeric role uplift.

Integrity function:

`private.c0213_p0_realized_role_consumer_integrity_v01(gameweek)`

GW4 result after deployment: `ok=true`.

The second identical fixture-role refresh inserted 0 rows, proving immediate idempotency.

After rerunning the tactical matchup layer:

- 100 GW4 matchup rows refreshed.
- Average latest matchup coverage restored to 0.9284.
- Minimum coverage 0.6364.
- No latest row below 0.50 coverage.

This is close to the pre-C0212 baseline (~0.94) and far above the broken post-overlay state (~0.29 for the key tactical families).

C0147 was then recaptured for GW4 and C0159/C0166 appended corrected forward fixture forecasts. No frozen research rows or historical forecasts were mutated.

Comparing `COMBINED_V01` adjustments:

- Broken vs pre-C0212 mean absolute home log delta: 0.007760.
- Fixed vs pre-C0212 mean absolute home log delta: 0.002544.
- Broken vs pre-C0212 mean absolute away log delta: 0.003016.
- Fixed vs pre-C0212 mean absolute away log delta: 0.001382.

The remaining difference is expected because realized tactical roles are now legitimately different categorical inputs; P0 removed the accidental feature-vector loss rather than forcing the system back to old archetype outputs.

## De Cuyper proof case

Current GW4 fixture-role state after P0:

- FPL scoring classification remains DEF elsewhere in the FPL player record.
- Tactical `primary_role = WIDE_ATTACKER`.
- Overlay taxonomy recorded in evidence as `event_role_v0.2.1+realized_v0.1`.
- Quantitative base profile remains physical `event_role_v0.2.1` observation id 3011.
- `role_semantics = REALIZED_TACTICAL_ROLE_WITH_BASE_QUANT_PROFILE`.
- `numeric_role_uplift_enabled = false`.

This satisfies the intended C0212 semantics: actual tactical role is preserved without inventing a role coefficient and without destroying the quantitative feature profile required by the existing matchup model.

## Independent blockers intentionally not bypassed

### GW4 decision-evidence readiness

`private.refresh_c0166_fixture_cycle_v01(4)` still returns overall `ok=false` because GW3 is not yet fully complete and the post-GW3 persistent fact/card layer for GW4 does not exist. The corrected fixture forecasts are present, but the decision-evidence gate remains red. P0 did not weaken or bypass this control.

### C0204 full-pool coverage guard

A direct attempt to regenerate the full GW4 FPL snapshot was blocked by C0204 because one player, `Samba` (player id 100695), is currently `MISSING_STATE_AND_BASELINE` and is not yet governed by a C0206 exclusion/prior path. The guard correctly failed closed. This is a separate production-readiness issue and must not be solved by zero-filling or bypassing C0204.

## P0 conclusion

The realized-role → tactical-feature consumer contract is repaired and behaviorally verified for the current GW4 forward path.

P0 does **not** establish a direct numerical realized-role coefficient in player xG/xA. That remains deliberately disabled pending a separately validated model-consumption decision.
