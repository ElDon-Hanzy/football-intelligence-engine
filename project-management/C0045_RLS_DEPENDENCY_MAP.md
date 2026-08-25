# C0045 — Legacy RLS / grant dependency map

Date: 2026-08-25
Status: Completed / Verified mapping

## Scope
Map direct and indirect dependencies before changing permissions on legacy public tables flagged by the Supabase security advisor.

No permission change is part of C0045.

## Security-advisor ERROR tables
Seven public tables have RLS disabled:

1. `player_role_intelligence`
2. `projection_disagreement`
3. `fixture_prediction_snapshots`
4. `odds_provider_events`
5. `odds_ingestion_runs`
6. `odds_raw_snapshots`
7. `odds_market_selections`

At audit time every one of these seven tables granted `anon` and `authenticated` the full table privilege set: SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER. `service_role` also has the full set.

Row counts at mapping time:
- fixture_prediction_snapshots: 48
- odds_ingestion_runs: 12
- odds_market_selections: 31,938
- odds_provider_events: 15
- odds_raw_snapshots: 125
- player_role_intelligence: 2
- projection_disagreement: 36

## Frontend dependency
The static GitHub Pages app calls only Edge Function endpoints:
- `/functions/v1/fpl-api`
- `/functions/v1/fixture-intelligence-api`
- `/functions/v1/betting-api`

No direct browser/PostgREST dependency on these seven base tables was found.

## Edge Function dependencies
All inspected live Edge Functions create their Supabase client with the backend `service_role` credential.

- `betting-api` reads `fixture_prediction_snapshots`, `odds_ingestion_runs`, `odds_raw_snapshots`, `odds_market_selections` and Correct Score views.
- `ingest-bookmaker-odds` writes `odds_ingestion_runs`, `odds_provider_events`, `odds_raw_snapshots`, `odds_market_selections`.
- `generate-fixture-predictions` writes `fixture_prediction_snapshots`.
- `fpl-api` reads `fixture_prediction_snapshots`.
- `generate-fpl-predictions-v013` reads `player_role_intelligence`.
- `projection-benchmark-api` does not use `projection_disagreement`; it reads the underlying benchmark tables and calculates comparison output itself.

Therefore anon/authenticated access to the seven base tables is not required by these application paths.

## Database view dependencies
`correct_score_price_history` depends directly on:
- `odds_raw_snapshots`
- `odds_market_selections`

Relevant Correct Score views (`correct_score_price_history`, `correct_score_price_summary`, `correct_score_clv_research`, `correct_score_edge_consensus`) are `security_invoker=true` and currently granted only to `service_role` among anon/authenticated/service_role.

This means hardening the underlying odds tables is compatible with the intended service-role-only view path.

## Database function dependencies
Functions that read target tables include:

### fixture_prediction_snapshots
- `backfill_prediction_version_manifests_v01`
- `create_walk_forward_run_v01`
- `evaluate_walk_forward_run_v01`
- `generate_blind_gw_replay_v01`
- `generate_correct_score_edge_observations`
- `generate_correct_score_edge_observations_for_snapshots`
- `generate_fixture_team_feature_snapshots_v01`
- `generate_walk_forward_ablation_v01`
- W0002 status checks

### odds_raw_snapshots
- A0005/W0002 near-close capture and status functions
- Correct Score edge generators

### odds_market_selections
- C0120 forward candidate function
- Correct Score edge generators
- market disagreement v0.1/v0.2

Almost all mapped public functions are EXECUTE-granted only to `service_role`.

**Exception:** `public.generate_blind_gw_replay_v01(integer)` is currently executable by PUBLIC/anon/authenticated as well as service_role. It is SECURITY INVOKER. This should be explicitly revoked during the hardening change; otherwise removing base-table privileges would cause anonymous calls to fail unpredictably rather than intentionally closing the RPC.

## Legacy-table status
- `player_role_intelligence` remains a live model-generation input, but only through service-role backend execution.
- `projection_disagreement` has 36 rows, latest update 2026-08-22, but no current database function/view or inspected Edge Function dependency was found. Current benchmark API computes disagreement from benchmark tables directly.

## Additional advisor findings
Many tables have RLS enabled with no policy. This is INFO-level and is expected for service-role-only internal tables where anon/authenticated grants are already absent.

`pg_net` installed in public is a WARN-level advisor finding and is separate from the seven RLS-disabled tables. Moving an extension can have broader operational consequences and should not be bundled into the first legacy-table hardening migration.

Advisor references:
- RLS disabled in public: https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public
- RLS enabled without policy: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy
- Extension in public: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

## Hardening conclusion
A staged hardening change can safely target the seven advisor ERROR tables by:
1. enabling RLS;
2. revoking all privileges from `anon` and `authenticated`;
3. retaining `service_role` access;
4. explicitly revoking PUBLIC/anon/authenticated EXECUTE on `generate_blind_gw_replay_v01(integer)`;
5. verifying the live Edge Function APIs and forward-validation pipelines before and after the change.

This should be a new Change ID, not part of C0045, because C0045's scope is dependency mapping only.
