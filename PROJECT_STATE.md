# Football Intelligence Engine — Project State

_Last updated: 2026-09-14 (Dubai) — after C0269 production verification_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts are append-only; completed evidence may change future decisions only; missing data is unknown; unpromoted research has zero numeric production effect; every meaningful FPL action compares with ROLL; xMins/role/fixture are structural gates; ownership has zero direct xPts effect; choices inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; serious challengers persist until resolved; live Supabase/runtime evidence outranks documentation; avoid overlapping layers.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; engineering ledger `public.change_tracker_working`; C0213 architecture/governance surfaces.

C0266–C0269 changed product serving/reliability only. The football/FPL forecast core and historical predictions were not changed.

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

At the latest verified production smoke, GW4 was **POST_DEADLINE_ACTIVE**:

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

C0257 captured the locked public FPL submission for GW4:

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

Verified live Supabase Edge Functions from the C0267/C0269 serving baseline:

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

## 10. C0268 historical latency experiment — superseded in production

C0268 resumed performance work from clean C0267 state rather than reviving C0264. It parallelized the current-page catalog, default workspace and default actual/live requests and retained strict Gameweek equality/fallback semantics.

Controlled same-run schedule A/B showed a median improvement of about **206 ms (~15%)**. C0268 passed its original PR and production acceptance gates and therefore remains historically `Completed / Verified`.

However, post-closeout red-team revalidation later exposed a reliability regression under the simultaneous three-Edge cold-start burst:

- one unchanged run returned HTTP 500 from default workspace;
- another unchanged run returned HTTP 500 from the Gameweek catalog;
- failures occurred from different runner regions while the underlying GW4 database dependencies remained healthy.

Therefore the C0268 scheduling behavior is no longer the production baseline. Its useful credential-parity/decoded-claims protection remains active.

## 11. C0269 active production scheduling baseline

C0269 supersedes the C0268 three-way cold-start behavior.

Production rule:

- **maximum two cold Edge requests concurrently** on the current V3 FPL page;
- Gameweek catalog and default workspace may start together;
- actual/live is requested explicitly only after workspace/catalog Gameweek identity is established;
- explicit actual/live Gameweek mismatch remains fail-closed;
- no retry masking;
- no auth relaxation;
- V2 remains untouched.

PR #25: `C0269: rollback unsafe V3 cold-start concurrency`

PR CI run: `34777906940` — **PASS**.

Merged production commit:

`1a7fffa39bb600173bd83f7d45c5e12b167546bb`

Production Pages run:

`34778026055` — **SUCCESS**.

Every production gate passed:

- V2 typecheck, unit tests, build and bundle budget;
- V3 semantic contract;
- V3 typecheck/build;
- serving parity;
- live public-client auth/contract smoke;
- V2 E2E/accessibility;
- V3 responsive semantic E2E/accessibility;
- Pages artifact verification and V2 rollback isolation;
- GitHub Pages deployment;
- deployed legacy root, `/v2/` and `/v3/` entrypoint verification.

C0269 tracker state is **Completed / Verified**.

## 12. Performance policy from C0269 onward

Reliability outranks small latency gains. A positive latency A/B alone is insufficient for promotion when a networked change alters concurrency or cold-start behavior.

Future latency work must:

- begin from the C0269 bounded-concurrency baseline;
- use a new change ID from current `main`;
- compare against ROLL/no-change;
- use same-run or otherwise controlled evidence;
- include repeated realistic cold/concurrent availability checks;
- preserve auth, chronology, semantic and V2 rollback gates;
- reject any change whose benefit is inside measurement noise or whose availability behavior is not robust;
- never reuse the C0264 branch.

## 13. Governance status

- C0264: **Blocked**, PR #20 closed unmerged.
- C0267: **Completed / Verified**.
- C0268: **Completed / Verified**, historical optimization superseded by C0269.
- C0269: **Completed / Verified**, active production scheduling baseline.
- V2 fallback: untouched operational rollback surface.
- No model promotion, historical rewrite or retrospective authorization occurred in C0266–C0269.

Latest tracker governance after C0269 closeout:

- `ok=true`;
- bad change IDs: 0;
- completed-not-verified: 0;
- completed-without-refs: 0;
- decision rows without refs: 0;
- consumption-contract violations: 0;
- cached GW4 diagnostics governance: `ok=true`.

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
- `project-management/C0269_V3_RELIABILITY_ROLLBACK_PRODUCTION_CLOSEOUT_20260914.md`
