create table if not exists public.research_fotmob_metric_observations (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0139' check (change_id='C0139'),
  source_key text not null default 'fotmob_public' check (source_key='fotmob_public'),
  league_id integer not null,
  season_id integer not null,
  entity_type text not null check (entity_type in ('team','player')),
  stat_key text not null,
  provider_entity_id text not null,
  provider_team_id text,
  internal_team_id bigint references public.teams(id),
  entity_name text not null,
  position text,
  stat_value numeric,
  substat_value numeric,
  rank integer,
  source_url text not null,
  payload_sha256 text not null,
  observation_hash text not null unique,
  actual_data_used boolean not null default true,
  evidence_cutoff timestamptz not null,
  captured_at timestamptz not null default now(),
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  mapping_method text,
  notes text,
  created_at timestamptz not null default now(),
  check (evidence_cutoff <= captured_at)
);
create index if not exists research_fotmob_metric_observations_stat_idx on public.research_fotmob_metric_observations(stat_key,captured_at desc);
create index if not exists research_fotmob_metric_observations_team_idx on public.research_fotmob_metric_observations(internal_team_id,captured_at desc) where internal_team_id is not null;
create index if not exists research_fotmob_metric_observations_provider_idx on public.research_fotmob_metric_observations(provider_entity_id,stat_key,captured_at desc);

create trigger research_fotmob_metric_observations_append_only_v01
before update or delete on public.research_fotmob_metric_observations
for each row execute function private.block_c0139_source_mutation_v01();

alter table public.research_fotmob_metric_observations enable row level security;
revoke all on public.research_fotmob_metric_observations from public, anon, authenticated;
revoke all on sequence public.research_fotmob_metric_observations_id_seq from public, anon, authenticated;

create or replace function private.c0139_fotmob_metric_status_v01()
returns jsonb
language sql
security definer
set search_path=public,private,pg_temp
as $$
select jsonb_build_object(
 'change_id','C0139',
 'rows',(select count(*) from public.research_fotmob_metric_observations),
 'latest_capture',(select max(captured_at) from public.research_fotmob_metric_observations),
 'by_stat',(select coalesce(jsonb_agg(x order by x.stat_key),'[]'::jsonb) from (
   select stat_key,entity_type,count(*) as rows,count(distinct provider_entity_id) as entities,
          count(*) filter(where internal_team_id is not null) as mapped_internal_team_rows,
          max(captured_at) as latest_capture
   from public.research_fotmob_metric_observations group by stat_key,entity_type
 ) x),
 'violations',jsonb_build_object(
   'model_effect_enabled',(select count(*) from public.research_fotmob_metric_observations where model_effect_enabled),
   'not_research_only',(select count(*) from public.research_fotmob_metric_observations where not research_only),
   'missing_values',(select count(*) from public.research_fotmob_metric_observations where stat_value is null)
 )
);
$$;
revoke all on function private.c0139_fotmob_metric_status_v01() from public,anon,authenticated;