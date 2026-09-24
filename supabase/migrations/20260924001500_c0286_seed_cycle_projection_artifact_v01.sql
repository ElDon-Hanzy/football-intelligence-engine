-- C0286: a decision cycle's target-GW prediction run is its first mandatory
-- lineage artifact.  Leaving PLAYER_PROJECTION empty makes the governed
-- dispatcher regenerate or block despite a frozen target run already being
-- selected by the cycle.

create or replace function private.c0276_open_cycle_v01(
  p_gameweek integer,
  p_horizon integer default 3
) returns jsonb
language plpgsql
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
declare
  v_cycle bigint;
  v_mgr bigint;
  v_runs bigint[];
  v_target_run bigint;
  v_fix text;
  v_ps timestamptz;
  v_sig text;
begin
  select id into v_mgr
  from public.fpl_manager_state_snapshots
  where gameweek=p_gameweek
  order by captured_at desc,id desc
  limit 1;

  select array_agg(id order by gameweek) into v_runs
  from (
    select distinct on (gameweek) gameweek,id
    from public.gameweek_prediction_runs
    where gameweek between p_gameweek and p_gameweek+p_horizon-1
      and run_type='pre_deadline' and frozen=true
    order by gameweek,generated_at desc,id desc
  ) q;
  v_target_run := v_runs[1];

  v_fix:=private.c0276_fixture_signature_v01(p_gameweek);
  v_ps:=private.c0276_player_state_cutoff_v01();
  v_sig:=md5(coalesce(v_mgr::text,'')||'|'||coalesce(v_runs::text,'')||'|'||coalesce(v_fix,'')||'|'||coalesce(v_ps::text,''));

  select id into v_cycle
  from public.fpl_decision_cycles
  where gameweek=p_gameweek and horizon=p_horizon and input_signature=v_sig
  order by id desc
  limit 1;

  if v_cycle is null then
    insert into public.fpl_decision_cycles(
      change_id,gameweek,horizon,manager_state_id,prediction_run_ids,
      fixture_lineage_signature,player_state_cutoff,input_signature,status,
      status_reason,historical_forecasts_rewritten
    ) values (
      'C0276',p_gameweek,p_horizon,v_mgr,v_runs,v_fix,v_ps,v_sig,'RUNNING',
      'CYCLE_INSTANTIATED',false
    ) returning id into v_cycle;

    insert into public.fpl_decision_cycle_nodes(
      cycle_id,node_key,artifact_run_id,status,status_reason
    )
    select v_cycle,node_key,
      case when node_key='PLAYER_PROJECTION' then v_target_run else null end,
      case when node_key in ('FIXTURE_STATE','PLAYER_STATE') then 'READY' else 'STALE' end,
      case when node_key='PLAYER_PROJECTION' then 'CYCLE_INSTANTIATED_TARGET_GW_FROZEN_RUN' else 'CYCLE_INSTANTIATED' end
    from private.fpl_decision_dependency_dag
    where enabled
    order by ordinal;
  else
    -- Safe idempotent repair for cycles created by the previous initializer.
    update public.fpl_decision_cycle_nodes
    set artifact_run_id=v_target_run,
        status_reason='C0286_BACKFILLED_TARGET_GW_FROZEN_RUN',
        updated_at=clock_timestamp()
    where cycle_id=v_cycle and node_key='PLAYER_PROJECTION'
      and artifact_run_id is null and v_target_run is not null;
  end if;

  return private.c0276_cycle_health_v01(v_cycle);
end;
$$;

revoke all on function private.c0276_open_cycle_v01(integer,integer) from public,anon,authenticated;
grant execute on function private.c0276_open_cycle_v01(integer,integer) to service_role;
