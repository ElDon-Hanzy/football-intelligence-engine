# Football Intelligence Engine — Model Registry

_Last updated: 2026-09-14 — C0272 post-audit consolidation_

## 1. Registry policy

The live machine-readable authority is `private.c0213_component_inventory_v01`. Lifecycle, canonical status and numeric production effect are separate. A component does not become production merely because code exists or because it is consumed as diagnostic metadata.

Every production-effect component requires current definition-hash-bound behavioral proof. Research/shadow output remains observational until its own chronology-safe promotion gate passes.

## 2. Live production-effect set

C0272 re-ran behavioral consumption on GW5 / prediction run 1367: **14 production-effect components; 14/14 PASS**.

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

The old v02 goal/assist lambda functions remain retired rollback components after C0220; v03 is live production.

## 3. Fixture stack

Production fixture path:

`structural baseline → bounded C0147 derivative via C0159 → bounded symmetric C0166 evidence → current production fixture selector`.

Raw C0147 remains shadow/research. The bounded C0159/C0166 derivatives are the only promoted consumption paths. C0272 does not add a new fixture model.

## 4. Player / role stack

The player projection path combines team/fixture lambda state, current xG/xA evidence, expected minutes/start states, penalty hierarchy, realized tactical role semantics, clean-sheet / Defensive Contributions / bonus probabilities, and event-distribution tails.

C0202 now supplies one additional **factual metadata field only**: high-confidence categorical attack-side inference. It is stored in fixture-role evidence through `public.refresh_player_fixture_role_snapshots`.

Permanent C0202 constraints:

- only the validated `HIGH` confidence side bucket is integrated;
- `attack_side_numeric_xpts_effect=false`;
- `numeric_role_uplift_enabled=false`;
- `model_effect_enabled=false`;
- the rejected generic flank-weakness xPts hypothesis is not promoted.

## 5. Squad / multi-GW decision stack

`fpl-full-pool-optimizer` remains the sole canonical full-pool squad optimizer. C0248 is the canonical **sequential selected-path authority** layered over candidate squad/action evidence.

Decision path:

`full-pool optimizer → uncertainty / ensemble / structural controls → supporting forward/rank/red-team layers → C0240 adversarial benchmark → C0242 challenger + captaincy consistency → C0248 sequential path authority → C0234 fail-closed authorization → C0237 publication`.

C0240 is supporting adversarial/regression evidence, not the normal-transfer selector.

C0272 adds **control-plane orchestration**, not another optimizer: `private.c0272_final_promotion_watch_v01` ensures that a final T−2 C0248 candidate gets an identical-lineage cross-beam peer, unchanged deterministic promotion, gate refresh and publication before the deadline. It cannot execute transfers or waive a gate.

## 6. Decision controls are not additional xPts models

- C0227 uncertainty: diagnostic/control.
- C0228 ensemble: alternative squad search/equivalence.
- C0229 structural robustness: marginal-value/portfolio diagnostic.
- **C0230 team regime: shadow advisory only; zero numeric effect and nonblocking to publication/final authorization.**
- C0231 forward management: supporting reachability evaluator.
- C0232 OR utility: rank/leverage context; zero direct xPts effect.
- C0233 red team: supporting adversarial diagnostic.
- C0240: deeper adversarial benchmark.
- C0242: named-challenger persistence + captaincy consistency.
- C0248: canonical sequential selected-path authority.
- C0234: fail-closed final authorization boundary.
- C0237: publication boundary.
- C0272: final-window orchestration only.

## 7. Research / shadow portfolio after C0272

| Family | Lifecycle / decision | Promotion state |
|---|---|---|
| A0005 enriched forward ablation | **RETIRED / REJECTED**; capture/evaluator crons removed | No production effect |
| W0002 rolling forward cohort | Continue through preregistered GW5 test | Shadow |
| C0120 exact-score predictive hypothesis | **REJECTED**; C0236 price/cache retained separately | No production effect |
| C0147 matchup validation | Continue; future TEST remains scheduled | Shadow; bounded derivative already represented by C0159 |
| C0197 chaos-only | **REJECTED**, selected dispersion scale 0 | No production effect |
| C0197 shootout/regime | Final prospective window only; no new captures after GW6 | Shadow |
| C0202 flank/side | Numeric flank xPts rejected; HIGH-confidence categorical side integrated as factual state | Metadata only, zero numeric effect |
| C0206 foreign translator | Paused/excluded until materially new governed calibration evidence | Shadow/research only |
| **C0224 Parity–Draw** | **Continue shadow by explicit user decision on 2026-09-14** | Zero production effect |
| C0230 team regime | Continue advisory shadow | Zero production effect / nonblocking |
| C0270 xMins cliff watch | Continue exactly as frozen | Shadow diagnostic only |

No new numeric shadow family was promoted in C0272.

## 8. Anti-over-engineering / promotion discipline

A new production component must fix a demonstrated material blind spot, add information not already represented, have a falsifiable output and regression test, have exactly one explicit consumption path, and show robust expected decision value above model uncertainty and maintenance cost.

If the same requirement fits naturally into an existing state layer, planner or gate, consolidate rather than create a new model. C0202 is the reference example: its useful factual side classifier was folded into the existing role-state evidence while the failed numeric hypothesis was discarded.

## 9. Governance controls

- `private.c0213_component_definition_hash_v01()`
- `private.run_c0213_behavioral_consumption_tests_v01(gw)`
- `private.c0213_behavioral_consumption_status_v01()`
- `private.c0213_change_consumption_contracts`
- `private.c0213_tracker_consumption_governance_v01()`
- `private.audit_change_tracker_governance_v01()`

C0272 verification:

- production-effect components: **14**;
- behavioral PASS: **14/14**;
- required capabilities: **19/19**;
- tracker consumption contracts: **97/97**;
- consumption violations: **0**;
- active duplicate cron targets: **0**;
- active retired API/Edge deployments: **0**;
- `system_consolidation_ok=true`.

## 10. C0272 references

- `project-management/C0272_POST_AUDIT_CONSOLIDATION_20260914.md`
- `supabase/migrations/20260914030600_c0272_post_audit_consolidation.sql`
- `supabase/functions/fpl-autonomous-gate/index.ts` — v7 source
- consumption contracts `C0202_C0272_FACTUAL_SIDE_STATE_V01` and `C0272_POST_AUDIT_CONSOLIDATION_V01`
