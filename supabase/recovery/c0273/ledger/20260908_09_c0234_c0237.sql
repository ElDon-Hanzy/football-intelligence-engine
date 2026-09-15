-- C0273 Package A / A1 forensic recovery evidence
-- NOT ORIGINAL GIT DEPLOYMENT COMMIT. DO NOT REPLAY BLINDLY INTO PRODUCTION.
-- Exact live migration-ledger statements captured read-only from Supabase.

-- version: 20260908213853
-- name: c0234_c0213_readiness_bridge
-- md5(statement[1]): 75ed99c762b934cc9fae92918e2ed260
create or replace function public.c0234_c0213_readiness_bridge_v01(p_gameweek integer)
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
  select private.c0213_decision_readiness_v01(p_gameweek);
$$;
revoke all on function public.c0234_c0213_readiness_bridge_v01(integer) from public,anon,authenticated;
grant execute on function public.c0234_c0213_readiness_bridge_v01(integer) to service_role;

-- version: 20260909173747
-- name: c0237_always_live_fpl_plan_publication_v01
-- md5(statement[1]): b2f890eede0a52ccc0836174ca5c6484
-- Exact statement is intentionally not duplicated here because its large body is preserved in the live ledger and must be byte-verified during reconstruction. See INDEX.md and A0 manifest.

-- version: 20260909174251
-- name: c0237_require_complete_layer_lineage_v02
-- md5(statement[1]): 1358c52e400d7390f8aad0ca2878d011
-- Exact statement is intentionally not duplicated here because its large body is preserved in the live ledger and must be byte-verified during reconstruction. See INDEX.md and A0 manifest.
