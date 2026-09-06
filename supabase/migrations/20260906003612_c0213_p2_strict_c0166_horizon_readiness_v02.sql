create or replace function private.c0213_p2_horizon_readiness_v02(p_gameweek integer default null,p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_gw integer:=p_gameweek;
  v_active_model_id bigint;
  v_player_state_at timestamptz;
  v_manager_state_id bigint; v_manager_at timestamptz; v_ft integer; v_bank integer; v_acq integer;
  v_manager_ready boolean:=false;
  v_items jsonb:='[]'::jsonb; v_runs jsonb:='[]'::jsonb;
  v_all_upstream boolean:=true; v_all_projection boolean:=true;
  v_sig text;
  i integer; g integer; v_fixtures integer; v_prod integer; v_tactical integer; v_features integer;
  v_prod_at timestamptz; v_run_id bigint; v_run_at timestamptz; v_run_rows integer; v_dist_rows integer;
  v_cov_projectable integer; v_cov_ungoverned integer; v_upstream boolean; v_projection boolean;
  v_weights text;
begin
  if p_horizon not between 3 and 5 then
    return jsonb_build_object('ok',false,'status','INVALID_HORIZON','horizon',p_horizon,'allowed','3-5');
  end if;
  if v_gw is null then
    select x.gameweek into v_gw from (
      select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at
      from public.matches m where m.source='fpl' and m.gameweek between 1 and 38 group by m.gameweek
    ) x where x.deadline_at>v_now order by x.gameweek limit 1;
  end if;
  if v_gw is null or v_gw+p_horizon-1>38 then
    return jsonb_build_object('ok',false,'status','HORIZON_OUT_OF_RANGE','gameweek',v_gw,'horizon',p_horizon);
  end if;

  select id into v_active_model_id from public.model_versions where is_active=true order by created_at desc,id desc limit 1;
  select max(as_of) into v_player_state_at from public.current_player_state_latest;
  select id,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths
    into v_manager_state_id,v_manager_at,v_ft,v_bank,v_acq
  from public.fpl_manager_state_snapshots where gameweek=v_gw order by captured_at desc,id desc limit 1;
  v_manager_ready:=v_manager_state_id is not null and v_ft is not null and v_bank is not null and v_acq is not null;

  for i in 0..p_horizon-1 loop
    g:=v_gw+i;
    select count(*) into v_fixtures from public.matches where source='fpl' and gameweek=g and kickoff_time>v_now;
    select count(*),max(captured_at) into v_prod,v_prod_at
    from (
      select distinct on (fps.match_id) fps.match_id,fps.captured_at
      from public.fixture_prediction_snapshots fps
      join public.matches m on m.id=fps.match_id
      where fps.gameweek=g and fps.is_pre_kickoff=true and m.kickoff_time>v_now
        and fps.source_snapshot->>'generator'='production_fixture_v0.3_c0166'
      order by fps.match_id,fps.captured_at desc,fps.id desc
    ) q;
    select count(*) into v_tactical from public.current_fixture_tactical_matchups where gameweek=g;
    select count(*) into v_features from public.current_fixture_team_feature_snapshots where gameweek=g;

    select id,generated_at into v_run_id,v_run_at from public.gameweek_prediction_runs
      where gameweek=g and model_version_id=v_active_model_id order by generated_at desc,id desc limit 1;
    if v_run_id is not null then
      select count(*) into v_run_rows from public.model_predictions where prediction_run_id=v_run_id;
      select count(*) into v_dist_rows from public.model_predictions where prediction_run_id=v_run_id and features ? 'point_distribution';
      select projectable_count,ungoverned_missing_count into v_cov_projectable,v_cov_ungoverned
      from public.fpl_projection_coverage_audits where gameweek=g and prediction_run_id=v_run_id order by captured_at desc,id desc limit 1;
    else
      v_run_rows:=0; v_dist_rows:=0; v_cov_projectable:=null; v_cov_ungoverned:=null;
    end if;

    v_upstream:=v_fixtures>0 and v_prod=v_fixtures and v_tactical=v_fixtures*10 and v_features=v_fixtures*2 and v_prod_at is not null;
    v_projection:=v_upstream and v_run_id is not null and v_run_rows>=500 and v_dist_rows=v_run_rows
      and coalesce(v_cov_projectable,v_run_rows)=v_run_rows and coalesce(v_cov_ungoverned,0)=0
      and v_run_at>=greatest(v_prod_at,coalesce(v_player_state_at,'epoch'::timestamptz));

    v_all_upstream:=v_all_upstream and v_upstream;
    v_all_projection:=v_all_projection and v_projection;
    v_runs:=v_runs||jsonb_build_array(jsonb_build_object('gameweek',g,'run_id',v_run_id,'generated_at',v_run_at,'projection_rows',v_run_rows));
    v_items:=v_items||jsonb_build_array(jsonb_build_object(
      'gameweek',g,'fixture_count',v_fixtures,'c0166_fixture_rows',v_prod,'c0166_fixture_at',v_prod_at,
      'required_fixture_generator','production_fixture_v0.3_c0166','tactical_rows',v_tactical,'feature_rows',v_features,'upstream_ready',v_upstream,
      'prediction_run_id',v_run_id,'prediction_run_at',v_run_at,'projection_rows',v_run_rows,'distribution_rows',v_dist_rows,
      'projectable_rows',v_cov_projectable,'ungoverned_missing',v_cov_ungoverned,'projection_ready',v_projection
    ));
  end loop;

  v_weights:=case p_horizon when 3 then '1,0.82,0.68' when 4 then '1,0.82,0.68,0.56' else '1,0.82,0.68,0.56,0.46' end;
  if v_all_projection and v_manager_ready then
    v_sig:=md5(concat_ws('|','C0213_P2_OPT_V02',v_gw,p_horizon,v_active_model_id,v_manager_state_id,v_ft,1000,4,0.12,1.0,v_weights,
      (select string_agg(coalesce(x->>'run_id','null'),',' order by (x->>'gameweek')::integer) from jsonb_array_elements(v_runs) x)));
  end if;

  return jsonb_build_object(
    'ok',true,'change_id','C0213','contract_version','C0213_P2_HORIZON_V02','captured_at',v_now,
    'gameweek',v_gw,'horizon',p_horizon,'active_model_id',v_active_model_id,'player_state_at',v_player_state_at,
    'manager_state',jsonb_build_object('id',v_manager_state_id,'captured_at',v_manager_at,'free_transfers',v_ft,'bank_tenths',v_bank,'acquisition_squad_cost_tenths',v_acq,'ready',v_manager_ready),
    'upstream_horizon_ready',v_all_upstream,'projection_horizon_ready',v_all_projection,'ready_for_optimizer',v_all_projection and v_manager_ready,
    'prediction_runs',v_runs,'gameweeks',v_items,'input_signature',v_sig,
    'optimizer_policy',jsonb_build_object('budget_tenths',1000,'transfer_cost_points',4,'bench_weight',0.12,'model_error_margin_points',1.0,'weights',string_to_array(v_weights,',')::numeric[]),
    'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false
  );
end $$;
revoke all on function private.c0213_p2_horizon_readiness_v02(integer,integer) from public,anon,authenticated;
grant execute on function private.c0213_p2_horizon_readiness_v02(integer,integer) to service_role;

create or replace function private.c0213_p2_optimizer_status_v01(p_gameweek integer default null,p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path='private','public','net','pg_temp'
as $$
declare v_ready jsonb; v_sig text; v_req record; v_run record; v_http integer;
begin
  v_ready:=private.c0213_p2_horizon_readiness_v02(p_gameweek,p_horizon);
  if not coalesce((v_ready->>'ok')::boolean,false) then return v_ready; end if;
  v_sig:=v_ready->>'input_signature';
  if v_sig is null then
    return jsonb_build_object('ok',true,'status','INPUTS_NOT_READY','ready',false,'readiness',v_ready);
  end if;
  select * into v_req from private.c0213_p2_optimizer_requests where input_signature=v_sig order by requested_at desc,id desc limit 1;
  if v_req.id is null then
    return jsonb_build_object('ok',true,'status','NEEDS_DISPATCH','ready',false,'input_signature',v_sig,'readiness',v_ready);
  end if;
  select id,captured_at,result_status,edge_classification,objective_gap_to_second into v_run
  from public.fpl_full_pool_optimizer_runs where request_id=v_req.request_id order by captured_at desc,id desc limit 1;
  if v_run.id is not null then
    return jsonb_build_object('ok',true,'status','READY','ready',true,'input_signature',v_sig,'request_id',v_req.request_id,'optimizer_run_id',v_run.id,'captured_at',v_run.captured_at,'result_status',v_run.result_status,'edge_classification',v_run.edge_classification,'objective_gap_to_second',v_run.objective_gap_to_second,'readiness',v_ready);
  end if;
  select status_code into v_http from net._http_response where id=v_req.request_id;
  return jsonb_build_object('ok',true,'status',case when v_http is null then 'PENDING' when v_http=200 then 'CAPTURE_PENDING' else 'HTTP_FAILED' end,'ready',false,'input_signature',v_sig,'request_id',v_req.request_id,'requested_at',v_req.requested_at,'http_status',v_http,'readiness',v_ready);
end $$;
revoke all on function private.c0213_p2_optimizer_status_v01(integer,integer) from public,anon,authenticated;
grant execute on function private.c0213_p2_optimizer_status_v01(integer,integer) to service_role;

create or replace function private.c0213_p2_orchestrate_optimizer_v01(p_gameweek integer default null,p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare
  v_capture jsonb; v_ready jsonb; v_status jsonb; v_gw integer; v_item jsonb; v_gen jsonb;
  v_sig text; v_req_id bigint; v_body jsonb; v_weights jsonb; v_manager jsonb; v_last_req_at timestamptz; v_last_http integer;
begin
  perform pg_advisory_xact_lock(hashtext('C0213_P2_OPTIMIZER_ORCHESTRATION'));
  v_capture:=private.c0213_p2_capture_pending_optimizer_v01();
  v_ready:=private.c0213_p2_horizon_readiness_v02(p_gameweek,p_horizon);
  if not coalesce((v_ready->>'ok')::boolean,false) then return v_ready||jsonb_build_object('capture',v_capture); end if;
  v_gw:=(v_ready->>'gameweek')::integer;

  for v_item in select value from jsonb_array_elements(v_ready->'gameweeks') loop
    if coalesce((v_item->>'upstream_ready')::boolean,false) and not coalesce((v_item->>'projection_ready')::boolean,false) then
      v_gen:=private.generate_upcoming_fpl_snapshot_v01((v_item->>'gameweek')::integer,false);
    end if;
  end loop;

  v_ready:=private.c0213_p2_horizon_readiness_v02(v_gw,p_horizon);
  if not coalesce((v_ready->>'projection_horizon_ready')::boolean,false) then
    return jsonb_build_object('ok',true,'status','WAITING_FOR_HORIZON_PROJECTIONS','gameweek',v_gw,'horizon',p_horizon,'capture',v_capture,'readiness',v_ready,'decisioning',false);
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