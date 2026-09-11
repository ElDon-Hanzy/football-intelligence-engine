# C0248 Checkpoint G — C0244/C0245 Future Option Guards

Date: 2026-09-11
Status: Implemented checkpoint; C0244/C0245 remain In Progress.

## Governance baseline
Post C0243-C0246 tracker reconciliation:
- tracker audit: OK; 173 rows; 0 violations; 0 completed-not-verified; 0 completed-without-refs.
- consumption governance: 85/85 required rows covered; 0 violations.
- behavioral production proof: 14/14 PASS on GW4, prediction run 1356.

## C0244 — chip timing
Added `private.c0248_structural_chip_window_status_v01()`.

Purpose: extend current-chip control without fabricating GW9-GW19 player projections.

Live state:
- FPL fixture calendar exists through GW19: 16/16 GWs from GW4-GW19, currently 10 matches each.
- Exact production player projections exist only through GW8: 5/16 GWs.
- Therefore full first-half numerical chip ranking is fail-closed.
- Current GW4 action remains robust `NONE` from C0248 current-chip control.
- Known future 10-match weeks are structural context only and must not be labelled DGWs.
- Re-rank as future projections and fixture rearrangements become authoritative.

This is intentionally not a new independent chip architecture layer; it is a C0248 guard.

## C0245 — terminal FT/liquidity/future-information value
Added `private.c0248_terminal_state_sensitivity_v02()`.

Live GW4-GW8 comparison:
- Wildcard raw exact-window edge vs best normal root: +15.659 weighted points.
- Best normal root: C0240_LEGACY.
- Terminal FT gap: normal +4 FTs vs Wildcard.
- Terminal bank: normal £0.3m; Wildcard £0.6m.
- FT-only break-even: 3.915 points per extra terminal FT.
- Illustrative sensitivity if £1m bank were assigned 1 point (NOT a production valuation): FT break-even 3.840.
- 11 first-half GWs remain beyond the exact projection horizon.
- Unused Wildcard option value and future-information option value remain explicitly unmodelled/non-zero.

Policy:
- no arbitrary fixed point value for an FT;
- no arbitrary fixed point value for cash;
- report break-even thresholds and sensitivity instead of fake precision;
- exact-window Wildcard edge alone cannot authorize Wildcard.

## Remaining work
C0244: full first-half ranking becomes numerical only when future projection/fixture evidence is sufficiently authoritative; until then structural guard + current-action control.
C0245: improve empirical calibration of terminal FT/flexibility and future-information option value without hindsight/look-ahead; do not force a single constant FT value if regime/state dependent.

No player xPts rewritten. No manager plan mutation. No transfer/chip execution.