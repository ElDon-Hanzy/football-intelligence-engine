insert into public.research_source_capability_registry
(source_key,source_name,capability_key,availability_status,evidence_class,current_epl_scope,continuous_xy,production_ready,access_class,terms_status,provenance_url,known_at,captured_at,notes)
values
('sofascore_public','SofaScore public/consumer surfaces','lineups_and_formations','blocked','direct',true,false,false,'consumer_json','runtime_http_403_and_terms_unverified','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Supabase Edge runtime returned HTTP 403 on both season discovery and EPL round-event discovery. Browser/community visibility is not operational server-side access; unattended ingestion is blocked.'),
('sofascore_public','SofaScore public/consumer surfaces','average_positions','blocked','direct',true,false,false,'consumer_json','runtime_http_403_and_terms_unverified','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Upstream discovery is HTTP 403 from production runtime, so downstream average-position ingestion is not operational.'),
('sofascore_public','SofaScore public/consumer surfaces','shot_xy','blocked','direct',true,false,false,'consumer_json','runtime_http_403_and_terms_unverified','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Upstream discovery is HTTP 403 from production runtime, so shot-map ingestion is not operational.'),
('sofascore_public','SofaScore public/consumer surfaces','player_heatmaps','blocked','direct',true,false,false,'consumer_json','runtime_http_403_and_terms_unverified','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Upstream discovery is HTTP 403 from production runtime, so heatmap ingestion is not operational.'),
('sofascore_public','SofaScore public/consumer surfaces','event_xy','blocked','direct',true,false,false,'consumer_json','runtime_http_403_and_terms_unverified','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Previously research-visible/partial; production runtime discovery is HTTP 403, therefore automated event-XY ingestion is blocked.'),
('fotmob_public','FotMob public/consumer surfaces','player_distance','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://www.fotmob.com/api/data/leagueseasondeepstats?id=47&season=36781&type=players&stat=phys_tdc',now(),now(),'Production runtime HTTP 200; 310 current-EPL player rows normalized with provider-native meter format.'),
('fotmob_public','FotMob public/consumer surfaces','player_distance_per_90','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://www.fotmob.com/api/data/leagueseasondeepstats?id=47&season=36781&type=players&stat=phys_tdc_per_90',now(),now(),'Production runtime HTTP 200; 129 current-EPL player rows normalized with provider-native meter format.');

create or replace view private.c0139_latest_source_capabilities_v01 as
select distinct on (source_key, capability_key)
  id,source_key,source_name,capability_key,availability_status,evidence_class,
  current_epl_scope,continuous_xy,production_ready,access_class,terms_status,
  provenance_url,known_at,captured_at,notes
from public.research_source_capability_registry
order by source_key,capability_key,captured_at desc,id desc;

revoke all on private.c0139_latest_source_capabilities_v01 from public,anon,authenticated;

create or replace function private.c0139_zero_cost_source_status_v01()
returns jsonb
language sql
security definer
set search_path = public, private, pg_temp
as $$
select jsonb_build_object(
  'change_id','C0139',
  'capability_rows_total',(select count(*) from public.research_source_capability_registry),
  'latest_capabilities',(select count(*) from private.c0139_latest_source_capabilities_v01),
  'probe_rows',(select count(*) from public.research_source_access_probes),
  'sources',(select coalesce(jsonb_agg(x order by x.source_key),'[]'::jsonb) from (
     select source_key,
            count(*) as latest_capability_rows,
            count(*) filter (where availability_status='available') as available,
            count(*) filter (where availability_status='partial') as partial,
            count(*) filter (where availability_status='blocked') as blocked,
            bool_or(current_epl_scope) as any_current_epl_scope,
            bool_or(continuous_xy) as any_continuous_xy,
            bool_or(production_ready) as any_production_ready
     from private.c0139_latest_source_capabilities_v01 group by source_key
  ) x),
  'probe_summary',(select coalesce(jsonb_agg(x order by x.source_key,x.endpoint_kind),'[]'::jsonb) from (
     select source_key,endpoint_kind,count(*) as attempts,count(*) filter (where ok and parse_ok) as successful,
            max(captured_at) as last_captured_at
     from public.research_source_access_probes group by source_key,endpoint_kind
  ) x),
  'integrity_violations',jsonb_build_object(
     'model_effect_enabled',(select count(*) from public.research_source_capability_registry where model_effect_enabled)
       +(select count(*) from public.research_source_access_probes where model_effect_enabled),
     'not_research_only',(select count(*) from public.research_source_capability_registry where not research_only)
       +(select count(*) from public.research_source_access_probes where not research_only)
  )
);
$$;
revoke all on function private.c0139_zero_cost_source_status_v01() from public, anon, authenticated;