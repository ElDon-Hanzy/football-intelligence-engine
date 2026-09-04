# C0197 Pre-GW3 Experiment Suite — 2026-09-04

## Governance

- Change: C0197
- Evidence freeze: **2026-09-04 07:29:02.603647 UTC**
- First GW3 kickoff: **2026-09-04 19:00 UTC**
- All experiments are research-only and `model_effect_enabled=false`.
- V01/V02/V03 are untouched.
- No variant may be selected, retuned, combined, or promoted from GW3 information until the full Gameweek is complete.
- Missing data is not treated as zero.

## V04 — Adaptive History Decay

Purpose: test whether regime change should alter how rapidly current-season observations replace 2025/26 history.

Base: frozen V02 six-component shootout score.

Regime gate:

`gate = max(0, 2 * (sigmoid(V03 regime overlay) - 0.5))`

Current-season observation weight:

`1 + (max_multiplier - 1) * gate`

Frozen sensitivity variants: max multipliers **2, 4, 8**. Prior-season rows retain weight 1. Missing slots retain the frozen V02 priors. No variant is preferred before GW3 results.

Key GW3 discrimination:

- Ipswich–Liverpool: V02 #2 -> V04 #2 / #1 / #1.
- Arsenal–Chelsea: V02 #9 -> V04 #8 / #7 / #6.
- Negative-regime fixtures are essentially unchanged.

## V05 — Tactical Clash

Purpose: test fixture-specific two-sided attacking opportunity independently of team-history/regime models.

Variant A: equal mean z-score of:

- weaker-side direct-transition opportunity,
- weaker-side central creation vs block,
- weaker-side wide-channel pressure.

Variant B: Variant A plus max side personnel disruption as a fourth equal component.

GW3 top signals:

- Arsenal–Chelsea: #1 in A and B.
- Everton–Man Utd: #3 A, #2 B.
- Ipswich–Liverpool: #8 A, #9 B; confidence only ~0.20 and coverage ~0.73.
- Hull–Villa: #10 with low confidence/coverage.

Interpretation rule: low-coverage tactical ranks must not be treated as equivalent to full-coverage ranks.

## V06 — Expected Attack-Unit Delta

Purpose: test the quality and breadth of the expected attacking XI rather than team reputation or transfer fee.

Current attacking unit:

- latest pre-cutoff expected-XI MID/FWD,
- top five by `xGI90 * expected_minutes / 90`.

Prior baseline:

- 2025/26 team MID/FWD,
- minimum 450 minutes,
- top five by historical xGI contribution.

Promoted/missing prior teams use league-average EPL prior and are explicitly flagged.

Equal-weight fixture score:

- weaker-side current top-five xGI load,
- weaker-side threat count (`xGI90 >= 0.30` and expected minutes >=45),
- average positive attack-unit delta versus prior baseline.

GW3 ranking:

1. Arsenal–Chelsea
2. Everton–Man Utd
3. Brentford–Sunderland
4. Ipswich–Liverpool (Ipswich prior missing)
5. Newcastle–Bournemouth

## V07 — GK/Defensive Suppression

Deferred for this Gameweek. The pre-cutoff availability layer returned no goalkeeper rows marked expected XI. No goalkeeper was inferred from FPL rank/order, and no keeper suppression feature was fabricated.

## V08 — Shootout / Demolition Router

Purpose: separate two high-tail mechanisms.

Shootout branch: frozen V02 standardized within GW3.

Demolition A components:

- favorite probability,
- favorite rolling goals,
- favorite rolling SOT,
- underdog rolling SOT allowed.

Demolition B adds underdog personnel disruption.

Router: whichever standardized archetype score is higher determines `SHOOTOUT` or `DEMOLITION`; tail score is the maximum of the two branch scores.

Important GW3 classifications:

- Man City–Coventry: **DEMOLITION**, demolition #1; very low shootout score.
- Everton–Man Utd: **SHOOTOUT**.
- Ipswich–Liverpool: **SHOOTOUT**.
- Newcastle–Bournemouth: **SHOOTOUT**.
- Brighton–Leeds: **DEMOLITION**.
- Arsenal–Chelsea: **DEMOLITION** under both router variants, with personnel disruption materially strengthening that branch.

## Key forward disagreements to evaluate after GW3

1. **Arsenal–Chelsea** — V02 low, V03/V05/V06 materially higher; router says demolition rather than shootout.
2. **Ipswich–Liverpool** — V03/V04 high; V05 tactical layer low-confidence/low rank; router says shootout.
3. **Man City–Coventry** — low shootout but top demolition; direct test of archetype separation.
4. **Brighton–Leeds** — V02 moderately high, V03 weak, V08 demolition.
5. **Everton–Man Utd** — broad agreement across several branches and therefore a useful consensus control.

## Post-GW3 evaluation protocol

Only after all ten GW3 fixtures are complete:

- classify actual 6+ matches into shootout vs demolition,
- compare top-k precision/recall for every frozen variant,
- evaluate 5+/6+/7+ tail capture,
- compare with frozen BTTS and O2.5 ranks,
- evaluate whether regime-sensitive variants add incremental information,
- stratify low-coverage/promoted-team cases,
- run red-team sensitivity before any promotion,
- do not retune from individual match outcomes.

Decision at freeze: **FORWARD_SHADOW_FROZEN_NO_PRODUCTION_EFFECT**.
