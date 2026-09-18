# C0279 P8 — Chronological Shadow Evaluation Closeout

**Phase status:** Completed / Verified  
**Promotion status:** Blocked  
**Date:** 2026-09-18  
**Production effect:** None

## Executive judgment

P8 completed the evidence inventory, leakage checks, eligible GW1–GW4 replay and exact P0 GW5 prospective freeze. The result does **not** support promotion.

The fixture replay is chronology-safe, but the early sample is weak and the selected scoring environments/families did not demonstrate stable value. A valid prior-season performance backtest and retroactive player/captaincy evaluation cannot be run from the current evidence without leakage. Those absences are retained as blocking negative evidence rather than filled with reconstructed hindsight.

## Cohorts

### Prior-season history — blocked

- Historical fixture-team feature rows: 2,000.
- Distinct historical fixtures: 1,240.
- Chronology-safe rows: 2,000.
- Rows marked as genuine historical captures: **0**.
- Trustworthy prematch prediction/outcome pairs: **0**.

The available archive can support research and prior construction, but not a fair forecast-performance backtest. P8 fails this sub-gate closed.

### GW1–GW4 replay — eligible fixture layer

- Eligible snapshots: 38 fixtures.
- Selection: latest snapshot strictly before each kickoff.
- Coverage: GW1 8/10; GW2–GW4 10/10 each.
- Chronology-valid: 38/38.
- Unique evidence hashes: 38/38.
- Actual results used only during evaluation, never generation.

| Metric | Result |
|---|---:|
| 1X2 multiclass Brier | 0.628772 |
| Over 2.5 Brier | 0.241105 |
| BTTS Brier | 0.229604 |
| Exact-score log loss | 2.943456 |
| Total-goal MAE | 1.518693 |
| Scoring-environment accuracy | 31.58% |
| Selected-family accuracy | 18.42% |
| Representative exact-score accuracy | 5.26% |
| Raw modal exact-score accuracy* | 15.00% |

\* Raw-modal comparison is available only where the historical snapshot stored that field (GW3–GW4).

The representative-family headline improved interpretability but did not improve exact-score hit rate in this small replay. This is retained as negative evidence. P3–P7 consume the preserved probability matrix and therefore produce **zero core 1X2/goal-market probability delta by design**; they cannot claim a Brier/log-loss gain without a later promoted calculation change.

### Player-tail and captaincy/chip replay — blocked

- P5 resolves player role from `current_player_state_latest`. Calling it retrospectively would import later role knowledge into earlier gameweeks.
- No immutable as-of full-XV/named-challenger/C0277 decision state exists across GW1–GW4.
- Consequently, player haul-tail calibration, captaincy regret and chip false-positive comparisons are not reported. Missing evidence is not zero.

### Frozen GW5 prospective cohort

- Fixture snapshots: 9084–9093, exactly one per match.
- Snapshot generator: `production_fixture_v0.3_c0166`.
- Player prediction run: 1426.
- Fixtures: 10/10.
- Frozen before kickoff: 10/10.
- Outcomes available at freeze: 0/10.
- Fixture hash: `7e92187851f750ce7d10de70f7efcd111d148b8b4108c6cf9e032bf1d37f5bf8`.
- Player projection hash: `38758eedc356211e0f941076a7b47fd0da6c82e318c14f4da513975878aefcb6`.

Validation initially detected two model versions sharing a later capture timestamp. That ambiguous 20-row set was rejected and replaced by the exact P0 C0166 evidence cut. The corrected cohort is 10 unique fixtures.

## Promotion decision

`BLOCKED_FOR_PROMOTION`

P9 must not promote C0279. Before reconsideration, the engine needs:

1. genuine prior-season prematch prediction/outcome pairs or an explicitly bounded alternative validation design;
2. immutable as-of role/minutes inputs for player-tail replay;
3. immutable historical full-XV, challenger and chip-gate decision states;
4. completed GW5 prospective outcomes;
5. stable evidence that score-family/player-tail benefits exceed uncertainty without degrading core prediction.

## Security and integrity

- All P8 tables have RLS enabled.
- No `public`, `anon` or `authenticated` table privileges.
- Zero production effect and no production consumer changes.
- Historical forecasts were not rewritten.
- The P0 GW5 cohort is append-only evidence for later evaluation.

## Artifacts

- `supabase/migrations/20260918133000_c0279_p8_chronological_shadow_evaluation.sql`
- `supabase/migrations/20260918134500_c0279_p8_prospective_cohort_correction.sql`
- `supabase/migrations/20260918135500_c0279_p8_p0_generator_pin.sql`
- `public.c0279_shadow_evaluation_runs`
- `public.c0279_fixture_shadow_evaluations`
- `public.c0279_prospective_shadow_cohort`

## GitHub reconciliation

- Primary migration: `c86525636bda5f89e29cfe7f3ed953babfae4b2b`
- Cohort correction: `694df4dbb9c613642f90c057f77dc32d9d893e18`
- P0 generator pin: `b6610d30baa8a84069f7913163c3b3085deb1fca`

## Boundary

P8 is complete. P9 promotion is blocked; no production behavior is authorized. The next valid action is to evaluate the frozen GW5 cohort after outcomes become available and design leakage-safe historical player/captaincy evidence—not to bypass the gate.
