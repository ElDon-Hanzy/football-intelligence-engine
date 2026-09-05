create or replace function private.c0213_architecture_registry_status_v01()
returns jsonb
language sql
security definer
set search_path = pg_catalog, public, private
as $$
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
ret_active as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED')
select jsonb_build_object(
 'change_id','C0213','phase','P1_ARCHITECTURE_CONSUMPTION_REGISTRY','captured_at',clock_timestamp(),
 'registry_integrity_ok',((select count(*) from inv where lifecycle not in ('PRODUCTION','SHADOW','RESEARCH','UI_ONLY','INFRASTRUCTURE','RETIRED'))=0 and (select count(*) from missing_keys)=0),
 'system_consolidation_ok',((select count(*) from req where implementation_status in ('MISSING','CONTRADICTION'))=0 and (select count(*) from dups)=0 and (select n from ret_active)=0),
 'total_components',(select count(*) from inv),
 'lifecycle_counts',(select coalesce(jsonb_object_agg(lifecycle,n),'{}'::jsonb) from life),
 'db_components',(select count(*) from inv where source_kind='LIVE_PG_CATALOG'),
 'active_crons',(select count(*) from private.c0213_active_cron_components_v01),
 'external_components',(select count(*) from private.c0213_external_components),
 'dependency_edges',(select count(*) from private.c0213_component_dependency_graph_v01),
 'production_effect_components',(select count(*) from inv where production_effect_enabled),
 'active_duplicate_cron_targets',(select coalesce(jsonb_agg(to_jsonb(dups)),'[]'::jsonb) from dups),
 'active_retired_edge_deployments',(select n from ret_active),
 'required_capabilities_total',(select count(*) from req),
 'required_capabilities_missing',(select coalesce(jsonb_agg(to_jsonb(req)) filter (where implementation_status='MISSING'),'[]'::jsonb) from req),
 'required_capability_contradictions',(select coalesce(jsonb_agg(to_jsonb(req)) filter (where implementation_status='CONTRADICTION'),'[]'::jsonb) from req),
 'canonical_keys_not_found',(select coalesce(jsonb_agg(to_jsonb(missing_keys)),'[]'::jsonb) from missing_keys),
 'legacy_engine_component_versions_rows',(select count(*) from public.engine_component_versions),
 'legacy_research_experiment_registry_rows',(select count(*) from public.research_experiment_registry),
 'legacy_registries_authoritative',false,
 'notes',jsonb_build_array('Lifecycle is exact and separate from health/canonical status.','DB objects and cron jobs are live-discovered; Edge/UI/workflow rows are runtime/repository captures.','P1 is audit/inventory only and intentionally does not remove duplicates or change model behavior.')
);
$$;
revoke all on function private.c0213_architecture_registry_status_v01() from public, anon, authenticated;
grant execute on function private.c0213_architecture_registry_status_v01() to service_role;