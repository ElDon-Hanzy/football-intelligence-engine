create or replace function private.c0213_p2_current_lineage_v01(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path='private','public','cron','pg_temp'
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_gw integer:=p_gameweek; v_prev integer; v_fixture_count integer:=0;
  v_result_id bigint; v_result_at timestamptz; v_result_final boolean:=false;
  v_sync_id bigint; v_sync_at timestamptz; v_sync_status text; v_sync_rows integer:=0;
  v_role_at timestamptz; v_role_mapped integer:=0; v_expected_starters integer:=0;
  v_player_at timestamptz; v_player_rows integer:=0;
  v_team_at timestamptz; v_team_rows integer:=0;
  v_tact_at timestamptz; v_tact_rows integer:=0; v_tact_calibrated integer:=0; v_tact_min_cov numeric;
  v_fix_at timestamptz; v_fix_rows integer:=0;
  v_proj_id bigint; v_proj_at timestamptz; v_proj_rows integer:=0;
  v_cov_id bigint; v_projectable integer:=0; v_governed integer:=0; v_ungoverned integer:=999999;
  v_dist_rows integer:=0;
  v_opt_id bigint; v_opt_at timestamptz; v_opt_horizon integer; v_opt_prediction_runs jsonb; v_opt_status text;
  v_dec_event_id bigint; v_dec_event_at timestamptz; v_dec jsonb;
  v_auto_decision_id bigint; v_manager_plan_id bigint; v_manager_plan_at timestamptz; v_manager_plan_status text;
  r1 record; r3 record; r5 record; r13 record; r17 record; r20 record; r25 record; r26 record;
  b_fpl boolean; b_player boolean; b_team boolean; b_tactical boolean; b_fixture boolean; b_projection boolean; b_distribution boolean; b_roles boolean; b_optimizer boolean;
  v_projection_ready boolean; v_decision_ready boolean; v_blockers jsonb:='[]'::jsonb; v_lineage jsonb;
begin
  if v_gw is null then
    select x.gameweek into v_gw from (
      select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at
      from public.matches m where m.source='fpl' and m.gameweek between 1 and 38 group by m.gameweek
    ) x where x.deadline_at>v_now order by x.gameweek limit 1;
  end if;
  if v_gw is null then return jsonb_build_object('ok',false,'status','NO_FUTURE_GAMEWEEK','change_id','C0213','phase','P2'); end if;
  v_prev:=v_gw-1;
  select count(*) into v_fixture_count from public.matches where source='fpl' and gameweek=v_gw;

  select id,observed_at,is_final into v_result_id,v_result_at,v_result_final
  from public.gameweek_result_runs where gameweek=v_prev order by observed_at desc,id desc limit 1;

  select id,finished_at,status,coalesce(rows_inserted,0) into v_sync_id,v_sync_at,v_sync_status,v_sync_rows
  from public.source_sync_runs where source='official_fpl_current_price_history' order by finished_at desc nulls last,id desc limit 1;

  select max(captured_at),count(distinct player_id) filter(where mapping_status<>'UNMAPPED') into v_role_at,v_role_mapped
  from public.realized_player_role_observations where gameweek=v_prev;
  select count(*) into v_expected_starters from public.player_gameweek_actuals where gameweek=v_prev and starts>0;

  select max(as_of),count(*) into v_player_at,v_player_rows from public.current_player_state_latest;
  select max(as_of),count(*) into v_team_at,v_team_rows from public.current_season_team_performance_latest;
  select max(captured_at),count(*),count(*) filter(where evidence->>'method'='fixture_tactical_matchup_v0.1.1'),min(data_coverage)
    into v_tact_at,v_tact_rows,v_tact_calibrated,v_tact_min_cov
  from public.current_fixture_tactical_matchups where gameweek=v_gw;
  select max(captured_at),count(*) into v_fix_at,v_fix_rows from public.current_production_fixture_prediction_v01 where gameweek=v_gw;

  select id,generated_at,coalesce((metadata->>'projection_rows')::integer,0) into v_proj_id,v_proj_at,v_proj_rows
  from public.gameweek_prediction_runs where gameweek=v_gw order by generated_at desc,id desc limit 1;

  select id,coalesce(projectable_count,0),coalesce(governed_excluded_count,0),coalesce(ungoverned_missing_count,999999)
    into v_cov_id,v_projectable,v_governed,v_ungoverned
  from public.fpl_projection_coverage_audits where gameweek=v_gw order by captured_at desc,id desc limit 1;

  if v_proj_id is not null then
    select count(*) into v_dist_rows from public.model_predictions
    where prediction_run_id=v_proj_id and features ? 'point_distribution';
  end if;

  select id,captured_at,horizon,prediction_runs,result_status into v_opt_id,v_opt_at,v_opt_horizon,v_opt_prediction_runs,v_opt_status
  from public.fpl_full_pool_optimizer_runs where gameweek=v_gw order by captured_at desc,id desc limit 1;

  select id,checked_at into v_dec_event_id,v_dec_event_at from public.c0167_audit_events where gameweek=v_gw order by checked_at desc,id desc limit 1;
  v_dec:=private.c0213_decision_readiness_v01(v_gw);

  if v_proj_id is not null then
    select id into v_auto_decision_id from public.decision_snapshots where gameweek=v_gw and prediction_run_id=v_proj_id order by captured_at desc,id desc limit 1;
  end if;
  select id,captured_at,status into v_manager_plan_id,v_manager_plan_at,v_manager_plan_status from public.fpl_manager_plans where gameweek=v_gw order by captured_at desc,id desc limit 1;

  select * into r1 from private.c0213_p2_latest_cron_runs_v01 where jobid=1;
  select * into r3 from private.c0213_p2_latest_cron_runs_v01 where jobid=3;
  select * into r5 from private.c0213_p2_latest_cron_runs_v01 where jobid=5;
  select * into r13 from private.c0213_p2_latest_cron_runs_v01 where jobid=13;
  select * into r17 from private.c0213_p2_latest_cron_runs_v01 where jobid=17;
  select * into r20 from private.c0213_p2_latest_cron_runs_v01 where jobid=20;
  select * into r25 from private.c0213_p2_latest_cron_runs_v01 where jobid=25;
  select * into r26 from private.c0213_p2_latest_cron_runs_v01 where jobid=26;

  b_fpl:=coalesce(v_sync_status='success',false) and v_sync_at>=v_now-interval '6 hours' and v_sync_rows>=600
         and coalesce(r25.run_status='succeeded',false) and r25.end_time>=v_now-interval '6 hours';
  b_player:=v_player_rows>=greatest(v_projectable,500) and coalesce(r3.run_status='succeeded',false) and r3.end_time>=v_now-interval '6 hours';
  b_team:=v_team_rows=20 and coalesce(r17.run_status='succeeded',false) and r17.end_time>=v_now-interval '2 hours';
  b_tactical:=v_fixture_count>0 and v_tact_rows=v_fixture_count*10 and v_tact_calibrated=v_tact_rows
              and coalesce(r5.run_status='succeeded',false) and r5.end_time>=v_now-interval '14 hours';
  b_fixture:=v_fixture_count>0 and v_fix_rows=v_fixture_count and coalesce(r20.run_status='succeeded',false) and r20.end_time>=v_now-interval '45 minutes';
  b_projection:=v_proj_id is not null and v_proj_rows=v_projectable and v_ungoverned=0
                and coalesce(r13.run_status='succeeded',false) and r13.end_time>=v_now-interval '20 minutes';
  b_distribution:=v_proj_id is not null and v_dist_rows=v_proj_rows and v_proj_rows>0;
  b_roles:=coalesce(v_result_final,false) and v_expected_starters>0 and v_role_mapped>=v_expected_starters
           and coalesce(r26.run_status='succeeded',false) and r26.end_time>=v_now-interval '2 hours';
  b_optimizer:=v_opt_id is not null and coalesce(v_opt_status='OPTIMIZED_READ_ONLY',false)
               and v_opt_horizon between 3 and 5 and v_opt_at>=coalesce(v_proj_at,'epoch'::timestamptz)
               and exists(select 1 from jsonb_array_elements(coalesce(v_opt_prediction_runs,'[]'::jsonb)) x where (x->>'gameweek')::integer=v_gw and (x->>'run_id')::bigint=v_proj_id);

  v_projection_ready:=b_fpl and b_player and b_team and b_tactical and b_fixture and b_projection and b_distribution;
  v_decision_ready:=v_projection_ready and coalesce(v_result_final,false) and b_roles and b_optimizer and coalesce((v_dec->>'ok')::boolean,false);

  if not b_fpl then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','FPL_CURRENT_DATA','code','FPL_SOURCE_NOT_READY')); end if;
  if not b_player then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','PLAYER_STATE','code','PLAYER_STATE_NOT_READY')); end if;
  if not b_team then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','TEAM_STATE','code','TEAM_STATE_NOT_READY')); end if;
  if not b_tactical then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','TACTICAL_FIXTURE_STATE','code','TACTICAL_STATE_NOT_READY')); end if;
  if not b_fixture then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','FIXTURE_PROJECTION','code','FIXTURE_PROJECTION_NOT_READY')); end if;
  if not b_projection then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','PLAYER_PROJECTION','code','PLAYER_PROJECTION_NOT_READY')); end if;
  if not b_distribution then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','POINT_DISTRIBUTION','code','POINT_DISTRIBUTION_NOT_READY')); end if;
  if not coalesce(v_result_final,false) then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','RESULTS','code','PRIOR_GAMEWEEK_NOT_FINAL','gameweek',v_prev)); end if;
  if coalesce(v_result_final,false) and not b_roles then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','REALIZED_ROLES','code','REALIZED_ROLE_REFRESH_INCOMPLETE','mapped_starters',v_role_mapped,'expected_starters',v_expected_starters)); end if;
  if not b_optimizer then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','FULL_POOL_OPTIMIZER','code',case when v_opt_id is null then 'OPTIMIZER_NOT_RUN' when coalesce(v_opt_horizon,0)<3 then 'OPTIMIZER_HORIZON_LT_3' else 'OPTIMIZER_NOT_CURRENT' end,'optimizer_run_id',v_opt_id,'horizon',v_opt_horizon)); end if;
  if not coalesce((v_dec->>'ok')::boolean,false) then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','DECISION_READINESS','code','C0166_C0167_NOT_READY')); end if;
  if v_decision_ready and v_manager_plan_id is null then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','SAVED_MANAGER_PLAN','code','MANAGER_PLAN_MISSING_AFTER_READINESS')); end if;

  v_lineage:=jsonb_build_array(
    jsonb_build_object('stage_order',10,'stage','RESULTS','state',case when v_result_final then 'READY' when v_result_id is null then 'MISSING' else 'IN_PROGRESS' end,'data_run_id',v_result_id,'data_at',v_result_at,'orchestrator_run_id',r1.runid,'orchestrator_status',r1.run_status,'orchestrator_at',r1.end_time,'required_for_projection',false,'required_for_decision',true),
    jsonb_build_object('stage_order',20,'stage','FPL_CURRENT_DATA','state',case when b_fpl then 'READY' else 'BLOCKED' end,'data_run_id',v_sync_id,'data_at',v_sync_at,'rows',v_sync_rows,'orchestrator_run_id',r25.runid,'orchestrator_status',r25.run_status,'orchestrator_at',r25.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',30,'stage','REALIZED_ROLES','state',case when not coalesce(v_result_final,false) then 'WAITING_FOR_FINAL_RESULTS' when b_roles then 'READY' else 'BLOCKED' end,'data_at',v_role_at,'mapped_starters',v_role_mapped,'expected_starters',v_expected_starters,'orchestrator_run_id',r26.runid,'orchestrator_status',r26.run_status,'orchestrator_at',r26.end_time,'required_for_projection',false,'required_for_decision',true),
    jsonb_build_object('stage_order',40,'stage','PLAYER_STATE','state',case when b_player then 'READY' else 'BLOCKED' end,'data_at',v_player_at,'rows',v_player_rows,'orchestrator_run_id',r3.runid,'orchestrator_status',r3.run_status,'orchestrator_at',r3.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',50,'stage','TEAM_STATE','state',case when b_team then 'READY' else 'BLOCKED' end,'data_at',v_team_at,'rows',v_team_rows,'orchestrator_run_id',r17.runid,'orchestrator_status',r17.run_status,'orchestrator_at',r17.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',60,'stage','TACTICAL_FIXTURE_STATE','state',case when b_tactical then 'READY' else 'BLOCKED' end,'data_at',v_tact_at,'rows',v_tact_rows,'calibrated_rows',v_tact_calibrated,'min_coverage',v_tact_min_cov,'orchestrator_run_id',r5.runid,'orchestrator_status',r5.run_status,'orchestrator_at',r5.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',70,'stage','FIXTURE_PROJECTION','state',case when b_fixture then 'READY' else 'BLOCKED' end,'data_at',v_fix_at,'rows',v_fix_rows,'expected_rows',v_fixture_count,'orchestrator_run_id',r20.runid,'orchestrator_status',r20.run_status,'orchestrator_at',r20.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',80,'stage','PLAYER_PROJECTION','state',case when b_projection then 'READY' else 'BLOCKED' end,'prediction_run_id',v_proj_id,'generated_at',v_proj_at,'projection_rows',v_proj_rows,'projectable_rows',v_projectable,'governed_excluded',v_governed,'ungoverned_missing',v_ungoverned,'coverage_audit_id',v_cov_id,'orchestrator_run_id',r13.runid,'orchestrator_status',r13.run_status,'orchestrator_at',r13.end_time,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',90,'stage','POINT_DISTRIBUTION','state',case when b_distribution then 'READY' else 'BLOCKED' end,'prediction_run_id',v_proj_id,'rows',v_dist_rows,'expected_rows',v_proj_rows,'required_for_projection',true,'required_for_decision',true),
    jsonb_build_object('stage_order',100,'stage','FULL_POOL_OPTIMIZER','state',case when b_optimizer then 'READY' when v_opt_id is null then 'NOT_RUN' when coalesce(v_opt_horizon,0)<3 then 'ENGINEERING_ONLY_HORIZON' else 'STALE' end,'optimizer_run_id',v_opt_id,'captured_at',v_opt_at,'horizon',v_opt_horizon,'result_status',v_opt_status,'required_for_projection',false,'required_for_decision',true),
    jsonb_build_object('stage_order',110,'stage','DECISION_READINESS','state',case when coalesce((v_dec->>'ok')::boolean,false) then 'READY' else 'BLOCKED' end,'audit_event_id',v_dec_event_id,'audit_at',v_dec_event_at,'detail',v_dec,'required_for_projection',false,'required_for_decision',true),
    jsonb_build_object('stage_order',120,'stage','AUTOMATED_CURRENT15_DECISION','state',case when v_auto_decision_id is not null then 'SAVED_FOR_CURRENT_RUN' when not v_decision_ready then 'BLOCKED_EXPECTED' else 'ABSENT' end,'decision_snapshot_id',v_auto_decision_id,'prediction_run_id',v_proj_id,'required_for_projection',false,'required_for_decision',false),
    jsonb_build_object('stage_order',130,'stage','SAVED_MANAGER_PLAN','state',case when v_manager_plan_id is not null then 'READY' when v_decision_ready then 'MISSING_REQUIRED_OUTPUT' else 'NOT_YET_ALLOWED' end,'manager_plan_id',v_manager_plan_id,'captured_at',v_manager_plan_at,'status',v_manager_plan_status,'required_for_projection',false,'required_for_decision',true)
  );

  return jsonb_build_object('ok',true,'change_id','C0213','phase','P2_ORCHESTRATION_READINESS_LINEAGE','contract_version','C0213_P2_V01','captured_at',v_now,'gameweek',v_gw,'previous_gameweek',v_prev,'fixture_count',v_fixture_count,'projection_ready',v_projection_ready,'decision_ready',v_decision_ready,'blockers',v_blockers,'lineage',v_lineage,'historical_forecasts_rewritten',false,'missing_data_is_not_zero',true);
end $$;

revoke all on function private.c0213_p2_current_lineage_v01(integer) from public,anon,authenticated;
grant execute on function private.c0213_p2_current_lineage_v01(integer) to service_role;

create or replace function private.capture_c0213_p2_lineage_v01(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare v jsonb; v_id bigint;
begin
  v:=private.c0213_p2_current_lineage_v01(p_gameweek);
  if not coalesce((v->>'ok')::boolean,false) then return v; end if;
  insert into private.c0213_p2_lineage_snapshots(gameweek,projection_ready,decision_ready,lineage,blockers,source_manifest)
  values((v->>'gameweek')::integer,(v->>'projection_ready')::boolean,(v->>'decision_ready')::boolean,v->'lineage',v->'blockers',jsonb_build_object('contract_version',v->>'contract_version','captured_at',v->>'captured_at'))
  returning id into v_id;
  return v||jsonb_build_object('lineage_snapshot_id',v_id,'status','CAPTURED');
end $$;
revoke all on function private.capture_c0213_p2_lineage_v01(integer) from public,anon,authenticated;
grant execute on function private.capture_c0213_p2_lineage_v01(integer) to service_role;
