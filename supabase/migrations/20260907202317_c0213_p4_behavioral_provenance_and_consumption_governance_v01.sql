create table if not exists private.c0213_behavioral_consumption_tests (
  id bigserial primary key,
  component_key text not null,
  test_key text not null,
  test_type text not null check (test_type in ('NUMERIC_PERTURBATION','STATE_SELECTION','OUTPUT_LINEAGE','RUNTIME_PROBE')),
  status text not null check (status in ('PASS','FAIL')),
  component_definition_hash text not null,
  evidence jsonb not null default '{}'::jsonb,
  tested_at timestamptz not null default clock_timestamp(),
  change_id text not null default 'C0213'
);
create index if not exists c0213_behavioral_tests_component_idx on private.c0213_behavioral_consumption_tests(component_key,tested_at desc,id desc);
revoke all on private.c0213_behavioral_consumption_tests from public,anon,authenticated;
grant select,insert on private.c0213_behavioral_consumption_tests to service_role;
grant usage,select on sequence private.c0213_behavioral_consumption_tests_id_seq to service_role;

create or replace function private.block_c0213_behavioral_consumption_test_mutation_v01()
returns trigger language plpgsql set search_path='pg_catalog','private','public' as $$
begin
  raise exception 'C0213 behavioral consumption evidence is append-only';
end $$;
drop trigger if exists trg_block_c0213_behavioral_consumption_test_mutation on private.c0213_behavioral_consumption_tests;
create trigger trg_block_c0213_behavioral_consumption_test_mutation
before update or delete on private.c0213_behavioral_consumption_tests
for each row execute function private.block_c0213_behavioral_consumption_test_mutation_v01();

create or replace function private.c0213_component_definition_hash_v01(p_component_key text)
returns text language plpgsql stable security definer set search_path='pg_catalog','private','public' as $$
declare v_kind text; v_oid oid; v_hash text; v_ext record;
begin
  select component_kind,nullif(source_locator->>'oid','')::oid into v_kind,v_oid
  from private.c0213_component_inventory_v01 where component_key=p_component_key limit 1;
  if v_kind='DB_FUNCTION' and v_oid is not null then
    return md5(pg_get_functiondef(v_oid));
  elsif v_kind='VIEW' and v_oid is not null then
    return md5(pg_get_viewdef(v_oid::regclass,true));
  elsif v_kind in ('EDGE_FUNCTION','API','UI','WORKFLOW') then
    select runtime_version,repo_path,source_locator,evidence into v_ext
    from private.c0213_external_components where component_key=p_component_key limit 1;
    return md5(coalesce(v_ext.runtime_version::text,'')||'|'||coalesce(v_ext.repo_path,'')||'|'||coalesce(v_ext.source_locator::text,'')||'|'||coalesce(v_ext.evidence::text,''));
  end if;
  return md5(coalesce((select source_locator::text||'|'||evidence::text from private.c0213_component_inventory_v01 where component_key=p_component_key limit 1),p_component_key));
end $$;
revoke all on function private.c0213_component_definition_hash_v01(text) from public,anon,authenticated;
grant execute on function private.c0213_component_definition_hash_v01(text) to service_role;

create or replace function private.c0213_behavioral_consumption_status_v01()
returns jsonb language sql stable security definer set search_path='pg_catalog','private','public' as $$
with prod as (
  select component_key,component_name,component_kind,private.c0213_component_definition_hash_v01(component_key) current_hash
  from private.c0213_component_inventory_v01 where production_effect_enabled
), latest as (
  select distinct on (component_key) component_key,status,component_definition_hash,test_key,test_type,tested_at,evidence
  from private.c0213_behavioral_consumption_tests order by component_key,tested_at desc,id desc
), joined as (
  select p.*,l.status,l.component_definition_hash,l.test_key,l.test_type,l.tested_at,l.evidence,
         (l.status='PASS' and l.component_definition_hash=p.current_hash) current_pass
  from prod p left join latest l using(component_key)
)
select jsonb_build_object(
 'ok',count(*) filter(where current_pass)=count(*),
 'change_id','C0213','contract_version','C0213_P4_BEHAVIOR_V01','production_effect_components',count(*),
 'current_pass',count(*) filter(where current_pass),
 'missing_or_stale',coalesce(jsonb_agg(jsonb_build_object('component_key',component_key,'component_name',component_name,'latest_status',status,'test_key',test_key,'test_type',test_type,'tested_at',tested_at,'hash_matches',component_definition_hash=current_hash)) filter(where not coalesce(current_pass,false)),'[]'::jsonb)
) from joined;
$$;
revoke all on function private.c0213_behavioral_consumption_status_v01() from public,anon,authenticated;
grant execute on function private.c0213_behavioral_consumption_status_v01() to service_role;

create or replace view private.c0213_prediction_effect_provenance_v01 as
select
 mp.id prediction_id,mp.prediction_run_id,mp.gameweek,mp.player_id,mp.match_id,mp.generated_at,
 mp.expected_minutes,mp.expected_points,
 nullif(mp.features->>'baseline_prediction_id','')::bigint baseline_prediction_id,
 b.expected_points baseline_expected_points,
 case when b.expected_points is not null then mp.expected_points-b.expected_points end net_xpts_delta_vs_baseline,
 nullif(mp.features->>'team_lambda','')::numeric team_lambda,
 nullif(mp.features->>'opp_lambda','')::numeric opponent_lambda,
 nullif(mp.features#>>'{point_distribution,events,goal_lambda}','')::numeric goal_lambda,
 nullif(mp.features#>>'{point_distribution,events,assist_lambda}','')::numeric assist_lambda,
 nullif(mp.features#>>'{point_distribution,events,p_dc}','')::numeric p_dc,
 nullif(mp.features#>>'{point_distribution,events,p_bonus}','')::numeric p_bonus,
 mp.features#>>'{point_distribution,version}' distribution_version,
 fp.id fixture_prediction_id,
 fp.source_snapshot->>'generator' fixture_generator,
 fp.source_snapshot->>'parent_c0159_snapshot_id' c0159_parent_snapshot_id,
 nullif(fp.source_snapshot->>'evidence_home_log_adjustment','')::numeric c0166_home_log_adjustment,
 nullif(fp.source_snapshot->>'evidence_away_log_adjustment','')::numeric c0166_away_log_adjustment,
 jsonb_build_object(
   'team_lambda_component','private.fpl_adjusted_team_lambda_v01',
   'goal_lambda_component','private.fpl_fixture_goal_lambda_v02',
   'assist_lambda_component','private.fpl_fixture_assist_lambda_v02',
   'distribution_component','private.fpl_current_event_distribution_v01',
   'fixture_generator',fp.source_snapshot->>'generator',
   'realized_role_numeric_uplift_enabled',false,
   'missing_data_is_not_zero',coalesce((mp.features->>'missing_data_is_not_zero')::boolean,false)
 ) effect_manifest
from public.model_predictions mp
left join public.model_predictions b on b.id=nullif(mp.features->>'baseline_prediction_id','')::bigint
left join lateral (
  select x.* from public.current_production_fixture_prediction_v01 x
  where x.match_id=mp.match_id order by x.captured_at desc,x.id desc limit 1
) fp on true
where mp.prediction_run_id is not null;
revoke all on private.c0213_prediction_effect_provenance_v01 from public,anon,authenticated;
grant select on private.c0213_prediction_effect_provenance_v01 to service_role;

create or replace function private.c0213_prediction_effect_provenance_status_v01(p_gameweek integer)
returns jsonb language sql stable security definer set search_path='pg_catalog','private','public' as $$
with r as (select max(id) run_id from public.gameweek_prediction_runs where gameweek=p_gameweek),
p as (select * from private.c0213_prediction_effect_provenance_v01 where prediction_run_id=(select run_id from r))
select jsonb_build_object(
 'ok',count(*)>0 and count(*) filter(where baseline_prediction_id is not null and baseline_expected_points is not null)=count(*) and count(*) filter(where team_lambda is not null and opponent_lambda is not null and distribution_version is not null)=count(*),
 'gameweek',p_gameweek,'prediction_run_id',(select run_id from r),'prediction_rows',count(*),
 'baseline_lineage_rows',count(*) filter(where baseline_prediction_id is not null and baseline_expected_points is not null),
 'lambda_lineage_rows',count(*) filter(where team_lambda is not null and opponent_lambda is not null),
 'event_distribution_rows',count(*) filter(where distribution_version is not null),
 'fixture_generator_rows',count(*) filter(where fixture_generator is not null),
 'nonzero_net_xpts_delta_rows',count(*) filter(where abs(coalesce(net_xpts_delta_vs_baseline,0))>0.000001),
 'contract_version','C0213_P4_EFFECT_PROVENANCE_V01','missing_data_is_not_zero',true
) from p;
$$;
revoke all on function private.c0213_prediction_effect_provenance_status_v01(integer) from public,anon,authenticated;
grant execute on function private.c0213_prediction_effect_provenance_status_v01(integer) to service_role;

create table if not exists private.c0213_change_consumption_contracts (
 change_id text primary key,
 pathway text not null check(pathway in ('PRODUCTION_CONSUMER','RESEARCH_EVALUATOR_OR_GATE','RESEARCH_INFRASTRUCTURE','BLOCKED_EXTERNAL_SOURCE','PROGRAM_UMBRELLA','LEGACY_RECONCILED')),
 consumer_or_evaluator_ref text not null,
 evidence jsonb not null default '{}'::jsonb,
 verified_at timestamptz not null default clock_timestamp()
);
revoke all on private.c0213_change_consumption_contracts from public,anon,authenticated;
grant select,insert,update on private.c0213_change_consumption_contracts to service_role;

create or replace function private.c0213_tracker_consumption_governance_v01()
returns jsonb language sql stable security definer set search_path='pg_catalog','private','public' as $$
with scoped as (
 select c.change_id,c.title,c.status,c.delivery_stage,c.model_effect,
   case when lower(coalesce(c.model_effect,'')) in ('n/a','none') or lower(coalesce(c.model_effect,'')) like 'none %' or lower(coalesce(c.model_effect,'')) like 'none —%' then false else true end requires_contract
 from public.change_tracker_working c where c.delivery_stage in ('Executed','Verified')
), j as (
 select s.*,cc.pathway,cc.consumer_or_evaluator_ref from scoped s left join private.c0213_change_consumption_contracts cc using(change_id)
)
select jsonb_build_object(
 'ok',count(*) filter(where requires_contract and pathway is null)=0,
 'contract_version','C0213_TRACKER_CONSUMPTION_V01',
 'implemented_rows',count(*),'rows_requiring_contract',count(*) filter(where requires_contract),
 'covered_rows',count(*) filter(where requires_contract and pathway is not null),
 'violations',coalesce(jsonb_agg(jsonb_build_object('change_id',change_id,'title',title,'status',status,'delivery_stage',delivery_stage,'model_effect',model_effect)) filter(where requires_contract and pathway is null),'[]'::jsonb)
) from j;
$$;
revoke all on function private.c0213_tracker_consumption_governance_v01() from public,anon,authenticated;
grant execute on function private.c0213_tracker_consumption_governance_v01() to service_role;

create or replace function private.audit_change_tracker_governance_v01()
returns jsonb language sql stable set search_path='public','private','pg_temp' as $$
with base as (
 select jsonb_build_object(
  'total_rows',count(*),
  'bad_change_ids',count(*) filter(where change_id !~ '^C[0-9]{4}$'),
  'completed_not_verified',count(*) filter(where status='Completed' and delivery_stage<>'Verified'),
  'completed_without_refs',count(*) filter(where status='Completed' and coalesce(cardinality(implementation_refs),0)=0),
  'decision_rows',count(*) filter(where decision_required),
  'decision_rows_without_refs',count(*) filter(where decision_required and coalesce(cardinality(decision_refs),0)=0)
 ) j from public.change_tracker_working
), cg as (select private.c0213_tracker_consumption_governance_v01() j)
select (base.j||jsonb_build_object('consumption_governance',cg.j,'consumption_contract_violations',(cg.j->>'rows_requiring_contract')::int-(cg.j->>'covered_rows')::int,'ok',
 (base.j->>'bad_change_ids')::int=0 and (base.j->>'completed_not_verified')::int=0 and (base.j->>'completed_without_refs')::int=0 and (base.j->>'decision_rows_without_refs')::int=0 and coalesce((cg.j->>'ok')::boolean,false))) from base,cg;
$$;

create or replace function private.c0213_architecture_registry_status_v01()
returns jsonb language sql security definer set search_path='pg_catalog','public','private' as $$
with inv as (select * from private.c0213_component_inventory_v01),
life as (select lifecycle,count(*) n from inv group by lifecycle),
dups as (
 select source_locator->>'edge_target' edge_target,source_locator->>'db_target' db_target,count(*) n,array_agg(component_key order by component_key) components
 from private.c0213_active_cron_components_v01 group by source_locator->>'edge_target',source_locator->>'db_target'
 having count(*)>1 and coalesce(source_locator->>'edge_target',source_locator->>'db_target') is not null
),req as (select * from private.c0213_required_capabilities),
missing_keys as (select r.capability_key,r.canonical_component_key from req r left join inv i on i.component_key=r.canonical_component_key where r.canonical_component_key is not null and i.component_key is null),
ret_all as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED'),
ret_edge as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED' and component_kind='EDGE_FUNCTION'),
ret_api as (select count(*) n from private.c0213_external_components where active and deployment_status='ACTIVE' and lifecycle='RETIRED' and component_kind='API'),
beh as (select private.c0213_behavioral_consumption_status_v01() j),
tgov as (select private.c0213_tracker_consumption_governance_v01() j)
select jsonb_build_object(
 'change_id','C0213','phase','ARCHITECTURE_CONSUMPTION_REGISTRY','captured_at',clock_timestamp(),
 'registry_integrity_ok',((select count(*) from inv where lifecycle not in ('PRODUCTION','SHADOW','RESEARCH','UI_ONLY','INFRASTRUCTURE','RETIRED'))=0 and (select count(*) from missing_keys)=0),
 'system_consolidation_ok',((select count(*) from req where implementation_status in ('MISSING','CONTRADICTION'))=0 and (select count(*) from dups)=0 and (select n from ret_all)=0 and coalesce(((select j from beh)->>'ok')::boolean,false) and coalesce(((select j from tgov)->>'ok')::boolean,false)),
 'behavioral_consumption',(select j from beh),'tracker_consumption_governance',(select j from tgov),
 'total_components',(select count(*) from inv),'lifecycle_counts',(select coalesce(jsonb_object_agg(lifecycle,n),'{}'::jsonb) from life),
 'db_components',(select count(*) from inv where source_kind='LIVE_PG_CATALOG'),'active_crons',(select count(*) from private.c0213_active_cron_components_v01),
 'external_components',(select count(*) from private.c0213_external_components),'dependency_edges',(select count(*) from private.c0213_component_dependency_graph_v01),
 'production_effect_components',(select count(*) from inv where production_effect_enabled),
 'active_duplicate_cron_targets',(select coalesce(jsonb_agg(to_jsonb(dups)),'[]'::jsonb) from dups),
 'active_retired_external_deployments',(select n from ret_all),'active_retired_edge_deployments',(select n from ret_edge),'active_retired_api_deployments',(select n from ret_api),
 'required_capabilities_total',(select count(*) from req),'required_capabilities_missing',(select coalesce(jsonb_agg(to_jsonb(req)) filter(where implementation_status='MISSING'),'[]'::jsonb) from req),
 'required_capability_contradictions',(select coalesce(jsonb_agg(to_jsonb(req)) filter(where implementation_status='CONTRADICTION'),'[]'::jsonb) from req),
 'canonical_keys_not_found',(select coalesce(jsonb_agg(to_jsonb(missing_keys)),'[]'::jsonb) from missing_keys),
 'legacy_engine_component_versions_rows',(select count(*) from public.engine_component_versions),'legacy_research_experiment_registry_rows',(select count(*) from public.research_experiment_registry),
 'legacy_registries_authoritative',false,
 'notes',jsonb_build_array('Lifecycle is exact and separate from health/canonical status.','Behavioral PASS evidence is definition-hash bound; changing a production component invalidates its prior proof.','Tracker model-effect rows require an explicit production-consumer or research/evaluator governance pathway.','Prediction-level effect provenance is exposed separately by C0213 P4.')
);
$$;
