create table if not exists public.research_source_capability_registry (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0139' check (change_id = 'C0139'),
  source_key text not null,
  source_name text not null,
  capability_key text not null,
  availability_status text not null check (availability_status in ('available','partial','blocked','unverified')),
  evidence_class text not null check (evidence_class in ('direct','derived','proxy','not_available','metadata')),
  current_epl_scope boolean,
  continuous_xy boolean not null default false,
  production_ready boolean not null default false,
  access_class text not null,
  terms_status text not null,
  provenance_url text not null,
  known_at timestamptz not null default now(),
  captured_at timestamptz not null default now(),
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  notes text,
  created_at timestamptz not null default now(),
  check (known_at <= captured_at)
);

create index if not exists research_source_capability_registry_source_idx
  on public.research_source_capability_registry(source_key, capability_key, captured_at desc);

create table if not exists public.research_source_access_probes (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0139' check (change_id = 'C0139'),
  source_key text not null,
  endpoint_kind text not null,
  source_url text not null,
  provider_object_id text,
  gameweek integer,
  provider_match_id text,
  match_id bigint references public.matches(id),
  http_status integer,
  ok boolean not null default false,
  parse_ok boolean not null default false,
  content_type text,
  payload_bytes bigint,
  payload_sha256 text,
  top_level_keys text[] not null default array[]::text[],
  field_presence jsonb not null default '{}'::jsonb,
  record_count integer,
  evidence_class text not null default 'metadata' check (evidence_class in ('direct','derived','proxy','metadata')),
  actual_data_used boolean not null default true,
  evidence_cutoff timestamptz not null,
  captured_at timestamptz not null default now(),
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  notes text,
  created_at timestamptz not null default now(),
  check (evidence_cutoff <= captured_at)
);

create index if not exists research_source_access_probes_source_idx
  on public.research_source_access_probes(source_key, endpoint_kind, captured_at desc);
create index if not exists research_source_access_probes_match_idx
  on public.research_source_access_probes(gameweek, provider_match_id, captured_at desc);

create or replace function private.block_c0139_source_mutation_v01()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  raise exception 'C0139 source evidence is append-only; append a new capability/probe row instead';
end;
$$;

create trigger research_source_capability_registry_append_only_v01
before update or delete on public.research_source_capability_registry
for each row execute function private.block_c0139_source_mutation_v01();

create trigger research_source_access_probes_append_only_v01
before update or delete on public.research_source_access_probes
for each row execute function private.block_c0139_source_mutation_v01();

alter table public.research_source_capability_registry enable row level security;
alter table public.research_source_access_probes enable row level security;
revoke all on public.research_source_capability_registry from public, anon, authenticated;
revoke all on public.research_source_access_probes from public, anon, authenticated;
revoke all on sequence public.research_source_capability_registry_id_seq from public, anon, authenticated;
revoke all on sequence public.research_source_access_probes_id_seq from public, anon, authenticated;

insert into public.research_source_capability_registry
(source_key,source_name,capability_key,availability_status,evidence_class,current_epl_scope,continuous_xy,production_ready,access_class,terms_status,provenance_url,known_at,captured_at,notes)
values
('fotmob_public','FotMob public/consumer surfaces','team_distance','available','direct',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/leagues/47/stats/season/36781/teams/phys_tdc_team/premier-league-teams',now(),now(),'Current EPL physical workload surface; research-only until access terms/reliability are validated.'),
('fotmob_public','FotMob public/consumer surfaces','player_sprints','available','direct',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/leagues/47/stats/season/36781/players/phys_sprints/premier-league',now(),now(),'Direct published sprint-count surface.'),
('fotmob_public','FotMob public/consumer surfaces','top_speed','available','direct',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/leagues/47/stats/season/36781/players/phys_ts/premier-league',now(),now(),'Direct published physical metric; not continuous tracking.'),
('fotmob_public','FotMob public/consumer surfaces','pressing_proxy_final_third_wins','available','proxy',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/leagues/47/stats/season/36781/teams/poss_won_att_3rd_team/premier-league-1000-teams',now(),now(),'Useful pressing-output proxy only; must never be labeled true pressure.'),
('fotmob_public','FotMob public/consumer surfaces','true_pressure','blocked','not_available',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/',now(),now(),'No continuous/direct pressure event feed established.'),
('fotmob_public','FotMob public/consumer surfaces','continuous_xy','blocked','not_available',true,false,false,'public_page/consumer_json','unverified_for_automated_production','https://www.fotmob.com/',now(),now(),'No free continuous current-EPL XY feed established.'),
('sofascore_public','SofaScore public/consumer surfaces','lineups_and_formations','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Current EPL event endpoints expose lineups/formation metadata in public consumer JSON; reliability/terms require validation.'),
('sofascore_public','SofaScore public/consumer surfaces','average_positions','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Event-time/aggregate positioning, not continuous tracking.'),
('sofascore_public','SofaScore public/consumer surfaces','shot_xy','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Useful for chance-origin research with exact provider provenance.'),
('sofascore_public','SofaScore public/consumer surfaces','player_heatmaps','available','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Aggregated spatial evidence only.'),
('sofascore_public','SofaScore public/consumer surfaces','event_xy','partial','direct',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Player action/rating-breakdown endpoints may expose event and pass-end coordinates; coverage must be proven.'),
('sofascore_public','SofaScore public/consumer surfaces','continuous_xy','blocked','not_available',true,false,false,'consumer_json','unverified_for_automated_production','https://api.sofascore.com/api/v1/unique-tournament/17/seasons',now(),now(),'Average positions/heatmaps are not full tracking.'),
('driblab_open','Driblab open tracking sample','continuous_xy','available','direct',false,true,false,'open_dataset','license_scope_to_verify_before_commercial_use','https://github.com/driblab/open-data',now(),now(),'Open research sample can validate real tracking algorithms but is not a current-season EPL production feed.'),
('driblab_open','Driblab open tracking sample','velocity_acceleration','available','direct',false,true,false,'open_dataset','license_scope_to_verify_before_commercial_use','https://github.com/driblab/open-data',now(),now(),'Supports pressure/line-height/transition algorithm development on sample matches.'),
('driblab_open','Driblab open tracking sample','line_height_algorithm_validation','available','derived',false,true,false,'open_dataset','license_scope_to_verify_before_commercial_use','https://github.com/driblab/open-data',now(),now(),'Algorithm validation only; does not close current-EPL coverage blocker.');

create or replace function private.c0139_zero_cost_source_status_v01()
returns jsonb
language sql
security definer
set search_path = public, private, pg_temp
as $$
select jsonb_build_object(
  'change_id','C0139',
  'capability_rows',(select count(*) from public.research_source_capability_registry),
  'probe_rows',(select count(*) from public.research_source_access_probes),
  'sources',(select coalesce(jsonb_agg(x order by x.source_key),'[]'::jsonb) from (
     select source_key,
            count(*) as capability_rows,
            count(*) filter (where availability_status='available') as available,
            count(*) filter (where availability_status='partial') as partial,
            count(*) filter (where availability_status='blocked') as blocked,
            bool_or(current_epl_scope) as any_current_epl_scope,
            bool_or(continuous_xy) as any_continuous_xy
     from public.research_source_capability_registry group by source_key
  ) x),
  'probe_summary',(select coalesce(jsonb_agg(x order by x.source_key,x.endpoint_kind),'[]'::jsonb) from (
     select source_key,endpoint_kind,count(*) as attempts,count(*) filter (where ok and parse_ok) as successful,
            max(captured_at) as last_captured_at
     from public.research_source_access_probes group by source_key,endpoint_kind
  ) x),
  'violations',jsonb_build_object(
     'model_effect_enabled',(select count(*) from public.research_source_capability_registry where model_effect_enabled)
       +(select count(*) from public.research_source_access_probes where model_effect_enabled),
     'not_research_only',(select count(*) from public.research_source_capability_registry where not research_only)
       +(select count(*) from public.research_source_access_probes where not research_only)
  )
);
$$;
revoke all on function private.c0139_zero_cost_source_status_v01() from public, anon, authenticated;

create or replace function private.invoke_engine_ingest(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'private', 'public', 'vault', 'net', 'pg_temp'
as $$
declare v_token text; v_url text; v_request_id bigint;
begin
  if p_function not in (
    'ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds',
    'refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats',
    'refresh-role-tactical-intelligence','ingest-historical-role-evidence','refresh-forward-fixture-forecasts',
    'refresh-forward-enriched-predictions','probe-zero-cost-football-sources'
  ) then
    raise exception 'Function not allowed';
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end
$$;