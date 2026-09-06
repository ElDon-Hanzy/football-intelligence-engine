create or replace function private.c0213_p2_current_lineage_v02(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare
  v jsonb;
  v_gw integer;
  v_prev integer;
  v_result_id bigint;
  v_result_final boolean:=false;
  v_expected_starters integer:=0;
  v_role_mapped integer:=0;
  v_role_at timestamptz;
  v_role_cron_status text;
  v_role_cron_at timestamptz;
  v_role_ready boolean:=false;
  v_optimizer_ready boolean:=false;
  v_evidence_ready boolean:=false;
  v_decision_ready boolean:=false;
  v_blockers jsonb;
  v_lineage jsonb;
begin
  v:=private.c0213_p2_current_lineage_v01(p_gameweek);
  if not coalesce((v->>'ok')::boolean,false) then return v; end if;
  v_gw:=(v->>'gameweek')::integer;
  v_prev:=(v->>'previous_gameweek')::integer;

  select id,is_final into v_result_id,v_result_final
  from public.gameweek_result_runs where gameweek=v_prev
  order by observed_at desc,id desc limit 1;

  if v_result_id is not null then
    select count(distinct player_id) filter(where starts>0)
      into v_expected_starters
    from public.player_gameweek_actuals
    where result_run_id=v_result_id and gameweek=v_prev;
  end if;

  select max(captured_at),count(distinct player_id) filter(where mapping_status<>'UNMAPPED')
    into v_role_at,v_role_mapped
  from public.realized_player_role_observations
  where gameweek=v_prev;

  select run_status,end_time into v_role_cron_status,v_role_cron_at
  from private.c0213_p2_latest_cron_runs_v01 where jobid=26;

  v_role_ready:=coalesce(v_result_final,false)
    and v_expected_starters>0
    and v_role_mapped>=v_expected_starters
    and coalesce(v_role_cron_status='succeeded',false)
    and v_role_cron_at>=clock_timestamp()-interval '2 hours';

  select exists(
    select 1 from jsonb_array_elements(v->'lineage') x
    where x->>'stage'='FULL_POOL_OPTIMIZER' and x->>'state'='READY'
  ) into v_optimizer_ready;
  select exists(
    select 1 from jsonb_array_elements(v->'lineage') x
    where x->>'stage'='DECISION_READINESS' and x->>'state'='READY'
  ) into v_evidence_ready;

  v_decision_ready:=coalesce((v->>'projection_ready')::boolean,false)
    and coalesce(v_result_final,false)
    and v_role_ready
    and v_optimizer_ready
    and v_evidence_ready;

  select coalesce(jsonb_agg(
    case
      when x->>'stage'='REALIZED_ROLES' then
        x || jsonb_build_object(
          'state',case when not coalesce(v_result_final,false) then 'WAITING_FOR_FINAL_RESULTS' when v_role_ready then 'READY' else 'BLOCKED' end,
          'data_at',v_role_at,
          'mapped_starters',v_role_mapped,
          'expected_starters',v_expected_starters,
          'source_result_run_id',v_result_id,
          'coverage_ratio',case when v_expected_starters>0 then round(v_role_mapped::numeric/v_expected_starters,4) else null end
        )
      when x->>'stage'='SAVED_MANAGER_PLAN' then
        x || jsonb_build_object(
          'state',case when x->'manager_plan_id' is not null and x->>'manager_plan_id'<>'null' then 'READY' when v_decision_ready then 'MISSING_REQUIRED_OUTPUT' else 'NOT_YET_ALLOWED' end
        )
      else x
    end order by (x->>'stage_order')::integer
  ),'[]'::jsonb) into v_lineage
  from jsonb_array_elements(v->'lineage') x;

  select coalesce(jsonb_agg(b),'[]'::jsonb) into v_blockers
  from jsonb_array_elements(v->'blockers') b
  where b->>'code'<>'REALIZED_ROLE_REFRESH_INCOMPLETE'
    and b->>'code'<>'MANAGER_PLAN_MISSING_AFTER_READINESS';

  if coalesce(v_result_final,false) and not v_role_ready then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object(
      'stage','REALIZED_ROLES','code','REALIZED_ROLE_REFRESH_INCOMPLETE',
      'mapped_starters',v_role_mapped,'expected_starters',v_expected_starters,
      'source_result_run_id',v_result_id
    ));
  end if;

  if v_decision_ready and not exists(
    select 1 from public.fpl_manager_plans where gameweek=v_gw
  ) then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','SAVED_MANAGER_PLAN','code','MANAGER_PLAN_MISSING_AFTER_READINESS'));
  end if;

  return (v - 'lineage' - 'blockers' - 'decision_ready' - 'contract_version')
    || jsonb_build_object(
      'lineage',v_lineage,
      'blockers',v_blockers,
      'decision_ready',v_decision_ready,
      'contract_version','C0213_P2_V02',
      'realized_role_latest_result_fix',true
    );
end $$;

revoke all on function private.c0213_p2_current_lineage_v02(integer) from public,anon,authenticated;
grant execute on function private.c0213_p2_current_lineage_v02(integer) to service_role;

create or replace function private.capture_c0213_p2_lineage_v01(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path='private','public','pg_temp'
as $$
declare v jsonb; v_id bigint;
begin
  v:=private.c0213_p2_current_lineage_v02(p_gameweek);
  if not coalesce((v->>'ok')::boolean,false) then return v; end if;
  insert into private.c0213_p2_lineage_snapshots(gameweek,projection_ready,decision_ready,lineage,blockers,source_manifest)
  values((v->>'gameweek')::integer,(v->>'projection_ready')::boolean,(v->>'decision_ready')::boolean,v->'lineage',v->'blockers',jsonb_build_object('contract_version',v->>'contract_version','captured_at',v->>'captured_at'))
  returning id into v_id;
  return v||jsonb_build_object('lineage_snapshot_id',v_id,'status','CAPTURED');
end $$;
