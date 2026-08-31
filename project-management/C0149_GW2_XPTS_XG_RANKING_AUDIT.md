# C0149 — GW2 xPts / xG ranking audit

Date: 2026-08-31
Status: Completed / Verified
Parent: C0148

## Trigger

The human-facing GW2 page showed Saka as the highest raw xPts player while the live manager discussion had Bruno Fernandes and Mbeumo as the serious captaincy candidates. Bruno's displayed fixture xG (~0.22) also looked low after correcting the UI from xG/90 × minutes to fixture-conditioned event expectation.

## Noise-control boundary

Bruno's eventual 23-point GW2 return is not evidence that his pre-match xG should have been 2.0 or that the model must be tuned upward. The audit uses the frozen pre-deadline inputs and model lineage to identify structural implementation problems, not the result to select coefficients.

## Findings

Frozen GW2 run 14 ranked Saka 6.19 xPts, Haaland 6.12, Tzolis 6.03, Mbeumo 5.46 and Bruno 5.39.

Bruno's goal expectation was low relative to the others, but his total attacking expectation was not tiny: fixture xG was about 0.22 and fixture xA about 0.37, for roughly 0.59 xGI. He was also first choice on penalties, direct free-kicks and corners.

The audit confirmed three implementation defects in C0135:

1. **Recursive rolling baseline chaining.** New pre-deadline runs selected the latest prior rolling prediction as the player's baseline. For Bruno, the GW2 chain repeatedly referenced earlier C0135 rows before eventually reaching the original GW1 active-model row. This allowed shape/scaling errors to compound.
2. **Target fixture attack strength was not used in player goal/assist hazards.** `new_team_lambda` changed with the fixture, but the C0135 `new_lg` / `new_la` equations were driven by player xG90/xA90 and an inherited scale only. The target fixture lambda therefore affected clean-sheet components but did not properly recondition player attacking events.
3. **The promoted explicit penalty model was collapsed into a generic multiplier.** Model 0.1.2/0.1.3 had an explicit first-choice penalty event contribution. C0135 inferred one generic `goal_scale` from total p(goal) divided by xG90 × minutes, mixing open-play, penalty and fixture effects. This produced cross-player distortions, most visibly an inflated Saka event rate when his current xG90 changed.

The early-season team assimilation magnitude was also reviewed. One completed match can move a team factor materially (e.g. Ipswich defensive factor suppressing United; Villa defensive factor boosting Arsenal). That is an explicit C0136 design choice rather than a confirmed implementation bug, so it was **not** retuned from GW2 results.

## Decision

Fix the confirmed C0135 event-conditioning regression prospectively under C0150. Do not rewrite GW1/GW2. Do not force Bruno's xG upward because of his GW2 haul. Preserve the C0136 team-weight question for separate forward validation / observation.
