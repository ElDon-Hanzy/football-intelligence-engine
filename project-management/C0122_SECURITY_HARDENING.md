# C0122 — Legacy RLS / grant hardening

Date: 2026-08-25
Parent: C0045
Status: Completed / Verified

## Scope
Harden legacy public-schema exposure without changing model data, forecasts, or service-role backend behavior.

## Dependency mapping before write
The GitHub Pages frontend (`app.js`) calls only these Edge Function APIs:
- `fpl-api`
- `fixture-intelligence-api`
- `betting-api`

The browser does not query Supabase tables directly. Those Edge Functions use backend service credentials.

24 public tables had broad direct grants to both `anon` and `authenticated` despite RLS being enabled and no table policies being present. The grants were therefore unnecessary and risky as future policy changes could unintentionally expose access.

Five mutating public RPC functions also retained inherited PUBLIC execute permission:
- `evaluate_blind_gw_replay_v01(bigint)`
- `evaluate_form_decay_shadow_v01(bigint)`
- `generate_form_decay_shadow_v01(bigint)`
- `generate_forward_team_strength_candidate_v03_elo(integer)`
- `rebuild_historical_football_data_elo_v01()`

## Changes
Migration `20260825033228_c0122_legacy_rls_grant_hardening`:
- revoked all direct table privileges on the 24 legacy public tables from `anon` and `authenticated`;
- revoked all public-schema sequence privileges from `anon` and `authenticated`;
- revoked public/anon/authenticated execution on the five mutating RPCs while explicitly preserving `service_role` execution;
- removed PUBLIC/anon/authenticated access to the `private` schema and private functions;
- preserved service-role access to private functions;
- changed default privileges so new public tables/sequences do not automatically recreate direct anon/auth access and new private functions do not inherit PUBLIC execute.

## Verification
After migration:
- remaining direct table grants to `anon`/`authenticated`: 0;
- remaining public sequence usage grants to `anon`/`authenticated`: 0;
- all five mutating RPCs: anon execute=false, authenticated execute=false, service_role execute=true;
- `fpl-api?gw=1`: HTTP 200;
- `fixture-intelligence-api?gw=1`: HTTP 200;
- `betting-api?gw=1`: HTTP 200;
- A0005 remains 140 frozen predictions, 0 evaluations, 0 integrity violations;
- W0002 remains 20 complete fixtures, 0 evaluations, 0 integrity violations;
- governance audit remains clean.

No model or forecast rows were altered by this change.
