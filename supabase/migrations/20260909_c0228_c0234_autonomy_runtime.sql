-- C0228-C0234 autonomous FPL decision architecture runtime storage.
-- All surfaces are append-only Decision-Control/SHADOW infrastructure.
-- They cannot rewrite historical forecasts or execute external FPL changes.

create table if not exists public.fpl_squad_ensemble_runs(
  id bigserial primary key,
  change_id text not null default 'C0228',
  gameweek integer not null,
  horizon integer not null,
  captured_at timestamptz not null default now(),
  optimizer_version text not null,
  ensemble_version text not null,
  model_error_margin_points numeric not null,
  input_signature text not null unique,
  result jsonb not null,
  historical_forecasts_rewritten boolean not null default false
);
alter table public.fpl_squad_ensemble_runs enable row level security;

create or replace view public.current_fpl_squad_ensemble_v01 as
select distinct on (gameweek,horizon)
  id,change_id,gameweek,horizon,captured_at,optimizer_version,ensemble_version,
  model_error_margin_points,input_signature,result,historical_forecasts_rewritten
from public.fpl_squad_ensemble_runs
order by gameweek,horizon,captured_at desc,id desc;

create or replace function private.c0228_ensemble_status_v01(p_gameweek integer default null,p_horizon integer default 5)
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
with x as (
  select * from public.current_fpl_squad_ensemble_v01
  where (p_gameweek is null or gameweek=p_gameweek) and horizon=p_horizon
  order by captured_at desc limit 1
)
select coalesce((select jsonb_build_object(
  'ok',coalesce((result->>'ok')::boolean,false),'id',id,'gameweek',gameweek,'horizon',horizon,
  'captured_at',captured_at,'optimizer_version',optimizer_version,'ensemble_version',ensemble_version,
  'model_error_margin_points',model_error_margin_points,
  'unique_squads',result->'convergence'->'unique_squads',
  'unique_family_signatures',result->'convergence'->'unique_family_signatures',
  'top_second_gap_points',result->'convergence'->'top_second_gap_points',
  'ensemble_classification',result->>'ensemble_classification',
  'historical_forecasts_rewritten',historical_forecasts_rewritten
) from x),jsonb_build_object('ok',false,'status','NO_ENSEMBLE_RUN'));
$$;
revoke all on function private.c0228_ensemble_status_v01(integer,integer) from public,anon,authenticated;
grant execute on function private.c0228_ensemble_status_v01(integer,integer) to service_role;

create table if not exists public.fpl_structural_control_runs(
 id bigserial primary key,change_id text not null default 'C0229',gameweek int not null,horizon int not null,
 captured_at timestamptz not null default now(),ensemble_run_id bigint not null references public.fpl_squad_ensemble_runs(id),
 input_signature text not null unique,result jsonb not null,historical_forecasts_rewritten boolean not null default false
);
create table if not exists public.fpl_team_regime_diagnostic_runs(
 id bigserial primary key,change_id text not null default 'C0230',gameweek int not null,
 captured_at timestamptz not null default now(),input_signature text not null unique,result jsonb not null,
 model_effect_enabled boolean not null default false,historical_forecasts_rewritten boolean not null default false
);
create table if not exists public.fpl_forward_management_runs(
 id bigserial primary key,change_id text not null default 'C0231',gameweek int not null,horizon int not null,
 captured_at timestamptz not null default now(),ensemble_run_id bigint not null references public.fpl_squad_ensemble_runs(id),
 input_signature text not null unique,result jsonb not null,historical_forecasts_rewritten boolean not null default false
);
create table if not exists public.fpl_or_utility_runs(
 id bigserial primary key,change_id text not null default 'C0232',gameweek int not null,horizon int not null,
 captured_at timestamptz not null default now(),ensemble_run_id bigint not null references public.fpl_squad_ensemble_runs(id),
 input_signature text not null unique,result jsonb not null,historical_forecasts_rewritten boolean not null default false
);
create table if not exists public.fpl_red_team_runs(
 id bigserial primary key,change_id text not null default 'C0233',gameweek int not null,horizon int not null,
 captured_at timestamptz not null default now(),ensemble_run_id bigint not null references public.fpl_squad_ensemble_runs(id),
 structural_run_id bigint references public.fpl_structural_control_runs(id),forward_run_id bigint references public.fpl_forward_management_runs(id),
 or_utility_run_id bigint references public.fpl_or_utility_runs(id),team_regime_run_id bigint references public.fpl_team_regime_diagnostic_runs(id),
 input_signature text not null unique,result jsonb not null,historical_forecasts_rewritten boolean not null default false
);
create table if not exists public.fpl_autonomous_gate_runs(
 id bigserial primary key,change_id text not null default 'C0234',gameweek int not null,horizon int not null,
 captured_at timestamptz not null default now(),ensemble_run_id bigint references public.fpl_squad_ensemble_runs(id),
 structural_run_id bigint references public.fpl_structural_control_runs(id),forward_run_id bigint references public.fpl_forward_management_runs(id),
 or_utility_run_id bigint references public.fpl_or_utility_runs(id),red_team_run_id bigint references public.fpl_red_team_runs(id),
 team_regime_run_id bigint references public.fpl_team_regime_diagnostic_runs(id),input_signature text not null unique,
 result jsonb not null,final_status text not null,historical_forecasts_rewritten boolean not null default false
);

alter table public.fpl_structural_control_runs enable row level security;
alter table public.fpl_team_regime_diagnostic_runs enable row level security;
alter table public.fpl_forward_management_runs enable row level security;
alter table public.fpl_or_utility_runs enable row level security;
alter table public.fpl_red_team_runs enable row level security;
alter table public.fpl_autonomous_gate_runs enable row level security;

create or replace function public.c0234_c0213_readiness_bridge_v01(p_gameweek integer)
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
  select private.c0213_decision_readiness_v01(p_gameweek);
$$;
revoke all on function public.c0234_c0213_readiness_bridge_v01(integer) from public,anon,authenticated;
grant execute on function public.c0234_c0213_readiness_bridge_v01(integer) to service_role;

create or replace function private.c0234_autonomous_gate_status_v01(p_gameweek integer default null,p_horizon integer default 5)
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
with x as (
 select * from public.fpl_autonomous_gate_runs
 where (p_gameweek is null or gameweek=p_gameweek) and horizon=p_horizon
 order by captured_at desc,id desc limit 1
)
select coalesce((select jsonb_build_object('ok',true,'id',id,'gameweek',gameweek,'horizon',horizon,'captured_at',captured_at,'final_status',final_status,'result',result,'historical_forecasts_rewritten',historical_forecasts_rewritten) from x),jsonb_build_object('ok',false,'status','NO_AUTONOMOUS_GATE_RUN'));
$$;
revoke all on function private.c0234_autonomous_gate_status_v01(integer,integer) from public,anon,authenticated;
grant execute on function private.c0234_autonomous_gate_status_v01(integer,integer) to service_role;

-- Standard protected Edge invocation allowlist extended for the autonomy stack.
create or replace function private.invoke_engine_ingest(p_function text,p_body jsonb default '{}'::jsonb)
returns bigint language plpgsql security definer set search_path to 'private','public','vault','net','pg_temp' as $function$
declare v_token text;v_url text;v_request_id bigint;begin
 if p_function not in (
  'ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds','refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats','refresh-role-tactical-intelligence','ingest-historical-role-evidence','refresh-forward-fixture-forecasts','refresh-forward-enriched-predictions','probe-zero-cost-football-sources','c0206-build-pl-transfer-pairs','c0206-build-understat-foreign-pairs-v02','c0206-build-understat-older-train-v01','c0206-fit-translation-shadow-v02','ingest-realized-player-roles','fpl-full-pool-optimizer','fpl-decision-control','fpl-squad-ensemble','sync-fpl-manager-state',
  'fpl-autonomy-ensemble','fpl-structural-control','fpl-team-regime-diagnostic','fpl-forward-management','fpl-or-utility','fpl-red-team','fpl-autonomous-gate'
 ) then raise exception 'Function not allowed';end if;
 select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
 if v_token is null then raise exception 'Engine admin token missing';end if;
 v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
 select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
 return v_request_id;
end $function$;

-- Permanent acceptance surface is defined in production as
-- private.c0226_autonomy_acceptance_tests_v01(). It protects:
-- A false precision; B evidence-quality ties; C defender marginal-value benchmark;
-- D differential quality; E explosive exception discoverability; F Wildcard humility.
