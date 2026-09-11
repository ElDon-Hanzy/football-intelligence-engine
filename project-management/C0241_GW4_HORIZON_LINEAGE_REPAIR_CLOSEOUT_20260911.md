# C0241 — GW4 Horizon-Lineage / C0240 Repeat Repair Closeout

Date: 2026-09-11 (Dubai)
Scope: production reliability / FPL decision-control integrity only. No projection/xPts rewrite. No external FPL action. No `public.fpl_manager_plans` mutation.

## Trigger

A GW4 PRE_FINAL audit found that the live horizon-5 publication was carrying an optimizer lineage from optimizer run 16 with `horizon=3`, while downstream C0228–C0240/C0237 were evaluating/serving a 5-GW decision. In addition, GW7/GW8 current fixture-team feature snapshots had not been materialized, causing canonical `private.c0213_p2_orchestrate_optimizer_v01(4,5)` to fail closed with `WAITING_FOR_HORIZON_UPSTREAM`.

## Repairs applied in production

1. Materialized canonical GW7/GW8 fixture-team features with `public.generate_fixture_team_feature_snapshots_v01`, 20 rows per GW, forward-valid and zero model effect.
2. Enforced exact optimizer horizon in `private.c0240_prepare_base_v05`: optimizer source must match `gameweek=p_gameweek AND horizon=p_horizon`.
3. Enforced the same exact-horizon optimizer selection in `private.c0237_publish_current_fpl_plan_core_v01`.
4. Hardened `private.c0240_prepare_v01` so an existing finalized/repeat cycle is reusable only when its `provisional_optimizer_run_id` equals the current exact-horizon optimizer run.
5. Hardened `private.c0240_repair_slot_challenger_v01` so repaired challengers cannot collide with an already-tested challenger for the same incumbent in the same batch.
6. Made `private.c0240_prepare_repeat_v01` idempotent: once a repeat batch exists, orchestration resumes it rather than reconstructing original slot tasks after repairs.
7. Corrected C0240 final coverage to count unique incumbent slots rather than raw repaired-attempt rows. Extra attempts remain retained as adversarial evidence.

Supabase migrations applied during remediation:
- `c0241_horizon_lineage_guard`
- `c0241_c0240_reuse_optimizer_horizon_guard`
- `c0241_slot_repair_duplicate_guard`
- `c0241_repeat_batch_idempotency_guard`
- `c0241_unique_slot_coverage_count`

## Verification

Canonical C0217/C0235 cadence was respected. GW4 daily projection was not regenerated because it was not due; immutable PRE_FINAL run 1356 remained the current GW4 snapshot.

After feature repair, GW4–GW8 horizon readiness was green. Canonical optimizer orchestration produced optimizer run 17 with `horizon=5`.

Fresh C0240 cycle from optimizer run 17:
- cycle-1 run 8: `IMPROVEMENT_FOUND_REATTACK_REQUIRED`
- exact horizon-5 provisional baseline: 224.270
- best role-safe reachable challenger: 229.434
- edge: +5.164

Mandatory repeat attack then finalized as C0240 run 10:
- status: `STABLE_NO_MEANINGFUL_EDGE`
- baseline: 229.434
- ROLL: 206.860
- unique slot coverage: 15/15
- structure attacks: 10
- transfer-path attacks: 3
- role-allocation attacks: 3
- failed tasks: 0
- repeat cycle found no further meaningful edge
- current prediction lineage: run 1356

C0234 run 7:
- 11/13 gates PASS
- `C0240_FINAL_ADVERSARIAL_OPTIMIZATION` PASS with run 10 and green decision/prediction lineage
- blockers remain `FINAL_T_MINUS_2H_REFRESH` and `CHIP_OPPORTUNITY_COST`
- status: `DECISION_NOT_READY`

C0237 publication 9:
- stage: PRE_FINAL
- status: CONTESTED
- execution_authorized: false
- prediction run: 1356
- optimizer run: 17, horizon: 5
- C0240 run: 10
- all required layers evaluated
- shadow numeric production effect: false
- current plan objective: 229.434; gain vs ROLL: +22.574

## Integrity conclusion

The prior 5-GW serving contract could accept a latest optimizer from a different horizon and C0240 could reuse a finalized cycle that did not prove optimizer-horizon identity. C0241 closes both failure modes and fixes the repeat-repair idempotency/coverage defects discovered while proving the repair.

The resulting PRE_FINAL plan remains non-executable. The separate 2026-09-12 14:30 Asia/Dubai final autonomy gate remains final authority.
