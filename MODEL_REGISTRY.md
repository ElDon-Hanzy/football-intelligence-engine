# Football Intelligence Engine — Model Registry

_Last reconciled: 2026-09-17 — C0279 planned program registered_

## 1. Registry policy

The live machine-readable authority is the C0213 component inventory/registry. Lifecycle, canonical status and numeric production effect are separate. Code existence or diagnostic consumption never grants production effect.

Every production-effect component requires current definition-hash-bound behavioral proof. Research/shadow output remains observational until its chronology-safe promotion contract passes.

## 2. Current production-effect set

C0278 reconciliation confirms **14 production-effect components; 14/14 current behavioral PASS**.

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

The retired v02 goal/assist lambda functions remain rollback-only; v03 is live production.

## 3. Fixture / player / role stack

Production fixture path remains:

`structural baseline → bounded C0147 derivative via C0159 → bounded symmetric C0166 evidence → current production fixture selector`.

Raw C0147 remains shadow/research. The player projection path combines team/fixture lambda state, current xG/xA evidence, xMins/start state, penalties, realized tactical roles, clean-sheet / Defensive Contributions / bonus probabilities and event-distribution tails.

C0202 HIGH-confidence attack-side inference remains factual metadata only: no generic flank xPts uplift, no numeric role uplift, and no model effect.

## 4. Canonical squad / decision stack

`fpl-full-pool-optimizer` is the canonical full-pool squad optimizer. C0248 is the sole canonical sequential selected-path authority.

```text
full-pool optimizer
→ C0227 uncertainty
→ C0228 ensemble/equivalence
→ C0229 structural robustness
→ C0231 forward-management evidence
→ C0232 OR/rank utility
→ C0233 red-team evidence
→ C0240 adversarial benchmark
→ captaincy / named-challenger consistency
→ C0248 sequential selected-path authority
→ C0234 / C0276 fail-closed final authorization
→ C0237 publication
```

C0230 is advisory/nonblocking and zero numeric effect. C0240 is not a normal-transfer selector. C0276 is a bounded operational control plane around this chain, not an xPts model or competing selector.

## 5. Sequential planning and chips

C0248 models reachable multi-GW state transitions including squad, bank, purchase/selling economics, FT inventory and chip state. Every action is compared with ROLL and remains subject to uncertainty/Noise-Control.

C0277 is the active seasonal chip option-value program. It adds reservation-value and joint chip-calendar evidence because a strong short-horizon WC/FH/BB/TC root does not by itself establish the best season-level chip week. C0277 feeds the existing C0248/C0276 authority path and does not create a parallel selector.

## 6. Decision controls are not extra xPts models

- C0227: uncertainty/sensitivity control.
- C0228: alternative squad search/equivalence.
- C0229: structural robustness / marginal-value control.
- C0230: shadow advisory only; zero numeric effect, nonblocking.
- C0231: forward reachability evidence.
- C0232: rank/leverage utility; zero direct xPts effect.
- C0233: red-team evidence.
- C0240: deeper adversarial benchmark.
- captaincy/named challengers: consistency controls.
- C0248: sole sequential selected-path authority.
- C0234/C0276: fail-closed final authorization/control plane.
- C0237: publication boundary.
- C0277: chip option-value sub-control.

## 7. Protected research / shadow states

- A0005: retired/rejected; zero production effect.
- W0002: governed shadow evidence only unless separately promoted.
- C0120 predictive hypothesis: rejected; retained infrastructure is separate.
- C0147 raw matchup family: shadow; only bounded promoted derivatives consume numerically.
- C0197 chaos-only: rejected; scale zero.
- C0197 shootout/regime: prospective shadow window through its registered expiry.
- C0202 generic numeric flank hypothesis: rejected; factual HIGH-confidence metadata only.
- C0206: paused/excluded pending new governed evidence.
- C0224 Parity–Draw: shadow only.
- C0230: advisory shadow, zero numeric effect.
- C0265: Open / Planned / Critical; production behavior deliberately unchanged.
- C0270: frozen prospective xMins-cliff diagnostic; shadow only.

Negative evidence and rejected hypotheses are retained without numeric production effect.

## 8. C0279 planned integration — zero production effect

C0279 is registered but not promoted. It targets consolidation of current-season team state, representative score families, conditional player upside and calculation-faithful decision evidence. Until promotion, the current 14-component production-effect set is unchanged.

Planned constraints:
- previous-season performance weight reaches 0% from nine current-season matches;
- L20 cannot be introduced/restored; cross-season L10 bypasses must be removed;
- LOW/NORMAL/HIGH is the primary scoring hierarchy; shootout/demolition are HIGH subtypes;
- raw modal cell remains diagnostic;
- score-family output may nominate player/captain/TC candidates but existing projection, captaincy, C0277, C0248 and C0276 authorities remain binding;
- Decision-Evidence Contract audits materiality, direction, net effects, contradictions and traceability.

Canonical plan: `project-management/C0279_SEASON_STATE_SCORE_FAMILY_PLAYER_UPSIDE_INTEGRATION_PLAN_20260917.md`.

## 9. Promotion / anti-over-engineering discipline

A new production component must fix a demonstrated material blind spot, add unique information, have a falsifiable output/regression test, have one explicit consumption contract and show decision value above uncertainty and maintenance cost. Prefer extending an existing state/planner/gate over creating a parallel model or authority.

## 10. Current governance evidence

Latest C0278 reconciliation:

- registered components: **820**;
- production-effect components: **14**;
- behavioral PASS: **14/14**;
- required capabilities: **19/19**;
- tracker consumption contracts: **99/99 covered**;
- consumption violations: **0**;
- active duplicate cron targets: **0**;
- active retired external deployments: **0**;
- `system_consolidation_ok=true`.

Key governance surfaces include component definition hashing, behavioral-consumption tests/status, change-consumption contracts, tracker-consumption governance and tracker audit functions.

## 11. Canonical references

- `PROJECT_STATE.md`
- `PROJECT_DESCRIPTION.md`
- `SYSTEM_ARCHITECTURE.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0278_FULL_ENGINE_STATE_AUDIT_RECONCILIATION_20260916.md`
- `project-management/C0277_SEASONAL_CHIP_OPTION_VALUE_OPTIMIZER_PLAN_20260916.md`
- `project-management/C0279_SEASON_STATE_SCORE_FAMILY_PLAYER_UPSIDE_INTEGRATION_PLAN_20260917.md`
