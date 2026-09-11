# C0248 Checkpoint F — Wildcard, Terminal Option Value & Final-Gate Integration

Date: 2026-09-11
Status: IMPLEMENTED / CURRENT-GW DECISION-CONTROL GREEN
Parent: C0248

## What changed

C0248 now supervises the existing C0240 normal-transfer survivor rather than replacing it blindly.

Implemented capabilities:

- root-preserved sequential search across GW4–GW8;
- exact FT carry/accrual and hit accounting;
- expected-autosub bench utility rather than a flat XV weight;
- named 2FT Guéhi + De Cuyper root preserved through the full horizon;
- first-party FPL price-predictor snapshots and timing control;
- Bench Boost / Triple Captain exact-window incremental EV;
- Free Hit current-GW same-utility benchmark;
- Wildcard as a true sequential root retaining banked FTs;
- terminal-state sensitivity so a five-GW horizon cannot pretend future FTs have zero value;
- current-chip action control that can robustly recommend `NONE` without claiming the best future chip week is known.

## Current sequential roots

Using the current GW4–GW8 projection lineage:

- Wildcard fresh root: 248.519 raw exact-horizon utility
- C0240 4FT/-4 normal root: 232.860
- C0228 2FT baseline: 227.528
- named 2FT De Cuyper + Guéhi: 226.342
- ROLL root: 222.330

The named 2FT path is also formally resolved by C0242 at 221.104 versus 229.434 under the canonical fixed-squad objective. C0248 narrows its disadvantage because sequential FT use is modelled, but does not reverse it under current assumptions.

## Wildcard red-team

The raw Wildcard edge over the best normal sequential root is +15.659 points across the exact GW4–GW8 horizon.

However, the Wildcard path finishes GW8 with 1 FT while the best normal path finishes with 5 FTs. The raw comparison therefore omits four terminal FTs plus the unused-Wildcard option for GW9–GW19.

Break-even terminal value per extra FT, ignoring bank and unused-Wildcard option: 3.915 points.

Sensitivity:

- 0 pt/FT → WC +15.659
- 1 → +11.659
- 2 → +7.659
- 3 → +3.659
- 4 → -0.341

Because the recommendation flips under a plausible FT value before even valuing the retained Wildcard, current Wildcard use is `HOLD_NO_ROBUST_EDGE`.

## Other chips

- Bench Boost: HOLD. Current incremental EV 4.846, only two bench slots at 60+ xMins; superior exact-window opportunities already exist.
- Triple Captain: HOLD. GW4 incremental EV 6.174; GW6 reaches 7.377 in the exact horizon.
- Free Hit: HOLD_NO_ROBUST_EDGE. Role-safe one-GW fresh-squad same-utility score is 63.822, only +2.618 versus the best normal GW4 action. A future FH opportunity worth >2.618 points reverses current use.
- Current recommended chip: NONE.

Future best chip weeks remain unresolved; this is intentional. Knowing the best future week is not required to conclude that no chip is robust enough today.

## Price timing

Official FPL predictor data shows no material next-update affordability risk on the preserved normal roots. Policy remains `WAIT_FOR_INFORMATION`; price evidence cannot create a transfer.

## C0234 integration

`fpl-autonomous-gate` v5 adds:

- `C0248_SEQUENTIAL_DECISION_CONTROL`
- `C0248_CURRENT_CHIP_ACTION`

The obsolete requirement that a full GW9–19 Wildcard opportunity model be complete before authorizing `NO CHIP` was removed.

Current C0234 result:

- 15 total gates
- 14 pass
- sole blocker: `FINAL_T_MINUS_2H_REFRESH`

No transfer/chip is execution-authorized before the scheduled final refresh.

## C0237 integration

Publication #14 is PRE_FINAL / CONTESTED / execution unauthorized and explicitly carries:

- C0248 planner lineage;
- best normal root;
- named 2FT branch;
- current chip = NONE;
- terminal Wildcard sensitivity;
- price timing summary.

## Integrity

- no player xPts rewrite;
- no historical forecast rewrite;
- no external FPL transfer or chip execution;
- no `public.fpl_manager_plans` mutation;
- C0240 remains the current normal-transfer selector while C0248 acts as sequential/chip/price supervisory decision control;
- final authority remains the scheduled T−2 refresh and C0234 gate.