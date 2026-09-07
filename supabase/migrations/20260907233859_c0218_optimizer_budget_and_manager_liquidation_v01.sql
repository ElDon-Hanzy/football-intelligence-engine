alter table public.fpl_manager_state_snapshots
  add column if not exists squad_liquidation_value_tenths integer;

with latest_audit as (
  select a.*
  from private.c0217_public_fpl_manager_state_audits a
  where a.entry_id=3559923 and a.target_gameweek=4
  order by a.captured_at desc,a.id desc
  limit 1
), calc as (
  select a.*,
         (select sum(case
           when (x->>'current_price_tenths')::int <= (x->>'purchase_price_tenths')::int
             then (x->>'current_price_tenths')::int
           else (x->>'purchase_price_tenths')::int + floor(((x->>'current_price_tenths')::int-(x->>'purchase_price_tenths')::int)/2.0)::int
         end)::int from jsonb_array_elements(a.squad) x) as liquidation
  from latest_audit a
), prior as (
  select * from public.fpl_manager_state_snapshots where gameweek=4 order by captured_at desc,id desc limit 1
)
insert into public.fpl_manager_state_snapshots(
  gameweek,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths,squad_liquidation_value_tenths,source,evidence
)
select 4,clock_timestamp(),p.free_transfers,p.bank_tenths,p.acquisition_squad_cost_tenths,c.liquidation,
       'public_fpl_api_plus_user_confirmation_c0218',
       p.evidence || jsonb_build_object(
         'change_id','C0218','squad_liquidation_value_tenths',c.liquidation,
         'optimizer_budget_tenths',c.liquidation+p.bank_tenths,
         'selling_value_rule','FPL_HALF_PROFIT_ROUNDED_DOWN',
         'squad',c.squad,
         'user_confirmation','No transfers since GW3'
       )
from prior p cross join calc c
where not exists (
  select 1 from public.fpl_manager_state_snapshots s
  where s.gameweek=4 and s.source='public_fpl_api_plus_user_confirmation_c0218'
);

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
begin
  if p_horizon not between 3 and 5 then return jsonb_build_object('ok',false,'status','INVALID_HORIZON','horizon',p_horizon,'allowed','3-5'); end if;
  if v_gw is null then
    select x.gameweek into v_gw from (
      select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at from public.matches m where m.source='fpl' and m.gameweek between 1 and 38 group by m.gameweek
    ) x where x.deadline_at>v_now order by x.gameweek limit 1;
  end if;
  if v_gw is null or v_gw+p_horizon-1>38 then return jsonb_build_object('ok',false,'status','HORIZON_OUT_OF_RANGE','gameweek',v_gw,'horizon',p_horizon); end if;
  select id into v_active_model_id from public.model_versions where is_active=true order by created_at desc,id desc limit 1;
  select max(as_of) into v_player_state_at from public.current_player_state_latest;
  select id,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths,squad_liquidation_value_tenths
    into v_manager_state_id,v_manager_at,v_ft,v_bank,v_acq,v_liq
  from public.fpl_manager_state_snapshots where gameweek=v_gw order by captured_at desc,id desc limit 1;
  v_budget:=case when v_liq is not null and v_bank is not null then v_liq+v_bank else null end;
  v_manager_ready:=v_manager_state_id is not null and v_ft is not null and v_bank is not null and v_acq is not null and v_liq is not null;
  for i in 0..p_horizon-1 loop
    g:=v_gw+i;
    select count(*) into v_fixtures from public.matches where source='fpl' and gameweek=g and kickoff_time>v_now;
    select count(*),max(captured_at) into v_prod,v_prod_at from (
      select distinct on (fps.match_id) fps.match_id,fps.captured_at from public.fixture_prediction_snapshots fps join public.matches m on m.id=fps.match_id
      where fps.gameweek=g and fps.is_pre_kickoff=true and m.kickoff_time>v_now and fps.source_snapshot->>'generator'='production_fixture_v0.3_c0166'
      order by fps.match_id,fps.captured_at desc,fps.id desc
    ) q;
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
  if v_all_projection and v_manager_ready then
    v_sig:=md5(concat_ws('|','C0218_OPT_V01',v_gw,p_horizon,v_active_model_id,v_manager_state_id,v_ft,v_budget,4,0.12,1.0,v_weights,(select string_agg(coalesce(x->>'run_id','null'),',' order by (x->>'gameweek')::integer) from jsonb_array_elements(v_runs) x)));
  end if;
  return jsonb_build_object('ok',true,'change_id','C0218','contract_version','C0218_HORIZON_V01','captured_at',v_now,'gameweek',v_gw,'horizon',p_horizon,'active_model_id',v_active_model_id,'player_state_at',v_player_state_at,
    'manager_state',jsonb_build_object('id',v_manager_state_id,'captured_at',v_manager_at,'free_transfers',v_ft,'bank_tenths',v_bank,'acquisition_squad_cost_tenths',v_acq,'squad_liquidation_value_tenths',v_liq,'optimizer_budget_tenths',v_budget,'ready',v_manager_ready),
    'upstream_horizon_ready',v_all_upstream,'projection_horizon_ready',v_all_projection,'ready_for_optimizer',v_all_projection and v_manager_ready,'prediction_runs',v_runs,'gameweeks',v_items,'input_signature',v_sig,
    'optimizer_policy',jsonb_build_object('budget_tenths',v_budget,'transfer_cost_points',4,'bench_weight',0.12,'model_error_margin_points',1.0,'weights',string_to_array(v_weights,',')::numeric[]),'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false);
end $function$;

create or replace function private.c0213_p2_orchestrate_optimizer_v01(p_gameweek integer default null::integer, p_horizon integer default 3)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','pg_temp'
as $function$
declare
  v_capture jsonb; v_ready jsonb; v_status jsonb; v_gw integer; v_gen jsonb; v_sig text; v_req_id bigint; v_body jsonb; v_weights jsonb; v_manager jsonb;
  v_last_req_at timestamptz; v_last_http integer; v_refresh_gw integer; v_budget integer;
begin
  perform pg_advisory_xact_lock(hashtext('C0213_P2_OPTIMIZER_ORCHESTRATION'));
  v_capture:=private.c0213_p2_capture_pending_optimizer_v01();
  v_ready:=private.c0213_p2_horizon_readiness_v02(p_gameweek,p_horizon);
  if not coalesce((v_ready->>'ok')::boolean,false) then return v_ready||jsonb_build_object('capture',v_capture); end if;
  v_gw:=(v_ready->>'gameweek')::integer;
  select (x->>'gameweek')::integer into v_refresh_gw from jsonb_array_elements(v_ready->'gameweeks') x where coalesce((x->>'upstream_ready')::boolean,false) and not coalesce((x->>'projection_ready')::boolean,false) order by (x->>'gameweek')::integer limit 1;
  if v_refresh_gw is not null then
    v_gen:=private.generate_upcoming_fpl_snapshot_v01(v_refresh_gw,false);
    return jsonb_build_object('ok',true,'status','PROJECTION_RECONCILED_ONE_STEP','gameweek',v_gw,'horizon',p_horizon,'refreshed_gameweek',v_refresh_gw,'projection_result',v_gen,'capture',v_capture,'readiness_before',v_ready,'decisioning',false,'writes_manager_plan',false,'reconciliation_policy','ONE_STALE_GAMEWEEK_PER_TRANSACTION_TO_PRESERVE_LEGACY_TEMP_TABLE_CONTRACT');
  end if;
  v_ready:=private.c0213_p2_horizon_readiness_v02(v_gw,p_horizon);
  if not coalesce((v_ready->>'projection_horizon_ready')::boolean,false) then return jsonb_build_object('ok',true,'status','WAITING_FOR_HORIZON_UPSTREAM','gameweek',v_gw,'horizon',p_horizon,'capture',v_capture,'readiness',v_ready,'decisioning',false); end if;
  if not coalesce((v_ready->>'ready_for_optimizer')::boolean,false) then return jsonb_build_object('ok',true,'status','WAITING_FOR_MANAGER_STATE','gameweek',v_gw,'horizon',p_horizon,'capture',v_capture,'readiness',v_ready,'decisioning',false); end if;
  v_status:=private.c0213_p2_optimizer_status_v01(v_gw,p_horizon);
  if coalesce((v_status->>'ready')::boolean,false) then return v_status||jsonb_build_object('capture',v_capture,'decisioning',false); end if;
  v_sig:=v_ready->>'input_signature';
  select q.requested_at,resp.status_code into v_last_req_at,v_last_http from private.c0213_p2_optimizer_requests q left join net._http_response resp on resp.id=q.request_id where q.input_signature=v_sig order by q.requested_at desc,q.id desc limit 1;
  if v_last_req_at is not null and v_last_req_at>clock_timestamp()-interval '10 minutes' and (v_last_http is null or v_last_http=200) then return v_status||jsonb_build_object('capture',v_capture,'decisioning',false); end if;
  v_weights:=case p_horizon when 3 then '[1,0.82,0.68]'::jsonb when 4 then '[1,0.82,0.68,0.56]'::jsonb else '[1,0.82,0.68,0.56,0.46]'::jsonb end;
  v_manager:=v_ready->'manager_state'; v_budget:=(v_manager->>'optimizer_budget_tenths')::integer;
  v_body:=jsonb_build_object('gameweek',v_gw,'horizon',p_horizon,'weights',v_weights,'budget_tenths',v_budget,'bench_weight',0.12,'free_transfers',(v_manager->>'free_transfers')::integer,'transfer_cost_points',4,'model_error_margin_points',1.0,'manager_state_id',(v_manager->>'id')::bigint);
  v_req_id:=private.invoke_engine_ingest('fpl-full-pool-optimizer',v_body);
  insert into private.c0213_p2_optimizer_requests(request_id,gameweek,horizon,input_signature,manager_state_id,free_transfers,budget_tenths,prediction_runs,request_body)
  values(v_req_id,v_gw,p_horizon,v_sig,(v_manager->>'id')::bigint,(v_manager->>'free_transfers')::integer,v_budget,v_ready->'prediction_runs',v_body);
  return jsonb_build_object('ok',true,'status','DISPATCHED','gameweek',v_gw,'horizon',p_horizon,'request_id',v_req_id,'input_signature',v_sig,'capture',v_capture,'readiness',v_ready,'decisioning',false,'writes_manager_plan',false);
end $function$;
