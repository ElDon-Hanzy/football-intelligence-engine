# C0239 — Manager Plan Serving Reliability Closeout

Date: 2026-09-09
Status: Completed / Verified
Scope: Serving reliability only. No model effect. No historical forecast rewrite.

## Problem

The GW4 website intermittently failed to show the current manager plan even though the C0237 live publication existed in Supabase.

## Root causes

1. `fpl-manager-plan-api` coupled plan serving to heavyweight engine diagnostics. A diagnostics failure/timeout could therefore turn a healthy plan into HTTP 500.
2. The C0237 live plan stored `horizon` numerically while the browser contract expected a string, so a successful response could still fail client-side validation.
3. `fpl-api` synchronously depended on the external official FPL fixtures endpoint. A slow upstream response could stall the whole FPL decision workspace before the manager-plan panel rendered.
4. `engine-diagnostics-api` recomputed the full diagnostics/governance payload synchronously on every request. Historical GW3 measurement was approximately 9.4s inside PostgreSQL, making concurrent E2E/browser calls fragile.

## Production fixes

### Manager-plan API

- `fpl-manager-plan-api` v8 ACTIVE.
- Plan serving is independent of diagnostics telemetry.
- C0237 live-plan `horizon` is normalized to the browser contract at the API boundary.
- Existing execution-authority semantics are unchanged: live publication may be PRE_FINAL/CONTESTED and is not transfer authority unless `execution_authorized=true`.

### FPL API

- `fpl-api` v13 ACTIVE.
- Database fixtures are the reliable serving fallback.
- External FPL live-fixture overlay is best-effort and bounded to 1500 ms.
- External live fixture fetch is attempted only after kickoff while the Gameweek is still in progress.
- Historical forecast immutability remains unchanged.

### Engine Diagnostics

- `engine-diagnostics-api` v4 ACTIVE.
- Diagnostics are served from `public.engine_diagnostics_cached_status_v01()` rather than synchronously recomputing the heavy audit payload.
- Private cache refresh function: `private.refresh_engine_diagnostics_status_cache_v01(integer)`.
- Active cron job: `c0239_engine_diagnostics_cache_v01`, schedule `*/15 * * * *`.
- Cache table remains in the private schema; public/anon/authenticated access is revoked.

## Regression coverage

Added:

- `frontend-v2/tests/c0239-live-plan.spec.ts`
  - live GW4 manager API must parse through `ManagerPlanApiSchema`
  - C0237 plan must exist
  - 11 starting XI + 4 bench
  - horizon must be browser-compatible string

- `frontend-v2/tests/c0239-live-fpl-page.spec.ts`
  - real browser loads GW4 FPL workspace against live Supabase APIs
  - requires `Live decision publication`
  - requires `Best current plan · CONTESTED`
  - requires contested/not-final state
  - requires Gabriel and B.Fernandes to render
  - requires XI 11/11 and bench 4/4

The diagnostics live-contract smoke was aligned to the current production GW rather than using stale/heavy historical GW3 as the synchronous serving test. Historical chronology remains covered separately.

## Verification

Production-code HEAD before this documentation-only closeout commit:

- Git commit: `82c1699c0d46e415b8d8d17d367eb85b875a2c7a`
- GitHub Actions run: `34392882372`
- Job: `deploy`
- Result: SUCCESS

Green steps included:

- Typecheck UI v2
- Unit test UI v2
- Build UI v2
- Bundle budget
- Chromium installation gate
- Full E2E + accessibility suite
- C0239 live manager-plan API regression
- C0239 real-browser live GW4 FPL rendering regression
- Pages artifact verification
- GitHub Pages deployment
- Live legacy root verification
- Live `/v2/` integrity verification

Live Supabase verification also confirmed:

- C0239 diagnostics cron exists and is active as job 32.
- GW4 cached diagnostics payload is present and readable by the service-role-only wrapper.
- Cached governance state remains green and historical forecasts are not rewritten.

## Security / advisor review

Supabase security advisor was rerun after the C0239 DDL. It reported the project's pre-existing RLS-no-policy informational findings and pre-existing mutable-search-path/extension warnings; no new C0239-specific exposure was identified. The C0239 cache table is private and its serving function is restricted to `service_role`.

## Final state

C0239 is complete and verified.

The website manager-plan path no longer depends on diagnostics success or an unbounded external FPL call, and the API/browser contract now accepts the current C0237 live-plan payload.

No FPL transfer, chip action, model promotion, projection mutation, or historical forecast rewrite was performed by C0239.
