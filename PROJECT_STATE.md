# Football Intelligence Engine — Project State

_Last updated: 2026-09-13 (Dubai) — after C0268 production verification_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts are append-only; completed evidence may change future decisions only; missing data is unknown; unpromoted research has zero numeric production effect; every meaningful FPL action compares with ROLL; xMins/role/fixture are structural gates; ownership has zero direct xPts effect; choices inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; serious challengers persist until resolved; live Supabase/runtime evidence outranks documentation; avoid overlapping layers.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; engineering ledger `public.change_tracker_working`; C0213 architecture/governance surfaces.

C0266–C0268 changed product serving/reliability only. The football/FPL forecast core and historical predictions were not changed.

## 2. Current decision architecture

`FULL-POOL OPTIMIZER`
→ C0227 uncertainty
→ C0228 structural ensemble/equivalence
→ C0229 robustness
→ C0230 shadow team-regime diagnostic
→ C0231 forward-management supporting evaluator
→ C0232 OR/rank utility
→ C0233 red-team supporting evaluator
→ C0240 adversarial supporting benchmark
→ C0242 named-challenger + captaincy consistency
→ **C0248 canonical sequential selected-path authority**
→ C0234 fail-closed final authorization
→ C0237 live publication
→ external execution only if separately authorized.

C0248 remains the canonical sequential selector. C0240 is an adversarial benchmark/regression root, not the normal-transfer selector. C0234 remains the authorization boundary and C0237 the publication boundary.

## 3. Current GW4 lifecycle

GW4 is **POST_DEADLINE_ACTIVE**. Current live fixture truth at this update:

- 10 fixtures total;
- 9 finished;
- 0 started-but-unfinished;
- 1 future.

GW4 remains active until the final fixture finishes.

## 4. Engine recommendation versus actual submitted team

The engine publication and the submitted FPL team are distinct records and must never be merged.

### Engine recommendation

Current GW4 publication:

- publication id **34**;
- prediction run **1365**;
- `publication_stage=FINAL`;
- `publication_status=FINAL`;
- `final_status=FINAL_POST_DEADLINE_CLOSURE`;
- scenario `NAMED:GW4_3FT_GUEHI_GABRIEL_SCHADE`;
- recommended transfers: Mosquera → Guéhi, O'Reilly → Gabriel, Palmer → Schade;
- recommended captain: Gabriel;
- recommended vice: Bruno Fernandes;
- chip: `NONE`;
- `execution_authorized=false`.

`FINAL` describes publication maturity only. It is not execution authority.

### Verified actual submitted team

C0257 subsequently captured the locked public FPL submission for GW4:

- actual-decision id **2**;
- source `public_fpl_api_locked_picks_c0257`;
- 11 starters + 4 bench players verified;
- actual captain: Bruno Fernandes (470);
- actual vice-captain: João Pedro (170);
- no chip recorded.

The actual submitted squad is not reconstructed from the engine recommendation. This supersedes older C0255-era documentation that said the actual GW4 submission was unverified.

## 5. Frozen evidence and historical integrity

The V3 current workspace serves frozen decision-time projection evidence tied to prediction run 1365. Decision-time xPts/xMins/haul evidence stays frozen. Current prices/ownership are not backfilled into missing historical slots.

Permanent state:

- `historical_forecasts_rewritten=false`;
- missing remains missing;
- actual submission, recommendation, frozen decision snapshot and realized outcome remain separate lanes;
- realized values require corresponding finished-fixture evidence.

## 6. V3 production product

Production URLs:

- V3: `https://eldon-hanzy.github.io/football-intelligence-engine/v3/`
- V2 fallback: `https://eldon-hanzy.github.io/football-intelligence-engine/v2/`
- legacy root remains preserved.

V3 remains an isolated consumer product. V2 is still the rollback/fallback product and no V2 retirement is authorized.

All six V3 destinations are covered by responsive semantic QA:

- Home;
- FPL;
- Matches;
- Markets;
- Insights;
- History.

GW4/GW5 switching is supported. Matches and Markets no longer depend on the FPL workspace critical path.

## 7. V3 semantic contract

The V3 serving/UI contract keeps four lanes distinct:

1. **Actual** — verified submitted manager state only.
2. **Recommendation** — engine hypothetical action/state only.
3. **Decision snapshot** — frozen decision-time evidence only.
4. **Realized** — live/finished outcome state only.

Permanent invariants:

- `FINAL` never implies `execution_authorized=true`;
- if actual submission is unavailable, the exact fail-closed phrase is `Actual submitted team not verified`;
- engine recommendation is never substituted as actual;
- pre-transfer manager economy is never merged into hypothetical post-transfer state;
- FUTURE / LIVE / FINISHED are explicit;
- historical/current chronology is not rewritten for UI convenience;
- cross-Gameweek workspace/actual truth must never be combined.

## 8. Current serving/runtime parity

Verified live Supabase Edge Functions:

- `gameweek-status-api`: **v8**, ACTIVE, custom public-client authorization in handler, `verify_jwt=false`;
- `fpl-v3-workspace-api`: **v3**, ACTIVE, `verify_jwt=true`, bundle `88548930feebaf42b45d23cb155bf731659b5eb0ce758a791cd6dc8e13e11273`;
- `fpl-v3-actual-live-api`: **v1**, ACTIVE, `verify_jwt=true`, bundle `49782885a5b4a039339fd1411ed7c56bc48bbd3e98814466feec0480a4ceca20`;
- legacy `fpl-api`: **v18**.

C0267 restored repository/runtime parity after the C0264 incident. The contaminated C0264 branch must not be reused.

## 9. C0264 incident disposition

C0264 PR #20 is **closed unmerged** and tracker status remains **Blocked**.

Failure class: experimental catalog/auth work mutated a legacy anon-JWT payload (`iss` typo) and caused the public Gameweek catalog to reject the browser with HTTP 401. The catalog failure cascaded into the global GW switcher, Matches and Markets.

C0266 restored the public catalog contract. C0267 reconciled the live-proven workspace runtime into clean repository state.

Permanent lesson: browser public credentials must not be hand-edited or independently copied without parity/claim validation.

## 10. C0268 verified latency optimization

C0268 resumed performance work from clean C0267 state rather than reviving C0264.

Change:

- start default actual/live truth at page start alongside the current workspace/catalog;
- reuse default actual/live only when its returned Gameweek matches the workspace Gameweek;
- on mismatch, fetch actual/live explicitly for the workspace Gameweek;
- keep all existing semantic/auth/history/V2 gates.

Controlled same-run schedule A/B:

- old: 1450 ms, 1297 ms → median **1374 ms**;
- new: 1124 ms, 1212 ms → median **1168 ms**;
- median improvement: **206 ms (~15%)**.

A red-team review caught an intermediate copied-JWT issuer typo before merge. It never reached production. C0268 therefore added a permanent public-auth parity/claims gate requiring the workspace and actual-live clients to ship the same credential and decode to `iss=supabase`, the correct project ref and `role=anon`.

## 11. C0268 production acceptance

PR #24 merged as:

`4b16fd6364d78e26af1430bed05aa8178ea736e5`

Final PR run: `34775557312` — PASS.

Production Pages run: `34775635944` — **SUCCESS**.

Production verification passed:

- V2/V3 deterministic build/typecheck;
- V3 semantic contract;
- serving parity;
- live public-client auth/contract smoke;
- V2 E2E/accessibility;
- V3 75-test responsive E2E/accessibility suite;
- matching-default actual/live reuse test;
- mismatched-default Gameweek fallback test;
- Pages artifact isolation;
- deployed legacy root + `/v2/` + `/v3/` HTML/JS integrity.

Production smoke during deployment confirmed GW4 `POST_DEADLINE_ACTIVE`, actual `VERIFIED`, 11 XI + 4 bench, `execution_authorized=false`, 20 recommendation evidence rows, 9 finished + 1 future fixture, 15 finalized actual rows, and `historical_forecasts_rewritten=false`.

C0268 tracker state is **Completed / Verified**.

## 12. Performance status and next optimization boundary

C0268 removed a client scheduling waterfall but does not prove that latency optimization is exhausted. Absolute network timings vary materially by runner region/cold state; do not compare unrelated runs as if they were controlled experiments.

Any further latency work must:

- use a new change ID from current `main`;
- establish same-run or otherwise controlled evidence;
- preserve auth and semantic gates;
- compare against no-change baseline;
- reject changes whose advantage is inside measurement noise;
- never reuse the C0264 branch.

## 13. Governance status

- C0264: **Blocked**, PR #20 closed unmerged.
- C0267: **Completed / Verified**.
- C0268: **Completed / Verified**.
- V2 fallback: untouched operational rollback surface.
- No model promotion, historical rewrite or retrospective authorization occurred in C0266–C0268.

## 14. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0255_PRODUCTION_CLOSEOUT_20260913.md`
- `project-management/C0263_V3_PERFORMANCE_GW_ROUTING_20260913.md`
- `project-management/C0268_V3_INITIAL_LOAD_LATENCY_PRODUCTION_CLOSEOUT_20260913.md`
- `project-management/C0268_DECISIONS_AND_HISTORY_ADDENDUM_20260913.md`
