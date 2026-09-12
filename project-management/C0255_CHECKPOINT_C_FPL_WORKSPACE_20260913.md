# C0255 — Checkpoint C: Pitch-First FPL Workspace

Date: 2026-09-13
Branch: `c0255-v3-product-semantic-architecture`
Status: IMPLEMENTED / BUILD-GREEN / NOT PUBLICLY DEPLOYED

## Scope

Checkpoint C implements the first real V3 product surface on top of the C0255 semantic boundary. It does not change model behavior, rewrite historical forecasts, modify V2, or create execution authority.

## Serving contract v2

`fpl-v3-workspace-api` was upgraded to production version 2 with contract:

`fpl_v3_workspace_v02_player_evidence`

Production bundle SHA-256:

`989e097caf66980805157b0da38e31da1bcf507cfd1d9533984311bf56f04d6f`

The function remains JWT-verified and is isolated from V2.

The v2 contract adds:

- frozen decision-time player xPts/xMin and event-distribution evidence pinned to the selected prediction run;
- player fixture/opponent context with H/A and explicit FUTURE/LIVE/FINISHED phase;
- realized player data that remains `PENDING` until the result-run evidence confirms the relevant fixture(s) finished;
- recommendation post-action FT/bank sourced only from the same C0248 selected first action;
- explicit evidence timestamps and preservation of missing historical price/ownership instead of current-value backfill.

Live GW4 verification request `pg_net #5714` returned HTTP 200 and proved:

- lifecycle = `POST_DEADLINE_ACTIVE`;
- actual submitted state = `NOT_VERIFIED`;
- recommendation authorization = `FINAL_FROZEN_NOT_AUTHORIZED`;
- 15/15 recommendation players have frozen player evidence;
- Gabriel = 6.173361 frozen xPts with Sunderland fixture context;
- one fixture was `LIVE` at verification time;
- `historical_forecasts_rewritten=false`.

The deployed Edge Function was re-read after deployment and matches production v2/version/hash/JWT metadata recorded in `runtime-manifests/fpl-v3-workspace-api.production.json`.

## FPL product surface

V3 now has a live state-aware FPL workspace rather than the initial placeholder.

### Primary interaction

State tabs:

- `Engine` — engine recommendation only;
- `Actual` — verified submitted team only; if absent, renders `Actual submitted team not verified` and never substitutes the recommendation;
- `Live` — realized/live overlay against the frozen recommendation when actual submission is unverified, with explicit language that this is not the submitted team.

View toggle:

- `Pitch` — primary;
- `List` — secondary.

### Reusable `FplPitch`

`frontend-v3/src/components/FplPitch.tsx` is presentation-pure and receives already-resolved player state.

It provides:

- formation-aware GKP/DEF/MID/FWD rows;
- legal formation display with fail-closed invalid-XI state;
- player shirt/card treatment;
- opponent + venue;
- captain / vice markers;
- frozen xPts, xMin and P10+ in projection mode;
- realized points / LIVE / pending state in live mode;
- frozen xPts retained as comparison evidence in realized mode;
- visually separate bench;
- secondary list presentation.

Current GW4 engine XI resolves as 3-5-2.

### State / provenance presentation

The workspace explicitly displays:

- Gameweek lifecycle;
- frozen prediction run;
- evidence timestamp;
- actual submission verification state;
- authorization state independent of publication status;
- transfer summary;
- post-action recommendation FT/bank;
- fixture phase rail;
- frozen-evidence provenance note.

Started fixtures are labelled `Live`, never `Next`. Finished/live fixture model evidence is described as frozen pre-match evidence rather than a current forecast.

## Regression coverage

The original six semantic state tests remain.

A new presentation regression contract adds:

- legal 3-5-2 formation resolution;
- incomplete/illegal XI => `INVALID`;
- LIVE fixture precedence;
- finished-only fixture state;
- `FINAL + execution_authorized=false` => not-authorized display language.

These presentation helpers are consumed by the actual React components rather than existing only as tests.

## CI evidence

GitHub Actions run `34719171940`:

- semantic contract: PASS;
- dependency install: PASS;
- strict TypeScript: PASS;
- Vite production build: PASS.

An earlier run correctly failed because Node native TypeScript test imports and Vite CSS typing were not aligned. The tooling contract was repaired rather than bypassed:

- `.ts` test imports are explicit;
- `allowImportingTsExtensions=true`;
- Vite client types are included.

## Design identity

The FPL surface uses the new V3 visual system only:

- warm light background and white surfaces;
- pitch-green football identity;
- intelligence-blue secondary cue;
- consumer sports hierarchy;
- desktop top navigation / mobile bottom navigation;
- responsive pitch and player-card sizing.

No V2 CSS/components are imported.

## Remaining deployment blockers

Checkpoint C is not a public-release authorization.

Still required before `/v3/` public deployment:

1. responsive browser QA at mobile/tablet/desktop breakpoints;
2. E2E interaction/data-state QA;
3. accessibility/browser checks;
4. committed dependency lock / reproducible frontend install;
5. live `/v3/` serving QA;
6. legacy production `fpl-api` v18 repository/runtime reproducibility drift resolved or formally removed as a V3 dependency/blocker with evidence;
7. V2 fallback reverified unchanged;
8. historical rewrite gate rechecked immediately before deployment.

## Model/governance impact

- model behavior changed: NO;
- optimizer/planner/gates weakened: NO;
- historical forecasts rewritten: NO;
- V2 modified: NO;
- execution authority manufactured: NO.
