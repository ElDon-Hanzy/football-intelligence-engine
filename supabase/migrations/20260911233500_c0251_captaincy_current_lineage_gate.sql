create or replace function private.c0242_captaincy_equivalence_gate_v02(
  p_gameweek integer,
  p_mean_error_band numeric default 1.0
)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','pg_temp'
as $$
declare
  v_plan jsonb;
  v_pub_id bigint;
  v_pub_run_id bigint;
  v_pub_at timestamptz;
  v_run_id bigint;
  v_run_at timestamptz;
  v_deadline timestamptz;
  v_is_current boolean;
  v_canon_count integer := 0;
  v_runfx_count integer := 0;
  v_fixture_mismatch integer := 0;
  v_latest_xi_state timestamptz;
  v_xi_projection_count integer := 0;
  v_result jsonb;
begin
  select id, plan, prediction_run_id, captured_at
    into v_pub_id, v_plan, v_pub_run_id, v_pub_at
  from public.fpl_live_plan_publications
  where gameweek=p_gameweek
  order by captured_at desc,id desc
  limit 1;

  if v_plan is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_LIVE_PLAN');
  end if;

  select min(kickoff_time)-interval '90 minutes'
    into v_deadline
  from public.matches
  where source='fpl' and gameweek=p_gameweek;

  if v_deadline is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_DEADLINE');
  end if;

  v_is_current := clock_timestamp() < v_deadline;

  if v_is_current then
    select r.id,r.generated_at
      into v_run_id,v_run_at
    from public.gameweek_prediction_runs r
    where r.gameweek=p_gameweek
      and r.run_type='pre_deadline'
      and r.frozen=true
      and r.generated_at < v_deadline
      and (select count(*) from public.model_predictions mp where mp.prediction_run_id=r.id and mp.gameweek=p_gameweek) >= 550
    order by r.generated_at desc,r.id desc
    limit 1;
  else
    v_run_id:=v_pub_run_id;
    select generated_at into v_run_at from public.gameweek_prediction_runs where id=v_run_id;
  end if;

  if v_run_id is null or v_run_at is null then
    return jsonb_build_object('ok',false,'change_id','C0251','gameweek',p_gameweek,'status','MISSING_CAPTAINCY_PROJECTION_RUN','publication_prediction_run_id',v_pub_run_id);
  end if;

  if v_is_current then
    with canon as (
      select match_id,captured_at
      from public.current_production_fixture_prediction_v01
      where gameweek=p_gameweek and is_pre_kickoff=true
    ), runfx as (
      select match_id,max((features->>'fixture_cutoff')::timestamptz) fixture_cutoff
      from public.model_predictions
      where prediction_run_id=v_run_id and gameweek=p_gameweek
      group by match_id
    )
    select (select count(*) from canon),
           (select count(*) from runfx),
           count(*) filter(where r.match_id is null or r.fixture_cutoff is distinct from c.captured_at)
      into v_canon_count,v_runfx_count,v_fixture_mismatch
    from canon c left join runfx r using(match_id);

    if v_canon_count=0 or v_runfx_count<>v_canon_count or v_fixture_mismatch>0 then
      return jsonb_build_object(
        'ok',false,'change_id','C0251','gameweek',p_gameweek,'status','STALE_FIXTURE_LINEAGE',
        'captaincy_prediction_run_id',v_run_id,'publication_prediction_run_id',v_pub_run_id,
        'canonical_fixture_count',v_canon_count,'run_fixture_count',v_runfx_count,'fixture_mismatch_count',v_fixture_mismatch,
        'policy','FAIL_CLOSED_UNTIL_CURRENT_CANONICAL_FIXTURE_LINEAGE_IS_PROJECTED'
      );
    end if;

    with xi as (
      select (jsonb_array_elements_text(v_plan->'starting_xi'))::bigint player_id
    )
    select max(s.as_of)
      into v_latest_xi_state
    from xi join public.current_player_state_latest s using(player_id);

    if v_latest_xi_state is not null and v_latest_xi_state>v_run_at then
      return jsonb_build_object(
        'ok',false,'change_id','C0251','gameweek',p_gameweek,'status','STALE_PLAYER_STATE_LINEAGE',
        'captaincy_prediction_run_id',v_run_id,'projection_generated_at',v_run_at,'latest_xi_player_state_at',v_latest_xi_state,
        'policy','FAIL_CLOSED_UNTIL_CURRENT_XI_PLAYER_STATE_IS_PROJECTED'
      );
    end if;
  end if;

  with xi as (
    select (jsonb_array_elements_text(v_plan->'starting_xi'))::bigint player_id
  )
  select count(*) into v_xi_projection_count
  from xi join public.model_predictions mp on mp.prediction_run_id=v_run_id and mp.player_id=xi.player_id and mp.gameweek=p_gameweek;

  if v_xi_projection_count<>11 then
    return jsonb_build_object(
      'ok',false,'change_id','C0251','gameweek',p_gameweek,'status','INCOMPLETE_XI_PROJECTION_COVERAGE',
      'captaincy_prediction_run_id',v_run_id,'xi_projection_count',v_xi_projection_count
    );
  end if;

  with xi as (
    select (jsonb_array_elements_text(v_plan->'starting_xi'))::bigint player_id
  ), q as (
    select p.id player_id,p.web_name,mp.expected_points,mp.expected_minutes,mp.p_blank,mp.p_5_plus,mp.p_10_plus,mp.p_15_plus,mp.p_20_plus,
           (2*mp.p_10_plus+4*mp.p_15_plus+6*mp.p_20_plus) tail_signal
    from xi join public.players p on p.id=xi.player_id
    join public.model_predictions mp on mp.prediction_run_id=v_run_id and mp.player_id=xi.player_id and mp.gameweek=p_gameweek
  ), ranked as (
    select q.*,max(expected_points) over() top_mean,
           row_number() over(order by expected_points desc,player_id) mean_rank,
           row_number() over(order by tail_signal desc,player_id) tail_rank,
           row_number() over(order by p_blank asc,player_id) floor_rank
    from q
  ), eq as (
    select * from ranked where top_mean-expected_points<=p_mean_error_band
  )
  select jsonb_build_object(
    'ok',true,'change_id','C0251','contract_version','C0242_CAPTAINCY_LINEAGE_V02','gameweek',p_gameweek,
    'publication_id',v_pub_id,'publication_prediction_run_id',v_pub_run_id,
    'captaincy_prediction_run_id',v_run_id,'projection_generated_at',v_run_at,
    'lineage_mode',case when v_is_current then 'LATEST_CURRENT_ALIGNED_PROJECTION' else 'FROZEN_PUBLICATION_PROJECTION' end,
    'fixture_lineage_aligned',case when v_is_current then v_fixture_mismatch=0 and v_runfx_count=v_canon_count else null end,
    'canonical_fixture_count',case when v_is_current then v_canon_count else null end,
    'latest_xi_player_state_at',case when v_is_current then v_latest_xi_state else null end,
    'mean_error_band_points',p_mean_error_band,
    'decision_class',case when (select count(*) from eq)=1 then 'ROBUST_MEAN_EDGE' else 'NO_MEANINGFUL_EDGE' end,
    'nominal_mean_leader',(select jsonb_build_object('player_id',player_id,'name',web_name,'expected_points',expected_points) from ranked order by mean_rank limit 1),
    'tail_leader',(select jsonb_build_object('player_id',player_id,'name',web_name,'tail_signal',tail_signal,'p10',p_10_plus,'p15',p_15_plus,'p20',p_20_plus) from ranked order by tail_rank limit 1),
    'floor_leader',(select jsonb_build_object('player_id',player_id,'name',web_name,'p_blank',p_blank) from ranked order by floor_rank limit 1),
    'equivalent_candidates',(select jsonb_agg(jsonb_build_object('player_id',player_id,'name',web_name,'expected_points',expected_points,'expected_minutes',expected_minutes,'p_blank',p_blank,'p5',p_5_plus,'p10',p_10_plus,'p15',p_15_plus,'p20',p_20_plus,'tail_signal',tail_signal) order by expected_points desc) from eq),
    'policy',jsonb_build_object(
      'ownership_numeric_effect',false,
      'do_not_claim_edge_inside_error_band',true,
      'captaincy_separate_from_squad_optimizer',true,
      'nominal_default_may_exist_without_meaningful_edge',true,
      'current_gameweek_requires_latest_aligned_projection',true,
      'stale_fixture_or_player_state_lineage_fails_closed',true
    ),
    'historical_forecasts_rewritten',false
  ) into v_result;

  return v_result;
end;
$$;

create or replace function private.c0242_consistency_status_v01(p_gameweek integer, p_horizon integer default 5)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','pg_temp'
as $$
declare
  v_ch record; v_pre jsonb; v_cap jsonb; v_total integer:=0; v_resolved integer:=0; v_unresolved integer:=0; v_rows jsonb:='[]'::jsonb;
begin
  for v_ch in select id from public.fpl_named_challenger_registry where gameweek=p_gameweek and horizon=p_horizon and active=true order by id loop
    v_pre:=private.c0242_precheck_named_challenger_v01(v_ch.id);
  end loop;
  with active_reg as (
    select reg.id,reg.challenger_key,reg.description from public.fpl_named_challenger_registry reg where reg.gameweek=p_gameweek and reg.horizon=p_horizon and reg.active=true
  ), latest as (
    select distinct on (e.challenger_id) e.* from public.fpl_named_challenger_evaluations e join active_reg a on a.id=e.challenger_id order by e.challenger_id,e.evaluated_at desc,e.id desc
  )
  select count(*),
         count(*) filter(where l.evaluation_status in ('INFEASIBLE_CURRENT_STATE','BEATEN','EQUIVALENT','SURVIVOR')),
         count(*) filter(where l.id is null or l.evaluation_status not in ('INFEASIBLE_CURRENT_STATE','BEATEN','EQUIVALENT','SURVIVOR')),
         coalesce(jsonb_agg(jsonb_build_object('challenger_id',a.id,'challenger_key',a.challenger_key,'description',a.description,'evaluation_status',l.evaluation_status,'legal',l.legal,'legal_reason',l.legal_reason,'objective',l.objective,'evaluated_at',l.evaluated_at,'optimizer_request_id',l.optimizer_request_id) order by a.id),'[]'::jsonb)
  into v_total,v_resolved,v_unresolved,v_rows
  from active_reg a left join latest l on l.challenger_id=a.id;
  v_cap:=private.c0242_captaincy_equivalence_gate_v02(p_gameweek,1.0);
  return jsonb_build_object('ok',true,'change_id','C0242','contract_version','C0242_CONSISTENCY_V03','gameweek',p_gameweek,'horizon',p_horizon,'named_challengers',jsonb_build_object('total',v_total,'resolved',v_resolved,'unresolved',v_unresolved,'all_resolved',v_unresolved=0,'items',v_rows),'captaincy',v_cap,'decision_consistency_ready',v_unresolved=0 and coalesce((v_cap->>'ok')::boolean,false),'historical_forecasts_rewritten',false);
end;
$$;
