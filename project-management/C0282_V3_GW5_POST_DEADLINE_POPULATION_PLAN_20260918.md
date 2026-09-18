# C0282 — V3 GW5 Post-Deadline Population & QA

Date: 2026-09-18
Status: COMPLETED / VERIFIED

## Objective
Populate the V3 consumer FPL product after the GW5 deadline without corrupting decision history or pretending that an unexecuted recommendation was the actual submitted FPL team.

## Integrity rules
1. Never infer ACTUAL from recommendation.
2. Never mark GW5 execution authorized without evidence.
3. Never rewrite prediction run 1458 or historical forecasts.
4. Keep the GW5 recommendation visible as contested/provisional audit evidence.
5. Actual submitted team must come from independently captured authoritative evidence.
6. Realized player values become final only from finished-fixture evidence.

## Final phase status
- P0 audit V3 data contracts and live GW5 state — COMPLETE / VERIFIED.
- P1 actual-team availability and recommendation→actual leakage protection — COMPLETE / VERIFIED.
- P2 post-deadline workspace semantics — COMPLETE / VERIFIED.
- P3 live/realized feed population — COMPLETE / VERIFIED for live transition. Result run 254 observed 2026-09-18 19:15:11Z contains 659 player rows; 22 already have minutes, max 12 minutes at verification, while zero fixtures are finished. This proves live observations are flowing without falsely finalizing fixtures.
- P4 forward/match intelligence reuse — COMPLETE / VERIFIED. Existing adapters reused; no duplicate model introduced.
- P5 UI QA — COMPLETE / VERIFIED. GitHub Pages run #955 (35382311038, commit 7b5352769397bb5f56f4ea0946d2012eba874abf) passed V2 typecheck/unit/build/bundle, V3 semantic/typecheck/build/parity/live workspace smoke, V2 E2E/accessibility, V3 responsive semantic E2E/accessibility, artifact/rollback isolation, deployment, and deployed legacy/V2/V3 entrypoint verification.
- P6 data QA — COMPLETE / VERIFIED.
- P7 reconciliation/closeout — COMPLETE / VERIFIED.

## Authoritative actual GW5 state
Official locked-picks capture inserted immutable actual decision id 3 at 2026-09-18 18:17:02Z from `public_fpl_api_locked_picks_c0258_frozen`.

Verified actual selection:
- XI: Verbruggen; N. Williams, Calafiori, Dalot, O'Reilly; B. Fernandes, Saka, Mbeumo, Tzolis; Isak, João Pedro.
- Captain: B. Fernandes (470).
- Vice-captain: N. Williams (514).
- Bench: Forster, De Cuyper, Kusi-Asare, Foden.
- Chip: none.

This differs materially from the engine's contested recommendation captaincy (Mbeumo C / Bruno VC), and V3 preserves that distinction.

## Final contract state
- Recommendation remains provisional/contested and `execution_authorized=false`.
- Decision evidence remains frozen to prediction run 1458.
- Actual submitted team is VERIFIED independently from official locked picks.
- Actual selection is exactly 11 starters + 4 bench = 15 unique players; captain and vice are in the XI; all 15 resolve names/positions.
- Live result ingestion is active after kickoff.
- Realized values are not promoted to FINAL until finished-fixture evidence exists.
- Historical forecasts were not rewritten.
- C0265 was not touched.

## QA repair note
The prior V2 deployment failures were test-contract mismatches, not a reason to turn governance green. The repaired test validates the typed governance diagnostics contract (`ok` may truthfully be false) and the actual Engine UI states (`Clean ledger` / `Attention required`, `Decision READY/BLOCKED/UNKNOWN`, and fail-closed rules). Production governance semantics were not weakened.

## Closeout
C0282 is closed as COMPLETED / VERIFIED. Ongoing GW5 result collection is normal operational ingestion and does not keep the V3 population/QA program open.