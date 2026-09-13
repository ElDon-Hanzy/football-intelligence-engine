# C0268 — V3 Initial-Load Latency Production Closeout

Date: 2026-09-13 (Dubai)
Status: **Completed / Verified**
Parent: C0267
Related incident: C0264 (Blocked, PR #20 closed unmerged)

## Objective

Resume V3 performance optimization only after C0264 production functionality had been restored and runtime/repository parity re-established. Reduce current-FPL initial-load latency without weakening C0255/C0257 semantic, chronology, authentication, browser or deployment gates.

## Starting state

The C0264 experiment had left production and repository state divergent. Its catalog/auth experiment caused the public Gameweek status contract to return HTTP 401 to the browser, cascading into the GW switcher, Matches and Markets. C0266 restored the public contract and C0267 reconciled the live-proven workspace v3 source into clean `main`.

C0268 therefore started from verified C0267 state and did not reuse the contaminated C0264 branch.

## Implemented change

C0268 changed frontend request scheduling only:

1. current/default actual-live truth starts immediately with the current page rather than waiting behind catalog/workspace completion;
2. the default actual-live response may be reused for an explicit workspace Gameweek only when `actual.gameweek === workspace.gameweek`;
3. any Gameweek mismatch triggers an explicit `?gw=<workspace gameweek>` actual-live fetch;
4. the client rejects explicit actual-live responses that return a different Gameweek;
5. live smoke now verifies default catalog/workspace/actual Gameweek alignment;
6. dedicated Playwright tests cover matching reuse and mismatched fallback.

No Edge Function, model coefficient, historical forecast, optimizer logic, FPL recommendation, or V2 semantic behavior was changed by C0268.

## Measurement

The first cold external sample was noisy and was not used as evidence for promotion.

A controlled same-run A/B then modeled the exact old versus new frontend schedules on the same GitHub runner, alternating order `old/new/new/old`:

| Schedule | Samples | Median |
|---|---:|---:|
| Old | 1450 ms, 1297 ms | 1374 ms |
| New | 1124 ms, 1212 ms | 1168 ms |

Result: **−206 ms median, approximately 15% faster**. Both new samples beat both old samples.

The temporary A/B loop was removed before final production CI. The lightweight live alignment/timing smoke remains.

## Red-team finding and permanent guard

Pre-merge diff review found an intermediate manually copied anon-JWT payload with malformed issuer `iss="supaase"`. This was the same failure class as the C0264 catalog incident. It **never reached production**.

The exact production credential was restored before merge and a permanent auth-parity/claims gate was added. CI now requires:

- workspace and actual-live browser clients to ship the exact same public anon credential;
- decoded `iss=supabase`;
- decoded `ref=knooiwezzsxcwhtjtdap`;
- decoded `role=anon`.

This guard is intentionally stricter than relying on a generic live smoke sourced from only one client file.

## GitHub promotion evidence

PR: **#24 — C0268: parallelize current V3 FPL truth loading**

Merge commit:

`4b16fd6364d78e26af1430bed05aa8178ea736e5`

Final post-fix PR workflow:

`34775557312` — PASS

Required gates passed before merge:

- semantic contract;
- live public-client smoke including auth parity/claims;
- serving parity;
- V3 typecheck/build;
- V2 isolation / Pages artifact QA;
- full responsive browser/accessibility suite;
- current-FPL matching reuse regression test;
- current-FPL mismatched-Gameweek fallback regression test.

## Production deployment evidence

Pages workflow:

`34775635944` — **SUCCESS**

Deployment built and verified commit:

`4b16fd6364d78e26af1430bed05aa8178ea736e5`

Production URL:

`https://eldon-hanzy.github.io/football-intelligence-engine/`

Deployment pipeline passed:

- V2 typecheck, 24 unit tests and bundle budget;
- V3 semantic tests;
- V3 typecheck/build;
- serving-parity gate;
- live public-client truth/auth smoke;
- V2 responsive E2E/accessibility: 114 passed, 42 skipped;
- V3 responsive E2E/accessibility: **75 passed**;
- artifact isolation and source-tree exclusion;
- Pages upload/deployment;
- live legacy root, `/v2/`, `/v3/` HTML and JavaScript asset verification.

## Production live truth at closeout

Deployment smoke reported:

- Gameweek: **4**;
- lifecycle: `POST_DEADLINE_ACTIVE`;
- workspace actual: `VERIFIED`;
- actual-live state: `VERIFIED`;
- source: `public_fpl_api_locked_picks_c0257`;
- actual XI: **11**;
- actual bench: **4**;
- engine `execution_authorized=false`;
- recommendation evidence rows: **20**;
- fixture phases: **9 FINISHED, 1 FUTURE, 0 LIVE**;
- actual result rows: **15 FINAL**;
- `historical_forecasts_rewritten=false`.

Production deployment timing sample from the eastus2 runner:

- default catalog: 1074 ms;
- default workspace: 2140 ms;
- default actual/live: 1850 ms;
- concurrent current-page envelope: 2178 ms;
- later catalog + explicit parallel workspace/actual path: 1306 ms.

Absolute cross-run values are observational only; region/cold-state variation is material. The controlled same-run A/B is the promotion evidence.

## Live runtime inventory

At closeout:

- `gameweek-status-api`: v8, ACTIVE, `verify_jwt=false` with explicit handler authorization;
- `fpl-v3-workspace-api`: v3, ACTIVE, `verify_jwt=true`, bundle `88548930feebaf42b45d23cb155bf731659b5eb0ce758a791cd6dc8e13e11273`;
- `fpl-v3-actual-live-api`: v1, ACTIVE, `verify_jwt=true`, bundle `49782885a5b4a039339fd1411ed7c56bc48bbd3e98814466feec0480a4ceca20`;
- legacy `fpl-api`: v18.

## Semantic acceptance

Preserved and re-proved:

- actual submitted team ≠ engine recommendation ≠ realized result;
- frozen projections remain frozen;
- missing remains missing;
- `FINAL` does not imply execution authorization;
- exact fail-closed phrase remains `Actual submitted team not verified`;
- cross-Gameweek actual/workspace truth is never combined;
- V2 remains untouched fallback;
- no historical forecast rewrite;
- no retrospective execution authority.

## Tracker closeout

`public.change_tracker_working.C0268` transitioned to:

- `status=Completed`;
- `delivery_stage=Verified`.

C0264 remains `Blocked`; PR #20 remains closed unmerged and must not be reused.

## Next boundary

Any additional V3 latency optimization must use a new change ID from current `main`, establish a controlled baseline, preserve all auth/semantic/browser/deployment gates, and be rejected if the measured advantage is within normal network/runtime noise.
