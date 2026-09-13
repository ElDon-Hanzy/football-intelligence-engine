# C0272 — Post-Audit Consolidation

Date: 2026-09-14  
Parent: C0247  
Scope: architecture consumption, shadow-model adjudication, final C0248 promotion reliability

## Executive outcome

The post-C0247 audit confirmed that the engine architecture is broadly healthy and genuinely consumed: the live C0213 registry has 14 production-effect components and all 14 current definition-hash-bound behavioral tests pass. The audit found one operational control-plane defect rather than a modeling defect: the fresh GW4 T−2 C0248 candidate was generated but did not obtain a same-lineage cross-beam peer and promotion before the deadline. The fail-closed autonomous gate therefore correctly refused authorization.

C0272 fixes that orchestration gap without weakening any C0248/C0234 acceptance rule and reduces research clutter. No historical forecast is rewritten and no new numeric player/fixture xPts model is promoted.

## Approved shadow adjudication

The user approved the audit disposition with one explicit exception: **C0224 Parity–Draw continues in shadow** rather than being retired.

| Family | C0272 disposition | Numeric production effect |
|---|---|---:|
| A0005 enriched forward ablation | RETIRE / REJECT; scheduled capture/evaluator removed | No |
| W0002 rolling forward cohort | Continue through preregistered GW5 test | No |
| C0120 exact-score predictive edge | Predictive promotion REJECTED; C0236 price/cache retained | No |
| C0147 matchup validation | Continue shadow; bounded C0159 derivative remains the only production consumption | No new effect |
| C0197 chaos-only | REJECTED; selected dispersion scale remains zero | No |
| C0197 shootout/regime | One final prospective window, hard new-capture expiry after GW6 | No |
| C0202 flank/side | Generic numeric flank-xPts hypothesis REJECTED; HIGH-confidence categorical side state integrated as factual metadata only | No |
| C0206 foreign translator | PAUSED / excluded pending materially new governed calibration evidence | No |
| C0224 Parity–Draw | **CONTINUE SHADOW by explicit user decision** | No |
| C0230 team regime | Continue shadow as advisory only; no publication/final-gate blocking | No |
| C0270 xMins cliff watch | Continue exactly as frozen | No |

## C0202 factual-state integration

`public.refresh_player_fixture_role_snapshots` now consumes only the `HIGH` bucket from `private.c0202_current_side_prior_v01()` and records the categorical attack-side state inside existing fixture-role evidence.

The following invariants are explicit:

- `attack_side_numeric_xpts_effect=false`;
- `numeric_role_uplift_enabled=false`;
- `model_effect_enabled=false`;
- primary role, role score, xMins, team lambda and player xPts are not changed by C0202 side state.

GW5 refresh verification inserted 675 current fixture-role rows. 114 carry promoted HIGH-confidence side metadata; zero have numeric side effect enabled and zero have `model_effect_enabled=true`.

## C0230 disposition

C0230 remains useful as early warning / red-team context, but it is not validated strongly enough to be a mandatory decision dependency.

C0272 therefore makes it advisory in both control surfaces:

- `private.c0237_publish_current_fpl_plan_pre_c0248_v01` no longer fails because a team-regime run is missing;
- `fpl-autonomous-gate` v7 reads the latest team-regime row with optional semantics and exposes it under advisories rather than as a blocking gate.

This changes control-plane readiness only. C0230 still has zero numeric projection effect.

## C0248 final-promotion repair

New function: `private.c0272_final_promotion_watch_v01`  
New cron: `c0272_fpl_final_promotion_watch` every 5 minutes.

The watcher is active only from T−2 hours until the FPL deadline. Outside that window it is a no-op. Within the window it advances one heavy step per pass:

1. require a current-GW prediction run generated inside the final T−2 window;
2. ensure a V06 C0248 candidate exists for that exact prediction lineage;
3. ensure an independent candidate exists with the same manager state and the identical full prediction-run vector but a different beam width;
4. call the pre-existing `private.c0248_promote_verified_candidate_v01` acceptance function unchanged;
5. refresh `fpl-autonomous-gate` against the promoted run;
6. publish the aligned gate state through C0237.

The watcher cannot execute FPL transfers/chips. It cannot waive cross-beam equivalence, hardening checks, Noise-Control, chip controls, captaincy consistency, ROLL comparison, or final authorization gates.

Dry-run verification for upcoming GW5 returned `OUTSIDE_FINAL_WINDOW`, deadline 2026-09-18 17:30 UTC and final-refresh threshold 15:30 UTC, with `executed=false`.

## Runtime / scheduler cleanup

Removed scheduled A0005 jobs:

- `football_intelligence_a0005_near_close`;
- `football_intelligence_a0005_evaluator`.

Confirmed still active:

- W0002 capture/evaluator;
- C0147 capture/evaluator;
- C0197 shootout-forward shadow;
- C0236 correct-score price cache;
- C0272 final-promotion watcher.

C0197's forward capture entrypoint now refuses new captures after GW6 while preserving evaluation of already-frozen evidence.

## Governance verification

After the C0202 consumption contract was registered:

- C0213 production-effect components: **14**;
- behavioral consumption: **14/14 PASS** on GW5 / prediction run 1367;
- required capabilities: **19/19 present**;
- active duplicate cron targets: **0**;
- active retired API/Edge deployments: **0**;
- tracker consumption contracts: **97/97 covered**;
- consumption-contract violations: **0**;
- bad change IDs: **0**;
- completed-not-verified: **0**;
- completed-without-refs: **0**;
- decision rows without refs: **0**;
- `system_consolidation_ok=true`.

## Production/runtime refs

- Supabase migration: `c0272_post_audit_consolidation`
- Edge Function: `fpl-autonomous-gate` v7, `C0234_AUTONOMOUS_FINAL_GATE_V07_C0230_ADVISORY`
- Gate v7 bundle SHA-256: `7342c2f37e808a456f62a93c1b5b27aedb89297718dea9b0c9812bfa722289b1`
- DB function: `private.c0272_final_promotion_watch_v01`
- Cron: `c0272_fpl_final_promotion_watch`
- C0202 bridge: `c0272_side_state_v01`
- Consumption contracts: `C0202_C0272_FACTUAL_SIDE_STATE_V01`, `C0272_POST_AUDIT_CONSOLIDATION_V01`

## Non-changes

- C0224 remains shadow-only, per user decision.
- C0265 production xMins behavior is untouched.
- C0270 frozen thresholds are untouched.
- C0248 promotion acceptance is unchanged.
- V2 is untouched.
- No actual FPL transfer or chip is executed.
- Historical forecasts remain append-only.
