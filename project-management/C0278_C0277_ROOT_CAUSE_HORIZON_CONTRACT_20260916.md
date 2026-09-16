# C0278 — C0277 Root-Cause Finding: Horizon Contract Mismatch — 2026-09-16

## Finding
C0277's live `BOUNDED_OPTION_INPUT_NOT_READY` is reproducibly horizon-dependent, not evidence that the V06 planner itself is absent.

Live checks:

- `private.c0248_planner_status_v01(5,3)` => READY, latest V06 candidate run 37.
- `private.c0248_planner_status_v01(5,5)` => `NO_PLANNER_RUN`.
- `private.c0248_planner_status_v01(5,15)` => `NO_PLANNER_RUN`.
- `private.c0276_bounded_chip_option_value_status_v01(5,3)` => OK, `bounded_no_chip_robust=true`, recommended current chip `NONE`.
- the same bounded chip function at horizon 15 => `BOUNDED_OPTION_INPUT_NOT_READY`.

The exact numerical sequential planner currently owns a 3-GW decision horizon (GW5-GW7 in run 37). Structural chip control separately spans the first-half window through GW19 and explicitly distinguishes exact numerical weeks from structural-only weeks. It does **not** fabricate decision-grade player projections for GW9-GW19.

Therefore feeding a first-half/seasonal window length such as 15 into functions that require an exact V06 sequential planner run violates the current horizon contract. It causes `V06_PLANNER_RUN_MISSING` even though the valid H=3 V06 planner exists and evaluates current chip opportunity cost successfully.

## Current H=3 chip result
Using the valid exact horizon:

- Bench Boost: HOLD; current incremental EV 2.469.
- Triple Captain: exact-horizon competitive but season opportunity unresolved; current incremental EV 6.498.
- Free Hit: HOLD_NO_ROBUST_EDGE; current same-utility edge 5.583, future option not numerically modelled.
- Wildcard: HOLD_OPTION_VALUE_UNRESOLVED; raw exact-horizon edge 9.936, future option not numerically modelled.
- Bounded current decision: `NONE`, robust under the existing fail-closed option-value policy.

This does **not** establish the best future chip week. It establishes only that current chip expenditure is not authorized under the available evidence.

## Implication for C0277
The next implementation must separate two horizons explicitly:

1. `exact_decision_horizon` — the V06 sequential planner's numerically projected horizon, currently 3.
2. `seasonal_chip_window` — structural/option-value coverage extending beyond exact projections, currently first-half through GW19.

Do not solve the issue by fabricating 15-GW player projections or by merely changing planner-version labels. Preserve the fail-closed rule: missing future numeric evidence may support preserving a chip, but may not authorize spending it.

## Safety
No historical forecast rewrite. No external FPL execution. C0265 unchanged. C0240 concurrency unchanged.