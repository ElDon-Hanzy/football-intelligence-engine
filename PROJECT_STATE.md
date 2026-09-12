# Football Intelligence Engine — Project State

_Last updated: 2026-09-13 (Dubai) — after C0255 V3 production deployment_

## 1. Mission and immutable rules

Build one chronology-safe football intelligence engine for FPL decision intelligence and football forecasting/research. FPL objective: maximize probability of Overall Rank #1, or expected final rank if #1 becomes unrealistic.

Immutable rules: historical forecasts are append-only; completed evidence may change future decisions only; missing data is unknown; unpromoted research has zero numeric production effect; every meaningful FPL action compares with ROLL; xMins/role/fixture are structural gates; ownership has zero direct xPts effect; choices inside model error are `NO_MEANINGFUL_EDGE`; captaincy is separate; serious challengers persist until resolved; live Supabase/runtime evidence outranks documentation; avoid overlapping layers.

Sources of truth: Supabase `knooiwezzsxcwhtjtdap`; GitHub `ElDon-Hanzy/football-intelligence-engine`; FPL entry `3559923`; engineering ledger `public.change_tracker_working`; C0213 architecture/governance surfaces.

The football/FPL forecast core is unchanged by C0255.

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

C0248 remains the canonical sequential selector. C0240 remains a required adversarial benchmark/regression root rather than the normal-transfer selector. C0231/C0233 remain supporting gates. C0234 remains the authorization boundary and C0237 the publication boundary.

## 3. Current GW4 lifecycle and decision truth

GW4 is **POST_DEADLINE_ACTIVE**. It remains active until all GW4 fixtures finish.

Current fixture state at the C0255 closeout audit:

- 10 fixtures total;
- 7 finished;
- 0 started-but-unfinished;
- 3 future.

Current live publication:

- publication id: **34**;
- prediction run: **1365**;
- publication stage: `FINAL`;
- publication status: `FINAL`;
- final status: `FINAL_POST_DEADLINE_CLOSURE`;
- scenario: `NAMED:GW4_3FT_GUEHI_GABRIEL_SCHADE`;
- transfers: Mosquera → Guéhi, O'Reilly → Gabriel, Palmer → Schade;
- captain: Gabriel (player 4);
- vice-captain: Bruno Fernandes (player 470);
- chip: `NONE`;
- post-action bank: **£1.4m**;
- `execution_authorized=false`.

`FINAL` therefore describes publication maturity only. It is **not** execution authority.

## 4. Actual manager state versus recommendation

No verified GW4 actual-manager-decision row exists in `public.fpl_actual_manager_decisions`.

Therefore the current truth is:

- **Actual submitted team: not verified.**
- The engine recommendation is not substituted for the actual team.
- No retrospective execution authority is manufactured.

The latest separate pre-transfer manager-state snapshot remains:

- 3 free transfers;
- £0.0m bank;
- 15-player current squad proof;
- locked from the prior submitted-lineage state.

That pre-transfer manager state is never presented as the recommendation's post-transfer economy. The recommendation has its own post-action state, including £1.4m bank.

## 5. Frozen decision evidence

The current V3 workspace resolves all **15/15** recommendation players against frozen decision-time evidence from prediction run 1365.

Decision-time xPts/xMin/haul evidence remains frozen and timestamped. Decision-time price/ownership is shown only when captured in the coherent decision-time lineage; current values are not backfilled into a missing historical slot.

Historical forecasts remain append-only and `historical_forecasts_rewritten=false`.

## 6. V3 production product

C0255 introduced a new isolated consumer product under `frontend-v3/` and production route `/v3/`.

Production URLs:

- V3: `https://eldon-hanzy.github.io/football-intelligence-engine/v3/`
- V2 fallback: `https://eldon-hanzy.github.io/football-intelligence-engine/v2/`
- legacy root remains preserved.

V3 is not a V2 redesign and does not inherit the dark FIE visual identity. V2 remains the rollback/fallback product; no V2 retirement is authorized.

V3 FPL product structure:

- pitch-first formation-aware `FplPitch`;
- separate bench;
- captain / vice markers;
- opponent and venue context;
- frozen decision-time player evidence;
- Engine / Actual / Live modes;
- secondary List View;
- explicit FUTURE / LIVE / FINISHED fixture states;
- responsive mobile/tablet/desktop layout;
- fail-closed rendering when actual manager state is unverified.

## 7. V3 semantic state contract

The V3 serving/UI contract keeps four lanes distinct:

1. **Actual** — verified submitted manager state only.
2. **Recommendation** — engine hypothetical action/state only.
3. **Decision snapshot** — frozen decision-time evidence only.
4. **Realized** — live/finished outcome state only.

Permanent V3 semantic invariants:

- `FINAL` never implies `execution_authorized=true`;
- missing actual submission displays `Actual submitted team not verified`;
- pre-transfer manager FT/bank/squad cannot be merged with hypothetical post-transfer state;
- FUTURE, LIVE and FINISHED fixtures are explicit;
- a started fixture is never labelled `Next`;
- post-kickoff probabilities are frozen pre-match evidence, not current forecasts;
- chronology/coherent evidence timestamps outrank UI convenience.

## 8. Serving/runtime parity

### Legacy `fpl-api`

- production version: **18**;
- contract: `fpl_api_v18_active_gw_public_payload`;
- bundle SHA-256: `3f02d4e011a635e8cc2fa5edd9fbad5c1c0c95d6c087bcdda472ff309ac5b347`;
- repository source reconciled to the unchanged live runtime;
- no runtime redeploy was required for reconciliation.

### V3 `fpl-v3-workspace-api`

- production version: **2**;
- contract: `fpl_v3_workspace_v02_player_evidence`;
- bundle SHA-256: `989e097caf66980805157b0da38e31da1bcf507cfd1d9533984311bf56f04d6f`;
- JWT verification enabled;
- repository/runtime parity GREEN.

The public-client smoke uses the exact endpoint and anonymous JWT/header path shipped by `frontend-v3` and passed against the live Edge Function.

## 9. C0255 production QA

C0255 promotion evidence:

- architecture-branch run `34720566041`: **5/5 green**;
- PR-context run `34720642769`: **5/5 green**;
- PR #9 merged to main as `7fa27410b482aa5a002c5724e1e098c28d5732d7`;
- production Pages run `34720702295`: **SUCCESS**;
- Pages deployment `6414713753`: **SUCCESS**.

Production checks passed for:

- deterministic V2/V3 installs;
- V2 typecheck/unit/bundle-budget/E2E/accessibility;
- V3 semantic contract/typecheck/build/E2E/accessibility;
- source/runtime serving parity;
- explicit V3 deployment authorization;
- live public-client V3 API smoke;
- mobile/tablet/desktop responsive QA;
- Pages root + `/v2/` + `/v3/` artifact integrity;
- live post-deploy HTML and JavaScript-asset verification;
- exclusion of frontend source trees from the public artifact.

## 10. Model / governance non-effects

C0255 is product/serving architecture only.

It did **not**:

- alter model coefficients or production forecast behavior;
- rewrite historical predictions;
- weaken C0234, Decision-Control, Noise-Control or chronology gates;
- promote research evidence;
- infer a manager action;
- create retrospective authorization;
- retire V2.

## 11. Legacy decision-layer disposition

Do not physically retire these merely because V3 is live:

- C0231 — supporting forward-management gate consumed by C0234;
- C0233 — supporting red-team gate consumed by C0234;
- C0240 — supporting adversarial benchmark/regression evidence;
- C0242 — named-challenger and captaincy-consistency gate;
- C0234 — final fail-closed authorization boundary;
- C0237 — live publication boundary.

Any simplification remains a separate evidence-driven architecture decision.

## 12. Governance status

Latest pre-closeout governance audit on 2026-09-13:

- tracker governance: PASS;
- bad change IDs: 0;
- completed-not-verified: 0;
- completed-without-refs: 0;
- decision rows without refs: 0;
- consumption governance: PASS;
- consumption-contract violations: 0.

C0255 production acceptance is satisfied. Formal tracker transition to `Completed / Verified` and its post-update governance audit are recorded in the C0255 production closeout evidence.

## 13. Canonical references

- `PROJECT_DESCRIPTION.md`
- `DECISIONS_AND_HISTORY.md`
- `SYSTEM_ARCHITECTURE.md`
- `MODEL_REGISTRY.md`
- `WEEKLY_DATA_PIPELINE.md`
- `MODEL_CONSUMPTION_AUDIT.md`
- `skills/fie/SKILL.md`
- `project-management/C0237_GW4_POST_DEADLINE_CLOSURE_20260912.md`
- `project-management/C0248_CHECKPOINT_L_PRODUCTION_SELECTOR_CUTOVER_20260911.md`
- `project-management/C0254_FPL_ACTIVE_GW_SERVING_LIFECYCLE_FIX_20260912.md`
- `project-management/C0255_V3_PRODUCT_SEMANTIC_ARCHITECTURE_20260913.md`
- `project-management/C0255_CHECKPOINT_C_FPL_WORKSPACE_20260913.md`
- `project-management/C0255_PREDEPLOYMENT_GATE_20260913.md`
- `project-management/C0255_PRODUCTION_CLOSEOUT_20260913.md`
