# C0279 P5 — Conditional Player-Return Bridge Closeout

**Status:** Completed / Verified  
**Date:** 2026-09-17  
**Production effect:** None (private shadow contract only)  
**Next phase:** P6 captaincy/chip consumption

## Outcome

P5 connects the P3/P4 fixture distribution to the canonical player projection core without creating a second projection authority. For every player it now exposes conditional outcomes for team goal states 0, 1, 2, 3 and 4+, including conditional goal/assist involvement, expected points, blank probability and P(5+), P(10+), P(15+) and P(20+).

The existing unconditional forecast remains the anchor. Integrating the conditional states over the team goal distribution reconstructs the canonical player forecast rather than replacing it.

## Contracts

Private shadow functions:

- `private.c0279_conditional_player_return_v01(jsonb,numeric,numeric,jsonb)`
- `private.c0279_conditional_player_snapshot_v01(bigint,bigint)`

The bridge consumes:

- P4 score-family environment and family;
- the complete fixture score matrix, converted to normalized team goal states;
- canonical player goal and assist event lambdas;
- existing point-distribution tails;
- expected minutes, start probability and current tactical role.

It emits an explicit xMins/role gate:

- **ELIGIBLE:** xMins ≥60, start probability ≥65%, known role;
- **WATCH:** xMins ≥30, start probability ≥30%, known role;
- **BLOCKED:** otherwise.

These gates constrain later nomination/selection. They do not erase substitute scoring probability or rewrite the underlying player forecast.

## Conservation rules

Player scoring shares are normalized from canonical goal lambdas within each team. Assist shares are normalized independently from canonical assist lambdas. Therefore:

- player expected goals allocated within each team goal state sum to that goal state;
- player expected assists cannot imply more assists than team goals;
- scoring-share and assist-share sums each equal 1 where evidence exists;
- weighted conditional return distributions reconstruct canonical unconditional xPts and haul tails.

Across all ten frozen GW5 fixtures:

| Test | Result |
|---|---:|
| Player rows | 604 |
| Fixture snapshots | 10 |
| Goal-share violations | 0 |
| Assist-share violations | 0 |
| Maximum goal-state allocation drift | 0.000003 |
| Maximum assist-state allocation drift | 0.000003 |
| Canonical xPts reconstruction drift | 0.000000 in diagnostic fixtures |
| Canonical P(10+) reconstruction drift | 0.000000 in diagnostic fixtures |
| Non-monotonic P(10+) state profiles | 0 |
| Chronology/production-effect violations | 0 |
| ELIGIBLE / WATCH / BLOCKED | 162 / 77 / 365 |

## Diagnostic fixture findings

Brentford–Chelsea remains HIGH_SCORING / SHOOTOUT. Among Chelsea players passing the ELIGIBLE gate:

| Player | Role | xMins | Start | P(10+) at 0 team goals | P(10+) at 2 | P(10+) at 4+ |
|---|---|---:|---:|---:|---:|---:|
| João Pedro | Central striker | 64.12 | 70.59% | 3.44% | 11.81% | 16.83% |
| Rogers | Wide attacker | 84.87 | 96.36% | 2.63% | 9.98% | 13.51% |
| Palmer | Creator 10 | 85.29 | 97.91% | 2.22% | 8.08% | 11.54% |

This confirms the intended bridge: João Pedro is Chelsea’s highest conditional P(10+) player in a 4+ team-goal state and passes the minimum minutes/start/role gate. It does **not** automatically make him captain or authorize Triple Captain; P6 must compare the full XV, named challengers, uncertainty and the existing C0277 opportunity-cost gate.

Leeds–Crystal Palace remains HIGH_SCORING / SHOOTOUT. Leeds’ leading eligible P(10+) players in a 4+ state are Calvert-Lewin (18.12%), Bogle (15.37%) and Stach (11.54%). These are conditional scenario outputs, not standalone selection recommendations.

## Validation and security

- Both diagnostic fixtures conserve player/team probabilities.
- Full GW5 frozen cohort passes conservation and monotonic-tail tests.
- Conditional states reconstruct existing xPts and P(10+) anchors.
- P3 and P4 function hashes remain unchanged.
- P5 functions are private, security-invoker/ordinary invoker code with empty search paths.
- PUBLIC, anon and authenticated roles have no execute privilege.
- Security and performance advisors returned no C0279-specific finding.
- Missing evidence fails closed in the pure classifier.
- Historical forecasts remain append-only.

## Integrity

P5 does not create a new fixture model, player projection core, captaincy selector or chip authority. C0248 remains the sole selected-path authority; C0277 remains the chip opportunity-cost gate; C0276 and final authorization remain binding. Production effect stays zero until prospective evaluation and explicit promotion.

## Implementation

Migration: `supabase/migrations/20260917193000_c0279_p5_conditional_player_return_shadow.sql`

P5 implementation, conservation, xMins/role gating and diagnostic acceptance gates are satisfied. Tail calibration quality remains a P8 prospective evaluation question and is not claimed from these structural tests.
