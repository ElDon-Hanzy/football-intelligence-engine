# C0226 — Autonomous FPL Decision Architecture Closeout

Date: 2026-09-09 Dubai
Parent: C0226
Children: C0227–C0234

## Executive result

The autonomous FPL Decision-Control stack is implemented and operational in production. It is intentionally **fail-closed** and read-only at the final gate. The first GW4 evaluation returned `DECISION_NOT_READY`, which is the correct architecture behavior rather than a runtime failure.

The stack does not rewrite xPts, historical forecasts, manager plans, or external FPL state. It can challenge a raw optimizer winner, classify near-equal structures, surface strategic/role/uncertainty risks, and refuse to manufacture a decision.

## Canonical decision path

```text
production player/fixture projections
  -> C0227 uncertainty/sensitivity state
  -> C0228 distributed structural ensemble / equivalence classes
  -> C0229 structural robustness / portfolio control
  -> C0230 team-regime diagnostic (SHADOW only)
  -> C0231 forward-management / premium-access simulation
  -> C0232 rank-aware OR/leverage utility
  -> C0233 adversarial red-team
  -> C0234 fail-closed autonomous final gate
  -> separately-authorized append-only manager plan only when gate is final
```

C0225 remains the base rank-aware leverage contract: ownership never becomes expected points and cannot force a differential.

## C0227 — model uncertainty and sensitivity

Production surface: `public.current_fpl_projection_uncertainty_v01`.
Refresh: `private.refresh_c0227_projection_uncertainty_v02(gw)`.

The first V01 pass exposed duplicate result-run aggregation in `player_gameweek_actuals`. This was not overwritten. V02 appends corrected observations and uses `LATEST_RESULT_RUN_PER_PLAYER_GW`.

GW4–GW8 have 604/604 V02 uncertainty rows. The layer is diagnostic only:

- João Pedro: LOW uncertainty;
- Thiago: HIGH, including regression dependency;
- Cherki: HIGH and minutes-risk;
- Schade: MEDIUM;
- Gabriel / Calafiori: LOW.

No calibrated-confidence-interval claim is made. Sensitivity triggers may invalidate a decimal edge but never change xPts.

## C0228 — distributed ensemble and equivalence classes

Canonical optimizer remains `fpl-full-pool-optimizer`; no second optimizer was created.

A first single-worker multi-family implementation hit Edge HTTP 546. It was rejected. The production solution distributes structural profiles over separate invocations of the same canonical optimizer and aggregates them with `fpl-autonomy-ensemble`.

Current production optimizer version: `C0228_DISTRIBUTED_ENSEMBLE_OPTIMIZER_V02`.

GW4–GW8 ensemble run #1 produced two unique structural families:

| Family | Profile | Weighted objective |
|---|---|---:|
| PF1_PM0_PD1 | BALANCED_VALUE / Haaland-value | 245.777 |
| PF0_PM2_PD1 | DUAL_PREMIUM_MID_VALUE / no-Haaland | 244.659 |

Gap: **1.118** points. This is outside the exact 1-point error band but inside the 2x sensitivity band, so classification is `NEAR_EQUIVALENT_SENSITIVITY_REQUIRED`.

The dual-premium-mid family was discovered without named-player anchors and contains Bruno Fernandes + Saka + Mbeumo with João Pedro and no Haaland.

`DUAL_PREMIUM_MID_LOW_DEF` is not used in the production ensemble yet because its seed-level defender cap did not survive local improvement. This defect was caught and excluded rather than hidden. C0229 performs the generic defender marginal-value challenge independently.

## C0229 — structural robustness

The structural controller compares only structures inside the sensitivity band and applies lexicographic controls rather than a points multiplier.

Current adjudication: `RAW_OPTIMUM_STRUCTURALLY_CHALLENGED`.

- raw Haaland/value family: one role-risk slot (Anderson), LOW 7 / MEDIUM 8 / HIGH 0 uncertainty;
- dual-premium-mid family: zero role-risk slots, LOW 8 / MEDIUM 7 / HIGH 0 uncertainty.

The structural layer also exposes club-slot saturation, fragile-minutes slots, bench leakage, defensive spend and marginal defender value.

Important semantic note: the current Gabriel-vs-cheaper-defender output is a **marginal-value benchmark inside the selected squad**, not necessarily a legal one-for-one transfer. For the current benchmark Gabriel's 5-GW weighted horizon advantage over Guéhi is 0.660 for £2.0m extra, approximately 0.33 weighted points per extra £1m. The acceptance surface explicitly preserves this benchmark semantics.

The no-Haaland family has a real counter-risk: Arsenal slot saturation through Saka + Calafiori + Gabriel.

## C0230 — team regime-change diagnostic

Lifecycle: `SHADOW_DIAGNOSTIC`.
Numeric projection effect: **false**.

It uses current-vs-prior xG/xGA plus process indices and requires at least three completed matches and process coverage. It may create a red-team warning but cannot alter fixture/team lambdas.

Current notable signals include:

- Manchester United attack: `UP_CONFIRMED_BY_XG_AND_PROCESS` HIGH;
- Chelsea attack: `PROCESS_UP_XG_NOT_YET_CONFIRMED` MEDIUM;
- Arsenal defence: `UP_CONFIRMED_BY_XGA_AND_PROCESS` HIGH;
- Manchester City defence: process improvement warning/observation;
- Chelsea defence: deterioration signal.

Promotion to numeric model effect would require a separate chronology-safe validation and Change ID.

## C0231 — forward-management and premium access

V01 evaluates structural access to top premium targets over the verified GW4–GW8 projection horizon.

Top current premium targets include Haaland, Bruno, Saka, Isak and Palmer.

Current trade-off:

- Haaland/value family directly owns the hardest premium to reacquire, but has one fragile slot;
- dual-premium-mid directly owns Bruno + Saka, has zero fragile slots and better one-transfer access to most other major premiums;
- Haaland is not reachable from the dual-premium-mid family within the current conservative two-transfer approximation.

One-transfer reachability is exact under candidate budget/position/club-slot constraints. Two-transfer reachability is explicitly a conservative approximation, not an exact future transfer optimizer.

## C0232 — rank-aware OR utility

Live public FPL state at first run: 203 points, OR 1,961,626.
Regime: `EARLY_SEASON_EV`.

The dual-premium-mid family has the stronger leverage diagnostic (10.1422 vs 9.3307), but rank/leverage did **not** reorder the raw winner because its 1.118-point gap is outside the fixed 1-point band. This proves rank does not widen the model-error band in early season.

## C0233 — adversarial red-team

Current verdict: **`EDGE_NOT_ROBUST`**.

Raw unique assets: Szoboszlai, Anderson, Lacroix, Haaland.
Challenger unique assets: Bruno Fernandes, Saka, João Pedro, Gvardiol.

High-severity blockers:

1. `MULTI_FAMILY_NEAR_EQUIVALENCE`;
2. `STRUCTURAL_CHALLENGER_BEATS_RAW_ON_ROBUSTNESS`;
3. `EDGE_FLIPS_UNDER_SMALL_ROLE_RISK_SENSITIVITY`.

Only a **6.42% attenuation** of Anderson's raw-family horizon contribution is sufficient to erase the 1.118-point raw family edge.

Supporting medium challenges favor the challenger on uncertainty, one-transfer flexibility, leverage and current shadow regime signals. Counter-evidence is preserved: the raw family owns Haaland and the challenger saturates Arsenal slots.

No candidate is recommended after red-team while the edge remains non-robust.

## C0234 — fail-closed autonomous final gate

Production Edge: `fpl-autonomous-gate`.
Version: `C0234_AUTONOMOUS_FINAL_GATE_V01`.
First production run: #1.

Result: **`DECISION_NOT_READY`**.

13 gates evaluated; 7 passed. Current blockers:

- `UNCERTAINTY_SENSITIVITY`;
- `EQUIVALENCE_ADJUDICATION`;
- `STRUCTURAL_ROBUSTNESS`;
- `ADVERSARIAL_RED_TEAM`;
- `FINAL_T_MINUS_2H_REFRESH`;
- `CHIP_OPPORTUNITY_COST`.

Current context:

- ROLL objective: 206.765;
- best raw no-chip path: 230.002;
- raw ideal fresh squad: 245.777;
- fresh-vs-best-no-chip raw edge: 15.775;
- live public chip history verified;
- first-half Wildcard currently available and unused;
- Wildcard is therefore a structural candidate, **not an authorized chip action**.

The Wildcard opportunity-cost gate remains deliberately red because only GW4–GW8 numerical player projections currently exist. Consuming a first-half Wildcard before its GW19 expiry cannot yet be compared honestly against later first-half windows. The gate will not fabricate that value.

C0234 is read-only: it does not write `public.fpl_manager_plans` and does not execute external FPL transfers. Latest manager plan remains Plan 10.

## Final-deadline timing

Production fixture state confirms:

- GW4 first kickoff: 2026-09-12 14:00 UTC = 18:00 Dubai;
- FPL deadline: 12:30 UTC = 16:30 Dubai;
- standing T−2h final autonomy refresh: **14:30 Dubai on 2026-09-12**.

The existing automation was corrected from 13:30 to 14:30 Dubai and renamed `GW4 Final Autonomy Gate`. It now refreshes the full C0227–C0234 stack.

## Permanent acceptance suite

`private.c0226_autonomy_acceptance_tests_v01()` is GREEN.

1. A_FALSE_PRECISION: 240.952 vs 240.841, gap 0.111 -> equivalent;
2. B_EVIDENCE_QUALITY_TIE: João Pedro 19.219 vs Thiago 19.118, gap 0.101; LOW vs HIGH uncertainty;
3. C_DEFENDER_OPPORTUNITY_COST: marginal-value benchmark exposed;
4. D_DIFFERENTIAL_QUALITY: Schade passes structural leverage gate at 4% ownership proxy;
5. E_EXPLOSIVE_EXCEPTION: Cherki remains discoverable despite 59.14 xMins, while HIGH/minutes-risk is explicit;
6. F_WILDCARD_HUMILITY: unresolved red-team + chip opportunity cost produces `DECISION_NOT_READY` rather than a forced Wildcard.

## Integrity / governance proof

After C0226–C0234 execution:

- GW4–GW8 latest projection run IDs remain 1347 / 1348 / 1350 / 1352 / 1353;
- all C0228–C0234 run tables have zero `historical_forecasts_rewritten=true` rows;
- latest manager plan remains id 10, captured before the autonomy run;
- C0213 behavioral production proof remains 14/14 GREEN;
- C0213 architecture registry is GREEN;
- tracker consumption governance is GREEN;
- global change-tracker governance is GREEN before tracker closeout.

## Decision for GW4 now

**No FPL action is authorized now.**

The architecture has done what it was built to do: the raw Haaland result was challenged successfully, but the evidence is not yet strong enough to replace it with the Bruno+Saka family either. The final autonomous decision must be rerun from refreshed T−2h evidence on September 12.
