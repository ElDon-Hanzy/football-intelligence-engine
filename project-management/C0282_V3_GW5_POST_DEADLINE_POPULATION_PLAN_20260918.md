# C0282 — V3 GW5 Post-Deadline Population & QA

Date: 2026-09-18
Status: IN PROGRESS

## Objective
Populate the V3 consumer FPL product after the GW5 deadline without corrupting decision history or pretending that an unexecuted recommendation was the actual submitted FPL team.

## Verified starting state
- `current_fpl_live_plan_v01` GW5 remains PRE_FINAL / CONTESTED / DECISION_NOT_READY.
- `execution_authorized=false`.
- frozen decision evidence points to prediction run 1458.
- At registration time `fpl_actual_manager_decisions` had no verified GW5 row; this changed after the official locked-picks endpoint became available.
- V3 workspace contract separates actual, recommendation, decision snapshot and realized state.

## Integrity rules
1. Never infer ACTUAL from recommendation.
2. Never mark GW5 execution authorized without evidence.
3. Never rewrite prediction run 1458 or historical forecasts.
4. Keep the GW5 recommendation visible as contested/provisional audit evidence.
5. Actual submitted team must come from independently captured authoritative evidence.
6. Realized player values become final only from finished-fixture evidence.

## Autonomous phases
P0 — audit V3 data contracts and live GW5 state. COMPLETE.
P1 — audit actual-team availability and prevent recommendation→actual leakage. COMPLETE.
P2 — post-deadline workspace semantics. COMPLETE / VERIFIED BY CONTRACT: recommendation, actual, frozen decision snapshot and realized state are separate; final does not imply execution; historical rewrite is a client integrity error.
P3 — live/realized feed population. ACTIVE: result run 253 observed 2026-09-18 18:15:13Z, 10 fixtures, 0 finished; realized player values therefore correctly remain non-final.
P4 — existing forward/match intelligence reuse. VERIFIED: V3 already has dedicated `forwardIntelligence.ts` and `matchIntelligence.ts` API adapters; no duplicate model will be created.
P5 — UI QA. PENDING.
P6 — data QA. ACTIVE.
P7 — reconciliation/closeout. PENDING.

## P1 authoritative state transition
The official locked-picks collector subsequently succeeded and inserted immutable GW5 actual decision id 3 at 2026-09-18 18:17:02Z from `public_fpl_api_locked_picks_c0258_frozen`.

Verified actual GW5 selection:
- XI: Verbruggen; N. Williams, Calafiori, Dalot, O'Reilly; B. Fernandes, Saka, Mbeumo, Tzolis; Isak, João Pedro.
- Captain: B. Fernandes (470).
- Vice-captain: N. Williams (514).
- Bench: Forster, De Cuyper, Kusi-Asare, Foden.
- Chip: none.

This is materially different from the engine's contested recommendation captaincy (Mbeumo C / Bruno VC), so preserving actual-vs-recommendation separation is essential.

## Current product behavior for GW5
- Recommendation: PROVISIONAL / CONTESTED, not execution-authorized.
- Decision evidence: frozen to prediction run 1458.
- Actual submitted team: VERIFIED from immutable official locked-picks capture.
- Live/realized: result run exists; no fixture was finished at latest checked snapshot, so player actuals must not yet be finalized.

## P6 checks already passed
- Actual selection contains exactly 11 starters + 4 bench players = 15 unique player IDs.
- Position/name resolution succeeds for all 15.
- Actual captain and vice are members of the starting XI.
- No historical forecast rewrite flag is set.
- Recommendation remains execution_authorized=false.

The product must continue favoring epistemic correctness over filling fields early.