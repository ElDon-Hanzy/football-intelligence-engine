create table if not exists public.research_c0206_foreign_source_season_observations (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  season text not null,
  competition text not null,
  source_club text not null,
  is_immediate_origin boolean not null default true,
  source_name text not null,
  source_url text not null,
  source_captured_at timestamptz not null default clock_timestamp(),
  source_as_of date,
  season_complete boolean not null default false,
  matches integer,
  starts integer,
  minutes integer,
  xg numeric,
  xa numeric,
  xg90 numeric generated always as (case when minutes>0 and xg is not null then 90.0*xg/minutes end) stored,
  xa90 numeric generated always as (case when minutes>0 and xa is not null then 90.0*xa/minutes end) stored,
  identity_match_method text not null,
  identity_confidence numeric not null,
  evidence jsonb not null default '{}'::jsonb,
  research_only boolean not null default true,
  model_effect_enabled boolean not null default false,
  constraint c0206_foreign_source_effect_off check (model_effect_enabled=false),
  constraint c0206_foreign_source_identity_conf check (identity_confidence between 0 and 1),
  constraint c0206_foreign_source_minutes_nonnegative check (minutes is null or minutes>=0),
  constraint c0206_foreign_source_missing_not_zero check (not (minutes is null and (xg=0 or xa=0)))
);

create index if not exists idx_c0206_foreign_source_obs_player_time
  on public.research_c0206_foreign_source_season_observations(player_id,source_captured_at desc);
create index if not exists idx_c0206_foreign_source_obs_comp_season
  on public.research_c0206_foreign_source_season_observations(competition,season);

create or replace function private.block_c0206_foreign_source_obs_mutation_v01()
returns trigger language plpgsql as $$
begin
  raise exception 'C0206 foreign source season observations are append-only';
end $$;

drop trigger if exists trg_block_c0206_foreign_source_obs_update on public.research_c0206_foreign_source_season_observations;
create trigger trg_block_c0206_foreign_source_obs_update
before update or delete on public.research_c0206_foreign_source_season_observations
for each row execute function private.block_c0206_foreign_source_obs_mutation_v01();

create or replace function private.c0206_foreign_source_observation_status_v01()
returns jsonb
language sql stable security definer
set search_path=private,public,pg_temp
as $$
with latest as (
  select distinct on (o.player_id,o.season,o.competition,o.source_club)
    o.*,p.web_name,p.position,t.short_name destination
  from public.research_c0206_foreign_source_season_observations o
  join public.players p on p.id=o.player_id
  join public.teams t on t.id=p.team_id
  order by o.player_id,o.season,o.competition,o.source_club,o.source_captured_at desc,o.id desc
), target as (
  select * from latest where season='2025-2026'
), players as (
  select player_id,
    bool_or(is_immediate_origin) has_immediate_origin,
    bool_or(is_immediate_origin and minutes is not null and xg is not null and xa is not null) immediate_complete,
    sum(minutes) filter(where minutes is not null) all_source_minutes,
    sum(minutes) filter(where is_immediate_origin and minutes is not null) immediate_minutes,
    count(*) rows
  from target group by player_id
)
select jsonb_build_object(
  'change_id','C0206',
  'rows',(select count(*) from target),
  'players',(select count(*) from players),
  'immediate_origin_complete_players',(select count(*) from players where immediate_complete),
  'players_ge_450_immediate_minutes',(select count(*) from players where immediate_minutes>=450),
  'players_ge_900_immediate_minutes',(select count(*) from players where immediate_minutes>=900),
  'metric_missing_rows',(select count(*) from target where minutes is null or xg is null or xa is null),
  'model_effect_violations',(select count(*) from target where model_effect_enabled),
  'observations',coalesce((select jsonb_agg(jsonb_build_object(
    'player_id',player_id,'name',web_name,'destination',destination,'position',position,
    'competition',competition,'source_club',source_club,'immediate_origin',is_immediate_origin,
    'matches',matches,'starts',starts,'minutes',minutes,'xG',xg,'xA',xa,
    'xG90',round(xg90,4),'xA90',round(xa90,4),'season_complete',season_complete,
    'source_name',source_name,'identity_confidence',identity_confidence
  ) order by competition,web_name,source_club) from target),'[]'::jsonb)
);
$$;