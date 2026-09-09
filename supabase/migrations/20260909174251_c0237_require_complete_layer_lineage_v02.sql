alter function private.c0237_publish_current_fpl_plan_v01(integer,integer)
rename to c0237_publish_current_fpl_plan_core_v01;

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
  v_uncertainty jsonb;
  v_regime_id bigint;
  v_core jsonb;
  v_core_id bigint;
  v_core_row public.fpl_live_plan_publications%rowtype;
  v_signature text;
  v_id bigint;
begin
  v_uncertainty := private.c0227_uncertainty_status_v01(p_gameweek);
  select id into v_regime_id
  from public.fpl_team_regime_diagnostic_runs
  where gameweek=p_gameweek
  order by captured_at desc,id desc limit 1;

  if not coalesce((v_uncertainty->>'ok')::boolean,false)
     or coalesce((v_uncertainty->>'rows')::integer,0) = 0
     or v_regime_id is null then
    return jsonb_build_object(
      'ok',false,
      'status','PUBLICATION_NOT_READY',
      'gameweek',p_gameweek,
      'reason','ALL_DECISION_AND_SHADOW_LAYERS_REQUIRED',
      'uncertainty',v_uncertainty,
      'team_regime_run_id',v_regime_id,
      'historical_forecasts_rewritten',false
    );
  end if;

  v_core := private.c0237_publish_current_fpl_plan_core_v01(p_gameweek,p_horizon);
  if not coalesce((v_core->>'ok')::boolean,false) then
    return v_core;
  end if;

  v_core_id := (v_core->>'publication_id')::bigint;
  select * into v_core_row from public.fpl_live_plan_publications where id=v_core_id;

  v_signature := md5(v_core_row.input_signature || '|C0237_V02|C0227=' || v_uncertainty::text || '|C0230=' || v_regime_id::text);

  insert into public.fpl_live_plan_publications(
    gameweek,horizon,publication_stage,publication_status,final_status,execution_authorized,
    prediction_run_id,manager_state_id,optimizer_run_id,autonomous_gate_run_id,
    plan,alternatives,research_inputs,blockers,freshness,layer_lineage,input_signature,
    source,historical_forecasts_rewritten
  ) values (
    v_core_row.gameweek,v_core_row.horizon,v_core_row.publication_stage,v_core_row.publication_status,
    v_core_row.final_status,v_core_row.execution_authorized,v_core_row.prediction_run_id,
    v_core_row.manager_state_id,v_core_row.optimizer_run_id,v_core_row.autonomous_gate_run_id,
    v_core_row.plan || jsonb_build_object('source','C0237_ALWAYS_LIVE_PLAN_V02'),
    v_core_row.alternatives,
    v_core_row.research_inputs,
    v_core_row.blockers,
    v_core_row.freshness,
    v_core_row.layer_lineage || jsonb_build_object(
      'uncertainty',jsonb_build_object(
        'change_id','C0227',
        'status',v_uncertainty,
        'required_for_publication',true
      ),
      'shadow_team_regime_required_for_publication',true,
      'publication_contract','ALL_REQUIRED_LAYERS_EVALUATED_NEGATIVE_RESULTS_ALLOWED_SKIPPED_LAYERS_FORBIDDEN'
    ),
    v_signature,
    'C0237_ALWAYS_LIVE_PLAN_V02',
    false
  ) on conflict (input_signature) do nothing returning id into v_id;

  if v_id is null then
    select id into v_id from public.fpl_live_plan_publications where input_signature=v_signature;
  end if;

  return jsonb_build_object(
    'ok',true,
    'publication_id',v_id,
    'gameweek',p_gameweek,
    'publication_stage',v_core_row.publication_stage,
    'publication_status',v_core_row.publication_status,
    'execution_authorized',v_core_row.execution_authorized,
    'final_status',v_core_row.final_status,
    'all_required_layers_evaluated',true,
    'uncertainty',v_uncertainty,
    'team_regime_run_id',v_regime_id,
    'shadow_numeric_production_effect',false,
    'historical_forecasts_rewritten',false
  );
end;
$$;

revoke all on function private.c0237_publish_current_fpl_plan_core_v01(integer,integer) from public;
revoke all on function private.c0237_publish_current_fpl_plan_v01(integer,integer) from public;
grant execute on function private.c0237_publish_current_fpl_plan_v01(integer,integer) to service_role;
