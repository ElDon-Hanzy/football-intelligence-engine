create or replace function private.c0213_p2_orchestrate_optimizer_v01(p_gameweek integer default null,p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare
  v_capture jsonb; v_ready jsonb; v_status jsonb; v_gw integer; v_item jsonb; v_gen jsonb;
  v_sig text; v_req_id bigint; v_body jsonb; v_weights jsonb; v_manager jsonb; v_last_req_at timestamptz; v_last_http integer;
  v_refresh_gw integer;
begin
  perform pg_advisory_xact_lock(hashtext('C0213_P2_OPTIMIZER_ORCHESTRATION'));
  v_capture:=private.c0213_p2_capture_pending_optimizer_v01();
  v_ready:=private.c0213_p2_horizon_readiness_v02(p_gameweek,p_horizon);
  if not coalesce((v_ready->>'ok')::boolean,false) then return v_ready||jsonb_build_object('capture',v_capture); end if;
  v_gw:=(v_ready->>'gameweek')::integer;

  select (x->>'gameweek')::integer into v_refresh_gw
  from jsonb_array_elements(v_ready->'gameweeks') x
  where coalesce((x->>'upstream_ready')::boolean,false)
    and not coalesce((x->>'projection_ready')::boolean,false)
  order by (x->>'gameweek')::integer
  limit 1;

  if v_refresh_gw is not null then
    v_gen:=private.generate_upcoming_fpl_snapshot_v01(v_refresh_gw,false);
    return jsonb_build_object(
      'ok',true,'status','PROJECTION_RECONCILED_ONE_STEP','gameweek',v_gw,'horizon',p_horizon,
      'refreshed_gameweek',v_refresh_gw,'projection_result',v_gen,'capture',v_capture,
      'readiness_before',v_ready,'decisioning',false,'writes_manager_plan',false,
      'reconciliation_policy','ONE_STALE_GAMEWEEK_PER_TRANSACTION_TO_PRESERVE_LEGACY_TEMP_TABLE_CONTRACT'
    );
  end if;

  v_ready:=private.c0213_p2_horizon_readiness_v02(v_gw,p_horizon);
  if not coalesce((v_ready->>'projection_horizon_ready')::boolean,false) then
    return jsonb_build_object('ok',true,'status','WAITING_FOR_HORIZON_UPSTREAM','gameweek',v_gw,'horizon',p_horizon,'capture',v_capture,'readiness',v_ready,'decisioning',false);
  end if;
  if not coalesce((v_ready->>'ready_for_optimizer')::boolean,false) then
    return jsonb_build_object('ok',true,'status','WAITING_FOR_MANAGER_STATE','gameweek',v_gw,'horizon',p_horizon,'capture',v_capture,'readiness',v_ready,'decisioning',false);
  end if;

  v_status:=private.c0213_p2_optimizer_status_v01(v_gw,p_horizon);
  if coalesce((v_status->>'ready')::boolean,false) then return v_status||jsonb_build_object('capture',v_capture,'decisioning',false); end if;
  v_sig:=v_ready->>'input_signature';
  select q.requested_at,resp.status_code into v_last_req_at,v_last_http
  from private.c0213_p2_optimizer_requests q left join net._http_response resp on resp.id=q.request_id
  where q.input_signature=v_sig order by q.requested_at desc,q.id desc limit 1;
  if v_last_req_at is not null and v_last_req_at>clock_timestamp()-interval '10 minutes' and (v_last_http is null or v_last_http=200) then
    return v_status||jsonb_build_object('capture',v_capture,'decisioning',false);
  end if;

  v_weights:=case p_horizon when 3 then '[1,0.82,0.68]'::jsonb when 4 then '[1,0.82,0.68,0.56]'::jsonb else '[1,0.82,0.68,0.56,0.46]'::jsonb end;
  v_manager:=v_ready->'manager_state';
  v_body:=jsonb_build_object('gameweek',v_gw,'horizon',p_horizon,'weights',v_weights,'budget_tenths',1000,'bench_weight',0.12,'free_transfers',(v_manager->>'free_transfers')::integer,'transfer_cost_points',4,'model_error_margin_points',1.0);
  v_req_id:=private.invoke_engine_ingest('fpl-full-pool-optimizer',v_body);
  insert into private.c0213_p2_optimizer_requests(request_id,gameweek,horizon,input_signature,manager_state_id,free_transfers,budget_tenths,prediction_runs,request_body)
  values(v_req_id,v_gw,p_horizon,v_sig,(v_manager->>'id')::bigint,(v_manager->>'free_transfers')::integer,1000,v_ready->'prediction_runs',v_body);
  return jsonb_build_object('ok',true,'status','DISPATCHED','gameweek',v_gw,'horizon',p_horizon,'request_id',v_req_id,'input_signature',v_sig,'capture',v_capture,'readiness',v_ready,'decisioning',false,'writes_manager_plan',false);
end $$;
revoke all on function private.c0213_p2_orchestrate_optimizer_v01(integer,integer) from public,anon,authenticated;
grant execute on function private.c0213_p2_orchestrate_optimizer_v01(integer,integer) to service_role;