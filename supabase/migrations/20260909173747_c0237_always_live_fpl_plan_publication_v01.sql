create table if not exists public.fpl_live_plan_publications (
  id bigint generated always as identity primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  horizon integer not null check (horizon between 1 and 8),
  captured_at timestamptz not null default now(),
  publication_stage text not null check (publication_stage in ('PRE_FINAL','FINAL')),
  publication_status text not null check (publication_status in ('PROVISIONAL','CONTESTED','FINAL')),
  final_status text,
  execution_authorized boolean not null default false,
  prediction_run_id bigint,
  manager_state_id bigint,
  optimizer_run_id bigint,
  autonomous_gate_run_id bigint,
  plan jsonb not null,
  alternatives jsonb not null default '[]'::jsonb,
  research_inputs jsonb not null default '{}'::jsonb,
  blockers jsonb not null default '[]'::jsonb,
  freshness jsonb not null default '{}'::jsonb,
  layer_lineage jsonb not null default '{}'::jsonb,
  input_signature text not null unique,
  source text not null default 'C0237_ALWAYS_LIVE_PLAN_V01',
  historical_forecasts_rewritten boolean not null default false,
  constraint fpl_live_plan_publications_execution_gate check (
    (execution_authorized = false) or (publication_status = 'FINAL' and publication_stage = 'FINAL' and final_status = 'FINAL_AUTONOMOUS_DECISION')
  ),
  constraint fpl_live_plan_publications_no_history_rewrite check (historical_forecasts_rewritten = false)
);

create index if not exists fpl_live_plan_publications_gw_latest_idx
  on public.fpl_live_plan_publications (gameweek, captured_at desc, id desc);

alter table public.fpl_live_plan_publications enable row level security;

create or replace function private.block_fpl_live_plan_publication_mutation_v01()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  raise exception 'fpl_live_plan_publications is append-only';
end;
$$;

drop trigger if exists trg_block_fpl_live_plan_publication_mutation_v01 on public.fpl_live_plan_publications;
create trigger trg_block_fpl_live_plan_publication_mutation_v01
before update or delete on public.fpl_live_plan_publications
for each row execute function private.block_fpl_live_plan_publication_mutation_v01();

create or replace view public.current_fpl_live_plan_v01
with (security_invoker = true)
as
select distinct on (gameweek)
  id, gameweek, horizon, captured_at, publication_stage, publication_status,
  final_status, execution_authorized, prediction_run_id, manager_state_id,
  optimizer_run_id, autonomous_gate_run_id, plan, alternatives, research_inputs,
  blockers, freshness, layer_lineage, input_signature, source,
  historical_forecasts_rewritten
from public.fpl_live_plan_publications
order by gameweek, captured_at desc, id desc;

create or replace function private.c0237_publish_current_fpl_plan_v01(
  p_gameweek integer,
  p_horizon integer default 5
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  v_optimizer public.fpl_full_pool_optimizer_runs%rowtype;
  v_manager public.fpl_manager_state_snapshots%rowtype;
  v_gate public.fpl_autonomous_gate_runs%rowtype;
  v_ensemble public.fpl_squad_ensemble_runs%rowtype;
  v_structural public.fpl_structural_control_runs%rowtype;
  v_forward public.fpl_forward_management_runs%rowtype;
  v_or public.fpl_or_utility_runs%rowtype;
  v_red public.fpl_red_team_runs%rowtype;
  v_regime public.fpl_team_regime_diagnostic_runs%rowtype;
  v_prefinal record;
  v_recommended jsonb;
  v_gw_plan jsonb;
  v_bench jsonb := '[]'::jsonb;
  v_alternatives jsonb := '[]'::jsonb;
  v_research_registry jsonb := '[]'::jsonb;
  v_parity_research jsonb := '[]'::jsonb;
  v_research jsonb := '{}'::jsonb;
  v_readiness jsonb;
  v_plan jsonb;
  v_freshness jsonb;
  v_lineage jsonb;
  v_blockers jsonb := '[]'::jsonb;
  v_stage text := 'PRE_FINAL';
  v_status text := 'PROVISIONAL';
  v_authorized boolean := false;
  v_signature text;
  v_id bigint;
  v_latest_player_state timestamptz;
  v_latest_price_state timestamptz;
  v_freshness_state text;
begin
  if p_gameweek is null or p_gameweek not between 1 and 38 then
    raise exception 'invalid gameweek %', p_gameweek;
  end if;

  select * into v_manager
  from public.fpl_manager_state_snapshots
  where gameweek = p_gameweek
  order by captured_at desc, id desc limit 1;

  select * into v_prefinal
  from public.current_fpl_prefinal_snapshot_v01
  where gameweek = p_gameweek
  limit 1;

  select * into v_optimizer
  from public.fpl_full_pool_optimizer_runs
  where gameweek = p_gameweek
    and evidence ? 'recommended_by_noise_gate'
    and evidence->'recommended_by_noise_gate' is not null
  order by captured_at desc, id desc limit 1;

  select * into v_ensemble from public.fpl_squad_ensemble_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;
  select * into v_structural from public.fpl_structural_control_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;
  select * into v_forward from public.fpl_forward_management_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;
  select * into v_or from public.fpl_or_utility_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;
  select * into v_red from public.fpl_red_team_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;
  select * into v_regime from public.fpl_team_regime_diagnostic_runs
  where gameweek=p_gameweek order by captured_at desc,id desc limit 1;
  select * into v_gate from public.fpl_autonomous_gate_runs
  where gameweek=p_gameweek and horizon=p_horizon order by captured_at desc,id desc limit 1;

  if v_optimizer.id is null or v_prefinal.prediction_run_id is null or v_manager.id is null
     or v_ensemble.id is null or v_structural.id is null or v_forward.id is null
     or v_or.id is null or v_red.id is null or v_gate.id is null then
    return jsonb_build_object(
      'ok', false,
      'status', 'PUBLICATION_NOT_READY',
      'gameweek', p_gameweek,
      'reason', 'COMPLETE_EVALUATED_STACK_REQUIRED',
      'missing', jsonb_strip_nulls(jsonb_build_object(
        'optimizer', case when v_optimizer.id is null then true else null end,
        'prefinal', case when v_prefinal.prediction_run_id is null then true else null end,
        'manager_state', case when v_manager.id is null then true else null end,
        'ensemble', case when v_ensemble.id is null then true else null end,
        'structural', case when v_structural.id is null then true else null end,
        'forward', case when v_forward.id is null then true else null end,
        'or_utility', case when v_or.id is null then true else null end,
        'red_team', case when v_red.id is null then true else null end,
        'autonomous_gate', case when v_gate.id is null then true else null end
      ))
    );
  end if;

  v_recommended := v_optimizer.evidence->'recommended_by_noise_gate';
  select elem into v_gw_plan
  from jsonb_array_elements(coalesce(v_recommended->'gameweeks','[]'::jsonb)) elem
  where (elem->>'gameweek')::integer = p_gameweek
  limit 1;

  if v_gw_plan is null then
    return jsonb_build_object('ok',false,'status','PUBLICATION_NOT_READY','gameweek',p_gameweek,'reason','CURRENT_GW_PLAN_MISSING_FROM_OPTIMIZER');
  end if;

  select coalesce(jsonb_agg(b.player_id order by b.is_gkp desc, b.expected_points desc nulls last, b.player_id),'[]'::jsonb)
  into v_bench
  from (
    select
      (s->>'player_id')::integer as player_id,
      case when s->>'position'='GKP' then 1 else 0 end as is_gkp,
      mp.expected_points
    from jsonb_array_elements(coalesce(v_recommended->'squad','[]'::jsonb)) s
    left join public.model_predictions mp
      on mp.prediction_run_id=v_prefinal.prediction_run_id
     and mp.player_id=(s->>'player_id')::integer
    where not ((s->>'player_id')::integer = any(
      array(select jsonb_array_elements_text(v_gw_plan->'starting_xi')::integer)
    ))
  ) b;

  select coalesce(jsonb_agg(jsonb_build_object(
      'scenario', s->>'scenario',
      'transfers', coalesce(s->'transfers','[]'::jsonb),
      'transfers_in', (s->>'transfers_in')::integer,
      'objective', (s->>'objective')::numeric,
      'objective_gain_vs_roll', (s->>'objective_gain_vs_roll')::numeric,
      'itb_tenths', (s->>'itb_tenths')::integer,
      'strategic', s->'strategic',
      'current_gameweek', (select g from jsonb_array_elements(coalesce(s->'gameweeks','[]'::jsonb)) g where (g->>'gameweek')::integer=p_gameweek limit 1)
    ) order by (s->>'transfers_in')::integer desc),'[]'::jsonb)
  into v_alternatives
  from jsonb_array_elements(coalesce(v_optimizer.evidence->'transfer_scenarios','[]'::jsonb)) s;

  select coalesce(jsonb_agg(jsonb_build_object(
      'experiment_key',experiment_key,
      'change_id',change_id,
      'experiment_name',experiment_name,
      'experiment_type',experiment_type,
      'status',status,
      'forward_valid',forward_valid,
      'model_effect_enabled',model_effect_enabled
    ) order by created_at, experiment_key),'[]'::jsonb)
  into v_research_registry
  from public.research_experiment_registry;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.cohort,x.parity_band,x.goal_band),'[]'::jsonb)
  into v_parity_research
  from public.research_c0224_parity_draw_summary x;

  v_readiness := private.c0213_p2_horizon_readiness_v02(p_gameweek,p_horizon);
  select max(updated_at) into v_latest_player_state from public.players;
  select max(captured_at) into v_latest_price_state from public.fpl_prices;

  v_freshness_state := case
    when coalesce((v_readiness->>'ready_for_optimizer')::boolean,false) then 'CURRENT'
    else 'STALE_UPSTREAM_PENDING_CADENCE'
  end;

  if v_gate.final_status='FINAL_AUTONOMOUS_DECISION' then
    v_stage := 'FINAL';
    v_status := 'FINAL';
    v_authorized := true;
  elsif coalesce(v_red.result->>'red_team_status','') not in ('EDGE_ROBUST','ROBUST_EDGE')
     or v_freshness_state <> 'CURRENT'
     or coalesce(v_structural.result->'adjudication'->>'classification',v_structural.result->>'status','') ilike '%CHALLENG%' then
    v_status := 'CONTESTED';
  else
    v_status := 'PROVISIONAL';
  end if;

  v_blockers := jsonb_build_object(
    'final_gate_status',v_gate.final_status,
    'final_gate_gates',coalesce(v_gate.result->'gates','[]'::jsonb),
    'red_team_status',v_red.result->>'red_team_status',
    'red_team_blocking_reasons',coalesce(v_red.result->'blocking_reasons','[]'::jsonb)
  );

  v_freshness := jsonb_build_object(
    'state',v_freshness_state,
    'projection_run_id',v_prefinal.prediction_run_id,
    'projection_generated_at',v_prefinal.generated_at,
    'latest_player_state_at',v_latest_player_state,
    'latest_price_state_at',v_latest_price_state,
    'horizon_readiness',v_readiness,
    'policy','PUBLISH_LAST_FULLY_EVALUATED_PLAN_WITH_EXPLICIT_FRESHNESS_WARNING'
  );

  v_lineage := jsonb_build_object(
    'manager_state_id',v_manager.id,
    'optimizer',jsonb_build_object('run_id',v_optimizer.id,'horizon',v_optimizer.horizon,'version',v_optimizer.optimizer_version,'edge_classification',v_optimizer.edge_classification),
    'ensemble',jsonb_build_object('run_id',v_ensemble.id,'status',v_ensemble.result->>'status','classification',v_ensemble.result->>'ensemble_classification'),
    'structural',jsonb_build_object('run_id',v_structural.id,'status',v_structural.result->>'status','adjudication',v_structural.result->'adjudication'),
    'forward_management',jsonb_build_object('run_id',v_forward.id,'status',v_forward.result->>'status'),
    'or_utility',jsonb_build_object('run_id',v_or.id,'status',v_or.result->>'status','reordered',v_or.result->'reordered'),
    'red_team',jsonb_build_object('run_id',v_red.id,'status',v_red.result->>'red_team_status'),
    'shadow_team_regime',case when v_regime.id is null then null else jsonb_build_object('run_id',v_regime.id,'status',v_regime.result->>'status','model_effect_enabled',v_regime.model_effect_enabled) end,
    'autonomous_gate',jsonb_build_object('run_id',v_gate.id,'final_status',v_gate.final_status),
    'all_layers_evaluated',true,
    'shadow_numeric_production_effect',false
  );

  v_research := jsonb_build_object(
    'research_only',true,
    'numeric_production_effect',false,
    'registry',v_research_registry,
    'team_regime',case when v_regime.id is null then null else jsonb_build_object(
      'run_id',v_regime.id,
      'model_effect_enabled',v_regime.model_effect_enabled,
      'result',v_regime.result
    ) end,
    'parity_draw',jsonb_build_object(
      'change_id','C0224',
      'model_effect_enabled',false,
      'summary',v_parity_research
    )
  );

  v_plan := jsonb_build_object(
    'gameweek',p_gameweek,
    'status',v_status,
    'publication_stage',v_stage,
    'execution_authorized',v_authorized,
    'scenario',v_recommended->>'scenario',
    'horizon',v_optimizer.horizon,
    'transfers',coalesce(v_recommended->'transfers','[]'::jsonb),
    'captain_player_id',(v_gw_plan->>'captain_player_id')::integer,
    'vice_player_id',(v_gw_plan->>'vice_player_id')::integer,
    'starting_xi',coalesce(v_gw_plan->'starting_xi','[]'::jsonb),
    'bench_order',v_bench,
    'chip','NONE',
    'gw_expected_xi_points',(v_gw_plan->>'xi_expected_points')::numeric,
    'captain_extra_expected_points',(v_gw_plan->>'captain_extra_expected_points')::numeric,
    'expected_gain_horizon',(v_recommended->>'objective_gain_vs_roll')::numeric,
    'objective',(v_recommended->>'objective')::numeric,
    'itb_tenths',(v_recommended->>'itb_tenths')::integer,
    'strategic',v_recommended->'strategic',
    'squad',v_recommended->'squad',
    'selection_policy','LATEST_COMPLETE_NORMAL_PLAN_RECOMMENDED_BY_NOISE_GATE; FINAL_AUTHORITY_REMAINS_C0234',
    'source','C0237_ALWAYS_LIVE_PLAN_V01'
  );

  v_signature := md5(concat_ws('|',p_gameweek,p_horizon,v_prefinal.prediction_run_id,v_manager.id,v_optimizer.id,v_ensemble.id,v_structural.id,v_forward.id,v_or.id,v_red.id,coalesce(v_regime.id,0),v_gate.id,v_stage,v_status,v_freshness_state));

  insert into public.fpl_live_plan_publications(
    gameweek,horizon,publication_stage,publication_status,final_status,execution_authorized,
    prediction_run_id,manager_state_id,optimizer_run_id,autonomous_gate_run_id,
    plan,alternatives,research_inputs,blockers,freshness,layer_lineage,input_signature,
    source,historical_forecasts_rewritten
  ) values (
    p_gameweek,p_horizon,v_stage,v_status,v_gate.final_status,v_authorized,
    v_prefinal.prediction_run_id,v_manager.id,v_optimizer.id,v_gate.id,
    v_plan,v_alternatives,v_research,v_blockers,v_freshness,v_lineage,v_signature,
    'C0237_ALWAYS_LIVE_PLAN_V01',false
  ) on conflict (input_signature) do nothing
  returning id into v_id;

  if v_id is null then
    select id into v_id from public.fpl_live_plan_publications where input_signature=v_signature;
  end if;

  return jsonb_build_object(
    'ok',true,
    'publication_id',v_id,
    'gameweek',p_gameweek,
    'publication_stage',v_stage,
    'publication_status',v_status,
    'execution_authorized',v_authorized,
    'final_status',v_gate.final_status,
    'plan',v_plan,
    'freshness',v_freshness,
    'layer_lineage',v_lineage,
    'research_only',true,
    'shadow_numeric_production_effect',false,
    'historical_forecasts_rewritten',false
  );
end;
$$;

revoke all on public.fpl_live_plan_publications from anon, authenticated;
revoke all on public.current_fpl_live_plan_v01 from anon, authenticated;
revoke all on function private.c0237_publish_current_fpl_plan_v01(integer,integer) from public;
grant execute on function private.c0237_publish_current_fpl_plan_v01(integer,integer) to service_role;
