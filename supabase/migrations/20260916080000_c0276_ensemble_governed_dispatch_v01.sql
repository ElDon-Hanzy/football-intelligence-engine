-- C0276 Autonomous Decision Orchestration: governed ENSEMBLE dispatch.
-- Production-applied 2026-09-16. Fail-closed, idempotent per cycle/optimizer lineage.
create table if not exists private.c0276_ensemble_requests (
  id bigint generated always as identity primary key,
  cycle_id bigint not null references public.fpl_decision_cycles(id),
  request_id bigint not null,
  gameweek integer not null,
  horizon integer not null,
  optimizer_run_id bigint not null,
  input_signature text not null,
  requested_at timestamptz not null default now(),
  unique(cycle_id,input_signature)
);

create or replace function private.c0276_dispatch_ensemble_v01(p_cycle_id bigint)
returns jsonb language plpgsql security definer set search_path=private,public,pg_temp as $$
declare v_cycle record; v_opt_id bigint; v_sig text; v_req bigint; v_last record; v_body jsonb; v_ft integer;
begin
 perform pg_advisory_xact_lock(hashtext('C0276_ENSEMBLE_DISPATCH_'||p_cycle_id::text));
 select * into v_cycle from public.fpl_decision_cycles where id=p_cycle_id;
 if not found then return jsonb_build_object('ok',false,'status','BLOCKED','reason','CYCLE_NOT_FOUND'); end if;
 if not exists(select 1 from public.fpl_decision_cycle_nodes where cycle_id=p_cycle_id and node_key='OPTIMIZER' and status='READY') then return jsonb_build_object('ok',false,'status','BLOCKED','reason','OPTIMIZER_NOT_READY','cycle_id',p_cycle_id); end if;
 select artifact_run_id into v_opt_id from public.fpl_decision_cycle_nodes where cycle_id=p_cycle_id and node_key='OPTIMIZER';
 v_sig:=md5(p_cycle_id::text||'|'||v_cycle.gameweek::text||'|'||coalesce(v_opt_id,0)::text||'|C0228_ENSEMBLE_AGGREGATOR_V02_SEQUENTIAL');
 select q.id,q.request_id,r.status_code into v_last from private.c0276_ensemble_requests q left join net._http_response r on r.id=q.request_id where q.cycle_id=p_cycle_id and q.input_signature=v_sig order by q.id desc limit 1;
 if v_last.id is not null then return jsonb_build_object('ok',true,'status',case when v_last.status_code is null then 'RUNNING' else 'DISPATCHED_ALREADY' end,'cycle_id',p_cycle_id,'request_id',v_last.request_id,'http_status',v_last.status_code,'input_signature',v_sig,'decisioning',false,'writes_manager_plan',false); end if;
 select free_transfers into v_ft from public.fpl_manager_state_snapshots where id=v_cycle.manager_state_id;
 v_body:=jsonb_build_object('gameweek',v_cycle.gameweek,'horizon',v_cycle.horizon,'free_transfers',coalesce(v_ft,1),'model_error_margin_points',1.0);
 v_req:=private.invoke_engine_ingest('fpl-autonomy-ensemble',v_body);
 insert into private.c0276_ensemble_requests(cycle_id,request_id,gameweek,horizon,optimizer_run_id,input_signature) values(p_cycle_id,v_req,v_cycle.gameweek,v_cycle.horizon,v_opt_id,v_sig);
 update public.fpl_decision_cycle_nodes set status='RUNNING',status_reason='C0276_GOVERNED_ENSEMBLE_DISPATCH',updated_at=now() where cycle_id=p_cycle_id and node_key='ENSEMBLE' and status in ('STALE','FAILED');
 return jsonb_build_object('ok',true,'status','DISPATCHED','cycle_id',p_cycle_id,'request_id',v_req,'optimizer_run_id',v_opt_id,'input_signature',v_sig,'decisioning',false,'writes_manager_plan',false,'historical_forecasts_rewritten',false);
end $$;
revoke all on function private.c0276_dispatch_ensemble_v01(bigint) from public,anon,authenticated;
