# C0250 — V2 Full-Surface Data Population & Contract Compatibility

Date: 2026-09-12 (Dubai)
Scope: production website serving/UI reliability only. No model, forecast, FPL decision, transfer, chip, or historical-snapshot mutation.

## Trigger

The v2 FPL `Full-pool projection leaders` surface rendered xPts but blank P10+/q90/q95 fields even though the production projection run contained those values.

## Root cause 1 — semantic contract drift

Production run 1357 exposes 604 player projections. Every row has expected points, expected minutes, price, ownership, P10+, q90 and q95. Production extended `tail_semantics` from:

`direct_current_fixture_event_distribution`

to the backward-compatible family member:

`direct_current_fixture_event_distribution_plus_explicit_penalty_miss`

The frontend used exact-string equality and therefore treated the valid extended distribution as non-direct. This hid tail metrics in both the full-pool leaders and current captain/vice distribution cards.

Fix: `isDirectCurrentDistribution()` now accepts the governed semantic family by prefix while still rejecting unrelated legacy tail semantics. Unit coverage includes the current production suffix and a future versioned suffix.

## Root cause 2 — missing benchmark coverage presented as zero

The Performance page's external projection-benchmark comparison has no same-GW benchmark snapshot for GW4. Only GW1 benchmark runs currently exist. `calibration-summary` consequently reports zero matched benchmark players; its legacy aggregate can be numeric zero even though no benchmark observations exist.

Fix: the v2 analysis data layer normalizes zero-match benchmark aggregates to missing (`null`) and Performance explicitly renders `Not captured` / `Not available`. Missing external data is never presented as zero. No benchmark values were fabricated or backfilled.

## Full live-surface audit

Current production evidence at audit time:

- Gameweek status: GW4, 20 teams, 38-round schedule metadata complete.
- FPL: run 1357, 15 squad players, 604 full-pool projections, 10 fixtures; 604/604 required projection/distribution fields populated.
- Manager plan: publication 22, 11 XI, 4 bench, 3 transfers, captain/vice and manager state present; contested and execution unauthorized.
- Fixtures: 10/10 fixture-intelligence rows, 10/10 high-score overlays, tactical profiles and expected-XI data present; fixture-facts available with 16 card facts and 133 modal facts; 10/10 evidence snapshots aligned.
- Markets: 4 primary model calls, 10 fixtures, odds feed connected, 1,333 bookmaker rows, every fixture has model markets and bookmaker observations.
- Performance: forward variants and retrospective runs populated; current/frozen FPL projection metrics populated; same-GW external benchmark coverage legitimately absent and now explicit.
- Engine & Research: active model and latest FPL run present; 10 production fixture snapshots; governance clean; orchestration projection/decision readiness green; source-health metrics populated; A0005 and W0002 states present.

## Permanent regression gate

Added `frontend-v2/tests/live-population.spec.ts`.

This test resolves the live Gameweek and audits real production APIs plus rendered v2 surfaces. It fails if:

- full-pool projections lose required xPts/xMin/price/ownership/P10/q90/q95 data;
- current distribution semantics leave the governed family;
- XI/bench/captain/vice disappear;
- fixture intelligence, expected XIs, high-score overlays or evidence alignment disappear;
- any fixture loses bookmaker/model market data;
- Performance loses current projection/validation data or misrepresents missing benchmark coverage;
- Engine loses model/run/fixture/governance/readiness/source-health data;
- the rendered FPL leader metrics contain silent em-dash blanks;
- current fixture matchup controls become unavailable from evidence mismatch;
- current Markets cards become `NO MARKET DATA`;
- any audited route throws browser errors.

## Integrity rules

1. Missing is not zero.
2. Semantic extensions must remain backward-compatible at the family boundary, not depend on one exact version string.
3. A UI card existing is insufficient QA; required populated metrics must be asserted.
4. Production current-GW API population is now part of CI, not an ad-hoc manual check.
5. Historical data and final execution authority remain unchanged.

## Implementation refs

- `frontend-v2/src/lib/fpl.ts` — semantic-family compatibility.
- `frontend-v2/src/lib/fpl.test.ts` — family regression coverage.
- `frontend-v2/src/lib/analysis.ts` — zero-match benchmark normalization.
- `frontend-v2/src/lib/analysis-normalization.test.ts` — missing-is-not-zero unit coverage.
- `frontend-v2/src/pages/PerformancePage.tsx` — truthful benchmark coverage state.
- `frontend-v2/tests/live-population.spec.ts` — full current-v2 production population gate.

C0250 may be marked Completed/Verified only after the final source-control head passes typecheck, unit tests, live E2E/accessibility, Pages deployment, deployed root/v2 checks, C0213 behavioral consumption and governance.
