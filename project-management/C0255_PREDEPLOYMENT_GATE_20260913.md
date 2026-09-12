# C0255 — V3 Pre-Deployment Gate

Date: 2026-09-13
Branch: `c0255-v3-product-semantic-architecture`
Status: DEPLOYMENT CANDIDATE

## Scope

This checkpoint records the evidence required before `/v3/` may be merged to `main` and served publicly. It does not change model behavior, FPL recommendations, historical forecasts or V2 product behavior.

## Semantic/data integrity

- V3 read contract remains split into `actual`, `recommendation`, `decision_snapshot` and `realized` lanes.
- GW4 live publication remains `FINAL / FINAL / FINAL_POST_DEADLINE_CLOSURE` with `execution_authorized = false`.
- V3 renders that state as `FINAL_FROZEN_NOT_AUTHORIZED`; publication maturity is not execution authority.
- `public.fpl_actual_manager_decisions` still has zero GW4 rows, so V3 renders `Actual submitted team not verified` and does not substitute the engine recommendation.
- latest manager-state snapshot remains a separate pre-transfer state: 3 FT / £0.0m, 15 players, locked GW3 lineage.
- recommendation publication #34 remains a 15-player hypothetical post-action state with 3 transfers and £1.4m ITB.
- all 15 recommended players have frozen decision-time projection evidence from prediction run 1365.
- latest database fixture audit: 10 total, 7 finished, 0 live/started unfinished, 3 future; lifecycle remains `POST_DEADLINE_ACTIVE` because the Gameweek is not complete.
- historical forecasts rewritten remains explicitly `false`.

## Runtime/source parity

Production runtime was independently rechecked before this gate:

- `fpl-api`: version 18, bundle SHA-256 `3f02d4e011a635e8cc2fa5edd9fbad5c1c0c95d6c087bcdda472ff309ac5b347`, unchanged runtime, repository source reconciled to production.
- `fpl-v3-workspace-api`: version 2, bundle SHA-256 `989e097caf66980805157b0da38e31da1bcf507cfd1d9533984311bf56f04d6f`, JWT verification enabled, repository/runtime parity green.
- no Edge Function was redeployed during the final frontend QA sequence.

## Public-client live smoke

GitHub Actions exercised the live `fpl-v3-workspace-api` using the exact endpoint and anonymous JWT/header pattern shipped by `frontend-v3`.

Observed pass payload:

- gameweek: 4;
- lifecycle: `POST_DEADLINE_ACTIVE`;
- actual: `NOT_VERIFIED`;
- `execution_authorized = false`;
- authorization label: `FINAL_FROZEN_NOT_AUTHORIZED`;
- frozen player evidence rows: 15;
- fixture phases: 7 finished / 0 live / 3 future;
- `historical_forecasts_rewritten = false`.

This proves the public browser-to-Supabase authentication path, not only an internal connector path.

## Frontend / browser QA

V3 branch gates are green for:

- deterministic dependency installation from committed `frontend-v3/package-lock.json` using `npm ci`;
- strict TypeScript;
- production Vite build;
- semantic state regressions;
- mobile/tablet/desktop Playwright coverage;
- no page-level horizontal overflow;
- accessibility scan with no critical/serious violations;
- formation-aware pitch behavior;
- Pitch/List toggle;
- Actual-state fail-closed behavior;
- LIVE fixture precedence / no started fixture labelled `Next`.

## V2 fallback / Pages rehearsal

- branch diff proves `frontend-v2/**` is unchanged from `main`.
- latest production V2 Pages deployment previously passed 114 E2E tests and byte-verified live legacy root and `/v2/`.
- branch Pages rehearsal successfully rebuilt V2 and V3, assembled the exact `_site` structure, preserved the root, preserved `/v2/`, added `/v3/`, excluded both frontend source trees and verified JavaScript assets.
- production Pages workflow is now fail-closed on V2 tests, V3 semantic/build/browser QA, serving parity, live V3 API smoke, artifact integrity, and post-deploy root/V2/V3 byte checks.

## Decision

C0255 is eligible to set `public_v3_deploy_allowed = true` in both serving manifests and run one final authorization-aware branch CI pass. Only after that pass is green may the architecture branch be merged to `main`.

V2 remains the rollback/fallback product after V3 publication; no V2 retirement is authorized by C0255.
