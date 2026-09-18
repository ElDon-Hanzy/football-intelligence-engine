# C0279 P6 — Captaincy & Chip Shadow Consumption Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-18  
**Production effect:** None  
**Next phase:** P7 matchup modal and Decision-Evidence Contract

## Outcome

P6 consumes P5 conditional player upside in a private shadow captaincy adapter while preserving the existing authority chain:

- C0248 remains the sole sequential selected-path and captain authority.
- C0277 remains the binding seasonal chip opportunity-cost gate.
- C0276/final authorization remain binding.
- P6 cannot select a captain, authorize Triple Captain or execute any chip.

The adapter compares the complete current 15-player squad plus every active named challenger. It evaluates xPts, P(blank), P(10+), P(15+), P(20+), expected minutes, start probability, role gate, scoring environment and conditional high-goal upside.

## Contract

Private function:

- `private.c0279_captaincy_chip_shadow_v01(manager_state_id, prediction_run_id, cycle_id)`

The shadow screening score is used only to order evidence for evaluation. It is not a production objective and must be calibrated prospectively in P8 before promotion.

The function exposes:

- full-XV and named-challenger coverage;
- P5 minutes/role eligibility;
- scoring environment and representative family;
- canonical haul probabilities;
- conditional P(10+) in a 4+ team-goal state;
- environment upside;
- incumbent C0248 captain comparison;
- Noise-Control equivalence;
- C0277 gate class, current chip and PLAY_NOW state;
- explicit non-authority and zero-production-effect lineage.

## Current GW5 result

Inputs:

- manager state: 5
- prediction run: 1428
- decision cycle: 2
- whole XV: 15/15
- active named challengers: 0/0
- eligible players: 12
- blocked by xMins/role: Foden, Forster and Kusi-Asare

Top shadow comparison:

| Rank | Player | Environment/family | xPts | P(10+) | P(15+) | P(20+) | P(10+) at 4+ goals | Classification |
|---:|---|---|---:|---:|---:|---:|---:|---|
| 1 | Mbeumo | HIGH / comfortable away win | 6.499 | 20.63% | 5.07% | 0.93% | 30.81% | Equivalent lead |
| 2 | B. Fernandes | HIGH / comfortable away win | 6.193 | 18.66% | 3.61% | 0.49% | 27.16% | Equivalent challenger |
| 3 | N. Williams | NORMAL / narrow home win | 5.660 | 9.55% | 1.06% | 0.09% | 18.19% | Shortlist |
| 4 | O'Reilly | HIGH / home demolition | 5.192 | 11.21% | 1.81% | 0.17% | 17.74% | Shortlist |
| 5 | Calafiori | NORMAL / narrow away win | 4.638 | 8.04% | 0.98% | 0.11% | 14.31% | Shortlist |
| 7 | João Pedro | HIGH / shootout | 4.332 | 9.71% | 1.41% | 0.09% | 16.83% | Outside top-five shortlist |

Mbeumo remains the incumbent C0248 captain and ranks first in the P6 shadow evaluation. His screening edge over Bruno is 0.550 points, below the registered one-point model-error margin, so P6 correctly reports **NO_MEANINGFUL_EDGE / equivalent lead pair** rather than false certainty.

João Pedro remains a valid Chelsea fixture-level upside nominee and passes the P5 eligibility gate, but the full-XV comparison places him seventh. Therefore the high-scoring Chelsea family does not override stronger squad-level candidates.

## Triple Captain and chips

The consumed C0277 gate returns:

- gate class: `RESERVE_FOR_FUTURE`
- recommended current chip: `NONE`
- `PLAY_NOW=false`
- current TC incremental evidence: +6.499 points
- season-best chip windows unresolved
- collision/reservation value unresolved

Accordingly:

- Mbeumo's TC evidence is `BLOCKED_BY_C0277_RESERVATION`;
- no other player is a lead TC nominee;
- xMins/role-blocked players are `NOT_ELIGIBLE_FOR_TC`;
- captain selection authorization is false for every row;
- chip execution authorization is false for every row.

## Validation

| Control | Result |
|---|---:|
| Whole-XV rows | 15 |
| Whole-XV coverage | Complete |
| Named challengers | 0 active; complete coverage |
| Eligible unique ranks | 12/12 |
| Noise-Control applied | Yes |
| C0248 incumbent preserved | Yes |
| C0277 reserve gate consumed | Yes |
| Captain/chip authority violations | 0 |
| Blocked-player TC violations | 0 |
| Production-effect violations | 0 |

P4/P5 and C0277 function hashes remain unchanged. PUBLIC, anon and authenticated roles cannot execute the P6 function. Supabase advisors returned no C0279-specific security or performance finding.

## Integrity

P6 is supporting evidence only. It creates no parallel selector and performs no writes to selected plans, recommendations, chip state or historical forecasts. The full-XV comparison includes defenders, preserves named-challenger extensibility, and keeps uncertainty/Noise-Control binding.

## Implementation

Migration: `supabase/migrations/20260917194500_c0279_p6_captaincy_chip_shadow_consumption.sql`

P6 structural, coverage, authority and opportunity-cost gates are satisfied. Ranking/calibration value remains a P8 prospective evaluation question.
