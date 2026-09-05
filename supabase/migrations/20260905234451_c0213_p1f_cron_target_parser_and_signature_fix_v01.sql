create or replace view private.c0213_active_cron_components_v01 as
with x as (
 select j.*,
  coalesce(
    (pg_catalog.regexp_match(j.command,'/functions/v1/([a-z0-9_-]+)','i'))[1],
    (pg_catalog.regexp_match(j.command,'invoke_engine_ingest\s*\(\s*''([^'']+)''','i'))[1]
  ) as edge_target,
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

update private.c0213_required_capabilities
set canonical_component_key='DB_FUNCTION:private.refresh_current_season_team_performance_v01(p_season_start integer, p_as_of timestamp with time zone)',updated_at=clock_timestamp()
where capability_key='CURRENT_SEASON_TEAM_STATE';