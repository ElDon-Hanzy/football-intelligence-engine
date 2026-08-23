-- Role / Tactical Intelligence v0.1 storage, chronology guards, helpers and backend allowlist.
-- All signals are observational only until forward validation enables a later model effect.

create table if not exists public.player_role_profile_observations (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  observed_at timestamptz not null default now(),
  evidence_cutoff timestamptz not null,
  taxonomy_version text not null default 'event_role_v0.1',
  primary_role text,
  secondary_role text,
  primary_score numeric,
  secondary_score numeric,
  confidence numeric,
  weighted_minutes numeric,
  competitive_minutes numeric,
  preseason_minutes numeric,
  feature_vector jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check (model_effect_enabled = false),
  unique (player_id, observation_hash)
);
create index if not exists player_role_profile_obs_player_time_idx on public.player_role_profile_observations(player_id, observed_at desc);
alter table public.player_role_profile_observations enable row level security;
revoke all on public.player_role_profile_observations from anon, authenticated;
grant select, insert on public.player_role_profile_observations to service_role;

create table if not exists public.team_tactical_profile_observations (
  id bigserial primary key,
  team_id bigint not null references public.teams(id),
  observed_at timestamptz not null default now(),
  evidence_cutoff timestamptz not null,
  taxonomy_version text not null default 'team_style_v0.1.1',
  style_label text,
  possession_control_score numeric,
  directness_score numeric,
  width_score numeric,
  box_pressure_score numeric,
  set_piece_score numeric,
  defensive_block_score numeric,
  confidence numeric,
  weighted_matches numeric,
  competitive_matches integer,
  preseason_matches integer,
  feature_vector jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check (model_effect_enabled = false),
  unique (team_id, observation_hash)
);
create index if not exists team_tactical_profile_obs_team_time_idx on public.team_tactical_profile_observations(team_id, observed_at desc);
alter table public.team_tactical_profile_observations enable row level security;
revoke all on public.team_tactical_profile_observations from anon, authenticated;
grant select, insert on public.team_tactical_profile_observations to service_role;

create table if not exists public.player_fixture_role_observations (
  id bigserial primary key,
  match_id bigint not null references public.matches(id),
  gameweek integer,
  team_id bigint not null references public.teams(id),
  opponent_team_id bigint not null references public.teams(id),
  player_id bigint not null references public.players(id),
  kickoff_time timestamptz not null,
  captured_at timestamptz not null default now(),
  profile_observed_at timestamptz,
  taxonomy_version text not null default 'event_role_v0.1',
  primary_role text,
  secondary_role text,
  primary_score numeric,
  secondary_score numeric,
  expected_xi boolean,
  availability_status text,
  confidence numeric,
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check (model_effect_enabled = false),
  unique (match_id, player_id, observation_hash)
);
create index if not exists player_fixture_role_match_time_idx on public.player_fixture_role_observations(match_id, captured_at desc);
create index if not exists player_fixture_role_player_time_idx on public.player_fixture_role_observations(player_id, captured_at desc);
alter table public.player_fixture_role_observations enable row level security;
revoke all on public.player_fixture_role_observations from anon, authenticated;
grant select, insert on public.player_fixture_role_observations to service_role;

create table if not exists public.team_fixture_tactical_observations (
  id bigserial primary key,
  match_id bigint not null references public.matches(id),
  gameweek integer,
  team_id bigint not null references public.teams(id),
  opponent_team_id bigint not null references public.teams(id),
  kickoff_time timestamptz not null,
  captured_at timestamptz not null default now(),
  profile_observed_at timestamptz,
  taxonomy_version text not null default 'team_style_v0.1.1',
  style_label text,
  possession_control_score numeric,
  directness_score numeric,
  width_score numeric,
  box_pressure_score numeric,
  set_piece_score numeric,
  defensive_block_score numeric,
  confidence numeric,
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check (model_effect_enabled = false),
  unique (match_id, team_id, observation_hash)
);
create index if not exists team_fixture_tactical_match_time_idx on public.team_fixture_tactical_observations(match_id, captured_at desc);
alter table public.team_fixture_tactical_observations enable row level security;
revoke all on public.team_fixture_tactical_observations from anon, authenticated;
grant select, insert on public.team_fixture_tactical_observations to service_role;

create or replace function private.guard_role_tactical_fixture_preko()
returns trigger
language plpgsql
set search_path = private, public, pg_temp
as $$
declare m record;
begin
  select id,kickoff_time,home_team_id,away_team_id into m from public.matches where id=new.match_id;
  if not found then raise exception 'match not found'; end if;
  if new.kickoff_time is distinct from m.kickoff_time then raise exception 'kickoff mismatch'; end if;
  if new.captured_at >= m.kickoff_time or now() >= m.kickoff_time then raise exception 'fixture intelligence frozen at kickoff'; end if;
  if not ((new.team_id=m.home_team_id and new.opponent_team_id=m.away_team_id) or (new.team_id=m.away_team_id and new.opponent_team_id=m.home_team_id)) then raise exception 'team/opponent mismatch'; end if;
  return new;
end $$;
revoke all on function private.guard_role_tactical_fixture_preko() from public,anon,authenticated;

drop trigger if exists trg_player_fixture_role_preko on public.player_fixture_role_observations;
create trigger trg_player_fixture_role_preko before insert or update on public.player_fixture_role_observations for each row execute function private.guard_role_tactical_fixture_preko();
drop trigger if exists trg_team_fixture_tactical_preko on public.team_fixture_tactical_observations;
create trigger trg_team_fixture_tactical_preko before insert or update on public.team_fixture_tactical_observations for each row execute function private.guard_role_tactical_fixture_preko();

create or replace view public.current_player_role_profiles with (security_invoker=true) as
select distinct on (player_id) * from public.player_role_profile_observations order by player_id,observed_at desc,id desc;
create or replace view public.current_team_tactical_profiles with (security_invoker=true) as
select distinct on (team_id) * from public.team_tactical_profile_observations order by team_id,observed_at desc,id desc;
create or replace view public.current_player_fixture_roles with (security_invoker=true) as
select distinct on (match_id,player_id) * from public.player_fixture_role_observations order by match_id,player_id,captured_at desc,id desc;
create or replace view public.current_team_fixture_tactics with (security_invoker=true) as
select distinct on (match_id,team_id) * from public.team_fixture_tactical_observations order by match_id,team_id,captured_at desc,id desc;
revoke all on public.current_player_role_profiles,public.current_team_tactical_profiles,public.current_player_fixture_roles,public.current_team_fixture_tactics from anon,authenticated;
grant select on public.current_player_role_profiles,public.current_team_tactical_profiles,public.current_player_fixture_roles,public.current_team_fixture_tactics to service_role;

create or replace function private.json_num(p jsonb,k text)
returns numeric
language plpgsql
immutable
strict
set search_path=pg_catalog
as $$
declare v text;
begin
  v:=nullif(btrim(p->>k),'');
  if v is null then return null; end if;
  begin return v::numeric; exception when others then return null; end;
end $$;
revoke all on function private.json_num(jsonb,text) from public,anon,authenticated;
grant execute on function private.json_num(jsonb,text) to service_role;

create or replace function private.unit_score(v numeric,c numeric)
returns numeric
language sql
immutable
strict
set search_path=pg_catalog
as $$ select greatest(0::numeric,least(1::numeric,v/nullif(v+c,0))) $$;
revoke all on function private.unit_score(numeric,numeric) from public,anon,authenticated;
grant execute on function private.unit_score(numeric,numeric) to service_role;

create or replace function private.invoke_engine_ingest(p_function text,p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path=private,public,vault,net,pg_temp
as $$
declare v_token text;v_url text;v_request_id bigint;
begin
  if p_function not in ('ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds','refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats','refresh-role-tactical-intelligence') then raise exception 'Function not allowed'; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end $$;
revoke all on function private.invoke_engine_ingest(text,jsonb) from public,anon,authenticated;
grant execute on function private.invoke_engine_ingest(text,jsonb) to postgres,service_role;
