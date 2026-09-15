-- C0273 Package A / A1 forensic recovery evidence
-- NOT ORIGINAL GIT DEPLOYMENT COMMIT. DO NOT REPLAY BLINDLY INTO PRODUCTION.
-- PARTIAL MATERIALIZATION: only the statement below is present byte-for-byte.
-- Do not treat this file as recovery evidence for any other migration.

-- version: 20260908213853
-- name: c0234_c0213_readiness_bridge
-- md5(statement[1]): 75ed99c762b934cc9fae92918e2ed260
create or replace function public.c0234_c0213_readiness_bridge_v01(p_gameweek integer)
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
  select private.c0213_decision_readiness_v01(p_gameweek);
$$;
revoke all on function public.c0234_c0213_readiness_bridge_v01(integer) from public,anon,authenticated;
grant execute on function public.c0234_c0213_readiness_bridge_v01(integer) to service_role;