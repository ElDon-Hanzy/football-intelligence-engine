-- Role/Tactical Intelligence v0.2 research storage.
-- Internal, observational, append-only research. No model effects.

create table if not exists public.historical_player_event_evidence (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  player_code integer not null,
  season text not null,
  source text not null default 'fpl_core_insights_premier_league',
  source_player_id integer,
  source_match_id text not null,
  gameweek integer,
  minutes integer,
  started boolean,
  raw jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  constraint historical_player_event_evidence_unique unique(source,season,source_match_id,player_id)
);
create index if not exists hp_event_evidence_player_idx on public.historical_player_event_evidence(player_id,season,gameweek);
alter table public.historical_player_event_evidence enable row level security;
revoke all on public.historical_player_event_evidence from anon,authenticated;
revoke update,delete,truncate on public.historical_player_event_evidence from service_role;
grant select,insert on public.historical_player_event_evidence to service_role;
grant usage,select on sequence public.historical_player_event_evidence_id_seq to service_role;

create table if not exists public.player_role_validation_observations (
  id bigserial primary key,
  match_id bigint not null references public.matches(id),
  gameweek integer,
  player_id bigint not null references public.players(id),
  pre_match_role_observation_id bigint not null references public.player_fixture_role_observations(id),
  predicted_taxonomy_version text not null,
  predicted_primary_role text,
  realized_vector jsonb not null default '{}'::jsonb,
  axis_similarity numeric check(axis_similarity is null or (axis_similarity>=0 and axis_similarity<=1)),
  exact_label_match boolean,
  validated_at timestamptz not null default now(),
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check(model_effect_enabled=false),
  constraint player_role_validation_unique unique(match_id,player_id,observation_hash)
);
create index if not exists role_validation_player_match_idx on public.player_role_validation_observations(player_id,match_id,validated_at desc);
create index if not exists role_validation_pre_role_obs_idx on public.player_role_validation_observations(pre_match_role_observation_id);
alter table public.player_role_validation_observations enable row level security;
revoke all on public.player_role_validation_observations from anon,authenticated;
revoke update,delete,truncate on public.player_role_validation_observations from service_role;
grant select,insert on public.player_role_validation_observations to service_role;
grant usage,select on sequence public.player_role_validation_observations_id_seq to service_role;

create table if not exists public.player_replacement_quality_observations (
  id bigserial primary key,
  match_id bigint not null references public.matches(id),
  gameweek integer,
  team_id bigint not null references public.teams(id),
  opponent_team_id bigint not null references public.teams(id),
  target_player_id bigint not null references public.players(id),
  candidate_player_id bigint not null references public.players(id),
  kickoff_time timestamptz not null,
  captured_at timestamptz not null default now(),
  target_role_profile_id bigint references public.player_role_profile_observations(id),
  candidate_role_profile_id bigint references public.player_role_profile_observations(id),
  target_availability_observation_id bigint references public.player_fixture_availability_observations(id),
  candidate_availability_observation_id bigint references public.player_fixture_availability_observations(id),
  target_primary_role text,
  candidate_primary_role text,
  role_fit_score numeric check(role_fit_score is null or (role_fit_score>=0 and role_fit_score<=1)),
  production_continuity_score numeric check(production_continuity_score is null or (production_continuity_score>=0 and production_continuity_score<=1)),
  composite_score numeric check(composite_score is null or (composite_score>=0 and composite_score<=1)),
  candidate_rank integer,
  quality_status text not null check(quality_status in ('PROXY_NOT_VALIDATED','ROLE_FIT_ONLY','INSUFFICIENT_ROLE_EVIDENCE','NO_RELIABLE_MATCH')),
  confidence numeric check(confidence is null or (confidence>=0 and confidence<=1)),
  evidence jsonb not null default '{}'::jsonb,
  observation_hash text not null,
  model_effect_enabled boolean not null default false check(model_effect_enabled=false),
  constraint player_replacement_quality_unique unique(match_id,target_player_id,candidate_player_id,observation_hash)
);
create index if not exists replacement_quality_match_target_idx on public.player_replacement_quality_observations(match_id,target_player_id,captured_at desc);
create index if not exists replacement_quality_team_idx on public.player_replacement_quality_observations(team_id);
create index if not exists replacement_quality_opponent_idx on public.player_replacement_quality_observations(opponent_team_id);
create index if not exists replacement_quality_target_player_idx on public.player_replacement_quality_observations(target_player_id);
create index if not exists replacement_quality_candidate_player_idx on public.player_replacement_quality_observations(candidate_player_id);
create index if not exists replacement_quality_target_role_profile_idx on public.player_replacement_quality_observations(target_role_profile_id);
create index if not exists replacement_quality_candidate_role_profile_idx on public.player_replacement_quality_observations(candidate_role_profile_id);
create index if not exists replacement_quality_target_availability_idx on public.player_replacement_quality_observations(target_availability_observation_id);
create index if not exists replacement_quality_candidate_availability_idx on public.player_replacement_quality_observations(candidate_availability_observation_id);
alter table public.player_replacement_quality_observations enable row level security;
revoke all on public.player_replacement_quality_observations from anon,authenticated;
revoke update,delete,truncate on public.player_replacement_quality_observations from service_role;
grant select,insert on public.player_replacement_quality_observations to service_role;
grant usage,select on sequence public.player_replacement_quality_observations_id_seq to service_role;

drop trigger if exists trg_player_replacement_quality_preko on public.player_replacement_quality_observations;
create trigger trg_player_replacement_quality_preko before insert or update on public.player_replacement_quality_observations for each row execute function private.guard_role_tactical_fixture_preko();

create or replace view public.current_player_replacement_quality with (security_invoker=true) as
select distinct on (match_id,target_player_id,candidate_player_id) *
from public.player_replacement_quality_observations
where evidence->>'method'='replacement_proxy_v0.1.1'
order by match_id,target_player_id,candidate_player_id,captured_at desc,id desc;

create or replace view public.current_best_replacement_quality with (security_invoker=true) as
select distinct on (match_id,target_player_id) *
from public.current_player_replacement_quality
order by match_id,target_player_id,case when composite_score is null then 1 else 0 end,composite_score desc nulls last,candidate_rank asc nulls last,captured_at desc,id desc;
revoke all on public.current_player_replacement_quality,public.current_best_replacement_quality from anon,authenticated;
grant select on public.current_player_replacement_quality,public.current_best_replacement_quality to service_role;

create or replace function private.invoke_engine_ingest(p_function text,p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path=private,public,vault,net,pg_temp
as $$
declare v_token text; v_url text; v_request_id bigint;
begin
  if p_function not in ('ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds','refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats','refresh-role-tactical-intelligence','ingest-historical-role-evidence') then
    raise exception 'Function not allowed';
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end $$;
revoke all on function private.invoke_engine_ingest(text,jsonb) from public,anon,authenticated;
grant execute on function private.invoke_engine_ingest(text,jsonb) to postgres,service_role;
