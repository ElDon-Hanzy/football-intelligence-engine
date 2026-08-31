# C0151 — Conversation handover — 2026-08-31

Date: 2026-08-31
Purpose: durable handover before starting a fresh ChatGPT conversation
Supabase: `knooiwezzsxcwhtjtdap`
Repository: `ElDon-Hanzy/football-intelligence-engine`

## 1. Non-negotiable operating rules

- Objective: maximize probability of FPL Overall Rank #1; if that becomes unrealistic, maximize expected final rank.
- Historical FPL and betting forecasts are append-only. Never rewrite genuine predictions after results are known.
- Fixture/model intelligence may update only pre-kickoff and hard-freezes at kickoff.
- Missing data is not zero.
- Production decisions require full-squad re-optimization, not isolated player comparisons.
- Default full-pool process: roughly top 300 players by expected minutes, split by position, plus an **explosive-exception bucket** for players whose role/start probability/ceiling may be changing faster than mechanical xMin filters (Cherki is the canonical example).
- Always compare transfers against **ROLL / no action** and include transfer opportunity cost, bench leakage, club-slot cost, future flexibility, price structure, correlation and captaincy consequences.
- Do not force Haaland or any premium through ad-hoc downgrades.
- User explicitly does **not** want to sell Bruno merely to manufacture a Haaland route.

### Noise-Control Gate

Never make a final FPL decision from a single model output, recent score, isolated statistic or one-match tactical observation. Every proposed transfer, captaincy choice or structural change must demonstrate a robust edge after model uncertainty and sensitivity testing. Require multiple independent supporting signals, including at least one structural signal such as expected minutes, tactical role or fixture quality. Always compare against ROLL/no action. If the recommendation changes under reasonable assumptions, if plausible scenarios do not favor it consistently, or if the projected difference is within normal model error, classify it as **NO MEANINGFUL EDGE** and do not act. Do not rank statistically indistinguishable options as if the difference were real.

Internally classify recommendations as: **Strong / Moderate / Weak / Noise**. Weak/Noise cannot become the final action without a separate strategic reason.

## 2. Current FPL squad and actual-manager history

Active 15 carried into GW2/GW3:

- GK: Verbruggen, Forster
- DEF: O'Reilly, Mosquera, Dalot, Neco Williams, van Ewijk
- MID: Bruno Fernandes, Palmer, Semenyo, Mbeumo, Tzolis
- FWD: Isak, João Pedro, Kusi-Asare

GW1 actual squad was the same 15. Key GW1 process lessons remain active:
- De Cuyper -> van Ewijk to fund O'Reilly was the largest squad-construction process error.
- O'Reilly was over-forced from historical-return arguments despite role/minutes uncertainty.
- Dalot was retained despite a known xMin/start-risk warning.
- Too much correlated Man Utd exposure plus overconfident Bruno captaincy.
- No-Haaland edge was tiny and inside model error; confidence should have been lower.
- Local player arguments must never override whole-squad optimization.

GW2 actual-manager action:
- **Captain: Bruno Fernandes** (not Tzolis).
- Frozen historical model captain remains **Tzolis** and must stay preserved separately for audit.
- Website overlay already distinguishes actual-manager action from frozen model recommendation.

As of this handover, GW2 is not fully complete: Aston Villa vs Arsenal is still to be played later on 2026-08-31. Do not finalize GW2 analysis before ingesting that result.

## 3. Current GW3 decision state

Latest superseding manager plan is `public.fpl_manager_plans.id = 2`:

- Status: `PROVISIONAL_HOLD_PENDING_GW2_COMPLETION_AND_NOISE_GATE`
- Transfers: **none**
- Captain: **Bruno Fernandes**
- Vice: **Mbeumo**
- Chip: NONE
- Baseline action: **HOLD / preserve both free transfers until GW2 is complete and the noise gate is rerun.**
- O'Reilly -> Guéhi is a **watch candidate only**, not yet an action.
- Collins is a good candidate but **not uniquely optimal**; tiny model differences vs Murillo/others are noise.
- Haaland structures must be re-tested, but do **not** fund Haaland by selling Bruno or by fragile ad-hoc downgrades.

The earlier Guéhi + Collins / Mbeumo captain plan is superseded and must not be treated as current.

## 4. Website/product direction

User is dissatisfied with technical/repetitive dashboard-style presentation. The product direction is **human-first decision intelligence**, not a raw model dashboard.

### Home
- Plain-English highlight of what mattered last GW.
- Plain-English expectation for the coming GW.
- One clear "What should I do?" decision card.
- Top 3-4 captaincy candidates with evidence: xPts, fixture xG, fixture xA, xMins, P(blank), P(10+), P(15+), penalties/free-kicks/corners, and one-line matchup explanation.
- Key changes/risks since the prior refresh.

### FPL
- Plain-English GW brief.
- Recommended squad changes or explicit HOLD/ROLL.
- Current squad visually: XI, bench order, C/VC, FT, ITB, chip.
- "Why this is better than rolling" with net 3-5 GW edge; if weak, roll.
- Top 10 raw xPts players, explicitly labelled as **not automatic transfer/captain rankings**.
- Permanent 3-5 GW outlook including planned premium routes and risks.

### Betting
- Four core market views: Correct Score, 1X2, O/U 2.5, BTTS/another main market.
- Model probability first; bookmaker value is a later layer.
- Must allow **NO BET** when no robust signal exists.
- Actual result appears on the same prediction card after settlement; deterministic market hits can show a large green tick.

### Club modal
Human-readable summary; attack/defence/control/set-piece/width/box occupation ratings; season W-D-L, GF/GA/CS, xG/xGA; last five scorelines/results; actual named absences with football role and set-piece responsibility; quantified impact only where defensible; tactical identity; strengths/weaknesses; next-fixture matchup.

### Player modal
Role/availability/start probability/xMins; xG/xA/xGI and per-90 underlying data; shots/big chances/creation; FPL distribution; DC/bonus; set pieces; recent match strip; opponent-specific matchup; share of team attack where available.

### Fixture / matchup modal
Plain-English match thesis -> team comparison -> absences -> tactical matchup -> likely score distribution -> best FPL exposures -> betting model view.

Important: the website logic is **not yet autonomous**. For now the deep weekly decision process still runs through ChatGPT and publishes outputs. Future migration of decision logic into an autonomous service is intentionally deferred.

## 5. C0145-C0148 product implementation

### C0145 — human-first decision surfaces — Completed / Verified
- Home/FPL/Betting simplified.
- Raw xPts is separated from final captaincy/transfer decision.
- Noise-control text added.

### C0146 — enriched club/player/fixture intelligence modals — Completed / Verified
- Team form/strength, named absences, player role and matchup context, fixture story.
- Tactical/personnel evidence remains observational unless separately validated.

### C0147 / E0011 — Matchup Predictive Validation — Completed / Verified, evidence accumulating
Prospective experiment:
- VALIDATION: GW3-GW6, 40 fixtures.
- TEST: GW7-GW10, 40 fixtures.
- Fixed variants: BASE, WIDE_ONLY, AERIAL_SET_PIECE_ONLY, CENTRAL_ONLY, TRANSITION_ONLY, PERSONNEL_CONTINUITY_ONLY, CREATOR_ABSENCE_ONLY, STRIKER_ABSENCE_ONLY, DEFENSIVE_ABSENCE_ONLY, SET_PIECE_ABSENCE_ONLY, COMBINED_V01.
- Fixed conservative coefficients were frozen before GW3 outcomes.
- Promotion requires improvement in **both 1X2 Brier and exact-score log loss in both validation and test**, process xG MAE not worse by >2% where available, >=8 activations per signal/split, zero integrity violations, and manual promotion under a new Change ID.
- `model_effect_enabled=false`.
- Capture every 15 minutes; evaluator hourly.
- Current decision state: `ACCUMULATING_VALIDATION_GW3_GW6`.
- Integrity currently clean.

### C0148 — live observation + outcome cards — Completed / Verified
- C0147 shadow numbers are visible as **UNDER OBSERVATION** beside production numbers.
- They remain research-only and do not silently alter FPL/betting predictions.
- Betting cards can show actual final score and green tick for deterministic hits.
- FPL cards show actual points; do not define an arbitrary hit/miss tolerance for an expected-value forecast.
- Captain cards now show fixture-conditioned goal/assist expectation instead of mislabelling `xG90 × xMins` as fixture xG.

## 6. C0149 audit and C0150 fix — critical latest model work

### C0149 — GW2 xPts/xG ranking audit — Completed / Verified
Trigger:
- Frozen GW2 run ranked Saka 6.19 xPts, Haaland 6.12, Tzolis 6.03, Mbeumo 5.46, Bruno 5.39.
- Human decision process had Bruno/Mbeumo as serious captain options.
- Bruno displayed fixture xG ~0.22 looked suspiciously low.

Important distinction:
- Bruno's GW2 goal expectation was low, but total attacking expectation was not tiny: roughly **0.22 fixture xG + 0.37 fixture xA = ~0.59 xGI**, plus first-choice penalties, direct free-kicks and corners.
- Bruno's eventual 23-point return is **not** used to tune the model.

Confirmed C0135 implementation defects:
1. Rolling snapshots recursively used earlier rolling snapshots as player baselines.
2. Player goal/assist hazards did not actually respond to the target fixture's team lambda.
3. The already-promoted explicit first-choice penalty event was collapsed into a generic multiplicative goal scale, mixing open-play, penalty and fixture effects and creating cross-player distortions (Saka was the clearest example).

C0136 early-season team assimilation can move team factors materially from one completed match. That is a **model-assumption question**, not a confirmed code defect. Do not retune it simply because GW2 outcomes looked surprising.

### C0150 — Stable fixture-conditioned player event projection v0.2 — Completed / Verified
Prospective fix only; GW1/GW2 untouched.

- Rolling generator now anchors to immutable non-rolling active-model player rows (`prediction_run_id IS NULL`).
- Goal hazards use current player state and target team lambda via the already-promoted 0.90 fixture transform.
- Assist hazards use target team lambda via the already-promoted 0.70 assist transform.
- First-choice penalty hazard is additive, not hidden inside generic goal scaling.
- Existing role multiplier and conservative positive current-season confirmation are retained.
- No coefficient was selected from Bruno/Saka/Mbeumo GW2 outcomes.

First corrected genuine future snapshot:
- **GW3 run 1240**
- 600 rows
- generated 2026-08-31 12:23:23 UTC
- deadline 2026-09-04 17:30 UTC
- projection layer `rolling_projection_v0.2_event_integrity`
- historical forecasts rewritten: false

Current GW3 illustrations after C0150:
- Haaland: **6.83 xPts**, fixture xG ~0.87, xA ~0.09
- Mbeumo: **6.54 xPts**, fixture xG ~0.62, xA ~0.16
- Bruno: **6.33 xPts**, fixture xG ~0.38, xA ~0.43
- Saka: **5.19 xPts**, fixture xG ~0.32, xA ~0.21

These are prospective GW3 numbers only.

## 7. Forward betting/model validation state

### A0005 / W0001
As of handover:
- GW2 VALIDATION: 9/10 fixtures finished/evaluated.
- 63 evaluation rows = 9 fixtures × 7 variants.
- 9 fixtures have genuine near-close coverage.
- zero run/prediction/duplicate-evaluation violations.
- Current best-looking GW2 variant by Brier/log loss is `FULL_V04_ELO_NO_SCHEDULE`, but **GW2 is validation-only and cannot be used to retune**.
- GW3 remains separate TEST.

### W0002 / E0008
- GW4 VALIDATION / GW5 TEST remain precommitted.
- 0 evaluations yet.
- zero integrity violations.
- A0005 untouched.

Do not use incomplete GW2 forward results to change frozen cohorts.

## 8. Current website/API artifacts worth knowing

- `human-insights-api`
- `intelligence-detail-api`
- `observation-results-api`
- `ui-v7.js/css` human-first pages
- `ui-v8.js/css` enriched intelligence modals
- `ui-v9.js/css` live observation / actual-result overlays

Latest Pages deployment for the observation layer succeeded on commit `aecc47ef70f34487fc0b71f7d20b39d3a6d3b304`.

## 9. Current automation state

Two FPL automations are enabled and were refreshed to current logic:

1. **GW3 Post-GW2 Refresh** — 2026-09-01 00:30 Asia/Damascus
   - finalize GW2 after Villa-Arsenal;
   - preserve actual Bruno captain vs frozen model Tzolis;
   - use C0150 corrected projection layer;
   - full-pool top~300 xMin + explosive exceptions;
   - current baseline is HOLD, Bruno C, Mbeumo VC;
   - re-test Haaland without selling Bruno;
   - C0147 remains under observation only.

2. **GW3 Final FPL Lock** — 2026-09-04 18:00 Asia/Damascus
   - final price/news/press conference/predicted-XI refresh;
   - Decision-Control + Noise-Control gates;
   - append a superseding final manager plan only if justified.

## 10. Immediate next sequence for the new conversation

1. Read `PROJECT_STATE.md` and `DECISIONS_AND_HISTORY.md` for the long-term foundation, but note both root docs were last consolidated before C0145-C0150.
2. Read this file, `project-management/C0149_GW2_XPTS_XG_RANKING_AUDIT.md`, `project-management/C0150_FPL_EVENT_CONDITIONING_INTEGRITY.md`, and `project-management/C0147_MATCHUP_PREDICTIVE_VALIDATION.md`.
3. Independently query Supabase production; do not blindly trust documentation.
4. Run:
   - `private.audit_change_tracker_governance_v01()`
   - `private.a0005_forward_validation_status_v01()`
   - `private.w0002_forward_validation_status_v01()`
   - `private.matchup_predictive_validation_status_v01()`
5. Verify latest GW3 `gameweek_prediction_runs` and latest `public.fpl_manager_plans`.
6. Wait for / ingest the completed Aston Villa-Arsenal GW2 result before any final GW2 audit.
7. Re-run GW3 from scratch using C0150; do not anchor to the old Guéhi+Collins plan.
8. Re-evaluate captaincy using mean xPts + haul tails + xMins + set pieces + matchup + blank probability, with normal model-error bands. Raw xPts leaders are not automatic captain recommendations.
9. Keep C0147 visible live as under observation but do not promote it until the prospective validation/test gate passes.
10. Preserve all historical decisions and negative experiments exactly as recorded.

## 11. Governance state at handover creation

Immediately before registering this handover:
- working tracker rows: 77
- governance audit: OK
- bad change IDs: 0
- completed-not-verified: 0
- completed-without-refs: 0
- decision rows without refs: 0

This handover is documentation/governance only. It must not change any forecast, result, model coefficient or frozen experiment.