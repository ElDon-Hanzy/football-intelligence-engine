# C0223 — Forecast Integration Closeout

Date: 2026-09-08
Status: Completed / Verified (production behavior; final tracker closeout follows this mirror)
Parent: C0220
Workstream: FPL_FORECAST_INTEGRATION

## Objective

Repair the integration defects found before structural squad testing without promoting any unvalidated research model:

1. make production-consumption truth match the live C0220 runtime;
2. eliminate silent cross-Gameweek player-state fallback for the optimization horizon;
3. make the full-pool optimizer tactically role-aware as Decision-Control, without an ad-hoc role points coefficient.

## Production repairs

### Canonical fixture lineage

`public.current_production_fixture_prediction_v01` now selects semantically by production tier rather than newest timestamp alone:

1. `production_fixture_v0.3_c0166`
2. `production_fixture_v0.2_c0159`
3. `forward_fixture_v0.1.3`

`private.generate_upcoming_fpl_projection_core_v01(integer,boolean)` now consumes that canonical view instead of reading raw `fixture_prediction_snapshots` directly. This closes the possibility that a later structural refresh silently bypasses C0159/C0166.

### Registry truth

The C0213 component registry was stale after C0220. It now correctly marks:

- `private.fpl_fixture_goal_lambda_v03` — PRODUCTION / CANONICAL
- `private.fpl_fixture_assist_lambda_v03` — PRODUCTION / CANONICAL

and keeps v02 only as inactive `LEGACY_ROLLBACK`.

### Exact-horizon player state

Added `private.c0223_horizon_player_state_integrity_v01(gameweek)` and wired it into `private.c0220_forecast_integrity_v01`.

The gate requires target-Gameweek availability and role state for all 20 teams and a full player population. Missing target-GW state now fails closed rather than being treated as another Gameweek's role/availability snapshot.

Exact target-GW availability + role snapshots were generated and verified for GW4–GW8:

- GW4: 654 availability / 654 role players
- GW5: 654 / 654
- GW6: 654 / 654
- GW7: 654 / 654
- GW8: 654 / 654

GW6 was regenerated after the repair as immutable projection run **1350**, 604 rows. Team competition constraints remain max 11 start probability and 990 expected minutes; max point-distribution mean gap remains 0.000001.

Important limitation: this is an exact-horizon lineage repair, not an invented future rotation/injury model. Current known information may remain similar across forward Gameweeks until validated congestion/rotation evidence changes it.

## Role-aware optimizer

Deployed `fpl-full-pool-optimizer` edge version **9**, runtime contract `C0223_ROLE_AWARE_FULL_POOL_V01`.

Role state is required separately for every optimized Gameweek. The optimizer fails closed if any horizon Gameweek lacks sufficient role rows.

Role is **not** converted into a points bonus/penalty. Expected points stay authoritative. Role only acts inside the model-error band as Decision-Control.

Current role-risk rule:

- FPL MID/FWD only;
- primary penalty takers exempt;
- control/defensive role in at least half of exact-GW role snapshots;
- role confidence at least 0.70.

Near-equal structures are ordered by:

1. fewer role-risk slots;
2. fewer unknown-role slots;
3. fewer weak xMins slots;
4. higher minimum-minutes durability;
5. fewer transfers;
6. higher raw objective.

This deliberately allows cases such as Szoboszlai (holding-midfielder role but first penalty taker) to remain viable while flagging a non-penalty MID such as Lewis-Potter when modeled as WIDE_BACK.

## Verification

Optimizer runtime test request: **3805**.

Input horizon: GW4–GW6 using runs **1347 / 1348 / 1350**.

Result:

- ROLL: 146.804
- 1 FT: 153.346 (+6.542) — O'Reilly → Guéhi
- 2 FT: 158.047 (+11.243) — O'Reilly → Guéhi; Mosquera → Calafiori
- raw 3 FT: 162.090 (+15.286) — O'Reilly → Guéhi; Mosquera → Gabriel; Semenyo → Schade

The role-control layer did not change the normal-transfer numeric winner in this run because the near-best structures had zero role-risk slots. That is desirable: the gate should alter decisions only when role evidence distinguishes statistically near-equal structures.

The raw Wildcard search remains a benchmark, not a chip recommendation. It still contains one flagged role-risk slot (Lewis-Potter), demonstrating that role awareness is diagnostic/Decision-Control rather than a hard exclusion.

No manager plan was written or changed by C0223.

## Behavioral/governance repair

Correcting the registry exposed that C0213's behavioral suite still probed retired v02 goal/assist functions. The suite initially fell from 14/14 to 12/14. The harness was repaired to perturb the live v03 functions with their current role-adjusted xG/xA inputs.

Final behavioral status: **14/14 PASS**, zero missing/stale components.

Tracker governance before final closeout: green, with zero bad change IDs, zero missing required consumption contracts and zero decision rows without references.

C0223 consumption contract: `C0223_EXACT_HORIZON_ROLE_AWARE_INTEGRATION_V01`.

## Non-promotions

C0223 does not promote:

- C0197
- C0202 player-specific/directional matchup
- A0005
- W0002
- C0210
- C0211
- C0216

Historical forecasts were not rewritten.

## Repository mirror

Mirrored production source:

- `supabase/migrations/20260908171700_c0223_integration_truth_and_horizon_fail_closed.sql`
- `supabase/migrations/20260908172100_c0223_projection_core_canonical_fixture_selector.sql`
- `supabase/migrations/20260908172500_c0223_consumption_governance_contract.sql`
- `supabase/migrations/20260908172800_c0223_behavioral_tests_live_v03_consumers.sql`
- `supabase/functions/fpl-full-pool-optimizer/index.ts`

Production edge SHA256: `a785b258f67273073181be07d22b4f3e537e0b57e9e37b860244a062caf1c700`.

## Decision consequence

C0223 makes structural squad testing materially safer, but it does **not** authorize the raw 3FT result or Wildcard benchmark. Plan 10 remains the provisional manager plan pending the final external-news/tactical T−2h refresh and Decision-Control red-team.
