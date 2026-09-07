create or replace function private.capture_c0213_optimizer_response_v01(p_request_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','net','pg_temp'
as $function$
declare v_code integer; v_body jsonb; v_id bigint; v_best jsonb; v_obj numeric; v_gap numeric; v_cost integer; v_itb integer; v_ti integer;
begin
  select status_code,content::jsonb into v_code,v_body from net._http_response where id=p_request_id;
  if v_code is null then return jsonb_build_object('ok',false,'status','RESPONSE_NOT_AVAILABLE','request_id',p_request_id); end if;
  if v_code<>200 or not coalesce((v_body->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status','OPTIMIZER_RESPONSE_NOT_SUCCESS','request_id',p_request_id,'status_code',v_code,'body',v_body); end if;
  if exists(select 1 from public.fpl_full_pool_optimizer_runs where request_id=p_request_id) then
    select id into v_id from public.fpl_full_pool_optimizer_runs where request_id=p_request_id order by id desc limit 1;
    return jsonb_build_object('ok',true,'status','ALREADY_CAPTURED','request_id',p_request_id,'optimizer_run_id',v_id);
  end if;
  v_best:=coalesce(v_body->'recommended_by_noise_gate',v_body->'best_uncontrolled',v_body->'best','{}'::jsonb);
  v_obj:=nullif(v_best->>'objective','')::numeric;
  v_gap:=coalesce(nullif(v_body->>'objective_gap_best_vs_roll','')::numeric,nullif(v_body->>'objective_gap_to_second','')::numeric);
  v_cost:=nullif(v_best->>'cost_tenths','')::integer; v_itb:=nullif(v_best->>'itb_tenths','')::integer; v_ti:=nullif(v_best->>'transfers_in','')::integer;
  insert into public.fpl_full_pool_optimizer_runs(
    request_id,gameweek,horizon,optimizer_version,model_version,source_pool_count,xmins_top_n,explosive_exception_count,candidate_counts,prediction_runs,
    objective,objective_gap_to_second,model_error_margin_points,edge_classification,cost_tenths,itb_tenths,transfers_in,search_method,search_exact,decisioning,writes_manager_plan,result_status,evidence,change_id
  ) values(
    p_request_id,(v_body->>'gameweek')::integer,(v_body->>'horizon')::integer,v_body->>'optimizer_version',v_body->>'model_version',
    nullif(v_body->>'source_pool_count','')::integer,nullif(v_body->>'xmins_top_n','')::integer,nullif(v_body->>'explosive_exception_count','')::integer,
    coalesce(v_body->'candidate_counts','{}'::jsonb),coalesce(v_body->'prediction_runs','[]'::jsonb),
    v_obj,v_gap,nullif(v_body->>'model_error_margin_points','')::numeric,v_body->>'edge_classification',v_cost,v_itb,v_ti,
    coalesce(v_body->>'search_method','C0218_SCENARIO_LOCAL_SEARCH'),coalesce((v_body->>'search_exact')::boolean,false),coalesce((v_body->>'decisioning')::boolean,false),coalesce((v_body->>'writes_manager_plan')::boolean,false),
    v_body->>'status',
    jsonb_build_object(
      'constraints',v_body->'constraints','notes',v_body->'notes','weights',v_body->'weights','gws',v_body->'gws',
      'manager_state_id',v_body->'manager_state_id','bank_tenths',v_body->'bank_tenths','squad_liquidation_value_tenths',v_body->'squad_liquidation_value_tenths','budget_tenths',v_body->'budget_tenths',
      'roll',v_body->'roll','transfer_scenarios',v_body->'transfer_scenarios','best_uncontrolled',v_body->'best_uncontrolled','recommended_by_noise_gate',v_body->'recommended_by_noise_gate',
      'objective_gap_best_vs_roll',v_body->'objective_gap_best_vs_roll','prediction_rows_loaded',v_body->'prediction_rows_loaded'
    ),'C0218'
  ) returning id into v_id;
  return jsonb_build_object('ok',true,'status','CAPTURED','request_id',p_request_id,'optimizer_run_id',v_id,'optimizer_version',v_body->>'optimizer_version','objective',v_obj,'gap_vs_roll',v_gap);
end $function$;
