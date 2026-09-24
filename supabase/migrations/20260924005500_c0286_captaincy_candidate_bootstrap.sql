-- C0286: captaincy is evaluated before publication in the governed DAG.  A
-- current, unpublished C0248 selected path is valid *evidence* for that gate,
-- but is never treated as a live/public plan or execution authorisation.

do $$
declare
  v_source text;
  v_missing constant text := $missing$  if v_plan is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_LIVE_PLAN');
  end if;$missing$;
  v_bootstrap constant text := $bootstrap$  if v_plan is null then
    select r.result#>'{summary,selected_normal_path,first_action}',
           r.prediction_run_ids[1]
      into v_plan,v_candidate_prediction_run_id
    from public.fpl_sequential_planner_runs r
    where r.gameweek=p_gameweek
      and r.result#>'{summary,selected_normal_path,first_action}' is not null
      and r.shadow_only=true
      and r.production_selected=false
    order by r.captured_at desc,r.id desc
    limit 1;
    if v_plan is null then
      return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_LIVE_PLAN_AND_CURRENT_CANDIDATE');
    end if;
    v_plan_source:='C0248_UNPUBLISHED_SELECTED_CANDIDATE';
  end if;$bootstrap$;
  v_run_guard constant text := $guard$  if v_run_id is null or v_run_at is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_CAPTAINCY_PROJECTION_RUN','publication_prediction_run_id',v_pub_run_id);
  end if;$guard$;
  v_run_guard_new constant text := $guard_new$  if v_run_id is null or v_run_at is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_CAPTAINCY_PROJECTION_RUN','publication_prediction_run_id',v_pub_run_id);
  end if;
  if v_plan_source='C0248_UNPUBLISHED_SELECTED_CANDIDATE'
     and v_candidate_prediction_run_id is distinct from v_run_id then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','STALE_CANDIDATE_PROJECTION_LINEAGE','candidate_prediction_run_id',v_candidate_prediction_run_id,'captaincy_prediction_run_id',v_run_id);
  end if;$guard_new$;
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0242_captaincy_equivalence_gate_v02'
    and pg_get_function_identity_arguments(p.oid)='p_gameweek integer, p_mean_error_band numeric';

  if v_source is null or position(v_missing in v_source)=0 or position(v_run_guard in v_source)=0 then
    raise exception 'C0286 expected C0242 bootstrap points were not found';
  end if;

  v_source:=replace(v_source,'  v_result jsonb;','  v_result jsonb;\n  v_plan_source text := ''LIVE_PUBLICATION'';\n  v_candidate_prediction_run_id bigint;');
  v_source:=replace(v_source,v_missing,v_bootstrap);
  v_source:=replace(v_source,v_run_guard,v_run_guard_new);
  v_source:=replace(v_source,'''publication_id'',v_pub_id,','''plan_source'',v_plan_source,''candidate_is_not_publication'',v_plan_source<>''LIVE_PUBLICATION'',''publication_id'',v_pub_id,');

  execute format(
    'create or replace function private.c0242_captaincy_equivalence_gate_v02(p_gameweek integer, p_mean_error_band numeric default 1.0) returns jsonb language plpgsql security definer set search_path to ''private'', ''public'', ''pg_temp'' as %L',
    v_source
  );
end
$$;
