# Football Intelligence Engine — Project State

_Last updated: 2026-09-14 (Dubai) — C0272 post-audit consolidation_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules:

- historical forecasts are append-only;
- completed evidence may change future decisions only;
- missing data remains unknown;
- actual submitted team ≠ engine recommendation ≠ realized outcome;
- unpromoted research has zero numeric production effect;
- every meaningful action compares with ROLL;
- xMins, tactical role and fixture quality are structural gates;
- ownership has zero direct xPts effect;
- differences inside model error are `NO_MEANINGFUL_EDGE`;
- captaincy is a separate optimization problem;
- serious challengers persist until resolved;
- live Supabase/runtime evidence outranks documentation;
- avoid overlapping layers and retire failed research rather than accumulating model clutter.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; engineering ledger `public.change_tracker_working`; C0213 architecture/governance surfaces.

## 2. Current decision architecture

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 ensemble/equivalence
→ C0229 structural robustness
→ C0231 forward-management supporting evaluator
→ C0232 OR/rank utility
→ C0233 red-team supporting evaluator
→ C0240 adversarial benchmark
→ C0242 named-challenger + captaincy consistency
→ **C0248 canonical sequential selected-path authority**
→ C0234 fail-closed final authorization
→ C0237 live publication
→ external execution only if separately authorized.

C0230 team regime is now **advisory shadow evidence**, not a blocking decision layer. It may raise warnings but cannot numerically alter projections or make publication/final authorization fail merely because its shadow state is absent or stale.

C0272 adds control-plane orchestration around the final C0248 promotion cycle; it is not another optimizer/model.

## 3. C0272 post-audit consolidation

The 2026-09-14 audit found the architecture functionally healthy but exposed one operational defect: the fresh GW4 T−2 C0248 candidate (run 29, prediction run 1365) did not receive an identical-lineage cross-beam peer and therefore was never promoted before the deadline. C0234 correctly failed closed instead of authorizing an unpromoted candidate.

C0272 closes that operational gap with `private.c0272_final_promotion_watch_v01`, scheduled every five minutes. It is inert outside the T−2-to-deadline window. Inside the window it advances one heavy step per pass: ensure final-lineage candidate, obtain an independent same-lineage beam peer, invoke the unchanged deterministic C0248 promotion contract, refresh C0234, then publish through C0237. It cannot execute transfers/chips or waive any gate.

Dry-run for GW5: `OUTSIDE_FINAL_WINDOW`, deadline **2026-09-18 17:30 UTC**, T−2 threshold **15:30 UTC**, `executed=false`.

## 4. Shadow-model state after C0272

No new numeric shadow model was promoted.

- **A0005:** retired/rejected; scheduled capture/evaluator removed.
- **W0002:** continue through preregistered GW5 test.
- **C0120:** predictive-promotion hypothesis rejected; C0236 price/cache infrastructure retained.
- **C0147:** continue shadow; bounded C0159 derivative remains the existing production consumption path.
- **C0197 chaos-only:** rejected; scale remains zero.
- **C0197 shootout/regime:** one final prospective window; no new captures after GW6.
- **C0202:** generic numeric flank xPts hypothesis rejected. HIGH-confidence categorical side inference is integrated into existing fixture-role evidence as factual metadata only; zero xPts effect.
- **C0206:** foreign translator paused/excluded pending materially new governed calibration evidence.
- **C0224 Parity–Draw:** **continue shadow by explicit user decision**; zero production effect.
- **C0230:** continue advisory shadow; nonblocking and zero numeric effect.
- **C0270:** continue exactly as frozen; C0265 production behavior remains untouched.

## 5. Production model / consumption verification

C0272 re-ran C0213 behavioral verification on GW5 / prediction run 1367:

- production-effect components: **14**;
- behavioral consumption: **14/14 PASS**;
- required capabilities: **19/19 present**;
- active duplicate cron targets: **0**;
- active retired API/Edge deployments: **0**;
- tracker consumption contracts: **97/97 covered**;
- consumption-contract violations: **0**;
- bad change IDs: **0**;
- completed-not-verified: **0**;
- completed-without-refs: **0**;
- decision rows without refs: **0**;
- `system_consolidation_ok=true`.

GW5 fixture-role refresh under `c0272_side_state_v01` produced 675 current rows; 114 carry HIGH-confidence C0202 side metadata; zero enable numeric side effect and zero have `model_effect_enabled=true`.

## 6. C0265 / C0270 xMins integrity watch

C0265 remains **Open / Planned / Critical** and deliberately unchanged in production. The predicted-XI hard-anchor can collapse xMins across a near-tie XI boundary. Do not repair it until separately authorized.

C0270 remains shadow-only and prospective definitions are frozen from immutable prediction run 1366:

- CLIFF: raw xMins ≥45, raw pStart ≥0.50, compression ≥25, pStart drop ≥0.20;
- SEVERE: raw xMins ≥50, raw pStart ≥0.60, compression ≥35, pStart drop ≥0.35;
- frozen SEVERE candidates: Foden, Matheus N., Darlow;
- FODEN_CLASS requires SEVERE + actual start + realized minutes within 5 of bug xMins + realized path inconsistent with the low-start mechanism.

The C0265 Repeat Watch remains active. A numerical coincidence never counts as causal validation by itself.

## 7. Current GW4 lifecycle and frozen recommendation

At the latest verified runtime state, GW4 remains active with one fixture still future.

Engine recommendation publication 34:

- prediction run 1365;
- `publication_stage=FINAL`;
- `final_status=FINAL_POST_DEADLINE_CLOSURE`;
- scenario `NAMED:GW4_3FT_GUEHI_GABRIEL_SCHADE`;
- Mosquera → Guéhi;
- O'Reilly → Gabriel;
- Palmer → Schade;
- captain Gabriel;
- vice Bruno Fernandes;
- chip NONE;
- `execution_authorized=false`.

This is frozen post-deadline audit evidence, not a claim that those transfers were executed.

Verified actual GW4 submitted team remains separate:

- actual decision id 2;
- source `public_fpl_api_locked_picks_c0257`;
- captain Bruno Fernandes;
- vice João Pedro;
- no chip recorded.

## 8. V3 product and scoring state

V3: `https://eldon-hanzy.github.io/football-intelligence-engine/v3/`  
V2 rollback: `https://eldon-hanzy.github.io/football-intelligence-engine/v2/`

V2 remains untouched and is not retired.

C0271 is Completed / Verified. V3's Gameweek comparison now scores engine and actual scenarios under official FPL captain/vice, legal autosub, Triple Captain and Bench Boost semantics while preserving source facts and frozen xPts separately.

Current important Edge runtime:

- `gameweek-status-api` v8 — ACTIVE, custom public auth, `verify_jwt=false`;
- `fpl-v3-workspace-api` v3 — ACTIVE, `verify_jwt=true`;
- `fpl-v3-actual-live-api` v2 — ACTIVE, `verify_jwt=true`;
- `fpl-autonomous-gate` **v7** — ACTIVE, custom admin-token auth, C0230 advisory semantics;
- legacy `fpl-api` v18.

C0269 remains the V3 request-scheduling reliability baseline: maximum two cold Edge requests concurrently; actual/live starts only after Gameweek identity is established; mismatch is fail-closed; no retry masking; no auth relaxation.

## 9. V3 semantic contract

Keep four lanes distinct:

1. **Actual** — verified submitted manager state only.
2. **Recommendation** — engine hypothetical action/state only.
3. **Decision snapshot** — frozen decision-time evidence only.
4. **Realized** — live/finished outcome state only.

Permanent invariants:

- `FINAL` never implies `execution_authorized=true`;
- if actual submission is unavailable: `Actual submitted team not verified.`;
- recommendation is never substituted as actual;
- pre-transfer manager economy is never merged into hypothetical post-transfer state;
- FUTURE / LIVE / FINISHED remain explicit;
- cross-Gameweek truth is never combined;
- frozen decision evidence is never recomputed from mutable current model state.

## 10. Current governance / engineering dispositions

- C0264: **Blocked**, experimental branch remains closed/unmerged.
- C0265: **Open / Planned / Critical**, no production fix authorized.
- C0269: **Completed / Verified**, current V3 scheduling baseline.
- C0270: **In Progress / Executing**, shadow only.
- C0271: **Completed / Verified**, V3 official scenario scoring.
- C0272: post-audit consolidation / final-promotion hardening; production changes verified and source-control reconciliation tracked by its closeout.

## 11. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0269_V3_RELIABILITY_ROLLBACK_PRODUCTION_CLOSEOUT_20260914.md`
- `project-management/C0272_POST_AUDIT_CONSOLIDATION_20260914.md`
- `supabase/migrations/20260914030600_c0272_post_audit_consolidation.sql`
