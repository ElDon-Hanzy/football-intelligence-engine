create or replace view private.c0213_component_inventory_v01 as
select component_key,component_name,component_kind,lifecycle,capability_key,canonical_status,canonical_component_key,production_effect_enabled,active,source_kind,source_locator,change_id,rationale as notes,evidence
from private.c0213_db_component_inventory_v01
union all
select component_key,component_name,component_kind,lifecycle,capability_key,canonical_status,canonical_component_key,production_effect_enabled,active,'LIVE_EXTERNAL_CAPTURE'::text,source_locator || jsonb_build_object('deployment_status',deployment_status,'runtime_version',runtime_version,'repo_path',repo_path,'captured_at',captured_at),change_id,notes,evidence
from private.c0213_external_components
union all
select component_key,component_name,component_kind,lifecycle,capability_key,canonical_status,canonical_component_key,production_effect_enabled,active,source_kind,source_locator,change_id,rationale,evidence
from private.c0213_active_cron_components_v01;

create or replace view private.c0213_view_table_dependencies_v01 as
select distinct ('DB_RELATION:'||v.view_schema||'.'||v.view_name)::text as consumer_component_key,
 ('DB_RELATION:'||v.table_schema||'.'||v.table_name)::text as provider_component_key,
 'VIEW_TABLE_USAGE'::text as dependency_type,'DATA_READ'::text as effect_scope,
 jsonb_build_object('source','information_schema.view_table_usage') as evidence
from information_schema.view_table_usage v
where v.view_schema in ('public','private') and v.table_schema in ('public','private');

create or replace view private.c0213_lexical_db_dependencies_v01 as
with sources as (
 select ('DB_FUNCTION:'||n.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')')::text as component_key,
 lower(pg_catalog.pg_get_functiondef(p.oid)) as definition
 from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('public','private')
), targets as (
 select component_key,(object_schema||'.'||object_name)::text as qualified_name,component_kind
 from private.c0213_db_component_inventory_v01
)
select distinct s.component_key as consumer_component_key,t.component_key as provider_component_key,
 'LEXICAL_SCHEMA_QUALIFIED_REFERENCE'::text as dependency_type,
 case when t.component_kind='DB_FUNCTION' then 'ORCHESTRATION' else 'DATA_READ_OR_WRITE' end::text as effect_scope,
 jsonb_build_object('matched',t.qualified_name) as evidence
from sources s cross join targets t
where s.component_key<>t.component_key and position(lower(t.qualified_name) in s.definition)>0;

create or replace view private.c0213_cron_dependencies_v01 as
with parsed as (
 select c.*,c.source_locator->>'edge_target' as edge_target,c.source_locator->>'db_target' as db_target
 from private.c0213_active_cron_components_v01 c
), dbmatch as (
 select p.component_key as consumer_component_key,d.component_key as provider_component_key
 from parsed p
 join lateral (
   select i.component_key from private.c0213_db_component_inventory_v01 i
   where i.component_kind='DB_FUNCTION' and (i.object_schema||'.'||i.object_name)=p.db_target
   order by i.component_key limit 1
 ) d on p.db_target is not null
)
select p.component_key as consumer_component_key,('EDGE_FUNCTION:'||p.edge_target)::text as provider_component_key,
 'CRON_INVOKES_EDGE'::text as dependency_type,'ORCHESTRATION'::text as effect_scope,jsonb_build_object('jobid',p.object_name) as evidence
from parsed p where p.edge_target is not null
union all
select d.consumer_component_key,d.provider_component_key,'CRON_INVOKES_DB_FUNCTION'::text,'ORCHESTRATION'::text,jsonb_build_object('source','cron_command') from dbmatch d;

insert into private.c0213_manual_dependency_edges(consumer_component_key,provider_component_key,dependency_type,effect_scope,evidence)
values
('UI:frontend-v2','EDGE_FUNCTION:fpl-api','UI_CALLS_API','UI',jsonb_build_object('repo_path','frontend-v2/src/lib/fpl.ts')),
('UI:frontend-v2','EDGE_FUNCTION:fpl-manager-plan-api','UI_CALLS_API','UI',jsonb_build_object('repo_path','frontend-v2/src/pages/FplPage.tsx')),
('UI:frontend-v2','EDGE_FUNCTION:fixture-intelligence-api','UI_CALLS_API','UI',jsonb_build_object('repo_path','frontend-v2/src/lib/api.ts')),
('UI:legacy-root','EDGE_FUNCTION:fpl-api','UI_CALLS_API','UI',jsonb_build_object('role','rollback')),
('EDGE_FUNCTION:fpl-api','DB_RELATION:public.gameweek_prediction_runs','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-api/index.ts')),
('EDGE_FUNCTION:fpl-api','DB_RELATION:public.model_predictions','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-api/index.ts')),
('EDGE_FUNCTION:fpl-api','DB_RELATION:public.decision_snapshots','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-api/index.ts')),
('EDGE_FUNCTION:fpl-manager-plan-api','DB_RELATION:public.fpl_manager_plans','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-manager-plan-api/index.ts')),
('EDGE_FUNCTION:fpl-manager-plan-api','DB_RELATION:public.fpl_manager_state_snapshots','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-manager-plan-api/index.ts')),
('EDGE_FUNCTION:fpl-manager-plan-api','DB_RELATION:public.fpl_actual_manager_decisions','API_READS','DATA_READ',jsonb_build_object('repo_path','supabase/functions/fpl-manager-plan-api/index.ts')),
('EDGE_FUNCTION:refresh-role-tactical-intelligence','DB_FUNCTION:public.refresh_fixture_tactical_matchups_v011(p_gameweek integer)','EDGE_INVOKES_DB_FUNCTION','ORCHESTRATION',jsonb_build_object('repo_path','supabase/functions/refresh-role-tactical-intelligence/index.ts')),
('EDGE_FUNCTION:ingest-realized-player-roles','DB_RELATION:public.realized_player_role_observations','EDGE_WRITES','DATA_WRITE',jsonb_build_object('repo_path','supabase/functions/ingest-realized-player-roles/index.ts')),
('WORKFLOW:github-pages','UI:frontend-v2','DEPLOYS','UI',jsonb_build_object('repo_path','.github/workflows/pages.yml')),
('WORKFLOW:github-pages','UI:legacy-root','DEPLOYS','UI',jsonb_build_object('repo_path','.github/workflows/pages.yml'))
on conflict (consumer_component_key,provider_component_key,dependency_type) do update set effect_scope=excluded.effect_scope,evidence=excluded.evidence,active=true,verified_at=clock_timestamp();

create or replace view private.c0213_component_dependency_graph_v01 as
select consumer_component_key,provider_component_key,dependency_type,effect_scope,true as active,evidence from private.c0213_view_table_dependencies_v01
union
select consumer_component_key,provider_component_key,dependency_type,effect_scope,true,evidence from private.c0213_lexical_db_dependencies_v01
union
select consumer_component_key,provider_component_key,dependency_type,effect_scope,true,evidence from private.c0213_cron_dependencies_v01
union
select consumer_component_key,provider_component_key,dependency_type,effect_scope,active,evidence from private.c0213_manual_dependency_edges where active;

insert into private.c0213_required_capabilities(capability_key,pipeline,stage_order,stage_name,required_for_decision,canonical_component_key,implementation_status,notes)
values
('FPL_SOURCE_INGEST','PRODUCTION',10,'SOURCE / INGESTION',true,'EDGE_FUNCTION:sync-fpl-data','IMPLEMENTED','Current scheduled FPL source ingestion.'),
('RESULTS_INGEST','PRODUCTION',20,'RESULTS INGESTION',false,'EDGE_FUNCTION:sync-gw-results','IMPLEMENTED','Append-only result synchronization.'),
('PLAYER_STATE_REFRESH','PRODUCTION',30,'PLAYER STATE',true,'EDGE_FUNCTION:refresh-current-player-state','IMPLEMENTED','Current player state refresh.'),
('REALIZED_ROLE_INGEST','PRODUCTION',35,'REALIZED ROLE STATE',true,'EDGE_FUNCTION:ingest-realized-player-roles','IMPLEMENTED','Factual realized-role ingest; no direct ad-hoc coefficient.'),
('ROLE_TACTICAL_REFRESH','PRODUCTION',40,'TACTICAL FEATURE / STATE',true,'EDGE_FUNCTION:refresh-role-tactical-intelligence','CONTRADICTION','Consumer bridge fixed in P0; v0.1/v0.1.1 latest-selector timestamp contradiction remains for P3.'),
('CURRENT_SEASON_TEAM_STATE','PRODUCTION',45,'TEAM STATE',true,'DB_FUNCTION:private.refresh_current_season_team_performance_v01()','IMPLEMENTED','Current-season team process state.'),
('FIXTURE_PRODUCTION_CYCLE','PRODUCTION',50,'FIXTURE MODEL / TRANSFORM',true,'DB_FUNCTION:private.refresh_c0166_fixture_cycle_v01(p_gameweek integer)','CONTRADICTION','Writes forecasts before semantic audits; cron success is not decision readiness.'),
('FPL_PROJECTION_ORCHESTRATION','PRODUCTION',60,'PROJECTION',true,'DB_FUNCTION:private.generate_upcoming_fpl_snapshot_v01(p_gameweek integer, p_force boolean)','IMPLEMENTED','C0204 coverage guard/reconciliation wraps current core.'),
('FPL_POINT_DISTRIBUTION','PRODUCTION',70,'DISTRIBUTION',true,'DB_FUNCTION:private.fpl_current_event_distribution_v01(p_position text, p_xmin numeric, p_pstart numeric, p_pappear numeric, p_goal_lambda numeric, p_assist_lambda numeric, p_opp_lambda numeric, p_pdc numeric, p_pbonus numeric, p_target_xpts numeric)','IMPLEMENTED','Current event distribution.'),
('FPL_CURRENT_SQUAD_SELECTOR','PRODUCTION',80,'CURRENT-15 XI / CAPTAIN SELECTOR',true,'DB_FUNCTION:private.generate_upcoming_fpl_snapshot_c0160_legacy_v01(p_gameweek integer, p_force boolean)','IMPLEMENTED','Inline current-squad selector; not full-pool optimization.'),
('FPL_FULL_POOL_OPTIMIZER','PRODUCTION',85,'FULL-POOL GBP100M OPTIMIZER',true,null,'MISSING','No canonical engine implementation. fpl_manager_plans are produced by external analysis, not a DB/Edge full-pool optimizer.'),
('DECISION_READINESS_AUDIT','PRODUCTION',88,'DECISION READINESS',true,'DB_FUNCTION:private.c0167_decision_evidence_audit_v01(p_gameweek integer)','CONTRADICTION','Audit exists but saved automated decisions are not yet fail-closed on this gate.'),
('SAVED_MANAGER_PLAN','PRODUCTION',90,'SAVED DECISION ARTIFACT',true,'DB_RELATION:public.fpl_manager_plans','SPLIT','Authoritative external full-pool/Noise-Control plan is separate from automated decision_snapshots.'),
('FPL_PROJECTION_API','PRODUCTION',100,'PROJECTION API',true,'EDGE_FUNCTION:fpl-api','IMPLEMENTED','Projection/automated snapshot API.'),
('FPL_MANAGER_PLAN_API','PRODUCTION',105,'MANAGER PLAN API',true,'EDGE_FUNCTION:fpl-manager-plan-api','IMPLEMENTED','Authoritative manager plan/state boundary.'),
('FPL_UI','PRODUCTION',110,'UI',true,'UI:frontend-v2','IMPLEMENTED','Preferred UI; legacy root retained only as rollback.'),
('C0147_MATCHUP_SHADOW_CAPTURE','RESEARCH',20,'SHADOW OUTPUT',false,'DB_FUNCTION:private.capture_matchup_predictive_validation_v01(p_gameweek integer)','IMPLEMENTED','Original C0147 family remains shadow; bounded derivative is a separate production consumer.'),
('C0197_SHOOTOUT_FORWARD','RESEARCH',30,'SHADOW OUTPUT',false,'DB_FUNCTION:private.c0197_capture_next_shootout_forward_v01()','IMPLEMENTED','Scheduled forward shadow.'),
('C0206_TRANSLATION_FIT','RESEARCH',40,'RESEARCH MODEL',false,'EDGE_FUNCTION:c0206-fit-translation-shadow-v02','IMPLEMENTED','Retained rejected research evidence; no production effect.')
on conflict (capability_key) do update set pipeline=excluded.pipeline,stage_order=excluded.stage_order,stage_name=excluded.stage_name,required_for_decision=excluded.required_for_decision,canonical_component_key=excluded.canonical_component_key,implementation_status=excluded.implementation_status,notes=excluded.notes,updated_at=clock_timestamp();