create table if not exists private.c0213_component_overrides (
  object_kind text not null,
  object_schema text not null,
  object_name text not null,
  lifecycle text not null check (lifecycle in ('PRODUCTION','SHADOW','RESEARCH','UI_ONLY','INFRASTRUCTURE','RETIRED')),
  capability_key text,
  canonical_status text not null default 'SUPPORTING' check (canonical_status in ('CANONICAL','SUPPORTING','DUPLICATE','LEGACY_ROLLBACK','ORPHANED','CANDIDATE','REJECTED')),
  canonical_component_key text,
  production_effect_enabled boolean not null default false,
  active_override boolean,
  change_id text,
  rationale text not null,
  evidence jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default clock_timestamp(),
  primary key (object_kind, object_schema, object_name)
);

create table if not exists private.c0213_external_components (
  component_key text primary key,
  component_name text not null,
  component_kind text not null check (component_kind in ('EDGE_FUNCTION','API','UI','WORKFLOW','LOGICAL')),
  lifecycle text not null check (lifecycle in ('PRODUCTION','SHADOW','RESEARCH','UI_ONLY','INFRASTRUCTURE','RETIRED')),
  capability_key text,
  canonical_status text not null default 'SUPPORTING' check (canonical_status in ('CANONICAL','SUPPORTING','DUPLICATE','LEGACY_ROLLBACK','ORPHANED','CANDIDATE','REJECTED')),
  canonical_component_key text,
  production_effect_enabled boolean not null default false,
  active boolean not null default true,
  deployment_status text,
  runtime_version integer,
  repo_path text,
  source_locator jsonb not null default '{}'::jsonb,
  change_id text,
  notes text,
  evidence jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

create table if not exists private.c0213_manual_dependency_edges (
  consumer_component_key text not null,
  provider_component_key text not null,
  dependency_type text not null,
  effect_scope text not null default 'ORCHESTRATION',
  active boolean not null default true,
  evidence jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default clock_timestamp(),
  primary key (consumer_component_key, provider_component_key, dependency_type)
);

create table if not exists private.c0213_required_capabilities (
  capability_key text primary key,
  pipeline text not null check (pipeline in ('PRODUCTION','RESEARCH')),
  stage_order integer not null,
  stage_name text not null,
  required_for_decision boolean not null default false,
  canonical_component_key text,
  implementation_status text not null check (implementation_status in ('IMPLEMENTED','SPLIT','MISSING','CONTRADICTION')),
  notes text,
  updated_at timestamptz not null default clock_timestamp()
);

revoke all on table private.c0213_component_overrides from public, anon, authenticated;
revoke all on table private.c0213_external_components from public, anon, authenticated;
revoke all on table private.c0213_manual_dependency_edges from public, anon, authenticated;
revoke all on table private.c0213_required_capabilities from public, anon, authenticated;
grant select, insert, update on table private.c0213_component_overrides to service_role;
grant select, insert, update on table private.c0213_external_components to service_role;
grant select, insert, update on table private.c0213_manual_dependency_edges to service_role;
grant select, insert, update on table private.c0213_required_capabilities to service_role;

create or replace view private.c0213_db_component_inventory_v01 as
with base as (
  select 'DB_RELATION'::text as object_kind,n.nspname::text as object_schema,c.relname::text as object_name,null::text as identity_args,c.oid as object_oid,
    ('DB_RELATION:'||n.nspname||'.'||c.relname)::text as component_key,
    case c.relkind when 'r' then 'TABLE' when 'p' then 'PARTITIONED_TABLE' when 'v' then 'VIEW' when 'm' then 'MATERIALIZED_VIEW' else 'RELATION' end::text as component_kind,
    case when c.relname ~* '(matchup_predictive|forward_enriched|walk_forward|shadow|research_c0197_.*forward)' then 'SHADOW'
         when c.relname ~* '(^research_|benchmark|ablation|replay|experiment|promotion_gate)' then 'RESEARCH'
         else 'INFRASTRUCTURE' end::text as default_lifecycle
  from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','private') and c.relkind in ('r','p','v','m')
  union all
  select 'DB_FUNCTION'::text,n.nspname::text,p.proname::text,pg_catalog.pg_get_function_identity_arguments(p.oid)::text,p.oid,
    ('DB_FUNCTION:'||n.nspname||'.'||p.proname||'('||pg_catalog.pg_get_function_identity_arguments(p.oid)||')')::text,
    'DB_FUNCTION'::text,
    case when p.proname ~* '(a0005|w0002|matchup_predictive|c0197_.*(shootout_forward|regime_shadow)|forward_enriched|shadow)' then 'SHADOW'
         when p.proname ~* '(c0206|c0202|research|benchmark|ablation|replay|validation|experiment|promotion_gate)' then 'RESEARCH'
         else 'INFRASTRUCTURE' end::text
  from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','private')
)
select b.component_key,(b.object_schema||'.'||b.object_name)::text as component_name,b.component_kind,
  coalesce(o.lifecycle,b.default_lifecycle)::text as lifecycle,
  coalesce(o.capability_key,case when b.object_kind='DB_FUNCTION' then 'DB_ROUTINE' else 'DB_STORAGE_OR_VIEW' end)::text as capability_key,
  coalesce(o.canonical_status,'SUPPORTING')::text as canonical_status,o.canonical_component_key,
  coalesce(o.production_effect_enabled,false) as production_effect_enabled,coalesce(o.active_override,true) as active,
  'LIVE_PG_CATALOG'::text as source_kind,b.object_schema,b.object_name,b.identity_args,
  jsonb_build_object('oid',b.object_oid,'discovered_from','pg_catalog') as source_locator,o.change_id,o.rationale,coalesce(o.evidence,'{}'::jsonb) as evidence
from base b left join private.c0213_component_overrides o on o.object_kind=b.object_kind and o.object_schema=b.object_schema and o.object_name=b.object_name;

create or replace view private.c0213_active_cron_components_v01 as
with x as (
 select j.*,(pg_catalog.regexp_match(j.command,'/functions/v1/([a-z0-9_-]+)','i'))[1] as edge_target,
  (pg_catalog.regexp_match(j.command,'((?:private|public)\.[a-zA-Z0-9_]+)\s*\(','i'))[1] as db_target
 from cron.job j where j.active
), g as (
 select x.*,coalesce(edge_target,db_target,md5(command)) as invocation_group,
  count(*) over(partition by coalesce(edge_target,db_target,md5(command))) as group_count,
  max(jobid) over(partition by coalesce(edge_target,db_target,md5(command))) as canonical_jobid
 from x
)
select ('CRON:'||g.jobid)::text as component_key,('cron.job '||g.jobid)::text as component_name,'CRON'::text as component_kind,
 case when g.command ~* '(a0005|w0002|matchup_predictive|c0197|forward-enriched)' then 'SHADOW'
      when g.command ~* '(c0202|c0206|research)' then 'RESEARCH' else 'INFRASTRUCTURE' end::text as lifecycle,
 ('SCHEDULE:'||coalesce(g.edge_target,g.db_target,'SQL'))::text as capability_key,
 case when g.group_count>1 and g.jobid<>g.canonical_jobid then 'DUPLICATE' else 'CANONICAL' end::text as canonical_status,
 case when g.group_count>1 and g.jobid<>g.canonical_jobid then ('CRON:'||g.canonical_jobid)::text else null end as canonical_component_key,
 false as production_effect_enabled,true as active,'LIVE_PG_CRON'::text as source_kind,'cron'::text as object_schema,g.jobid::text as object_name,null::text as identity_args,
 jsonb_build_object('jobid',g.jobid,'schedule',g.schedule,'command',g.command,'edge_target',g.edge_target,'db_target',g.db_target,'duplicate_target_count',g.group_count) as source_locator,
 null::text as change_id,case when g.group_count>1 then 'Multiple active cron jobs invoke the same discovered target.' else null end::text as rationale,
 jsonb_build_object('invocation_group',g.invocation_group) as evidence
from g;
