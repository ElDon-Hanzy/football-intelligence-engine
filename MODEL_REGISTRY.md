# Football Intelligence Engine — Model Registry

_Last updated: 2026-09-11 — C0247 audit_

## 1. Registry policy

The live machine-readable authority is `private.c0213_component_inventory_v01`. A deployed component is not production merely because code exists. Lifecycle, canonical status and numeric production effect are separate.

Every production-effect component requires current definition-hash-bound behavioral proof. Research/shadow output remains observational until its promotion gate passes.

## 2. Live production-effect set

C0247 verified **14 production-effect components; 14/14 behavioral PASS**.

| Capability | Canonical component | Effect |
|---|---|---|
| Current-season team assimilation | `private.refresh_current_season_team_performance_v01` | State |
| Team lambda adjustment | `private.fpl_adjusted_team_lambda_v01` | Numeric |
| Player goal lambda | `private.fpl_fixture_goal_lambda_v03` | Numeric |
| Player assist lambda | `private.fpl_fixture_assist_lambda_v03` | Numeric |
| Event distribution | `private.fpl_current_event_distribution_v01` | Numeric distribution |
| FPL projection core | `private.generate_upcoming_fpl_projection_core_v01` | Projection |
| C0159 fixture derivative | `private.refresh_c0159_production_fixture_forecasts_v01` | Numeric fixture |
| C0166 fixture evidence | `private.refresh_c0166_production_fixture_forecasts_v01` | Numeric fixture |
| Tactical base generator | `public.refresh_fixture_tactical_matchups_v01` | Supporting state |
| Tactical calibrated entrypoint | `public.refresh_fixture_tactical_matchups_v011` | State selection |
| Realized role state | `public.current_realized_player_roles` | Factual state |
| Role profile overlay | `public.current_player_role_profiles` | State selection |
| Current fixture selector | `public.current_production_fixture_prediction_v01` | State selection |
| Full-pool optimizer | `fpl-full-pool-optimizer` | Squad optimization |

The old v02 goal/assist lambda functions are retired rollback components after C0220; v03 is live production.

## 3. Fixture stack

The production fixture path remains layered:

`structural baseline → bounded C0147 derivative via C0159 → bounded symmetric C0166 evidence → current production fixture selector`.

Raw C0147 remains shadow/research. Production use occurs only through the bounded derivatives registered in C0159/C0166.

## 4. Player stack

The player projection path combines:

- team/fixture lambda state;
- current player xG/xA evidence;
- expected minutes/start states;
- penalty hierarchy;
- realized tactical role semantics;
- clean-sheet, Defensive Contributions and bonus probabilities;
- event-distribution tails and calibrated mean.

Realized role is factual state; it does not grant an unvalidated generic “attacking role” xPts multiplier.

## 5. Full-pool optimizer

`fpl-full-pool-optimizer` is the sole canonical full-pool optimizer and remains read-only.

Current properties:

- top ~300 by xMins plus explosive exceptions;
- position-specific candidate pools;
- legal 2/5/5/3 squad and club/budget rules;
- exact FPL selling-price calculation for current assets;
- 1–5 GW weighted horizon;
- best-XI selection each GW;
- tail-aware captain selection;
- transfer costs and current FT input;
- default bench discount 0.12;
- model-error/no-meaningful-edge classification.

Current material limitation: the horizon evaluates candidate XVs largely statically. It does not yet optimize the true weekly FT/state transition.

## 6. Decision controls are not additional xPts models

C0227–C0242 are downstream decision-control, robustness, serving or governance components. They do not become new player xPts models simply because they influence whether a plan is trusted.

Important distinction:

- C0227 uncertainty: diagnostic/control.
- C0228 ensemble: alternative squad search/equivalence.
- C0229 structural robustness: marginal-value/portfolio diagnostics.
- C0230 team regime: shadow only, zero numeric effect.
- C0231 forward management: approximate reachability diagnostic.
- C0232 OR utility: rank/leverage context, zero direct xPts effect.
- C0233 red team: adversarial diagnostic.
- C0240: deeper final adversarial search over current-transfer paths.
- C0234: authorization gate.
- C0242: named-challenger persistence/captaincy equivalence, integration incomplete.

C0247 identifies overlap among these layers and recommends consolidation rather than further expansion.

## 7. Research / shadow discipline

Active research families include A0005/W0002 forward cohorts, C0120 score/mispricing research, C0147 tactical matchup validation, C0197 high-score/shootout research, C0202 side/flank research, C0206 new-player priors, C0224 Parity–Draw and C0230 team regime diagnostics.

They remain zero numeric production effect unless their own chronology-safe promotion criteria are met.

One active research-only orphan currently exists: `EDGE_FUNCTION:c0120-historical-correct-score` is present in the live registry but absent from current GitHub source. It must be reconciled separately.

## 8. Pending decision requirements

C0243-C0246 are **Planned / Design Pending** only:

- price movement / execution timing;
- chip timing / opportunity cost;
- sequential FT / ideal-squad path planning;
- XI/bench/hit objective recalibration.

C0247 recommends merging their valid requirements into one multi-GW state-transition planner rather than creating four independent production layers.

## 9. Promotion / anti-over-engineering discipline

A new production component must:

- fix a demonstrated material blind spot;
- add unique information rather than duplicate another layer;
- have a falsifiable output and regression test;
- have exactly one explicit consumption path;
- show expected decision value that exceeds architecture/maintenance cost.

If the same requirement fits naturally inside an existing planner/gate, consolidation is preferred.

## 10. Governance controls

- `private.c0213_component_definition_hash_v01()`
- `private.run_c0213_behavioral_consumption_tests_v01(gw)`
- `private.c0213_behavioral_consumption_status_v01()`
- `private.c0213_change_consumption_contracts`
- `private.c0213_tracker_consumption_governance_v01()`
- `private.audit_change_tracker_governance_v01()`

At C0247 audit: 14/14 production-effect behavioral PASS and 83/83 required tracker-consumption contracts covered.