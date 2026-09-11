# C0248 Checkpoint L — Production Selector Cutover

Date: 2026-09-11

## Outcome

C0248 production-selector cutover is complete and verified. The sequential planner is now the canonical selected-path authority. C0240 remains a supporting adversarial benchmark/fallback evidence source, not the normal-transfer action selector.

No FPL transfer or chip was executed.

## Production planner

Production-selected planner row: **7**

Planner version: `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`

Promotion contract: `C0248_VERIFIED_CANDIDATE_PROMOTION_V01`

Promotion evidence:
- candidate run 6;
- cross-beam peer run 5;
- identical selected normal root across beam 6 / beam 8;
- identical best root / best utility / ROLL utility within 0.001;
- hardening contract green;
- append-only promotion only after deterministic validation;
- `shadow_only=false`;
- `production_selected=true`.

A newly generated unpromoted V06 candidate becomes the newest lineage and therefore makes final readiness fail closed until it is independently cross-beam verified and promoted. This is required at fresh-data checkpoints including T−2.

## Blockers closed

1. **Autosub legality** — replaced approximate autosub with conservative legal formation handling using starter/bench appearance probabilities. In multi-absence states that cannot be completed legally, autosub EV is conservatively zero rather than fabricated.
2. **Normal actions beyond 2 transfers** — planner action contract now permits 1–5 normal transfers per GW and preserves larger serious roots. Current production winner remains the preserved C0240 4-transfer root; no new 3–5 generated root produced a superior robust edge on current state.
3. **Explicit chip actions** — Wildcard, Free Hit, Bench Boost and Triple Captain are explicit planner roots. BB/TC include transfer+chip combinations on preserved normal roots.
4. **Canonical fresh squads** — Wildcard uses the role-safe full-pool optimizer over the exact horizon; Free Hit uses an independently generated one-GW role-safe fresh squad.
5. **Price feasibility** — exact current-price feasibility and path bank headroom are represented; price evidence is diagnostic/timing only and never changes player xPts.
6. **Regression / Noise-Control** — C0240 and named challengers remain in the action set. Beam 6 / beam 8 sensitivity is deterministic. Model-error equivalence can retain the incumbent benchmark instead of manufacturing a false edge.
7. **C0234 action authority** — `fpl-autonomous-gate` v6 now selects actions from the C0248 selected path. C0240 remains a required supporting adversarial benchmark.
8. **C0237 serving authority** — `private.c0237_publish_current_fpl_plan_v01` now publishes the selected C0248 path. Publication 20 uses planner run 7.
9. **Governance / behavior** — change-tracker governance PASS; consumption governance 87/87; C0213 production behavioral consumption tests 14/14 PASS on prediction run 1356.

## Current GW4 evidence at cutover

Selected no-chip normal root: `C0240_LEGACY`

Current first action:
- O'Reilly → Gabriel
- Palmer → Saka
- Semenyo → Schade
- Mosquera → Guéhi
- 4 transfers using 3 FTs, therefore -4 hit
- bank after: £0.3m

Five-GW selected normal utility: 232.617

ROLL utility: 221.610

Selected normal edge vs ROLL: +11.007 weighted utility.

This is **pre-final evidence**, not a transfer instruction. Final gate remains fail closed until the T−2 refresh.

Current chip control:
- Bench Boost: HOLD; current increment +4.849;
- Triple Captain: HOLD; current increment +6.174;
- Free Hit: HOLD_NO_ROBUST_EDGE; canonical one-GW candidate +2.599 vs selected normal current-GW utility;
- Wildcard: HOLD_NO_ROBUST_EDGE; exact-horizon raw edge +12.498, terminal FT gap 4, FT-only break-even 3.125 points per extra FT; retained-chip/future-information option value unresolved;
- current chip: NONE.

## Final authorization state

`fpl-autonomous-gate` v6 was rerun against production planner run 7.

Result:
- 14 / 15 gates pass;
- only blocker: `FINAL_T_MINUS_2H_REFRESH`;
- `final_status=DECISION_NOT_READY`;
- action = NONE;
- selector = C0248;
- `authorized=false`.

C0237 publication 20:
- `PRE_FINAL`;
- `CONTESTED`;
- selected C0248 path rendered;
- C0240 supporting benchmark rendered;
- chip NONE;
- execution authorized false.

## Legacy disposition after cutover

Do **not** physically retire C0231, C0233 or C0240 in this checkpoint.

- C0240 is demoted from selector to supporting adversarial benchmark and provides useful regression evidence.
- C0231 and C0233 are still explicitly required by C0234 supporting gates and should be simplified/retired only in a separate evidence-driven consolidation after proving their unique duties are absorbed.
- C0242 remains the named-challenger/captaincy consistency gate.
- C0234 remains the final fail-closed authorization boundary.
- C0237 remains the serving/publication boundary.

## T−2 operational rule

At T−2, fresh data must generate a new C0248 candidate. Because the newest candidate is initially unpromoted, decision readiness automatically becomes false. The new lineage must pass cross-beam validation and promotion before C0234 can authorize a final recommendation. This prevents stale production-selected state from surviving a material fresh-data refresh.
