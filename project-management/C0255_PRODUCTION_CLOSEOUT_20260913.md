# C0255 — V3 Product & Semantic Architecture — Production Closeout

Date: 2026-09-13 (Dubai)
Status: COMPLETED / VERIFIED
Production merge: `7fa27410b482aa5a002c5724e1e098c28d5732d7`
PR: #9

## Outcome

`/v3/` is now a production-served, isolated consumer football-intelligence product. It does not inherit the dark V2/FIE identity and it does not change the football/FPL model stack.

Production URLs:

- V3: `https://eldon-hanzy.github.io/football-intelligence-engine/v3/`
- V2 fallback: `https://eldon-hanzy.github.io/football-intelligence-engine/v2/`
- Legacy root remains preserved.

V2 remains the rollback/fallback product. C0255 does not authorize V2 retirement.

## Product architecture delivered

V3 uses explicit, non-interchangeable state lanes:

1. **Actual submitted team** — only verified manager submission state; never inferred from a recommendation.
2. **Engine recommendation** — hypothetical engine action/state only.
3. **Decision-time frozen projection** — immutable decision evidence with prediction-run provenance.
4. **Realized/live results** — live/finished outcome state only.

The FPL workspace is pitch-first and includes:

- formation-aware `FplPitch`;
- player cards with opponent/venue context;
- captain / vice-captain markers;
- frozen xPts/xMin/haul evidence;
- visually separate bench;
- secondary List View;
- Engine / Actual / Live modes;
- explicit FUTURE / LIVE / FINISHED fixture states;
- responsive mobile/tablet/desktop layouts.

## Semantic invariants verified

- `FINAL` publication maturity is not execution authority.
- GW4 publication #34 remains `FINAL / FINAL / FINAL_POST_DEADLINE_CLOSURE` with `execution_authorized=false`.
- V3 renders that state as `FINAL_FROZEN_NOT_AUTHORIZED`.
- No verified GW4 manager-decision row exists, therefore V3 displays `Actual submitted team not verified` and does not substitute the recommendation.
- Pre-transfer manager state remains separate from the hypothetical post-transfer recommendation state.
- Started unfinished fixtures are `LIVE`, never `Next`.
- Post-kickoff model probabilities are labelled frozen pre-match evidence, not current/actionable forecasts.
- Missing decision-time price/ownership evidence is not backfilled from current values.
- Historical forecasts remain append-only; `historical_forecasts_rewritten=false`.

## Current production GW4 evidence at closeout

- current lifecycle: `POST_DEADLINE_ACTIVE`;
- fixtures: 10 total / 7 finished / 0 live unfinished / 3 future;
- recommendation publication: #34;
- prediction run: 1365;
- recommendation: 15 players, 3 transfers, £1.4m post-action bank;
- latest separate pre-transfer manager snapshot: 3 FT / £0.0m;
- actual manager decision rows: 0;
- frozen decision-time player evidence: 15/15.

The Gameweek remains active until all fixtures are finished.

## Serving/runtime parity

### Legacy FPL API

- function: `fpl-api`;
- deployed version: 18;
- contract: `fpl_api_v18_active_gw_public_payload`;
- deployed SHA-256: `3f02d4e011a635e8cc2fa5edd9fbad5c1c0c95d6c087bcdda472ff309ac5b347`;
- repository source reconciled to the unchanged deployed runtime;
- no runtime redeploy was required for reconciliation.

### V3 workspace API

- function: `fpl-v3-workspace-api`;
- deployed version: 2;
- contract: `fpl_v3_workspace_v02_player_evidence`;
- deployed SHA-256: `989e097caf66980805157b0da38e31da1bcf507cfd1d9533984311bf56f04d6f`;
- JWT verification enabled;
- repository/runtime parity GREEN.

The live public-client smoke used the exact endpoint and anonymous-JWT/header pattern shipped by the browser and returned HTTP 200 with the expected semantic contract.

## QA evidence

Final architecture-branch gate:

- GitHub Actions run `34720566041` — 5/5 jobs green.

PR-context gate:

- GitHub Actions run `34720642769` — 5/5 jobs green.

Production Pages gate:

- GitHub Actions run `34720702295` — SUCCESS.
- GitHub Pages deployment `6414713753` — SUCCESS.

The production workflow verified:

- deterministic V2 and V3 installs/builds;
- V2 typecheck/unit/bundle-budget gates;
- V3 semantic/typecheck/build gates;
- serving parity + explicit deployment authorization;
- live V3 API browser-auth smoke;
- V2 E2E/accessibility;
- V3 responsive semantic E2E/accessibility;
- exact Pages artifact assembly;
- legacy root preservation;
- V2 rollback isolation;
- V3 artifact inclusion;
- frontend source-tree exclusion;
- live post-deploy root, `/v2/`, `/v3/` and JavaScript-asset verification.

## Integrity / non-effects

C0255 made **no football-model behavior change**.

It did not:

- change production coefficients or projections;
- rewrite historical forecasts;
- weaken any Decision-Control, Noise-Control, authorization or chronology gate;
- infer a manager action that was not verified;
- create retrospective execution authority;
- retire V2.

## Final decision

C0255 acceptance criteria are satisfied. `/v3/` is production live and V2 remains operational as fallback. C0255 may be marked **Completed / Verified** after tracker governance confirms zero violations.
