-- C0213 P3: canonical production-core naming, retired invocation-surface cleanup,
-- and accurate retired external deployment metrics. No numerical model behavior changes.

alter function private.generate_upcoming_fpl_snapshot_c0160_legacy_v01(integer, boolean)
  rename to generate_upcoming_fpl_projection_core_v01;

create or replace function private.generate_upcoming_fpl_snapshot_v01(p_gameweek integer default null::integer, p_force boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'private', 'public', 'pg_temp'
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_gw integer;
  v_cov jsonb;
  v_reconcile jsonb;
  v_res jsonb;
  v_run_id bigint;
  v_decision_saved boolean:=false;
  v_readiness jsonb;
begin
  if p_gameweek is null then
    select x.gameweek into v_gw
    from (
      select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at
      from public.matches m where m.source='fpl' and m.gameweek between 1 and 38
      group by m.gameweek
    ) x
    where x.deadline_at>v_now order by x.gameweek limit 1;
  else
    v_gw:=p_gameweek;
  end if;
  if v_gw is null then
    return jsonb_build_object('ok',false,'status','NO_FUTURE_GAMEWEEK','change_id','C0204');
  end if;

  v_cov:=private.c0204_projection_coverage_summary_v01(v_gw,v_now);
  if coalesce((v_cov->>'ungoverned_missing_count')::integer,0)>0 then
    v_reconcile:=private.c0204_reconcile_projection_coverage_v02(v_gw,v_now);
    v_cov:=private.c0204_projection_coverage_summary_v01(v_gw,v_now);
  else
    v_reconcile:=jsonb_build_object('ok',true,'change_id','C0204','reconciliation_version','C0204_V02_CONTINUOUS','gameweek',v_gw,'new_governed_exclusions',0,'player_ids','[]'::jsonb,'missing_data_is_not_zero',true,'validated_prior_created',false,'historical_forecasts_rewritten',false);
  end if;

  if coalesce((v_cov->>'ungoverned_missing_count')::integer,0)>0 then
    insert into public.fpl_projection_coverage_audits(prediction_run_id,gameweek,captured_at,projectable_count,governed_excluded_count,ungoverned_missing_count,total_fpl_players,coverage)
    values(null,v_gw,clock_timestamp(),(v_cov->>'projectable_count')::integer,(v_cov->>'governed_excluded_count')::integer,(v_cov->>'ungoverned_missing_count')::integer,(v_cov->>'total_fpl_players')::integer,v_cov || jsonb_build_object('coverage_reconciliation',v_reconcile));
    return jsonb_build_object('ok',false,'status','C0204_PROJECTION_COVERAGE_BLOCKED','gameweek',v_gw,'projection_coverage',v_cov,'coverage_reconciliation',v_reconcile,'historical_forecasts_rewritten',false);
  end if;

  v_res:=private.generate_upcoming_fpl_projection_core_v01(v_gw,p_force);
  if v_res ? 'run_id' then v_run_id:=(v_res->>'run_id')::bigint; end if;

  if v_run_id is not null then
    select exists(select 1 from public.decision_snapshots d where d.prediction_run_id=v_run_id) into v_decision_saved;
  end if;
  v_readiness:=private.c0213_decision_readiness_v01(v_gw);

  insert into public.fpl_projection_coverage_audits(prediction_run_id,gameweek,captured_at,projectable_count,governed_excluded_count,ungoverned_missing_count,total_fpl_players,coverage)
  values(v_run_id,v_gw,clock_timestamp(),(v_cov->>'projectable_count')::integer,(v_cov->>'governed_excluded_count')::integer,(v_cov->>'ungoverned_missing_count')::integer,(v_cov->>'total_fpl_players')::integer,v_cov || jsonb_build_object('coverage_reconciliation',v_reconcile));

  return v_res || jsonb_build_object(
    'change_id','C0204',
    'projection_coverage',v_cov,
    'coverage_reconciliation',v_reconcile,
    'decision_readiness',v_readiness,
    'decision_saved',v_decision_saved,
    'decision_status',case when v_decision_saved then 'SAVED' else 'BLOCKED_NOT_READY' end,
    'historical_forecasts_rewritten',false
  );
end $function$;

create or replace function private.invoke_engine_ingest(p_function text, p_body jsonb default '{}'::jsonb)
 returns bigint
 language plpgsql
 security definer
 set search_path to 'private', 'public', 'vault', 'net', 'pg_temp'
as $function$
declare v_token text; v_url text; v_request_id bigint;
begin
  if p_function not in (
    'ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds',
    'refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats',
    'refresh-role-tactical-intelligence','ingest-historical-role-evidence','refresh-forward-fixture-forecasts',
    'refresh-forward-enriched-predictions','probe-zero-cost-football-sources',
    'c0206-build-pl-transfer-pairs','c0206-build-understat-foreign-pairs-v02',
    'c0206-build-understat-older-train-v01','c0206-fit-translation-shadow-v02',
    'ingest-realized-player-roles','fpl-full-pool-optimizer'
  ) then raise exception 'Function not allowed'; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end $function$;

update private.c0213_component_overrides
set object_name='generate_upcoming_fpl_projection_core_v01',
    rationale='Active production projection/distribution/current-15 selection core; canonical name consolidated by C0213 P3.',
    evidence=coalesce(evidence,'{}'::jsonb) - 'known_naming_debt' || jsonb_build_object('renamed_by','C0213_P3','oid_preservation_required',true),
    updated_at=clock_timestamp()
where object_kind='DB_FUNCTION'
  and object_schema='private'
  and object_name='generate_upcoming_fpl_snapshot_c0160_legacy_v01';

update private.c0213_required_capabilities
set canonical_component_key='DB_FUNCTION:private.generate_upcoming_fpl_projection_core_v01(p_gameweek integer, p_force boolean)',
    notes='Inline current-squad selector inside the canonical production projection core; not the full-pool optimizer.',
    updated_at=clock_timestamp()
where capability_key='FPL_CURRENT_SQUAD_SELECTOR';

create or replace function private.c0213_architecture_registry_status_v01()
 returns jsonb
 language sql
 security definer
 set search_path to 'pg_catalog', 'public', 'private'
as $function$
with inv as (select * from private.c0213_component_inventory_v01),
life as (select lifecycle,count(*) n from inv group by lifecycle),
dups as (
 select source_locator->>'edge_target' edge_target,source_locator->>'db_target' db_target,count(*) n,array_agg(component_key order by component_key) components
 from private.c0213_active_cron_components_v01
 group by source_locator->>'edge_target',source_locator->>'db_target'
 having count(*)>1 and coalesce(source_locator->>'edge_target',source_locator->>'db_target') is not null
),
req as (select * from private.c0213_required_capabilities),
missing_keys as (
 select r.capability_key,r.canonical_component_key
 from req r left join inv i on i.component_key=r.canonical_component_key
 where r.canonical_component_key is not null and i.component_key is null
),
ret_all as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED'),
ret_edge as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED' and component_kind='EDGE_FUNCTION'),
ret_api as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED' and component_kind='API')
select jsonb_build_object(
 'change_id','C0213','phase','ARCHITECTURE_CONSUMPTION_REGISTRY','captured_at',clock_timestamp(),
 'registry_integrity_ok',((select count(*) from inv where lifecycle not in ('PRODUCTION','SHADOW','RESEARCH','UI_ONLY','INFRASTRUCTURE','RETIRED'))=0 and (select count(*) from missing_keys)=0),
 'system_consolidation_ok',((select count(*) from req where implementation_status in ('MISSING','CONTRADICTION'))=0 and (select count(*) from dups)=0 and (select n from ret_all)=0),
 'total_components',(select count(*) from inv),
 'lifecycle_counts',(select coalesce(jsonb_object_agg(lifecycle,n),'{}'::jsonb) from life),
 'db_components',(select count(*) from inv where source_kind='LIVE_PG_CATALOG'),
 'active_crons',(select count(*) from private.c0213_active_cron_components_v01),
 'external_components',(select count(*) from private.c0213_external_components),
 'dependency_edges',(select count(*) from private.c0213_component_dependency_graph_v01),
 'production_effect_components',(select count(*) from inv where production_effect_enabled),
 'active_duplicate_cron_targets',(select coalesce(jsonb_agg(to_jsonb(dups)),'[]'::jsonb) from dups),
 'active_retired_external_deployments',(select n from ret_all),
 'active_retired_edge_deployments',(select n from ret_edge),
 'active_retired_api_deployments',(select n from ret_api),
 'required_capabilities_total',(select count(*) from req),
 'required_capabilities_missing',(select coalesce(jsonb_agg(to_jsonb(req)) filter (where implementation_status='MISSING'),'[]'::jsonb) from req),
 'required_capability_contradictions',(select coalesce(jsonb_agg(to_jsonb(req)) filter (where implementation_status='CONTRADICTION'),'[]'::jsonb) from req),
 'canonical_keys_not_found',(select coalesce(jsonb_agg(to_jsonb(missing_keys)),'[]'::jsonb) from missing_keys),
 'legacy_engine_component_versions_rows',(select count(*) from public.engine_component_versions),
 'legacy_research_experiment_registry_rows',(select count(*) from public.research_experiment_registry),
 'legacy_registries_authoritative',false,
 'notes',jsonb_build_array('Lifecycle is exact and separate from health/canonical status.','DB objects and cron jobs are live-discovered; Edge/UI/workflow rows are runtime/repository captures.','Retired external deployment counts distinguish Edge Functions, APIs, and the combined external total.','P3 canonical naming and invocation-surface cleanup do not alter numerical model behavior.')
);
$function$;

revoke all on function private.generate_upcoming_fpl_projection_core_v01(integer,boolean) from public, anon, authenticated;
grant execute on function private.generate_upcoming_fpl_projection_core_v01(integer,boolean) to service_role;
revoke all on function private.generate_upcoming_fpl_snapshot_v01(integer,boolean) from public, anon, authenticated;
grant execute on function private.generate_upcoming_fpl_snapshot_v01(integer,boolean) to service_role;
revoke all on function private.invoke_engine_ingest(text,jsonb) from public, anon, authenticated;
grant execute on function private.invoke_engine_ingest(text,jsonb) to service_role;
revoke all on function private.c0213_architecture_registry_status_v01() from public, anon, authenticated;
grant execute on function private.c0213_architecture_registry_status_v01() to service_role;
