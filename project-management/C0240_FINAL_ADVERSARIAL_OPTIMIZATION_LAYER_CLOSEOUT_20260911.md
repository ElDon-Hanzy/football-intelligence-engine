# C0240 — Final Adversarial Optimization Layer Closeout

_Date: 2026-09-11 (Dubai)_

## Status

**Completed / Verified** for implementation. This closeout does **not** authorize external FPL transfers or chips and does not replace the scheduled GW4 T−2h final-information refresh.

## Permanent production path

`FULL-POOL OPTIMIZER → C0227 UNCERTAINTY → C0228 STRUCTURAL ENSEMBLE → C0229 STRUCTURAL CONTROL → C0230 SHADOW REGIME → C0231 FORWARD MANAGEMENT → C0232 OR UTILITY → C0233 FIRST-PASS RED TEAM → C0240 FINAL ADVERSARIAL LOOP → C0234 FINAL AUTHORIZATION → C0237 LIVE PUBLICATION`

The first optimizer output is permanently treated as a provisional hypothesis. C0234 may not authorize FINAL unless the latest lineage-matched C0240 survivor is stable.

## Implemented behavior

C0240 now performs, fail-closed:

- exact same-horizon baseline evaluation;
- 15/15 slot attacks;
- 10 materially different structural attacks;
- role/allocation attack expansion where material challengers exist;
- ROLL/current-FT/+1-hit/+2-hit pathway evaluation;
- uncertainty/sensitivity adjudication without rewriting xPts;
- repeated adversarial cycle until no new edge greater than the model-error threshold remains;
- role-safety gate for FPL MID/FWD control-defensive roles;
- penalty duty does not exempt a player from the defensive-role gate;
- prediction-run and decision-lineage freshness checks;
- C0234 fail-closed dependency;
- C0237 publication from the C0240 survivor rather than the pre-attack optimizer plan.

## Production evidence

Latest verified GW4 C0240 evidence at closeout:

- prediction run: **1356**;
- manager state: **4**;
- ensemble run: **4**;
- red-team run: **5**;
- C0240 final adversarial run: **6**;
- stability: `STABLE_NO_MEANINGFUL_EDGE`;
- `final_ready=true`;
- slot attacks: **15/15**;
- structure attacks: **10**;
- transfer-path attacks: **3**;
- repeated cycle: complete;
- failed tasks: **0**;
- historical forecasts rewritten: **false**;
- latest live publication: **7**;
- publication stage: `PRE_FINAL`;
- publication status: `CONTESTED`;
- execution authorized: **false**.

The current PRE_FINAL status is expected because the GW4 T−2h refresh window is not open yet and season-level Wildcard opportunity cost remains a separate final-gate issue. Those are Gameweek decision gates, not incomplete C0240 implementation work.

## Workload-isolation fixes

During implementation the original monolithic adversarial search hit Supabase worker resource limits. The final architecture distributes slot/structure workers and uses a dedicated bounded transfer-path evaluator for current-FT/+1-hit/+2-hit pathway searches. The canonical C0228 ensemble was also moved to sequential profile execution to avoid parallel compute spikes.

## Role-safety root fix

A prior optimizer rule allowed a penalty taker to bypass control-defensive MID/FWD role risk. That could admit a player such as a holding midfielder despite the realized-role layer contradicting the attacking assumption. The permanent policy is now:

`confirmed control-defensive MID/FWD role + confidence >= 0.70 across the horizon majority => cannot be newly selected; penalty duty does not cancel the gate.`

Production runtime uses:

- Edge Function `fpl-full-pool-optimizer` v14 — role-safe adapter;
- immutable core Edge Function `fpl-full-pool-optimizer-core-v02` v1;
- GitHub runtime source mirror: `supabase/functions/fpl-full-pool-optimizer-role-safe/index.ts`;
- GitHub immutable core source: `supabase/functions/fpl-full-pool-optimizer-core-v02/index.ts`.

## Deterministic regression contract

`private.c0240_deterministic_regression_v01()` verifies the failure classes that motivated C0240, including:

- local player gain losing after reinvestment;
- low-minute/team-prior protection losing to a stronger structural challenger;
- premium penalty-taker losing at squad allocation after price reinvestment;
- uncertainty swallowing a small forward edge;
- player-level gain losing after funding cost;
- near-equal structures remaining equivalent;
- ROLL remaining a valid winner;
- missing slot attack blocking final readiness;
- convergence-bound failure blocking final readiness.

This is decision-control regression only; it does not alter xPts.

## Governance

- C0240 production-consumption contract is registered under C0213 governance.
- Existing C0213 production behavioral suite remains green.
- Change-tracker governance must remain zero-violation at closeout.
- Historical projections/publications remain append-only.
- Shadow/research models remain zero numeric production effect unless separately promoted.

## Source refs

Plan committed before implementation:

- `project-management/C0240_FINAL_ADVERSARIAL_OPTIMIZATION_LAYER_PLAN_20260911.md`
- plan commit `825a4bf06c77e8fd3a418937cfff2ae6bdb36150`

Runtime source capture:

- immutable optimizer core commit `900ae9904ced161c35207a99f4479b4c3b14c615`
- role-safe adapter source commit `9573435610a05a9b537a5df65847576543e4de2b`

## Final implementation decision

C0240 is a permanent mandatory final layer. No Gameweek squad is eligible for FINAL solely because the optimizer/ensemble selected it. The candidate squad must survive the full adversarial loop and C0234 final-information/chip gates. External FPL execution remains separately authorized.
