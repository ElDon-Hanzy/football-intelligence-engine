# C0220 — Forecast Integrity Repair Closeout

Date: 2026-09-08
Parent: C0218
Status: Completed / Verified in production

## Scope

C0220 repaired three demonstrated production forecast-integrity gaps without rewriting frozen historical forecasts and without promoting research-only model families:

1. explicit penalty-event and penalty-miss modeling;
2. numeric consumption of stable material realized-role regime changes;
3. team-level start-probability / expected-minute competition budgets.

Research-only A0005, C0197, C0202, C0210, C0211, C0216 and W0002 remain disabled.

## Penalty model

Production now uses the current official FPL `players.penalties_order` hierarchy. The latest complete historical PL season in production contains 92 attempts and 77 scored penalties, giving:

- team penalty attempt rate: 92 / (20 * 38) = 0.121053 per team-match;
- conversion probability: 77 / 92 = 0.836957.

Rank 1 receives on-pitch penalty exposure. Lower-ranked takers inherit exposure only when all higher-ranked takers are projected off the pitch. Player-specific one-season conversion skill is intentionally disabled because current samples are too small for a robust persistent-skill effect.

Penalty misses are explicitly distributed as -2 FPL points. The rolling expected-points delta replaces the legacy baseline expected penalty-miss term instead of subtracting it twice.

Primary production consumers:

- `private.fpl_penalty_profile_v01`
- `private.fpl_penalty_miss_lambda_v01`
- `private.fpl_baseline_penalty_miss_lambda_v01`
- `private.fpl_apply_penalty_miss_distribution_v01`

## Realized-role numeric effect

Realized role is no longer categorical-only when a material role regime is sufficiently established.

Numeric adaptation requires all of:

- realized-role overlay active;
- realized role differs from the retained quantitative profile;
- transition crosses the ATTACKING vs DEFENSIVE/CONTROL family boundary;
- at least 3 same-role appearances;
- at least 180 same-role minutes;
- role confidence >= 0.80.

The player's own same-role xG/xA/DC evidence is used; no fixed role coefficient is invented. Normal current-form adjustment and realized-role adjustment are separate consumers so an already-capped form ratio cannot swallow the role effect. The independent realized-role rate multiplier is capped to +/-15% while the evidence requirement remains only three appearances.

Primary penalty takers are protected from role-xG contamination when their same-role xG sample contains penalty xG that cannot be cleanly removed from the production-safe official actuals. xA/DC may still adapt.

At closeout, three players passed the material regime gate: De Cuyper (WIDE_BACK -> WIDE_ATTACKER), Iwobi (CREATOR_10 -> HOLDING_MIDFIELDER), and Szoboszlai (CREATOR_10 -> HOLDING_MIDFIELDER). For De Cuyper, the final consumer raises the GW4 goal lambda from 0.1622 on the raw state to 0.1866 on the role-adjusted state; the final GW4 projection is 4.207 xPts with P(goal) 17.0%.

Primary production consumers:

- `private.fpl_projection_player_state_v01`
- `private.fpl_fixture_goal_lambda_v03`
- `private.fpl_fixture_assist_lambda_v03`

## Team competition budget

Independent player states previously produced impossible team totals (for example Manchester United summed to 15.75 expected starts and 1,337 expected minutes).

The projection player-state consumer now anchors the predicted XI and redistributes competing non-XI probability/minute mass so no team exceeds:

- 11 expected starts;
- 990 expected player-minutes.

The C0220 integrity audit now returns adjusted maxima of exactly 11.000 starts and 990.0 minutes while preserving the raw totals for audit provenance.

## Production cutover

`private.generate_upcoming_fpl_projection_core_v01` now consumes the C0220 player state, role-aware goal/assist lambdas, explicit penalty hierarchy, and explicit penalty-miss distribution.

Final post-closeout immutable projection runs:

- GW4: prediction run 1341 — 604 rows;
- GW5: prediction run 1342 — 604 rows;
- GW6: prediction run 1343 — 604 rows.

All three have `rolling_projection_v0.4_forecast_integrity` provenance and a maximum event-distribution mean vs target-xPts gap of 0.000001.

The full-pool optimizer was rerun on exactly those three snapshots:

- request 3732;
- optimizer run 8;
- ROLL 143.584;
- 1FT 149.968 (+6.384): O'Reilly -> Guehi;
- 2FT 154.287 (+10.703): O'Reilly -> Guehi; Mosquera -> Calafiori;
- raw 3FT 158.258 (+14.674): O'Reilly -> Guehi; Mosquera -> Gabriel; Semenyo -> Schade.

The optimizer is read-only. Its raw 3FT scenario is not automatically an FPL manager decision. Existing Plan 10 remains the provisional externally red-teamed GW4 plan pending the scheduled T-2h refresh.

## Validation

- `private.c0220_forecast_integrity_v01(GW4/GW5/GW6)`: green;
- team max adjusted start sum: 11.000;
- team max adjusted minutes: 990.0;
- C0213 behavioral consumption: 14 / 14 production-effect components pass on GW4 run 1341;
- `private.audit_change_tracker_governance_v01()`: green after registering `C0220_FORECAST_INTEGRITY_PRODUCTION_EFFECT_V01`;
- bad change IDs: 0;
- completed-not-verified: 0;
- completed without refs: 0;
- consumption-contract violations: 0;
- frozen historical forecasts rewritten: false.

## Production migration history

- `c0220_forecast_integrity_helpers`
- `c0220_material_role_regime_gate`
- `c0220_preserve_calibrated_open_play_anchor`
- `c0220_penalty_residual_replacement_only`
- `c0220_role_xg_penalty_confound_gate`
- `c0220_role_snapshot_horizon_fallback`
- `c0220_forecast_integrity_core_cutover_v01`
- `c0220_realized_role_numeric_consumer_separation_v01`
