# Football Intelligence Engine Operating Skill

## Source-of-truth order

1. Live Supabase runtime/data/architecture registry.
2. `public.change_tracker_working` and C0213 governance.
3. Current GitHub source/migrations.
4. Canonical docs.
5. Historical handovers/conversation summaries.

Never overwrite live evidence with stale documentation.

## Start-of-session checks

Before meaningful FPL implementation/recommendation:
- read `PROJECT_STATE.md`, `DECISIONS_AND_HISTORY.md`, and latest relevant closeout;
- inspect manager state and current prediction/optimizer lineage;
- run tracker governance plus C0213 consumption/behavioral status;
- verify current-GW inputs are fresh.

## Decision rules

Optimize the whole legal XV but score points entering the XI correctly. Captaincy is separate. Always compare ROLL. Hits need a robust edge after FT inventory, flexibility, timing and uncertainty. Sequential planning must model bank, selling value, FT carry/accrual and future information. Bench value under normal rules is legal expected autosub/resilience, not a flat percentage; Bench Boost uses full bench value. Chip timing compares current use to retained future option value. Structural future fixture evidence may be used without inventing player precision. Price affects feasibility/timing only, never xPts. Serious challengers remain until explicitly resolved. Options inside model error are `NO_MEANINGFUL_EDGE`. Unpromoted research cannot acquire numeric production effect.

## Anti-over-engineering gate

Before adding a layer ask whether it fixes a demonstrated decision failure, duplicates existing information, has a falsifiable contract, has one clear consumer, can be merged more simply, and delivers expected decision value above complexity. If not, consolidate/reject.

## Current architecture directive

C0243-C0246 were consolidated into **C0248 — Sequential Multi-GW Decision Planner**.

C0244, C0245 and C0248 are **Completed / Verified**.

C0248 is now the canonical **selected-path authority**. Production planner:
- run 7;
- `C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED`;
- `shadow_only=false`;
- `production_selected=true`.

C0248 capabilities include legal/conservative autosub handling, normal actions through 5 transfers/GW, explicit WC/FH/BB/TC roots, BB/TC transfer+chip variants, canonical role-safe Wildcard and independent one-GW Free Hit fresh squads, price headroom diagnostics, root preservation and Noise-Control regression.

### Promotion invariant

The planner may not self-promote. Fresh V06 candidate lineage is shadow-only until a different-beam peer on identical manager/prediction lineage confirms the same selected normal root, best root, best utility and ROLL utility within tolerance and all hardening checks are green. Promotion is append-only via `C0248_VERIFIED_CANDIDATE_PROMOTION_V01`.

If fresh data produces a newer unpromoted candidate, `decision_control_ready` must become false. This fail-closed behavior is mandatory at T−2.

### Same-lineage invariant

All chip, terminal and price controls used together must bind to the same canonical C0248 planner run. Any mismatch fails closed.

Free Hit must use the independent one-GW fresh optimizer candidate; never use a hard-coded edge. Wildcard uses the exact-horizon fresh optimizer candidate. Wildcard and Free Hit retain banked FTs under the 2026/27 rules.

## Downstream authority

C0234 v6 consumes C0248 selected-path authority. C0237 v7 publishes the C0248 selected path. C0240 is now a **supporting adversarial benchmark**, not normal-transfer selector authority.

Do not physically retire C0231/C0233/C0240 yet: they remain supporting dependencies. Remove/simplify them only under a separate verified consolidation proving unique responsibilities are absorbed.

C0242 remains named-challenger/captaincy consistency; C0234 remains final fail-closed authorization; C0237 remains serving/publication.

## Current GW4 control

No external GW4 action has been executed.

Current pre-final selected no-chip root remains C0240_LEGACY inside C0248:
- O'Reilly → Gabriel
- Palmer → Saka
- Semenyo → Schade
- Mosquera → Guéhi
- 4 transfers / -4 hit / £0.3m remaining.

This is pre-final evidence, **not an execution instruction**.

Current chip: `NONE`.
- BB HOLD, +4.849 current increment.
- TC HOLD, +6.174.
- FH HOLD_NO_ROBUST_EDGE, canonical one-GW +2.599 vs selected normal current-GW utility.
- WC HOLD_NO_ROBUST_EDGE, raw exact-horizon +12.498; normal-minus-WC terminal FT gap 4; break-even 3.125 points/extra FT; future option value unresolved.

Captaincy remains `NO_MEANINGFUL_EDGE` until refreshed distribution/tail evidence proves otherwise.

C0234 against production run 7 passes 14/15 gates. Only blocker: `FINAL_T_MINUS_2H_REFRESH`. Current guidance: `WAIT_FOR_T_MINUS_2` unless a verified material price/injury event creates a robust reason to act earlier.

## T−2 process

Fresh ingestion → full-pool projections/roles → new C0248 candidate → cross-beam validation → promotion only if green → C0240/C0242 supporting checks → C0234 final gate → C0237 final publication.

Evaluate all 15 players, xMins/roles, Defensive Contributions, captaincy distributions, chips, ROLL, serious challengers, price/timing, uncertainty, red team and Noise-Control.

## Communication

Keep chat concise. Put detailed engineering evidence in GitHub/Supabase. State clearly when repaired/fresh evidence invalidates an older recommendation.
