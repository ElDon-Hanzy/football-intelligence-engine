create or replace function private.c0213_p2_horizon_readiness_v02(p_gameweek integer default null::integer, p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','pg_temp'
as $function$
declare
  v_now timestamptz:=clock_timestamp(); v_gw integer:=p_gameweek; v_active_model_id bigint; v_player_state_at timestamptz;
  v_manager_state_id bigint; v_manager_at timestamptz; v_ft integer; v_bank integer; v_acq integer; v_liq integer; v_budget integer; v_manager_ready boolean:=false;
  v_items jsonb:='[]'::jsonb; v_runs jsonb:='[]'::jsonb; v_all_upstream boolean:=true; v_all_projection boolean:=true; v_sig text;
  i integer; g integer; v_fixtures integer; v_prod integer; v_tactical integer; v_features integer; v_prod_at timestamptz;
  v_run_id bigint; v_run_at timestamptz; v_run_rows integer; v_dist_rows integer; v_cov_projectable integer; v_cov_ungoverned integer; v_upstream boolean; v_projection boolean; v_weights text;
  v_optimizer_contract text:='C0218_FULL_POOL_SCENARIO_V02';
begin
  if p_horizon not between 3 and 5 then return jsonb_build_object('ok',false,'status','INVALID_HORIZON','horizon',p_horizon,'allowed','3-5'); end if;
  if v_gw is null then
    select x.gameweek into v_gw from (select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at from public.matches m where m.source='fpl' and m.gameweek between 1 and 38 group by m.gameweek) x where x.deadline_at>v_now order by x.gameweek limit 1;
  end if;
  if v_gw is null or v_gw+p_horizon-1>38 then return jsonb_build_object('ok',false,'status','HORIZON_OUT_OF_RANGE','gameweek',v_gw,'horizon',p_horizon); end if;
  select id into v_active_model_id from public.model_versions where is_active=true order by created_at desc,id desc limit 1;
  select max(as_of) into v_player_state_at from public.current_player_state_latest;
  select id,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths,squad_liquidation_value_tenths into v_manager_state_id,v_manager_at,v_ft,v_bank,v_acq,v_liq from public.fpl_manager_state_snapshots where gameweek=v_gw order by captured_at desc,id desc limit 1;
  v_budget:=case when v_liq is not null and v_bank is not null then v_liq+v_bank else null end;
  v_manager_ready:=v_manager_state_id is not null and v_ft is not null and v_bank is not null and v_acq is not null and v_liq is not null;
  for i in 0..p_horizon-1 loop
    g:=v_gw+i;
    select count(*) into v_fixtures from public.matches where source='fpl' and gameweek=g and kickoff_time>v_now;
    select count(*),max(captured_at) into v_prod,v_prod_at from (select distinct on (fps.match_id) fps.match_id,fps.captured_at from public.fixture_prediction_snapshots fps join public.matches m on m.id=fps.match_id where fps.gameweek=g and fps.is_pre_kickoff=true and m.kickoff_time>v_now and fps.source_snapshot->>'generator'='production_fixture_v0.3_c0166' order by fps.match_id,fps.captured_at desc,fps.id desc) q;
    select count(*) into v_tactical from public.current_fixture_tactical_matchups where gameweek=g;
    select count(*) into v_features from public.current_fixture_team_feature_snapshots where gameweek=g;
    select id,generated_at into v_run_id,v_run_at from public.gameweek_prediction_runs where gameweek=g and model_version_id=v_active_model_id order by generated_at desc,id desc limit 1;
    if v_run_id is not null then
      select count(*) into v_run_rows from public.model_predictions where prediction_run_id=v_run_id;
      select count(*) into v_dist_rows from public.model_predictions where prediction_run_id=v_run_id and features ? 'point_distribution';
      select projectable_count,ungoverned_missing_count into v_cov_projectable,v_cov_ungoverned from public.fpl_projection_coverage_audits where gameweek=g and prediction_run_id=v_run_id order by captured_at desc,id desc limit 1;
    else v_run_rows:=0; v_dist_rows:=0; v_cov_projectable:=null; v_cov_ungoverned:=null; end if;
    v_upstream:=v_fixtures>0 and v_prod=v_fixtures and v_tactical=v_fixtures*10 and v_features=v_fixtures*2 and v_prod_at is not null;
    v_projection:=v_upstream and v_run_id is not null and v_run_rows>=500 and v_dist_rows=v_run_rows and coalesce(v_cov_projectable,v_run_rows)=v_run_rows and coalesce(v_cov_ungoverned,0)=0 and v_run_at>=greatest(v_prod_at,coalesce(v_player_state_at,'epoch'::timestamptz));
    v_all_upstream:=v_all_upstream and v_upstream; v_all_projection:=v_all_projection and v_projection;
    v_runs:=v_runs||jsonb_build_array(jsonb_build_object('gameweek',g,'run_id',v_run_id,'generated_at',v_run_at,'projection_rows',v_run_rows));
    v_items:=v_items||jsonb_build_array(jsonb_build_object('gameweek',g,'fixture_count',v_fixtures,'c0166_fixture_rows',v_prod,'c0166_fixture_at',v_prod_at,'required_fixture_generator','production_fixture_v0.3_c0166','tactical_rows',v_tactical,'feature_rows',v_features,'upstream_ready',v_upstream,'prediction_run_id',v_run_id,'prediction_run_at',v_run_at,'projection_rows',v_run_rows,'distribution_rows',v_dist_rows,'projectable_rows',v_cov_projectable,'ungoverned_missing',v_cov_ungoverned,'projection_ready',v_projection));
  end loop;
  v_weights:=case p_horizon when 3 then '1,0.82,0.68' when 4 then '1,0.82,0.68,0.56' else '1,0.82,0.68,0.56,0.46' end;
  if v_all_projection and v_manager_ready then v_sig:=md5(concat_ws('|','C0218_OPT_V02',v_optimizer_contract,v_gw,p_horizon,v_active_model_id,v_manager_state_id,v_ft,v_budget,4,0.12,1.0,v_weights,(select string_agg(coalesce(x->>'run_id','null'),',' order by (x->>'gameweek')::integer) from jsonb_array_elements(v_runs) x))); end if;
  return jsonb_build_object('ok',true,'change_id','C0218','contract_version','C0218_HORIZON_V02','optimizer_contract_version',v_optimizer_contract,'captured_at',v_now,'gameweek',v_gw,'horizon',p_horizon,'active_model_id',v_active_model_id,'player_state_at',v_player_state_at,'manager_state',jsonb_build_object('id',v_manager_state_id,'captured_at',v_manager_at,'free_transfers',v_ft,'bank_tenths',v_bank,'acquisition_squad_cost_tenths',v_acq,'squad_liquidation_value_tenths',v_liq,'optimizer_budget_tenths',v_budget,'ready',v_manager_ready),'upstream_horizon_ready',v_all_upstream,'projection_horizon_ready',v_all_projection,'ready_for_optimizer',v_all_projection and v_manager_ready,'prediction_runs',v_runs,'gameweeks',v_items,'input_signature',v_sig,'optimizer_policy',jsonb_build_object('budget_tenths',v_budget,'transfer_cost_points',4,'bench_weight',0.12,'model_error_margin_points',1.0,'weights',string_to_array(v_weights,',')::numeric[]),'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false);
end $function$;
