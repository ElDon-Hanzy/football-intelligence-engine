alter table public.research_fotmob_metric_observations
  add column if not exists stat_format text,
  add column if not exists stat_fractions integer,
  add column if not exists substat_format text,
  add column if not exists substat_fractions integer;

create or replace function private.c0139_fotmob_metric_status_v01()
returns jsonb
language sql
security definer
set search_path=public,private,pg_temp
as $$
select jsonb_build_object(
 'change_id','C0139',
 'rows',(select count(*) from public.research_fotmob_metric_observations),
 'usable_rows',(select count(*) from public.research_fotmob_metric_observations where stat_value is not null),
 'legacy_null_extraction_rows',(select count(*) from public.research_fotmob_metric_observations where stat_value is null),
 'latest_capture',(select max(captured_at) from public.research_fotmob_metric_observations),
 'by_stat',(select coalesce(jsonb_agg(x order by x.stat_key),'[]'::jsonb) from (
   select stat_key,entity_type,
          count(*) as rows,
          count(*) filter(where stat_value is not null) as usable_rows,
          count(distinct provider_entity_id) filter(where stat_value is not null) as usable_entities,
          count(*) filter(where stat_value is not null and internal_team_id is not null) as usable_mapped_internal_team_rows,
          array_agg(distinct stat_format) filter(where stat_format is not null) as stat_formats,
          max(captured_at) as latest_capture
   from public.research_fotmob_metric_observations group by stat_key,entity_type
 ) x),
 'integrity_violations',jsonb_build_object(
   'model_effect_enabled',(select count(*) from public.research_fotmob_metric_observations where model_effect_enabled),
   'not_research_only',(select count(*) from public.research_fotmob_metric_observations where not research_only)
 )
);
$$;
revoke all on function private.c0139_fotmob_metric_status_v01() from public,anon,authenticated;