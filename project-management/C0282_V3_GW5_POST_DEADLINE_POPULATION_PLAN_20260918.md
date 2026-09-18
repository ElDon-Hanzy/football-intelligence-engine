# C0282 — V3 GW5 Post-Deadline Population & QA

Date: 2026-09-18
Status: IN PROGRESS

## Objective
Populate the V3 consumer FPL product after the GW5 deadline without corrupting decision history or pretending that an unexecuted recommendation was the actual submitted FPL team.

## Verified starting state
- `current_fpl_live_plan_v01` GW5 remains PRE_FINAL / CONTESTED / DECISION_NOT_READY.
- `execution_authorized=false`.
- frozen decision evidence points to prediction run 1458.
- `fpl_actual_manager_decisions` has no verified GW5 row at registration time.
- latest manager-state snapshot is id 5, GW5, captured 2026-09-15, 1 FT and 0.2m bank; its evidence says zero GW5 transfers had been confirmed at that capture time. This is pre-deadline evidence, not proof of the final submitted XI/captain/bench.
- V3 workspace contract already separates actual, recommendation, decision snapshot and realized state.

## Integrity rules
1. Never infer ACTUAL from recommendation.
2. Never mark GW5 execution authorized without evidence.
3. Never rewrite prediction run 1458 or historical forecasts.
4. Keep the GW5 recommendation visible as contested/provisional audit evidence.
5. If actual submitted GW5 team cannot be independently verified, UI must say NOT_VERIFIED rather than fabricate it.
6. Realized player values become final only from finished-fixture evidence.

## Autonomous phases
P0 — audit V3 data contracts and live GW5 state. COMPLETE.
P1 — audit actual-team availability and prevent recommendation→actual leakage. COMPLETE: no verified GW5 actual row exists.
P2 — ensure post-deadline workspace renders provisional recommendation + frozen decision evidence + NOT_VERIFIED actual state coherently.
P3 — populate realized/live fixture and player evidence as authoritative feeds become available.
P4 — populate forward-intelligence and match-intelligence surfaces from existing engine APIs; do not create duplicate models.
P5 — UI QA: pitch, captain/vice, bench, fixtures, evidence labels, mobile layout, loading/error states.
P6 — data QA: IDs, names, roles, opponents, xMins/xPts/tails, actual-vs-projection semantics, stale lineage warnings.
P7 — reconcile Supabase/GitHub/project state and close out.

## Immediate product behavior for GW5
The correct current presentation is:
- Recommendation: PROVISIONAL / CONTESTED, not execution-authorized.
- Decision evidence: frozen to prediction run 1458.
- Actual submitted team: NOT VERIFIED until authoritative evidence is captured.
- Live/realized: sourced independently from match/result feeds.

This deliberately favors epistemic correctness over filling every UI field.