# Football Intelligence Engine — Model Registry

_Last updated: 2026-09-07 — C0213 canonical registry_

## 1. Registry policy

The live machine-readable authority is `private.c0213_component_inventory_v01`; this document is the human-readable canonical model registry.

A model/component is not production merely because it is deployed. `lifecycle`, `canonical_status` and `production_effect_enabled` are separate fields. Research and shadow outputs must remain observational until their registered promotion gate passes.

Every production-effect component must have a current definition-hash-bound behavioral PASS. Every implemented model-effect Change ID must have a production consumer, evaluator/promotion gate, research-infrastructure classification, blocked-source classification or explicit reconciled legacy contract.

## 2. Active production-effect components

| Capability | Canonical component | Effect type | C0213 behavioral proof |
|---|---|---|---|
| Current-season team assimilation | `private.refresh_current_season_team_performance_v01` | State | non-unit enabled team factors exist |
| Team lambda adjustment | `private.fpl_adjusted_team_lambda_v01` | Numeric | base-lambda perturbation changes output |
| Player goal lambda | `private.fpl_fixture_goal_lambda_v02` | Numeric | -20% team lambda changes goal lambda |
| Player assist lambda | `private.fpl_fixture_assist_lambda_v02` | Numeric | -20% team lambda changes assist lambda |
| Event point distribution | `private.fpl_current_event_distribution_v01` | Numeric distribution | halving goal lambda changes P10+ |
| FPL projection/current-15 core | `private.generate_upcoming_fpl_projection_core_v01` | Projection/selection | current run has complete point-distribution lineage |
| C0159 fixture derivative | `private.refresh_c0159_production_fixture_forecasts_v01` | Numeric fixture | stored signed C0147 bounded effects present |
| C0166 fixture evidence layer | `private.refresh_c0166_production_fixture_forecasts_v01` | Numeric fixture | stored non-zero signed bounded adjustments present |
| Tactical base generator | `public.refresh_fixture_tactical_matchups_v01` | State generation | base v0.1 observations exist |
| Tactical calibrated entrypoint | `public.refresh_fixture_tactical_matchups_v011` | State selection | current selector is 100% v0.1.1 on audited GW |
| Realized role state | `public.current_realized_player_roles` | Factual state | current realized-role rows present |
| Role profile overlay | `public.current_player_role_profiles` | State selection | current profiles adopt realized role while retaining base quantitative profile |
| Current fixture selector | `public.current_production_fixture_prediction_v01` | State selection | current audited fixture rows select C0166 generator |
| Full-pool optimizer | `fpl-full-pool-optimizer` | Squad optimization | read-only optimized run; no manager-plan write authority |

At C0213 closure: **14/14 current PASS**.

## 3. Production fixture model stack

### Structural baseline
The engine retains a structural forward-fixture baseline that creates match lambdas and the score distribution. It is not replaced by research layers merely because they are newer.

### C0147 — matchup predictive family
Lifecycle: **SHADOW**.

C0147 captures tactical matchup evidence and forward validation. The research family itself remains `model_effect_enabled=false`. A bounded derivative is consumed by C0159; therefore “C0147 exists in production code” must not be confused with “raw C0147 is production.”

### C0159 — bounded production derivative
Lifecycle: **PRODUCTION**.

C0159 consumes bounded C0147 evidence plus its registered fixture context. It persists explicit signed changes in `change_reasons` and the parent structural lineage.

### C0166 — symmetric evidence-to-decision layer
Lifecycle: **PRODUCTION**.

C0166 applies season-aware, symmetric evidence with maximum absolute log-lambda effect `0.04` per team. It preserves target-fixture chronology and records the parent C0159 snapshot and signed home/away adjustments.

The semantic/evidence audit is separate from numerical forecast creation. Decision readiness may be red even while C0166 numerical forecasts exist.

## 4. Production FPL player stack

### Current-season team state — C0136
Completed 2026/27 process evidence may update future FPL lambdas. Missing metrics are omitted, not zero-filled. Frozen betting cohorts do not inherit later rolling FPL assimilation.

### Goal and assist lambdas — C0150
`fpl_fixture_goal_lambda_v02` and `fpl_fixture_assist_lambda_v02` combine baseline player rates, current-state ratios, fixture/team lambda context, minutes and bounded existing role multipliers. Penalty hierarchy is handled explicitly in the goal path.

C0212 realized tactical role does **not** introduce an additional numeric role coefficient.

### Event distribution — C0160
`fpl_current_event_distribution_v01` models appearance/minute states, goals, assists, clean sheets, Defensive Contributions and bonus, then calibrates a residual to the current xPts mean. Captaincy/ceiling analysis therefore uses the resulting distribution rather than mean xPts alone.

### Projection core
`generate_upcoming_fpl_projection_core_v01` is the canonical production core. The old misleading `...c0160_legacy...` name was removed by renaming the same function object; its OID and production behavior were preserved.

`generate_upcoming_fpl_snapshot_v01` remains the orchestration/coverage wrapper and is not a second competing core.

## 5. Squad optimization / decision model

### Automated current-15 selector
Lives inside the projection core. It is useful as an automated snapshot but is **not** the project’s complete £100m full-pool optimizer.

### Full-pool optimizer
`fpl-full-pool-optimizer` is canonical and read-only. It uses:

- top ~300 by xMins;
- explosive-exception candidates;
- position-specific pools;
- legal squad/budget/club constraints;
- multi-GW weighted projections;
- bench leakage;
- transfer costs and current manager state when available;
- a model-error margin before declaring an edge.

It cannot save `fpl_manager_plans` and does not itself constitute a final FPL decision.

## 6. Realized roles and tactical state

### C0212 realized roles
`current_realized_player_roles` is factual post-match tactical evidence refreshed after completed matches.

`current_player_role_profiles` overlays the realized categorical role onto the pre-existing quantitative profile. C0213 P0 repaired the identity bridge so fixture tactical consumers resolve the physical quantitative profile rather than the virtual overlay timestamp/taxonomy.

Policy: **realized role changes role semantics; numeric uplift remains disabled unless a separately validated future model earns promotion.**

### Tactical matchup v0.1 / v0.1.1
Both observation families are retained for lineage. The canonical current selector deterministically prefers v0.1.1 for the same match/team/signal.

## 7. Current shadow / research families

The following are important active research families, not production effects:

### A0005 / E0006 — forward model validation
- GW2: VALIDATION
- GW3: TEST
- 20/20 fixtures finished
- 140 evaluations
- zero integrity violations
- decision state: `GW3_COMPLETE_PROMOTION_GATE_ELIGIBLE`

A manual promotion/rejection review is due. Existing historical/early promotion assessments must not be mistaken for a post-GW3 decision.

### W0002 / E0008 — independent second cohort
- GW4: VALIDATION
- GW5: TEST
- frozen before first-cohort results
- model effect disabled
- still accumulating genuine forward evidence.

### C0120 / E0007 — Correct Score mispricing hypothesis
Research only. Current sample is too small for promotion; value recommendations remain disabled.

### C0147 — tactical matchup predictive validation
Shadow family. Bounded derivative only enters production through C0159.

### C0154 / C0196 — score selector / high-tail audit
Research/validation remains open. Production score-distribution behavior must not be changed from small-sample tail outcomes.

### C0197 — high-score / shootout research
Chaos, eSOT, scorer breadth, tactical-clash, attack-unit and shootout/demolition variants are frozen research/shadow outputs. Negative/no-edge results are preserved. No variant is production merely because it performed well on one slice.

### C0202 — flank/side matchup research
Exact-side inference has strong mapping accuracy, but generic flank weakness did not show robust predictive value. Forward archetype outcomes remain descriptive until the registered ≥5 GW / ≥100 paired-outcome + later-holdout gate is met.

### C0206 — new-player prior bootstrap
Research/shadow with governed uncertainty. No evidence means unresolved/excluded, never fabricated zero history.

## 8. Rejected or constrained model decisions

Preserved negative results include, among others:

- non-zero regularized residual effects that failed dual-metric improvement → shrink to zero;
- nonlinear response curves without cross-window stability → rejected;
- hierarchical team residual partial pooling without cross-window stability → rejected;
- venue-context blends without robust stability → rejected;
- generic mismatch/overdispersion alternatives without robust likelihood improvement → retained independent Poisson;
- C0197 Chaos-only and eSOT chaos variants without robust high-tail edge → research only;
- generic C0202 flank xPts effects → off.

Negative experiments are first-class evidence and must not be retuned merely to manufacture a winner.

## 9. Promotion discipline

A production promotion requires the relevant registered gate. For effect-family promotion under C0125, the contract includes:

- ≥50 genuine VALIDATION observations;
- ≥30 genuine TEST observations;
- ≥0.005 absolute Brier improvement in both;
- no log-loss regression;
- process MAE within 2%;
- zero integrity violations;
- manual review; no automatic activation.

Other research families use their own predeclared gates. A model cannot bypass its gate by being consumed in UI, by producing a plausible story, or by having high ownership/popularity in FPL.

## 10. Registry anti-drift controls

- `private.c0213_component_definition_hash_v01()` hashes current production definitions/runtimes.
- `private.c0213_behavioral_consumption_tests` stores append-only proof.
- `private.c0213_behavioral_consumption_status_v01()` requires a PASS whose hash matches the current component.
- `private.run_c0213_behavioral_consumption_tests_v01(gw)` is the canonical rerunnable proof suite.
- `private.c0213_change_consumption_contracts` maps implemented model-effect work to its consumer/evaluator/governance path.
- `private.c0213_tracker_consumption_governance_v01()` fails on missing contracts.

Any new production component or production-definition change should turn architecture consolidation red until its behavior is reproven.
