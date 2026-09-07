create or replace function private.run_c0213_behavioral_consumption_tests_v01(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','private','public'
as $$
declare
  v_gw integer;
  v_run bigint;
  c record;
  v_opp bigint;
  v_pappear numeric;
  v_adj_a numeric; v_adj_b numeric;
  v_goal_a numeric; v_goal_b numeric;
  v_assist_a numeric; v_assist_b numeric;
  v_p10_a numeric; v_p10_b numeric;
  v_inserted integer:=0;
begin
  v_gw:=coalesce(p_gameweek,(select m.gameweek from public.matches m where m.source='fpl' and m.gameweek is not null and m.kickoff_time>clock_timestamp() order by m.kickoff_time limit 1));
  if v_gw is null then raise exception 'No future FPL gameweek available for C0213 behavioral audit'; end if;
  select max(id) into v_run from public.gameweek_prediction_runs where gameweek=v_gw;
  if v_run is null then raise exception 'No prediction run for gameweek %',v_gw; end if;

  select mp.player_id,mp.match_id,p.team_id,p.position,mp.expected_minutes,mp.expected_points,mp.p_start,
         (mp.features->>'team_lambda')::numeric team_lambda,(mp.features->>'opp_lambda')::numeric opp_lambda,
         (mp.features#>>'{point_distribution,events,goal_lambda}')::numeric goal_lambda,
         (mp.features#>>'{point_distribution,events,assist_lambda}')::numeric assist_lambda,
         (mp.features#>>'{point_distribution,events,p_dc}')::numeric p_dc,
         (mp.features#>>'{point_distribution,events,p_bonus}')::numeric p_bonus,
         (mp.features->>'fixture_cutoff')::timestamptz cutoff,
         coalesce((mp.features#>>'{point_distribution,minute_model,p_no_appearance}')::numeric,0) p_no_appearance
  into c
  from public.model_predictions mp join public.players p on p.id=mp.player_id
  where mp.prediction_run_id=v_run and mp.expected_minutes>60
    and coalesce((mp.features#>>'{point_distribution,events,goal_lambda}')::numeric,0)>0.2
    and coalesce((mp.features#>>'{point_distribution,events,assist_lambda}')::numeric,0)>0.1
  order by mp.expected_points desc limit 1;
  if not found then raise exception 'No suitable behavioral probe player in prediction run %',v_run; end if;
  select case when home_team_id=c.team_id then away_team_id else home_team_id end into v_opp from public.matches where id=c.match_id;
  v_pappear:=greatest(0,least(1,1-c.p_no_appearance));

  v_adj_a:=private.fpl_adjusted_team_lambda_v01(c.team_id,v_opp,1.5,c.cutoff);
  v_adj_b:=private.fpl_adjusted_team_lambda_v01(c.team_id,v_opp,1.2,c.cutoff);
  v_goal_a:=private.fpl_fixture_goal_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff);
  v_goal_b:=private.fpl_fixture_goal_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff);
  v_assist_a:=private.fpl_fixture_assist_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda,c.cutoff);
  v_assist_b:=private.fpl_fixture_assist_lambda_v02(c.player_id,c.expected_minutes,c.team_lambda*0.8,c.cutoff);
  v_p10_a:=(private.fpl_current_event_distribution_v01(c.position,c.expected_minutes,c.p_start,v_pappear,c.goal_lambda,c.assist_lambda,c.opp_lambda,c.p_dc,c.p_bonus,c.expected_points)->>'p_10_plus')::numeric;
  v_p10_b:=(private.fpl_current_event_distribution_v01(c.position,c.expected_minutes,c.p_start,v_pappear,c.goal_lambda*0.5,c.assist_lambda,c.opp_lambda,c.p_dc,c.p_bonus,c.expected_points)->>'p_10_plus')::numeric;

  insert into private.c0213_behavioral_consumption_tests(component_key,test_key,test_type,status,component_definition_hash,evidence)
  select k,'P4_TEAM_LAMBDA_PERTURBATION','NUMERIC_PERTURBATION',case when abs(v_adj_a-v_adj_b)>0.000001 then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'prediction_run_id',v_run,'probe_player_id',c.player_id,'probe_match_id',c.match_id,'adjusted_base_1_5',v_adj_a,'adjusted_base_1_2',v_adj_b,'delta',v_adj_a-v_adj_b) from (values('DB_FUNCTION:private.fpl_adjusted_team_lambda_v01(p_team_id bigint, p_opp_team_id bigint, p_base_lambda numeric, p_cutoff timestamp with time zone)')) v(k)
  union all select k,'P4_EVENT_DISTRIBUTION_GOAL_HALF','NUMERIC_PERTURBATION',case when abs(v_p10_a-v_p10_b)>0.000001 then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'prediction_run_id',v_run,'probe_player_id',c.player_id,'p10_base',v_p10_a,'p10_goal_lambda_half',v_p10_b,'delta',v_p10_a-v_p10_b) from (values('DB_FUNCTION:private.fpl_current_event_distribution_v01(p_position text, p_xmin numeric, p_pstart numeric, p_pappear numeric, p_goal_lambda numeric, p_assist_lambda numeric, p_opp_lambda numeric, p_pdc numeric, p_pbonus numeric, p_target_xpts numeric)')) v(k)
  union all select k,'P4_ASSIST_LAMBDA_TEAM_LAMBDA_DOWN20','NUMERIC_PERTURBATION',case when abs(v_assist_a-v_assist_b)>0.000001 then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'prediction_run_id',v_run,'probe_player_id',c.player_id,'assist_base',v_assist_a,'assist_down20_team_lambda',v_assist_b,'delta',v_assist_a-v_assist_b) from (values('DB_FUNCTION:private.fpl_fixture_assist_lambda_v02(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone)')) v(k)
  union all select k,'P4_GOAL_LAMBDA_TEAM_LAMBDA_DOWN20','NUMERIC_PERTURBATION',case when abs(v_goal_a-v_goal_b)>0.000001 then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'prediction_run_id',v_run,'probe_player_id',c.player_id,'goal_base',v_goal_a,'goal_down20_team_lambda',v_goal_b,'delta',v_goal_a-v_goal_b) from (values('DB_FUNCTION:private.fpl_fixture_goal_lambda_v02(p_player_id bigint, p_xmin numeric, p_team_lambda numeric, p_cutoff timestamp with time zone)')) v(k)
  union all select k,'P4_PROJECTION_CORE_OUTPUT_LINEAGE','OUTPUT_LINEAGE',case when (select count(*) from public.model_predictions where prediction_run_id=v_run)>0 and (select count(*) from public.model_predictions where prediction_run_id=v_run and features ? 'point_distribution')=(select count(*) from public.model_predictions where prediction_run_id=v_run) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'prediction_run_id',v_run,'projection_rows',(select count(*) from public.model_predictions where prediction_run_id=v_run),'distribution_feature_rows',(select count(*) from public.model_predictions where prediction_run_id=v_run and features ? 'point_distribution')) from (values('DB_FUNCTION:private.generate_upcoming_fpl_projection_core_v01(p_gameweek integer, p_force boolean)')) v(k)
  union all select k,'P4_C0159_SIGNED_EFFECT_PRESENT','OUTPUT_LINEAGE',case when exists(select 1 from public.current_production_fixture_prediction_v01 fx cross join lateral jsonb_array_elements(fx.change_reasons) r where fx.gameweek=v_gw and r->>'type'='C0147_PROMOTED_BOUNDED' and abs(coalesce((r->>'home_log')::numeric,0))+abs(coalesce((r->>'away_log')::numeric,0))>0) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'fixtures_with_nonzero_c0159',(select count(distinct fx.match_id) from public.current_production_fixture_prediction_v01 fx cross join lateral jsonb_array_elements(fx.change_reasons) r where fx.gameweek=v_gw and r->>'type'='C0147_PROMOTED_BOUNDED' and abs(coalesce((r->>'home_log')::numeric,0))+abs(coalesce((r->>'away_log')::numeric,0))>0)) from (values('DB_FUNCTION:private.refresh_c0159_production_fixture_forecasts_v01(p_gameweek integer)')) v(k)
  union all select k,'P4_C0166_SIGNED_EFFECT_PRESENT','OUTPUT_LINEAGE',case when exists(select 1 from public.current_production_fixture_prediction_v01 where gameweek=v_gw and abs(coalesce((source_snapshot->>'evidence_home_log_adjustment')::numeric,0))+abs(coalesce((source_snapshot->>'evidence_away_log_adjustment')::numeric,0))>0) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'nonzero_adjustment_rows',(select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw and abs(coalesce((source_snapshot->>'evidence_home_log_adjustment')::numeric,0))+abs(coalesce((source_snapshot->>'evidence_away_log_adjustment')::numeric,0))>0),'abs_log_cap',0.04) from (values('DB_FUNCTION:private.refresh_c0166_production_fixture_forecasts_v01(p_gameweek integer)')) v(k)
  union all select k,'P4_CURRENT_SEASON_STATE_NONUNIT','STATE_SELECTION',case when exists(select 1 from public.current_season_team_performance_states where fpl_effect_enabled and (abs(attack_factor-1)>0.000001 or abs(defence_factor-1)>0.000001)) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('enabled_state_rows',(select count(*) from public.current_season_team_performance_states where fpl_effect_enabled),'nonunit_state_rows',(select count(*) from public.current_season_team_performance_states where fpl_effect_enabled and (abs(attack_factor-1)>0.000001 or abs(defence_factor-1)>0.000001))) from (values('DB_FUNCTION:private.refresh_current_season_team_performance_v01(p_season_start integer, p_as_of timestamp with time zone)')) v(k)
  union all select k,'P4_TACTICAL_BASE_ROWS_EXIST','STATE_SELECTION',case when exists(select 1 from public.fixture_tactical_matchup_observations where gameweek=v_gw and evidence->>'method'='fixture_tactical_matchup_v0.1') then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'base_rows',(select count(*) from public.fixture_tactical_matchup_observations where gameweek=v_gw and evidence->>'method'='fixture_tactical_matchup_v0.1')) from (values('DB_FUNCTION:public.refresh_fixture_tactical_matchups_v01(p_gameweek integer)')) v(k)
  union all select k,'P4_TACTICAL_CALIBRATED_SELECTOR','STATE_SELECTION',case when (select count(*) from public.current_fixture_tactical_matchups where gameweek=v_gw)>0 and (select count(*) from public.current_fixture_tactical_matchups where gameweek=v_gw and evidence->>'method'='fixture_tactical_matchup_v0.1.1')=(select count(*) from public.current_fixture_tactical_matchups where gameweek=v_gw) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'current_rows',(select count(*) from public.current_fixture_tactical_matchups where gameweek=v_gw),'current_calibrated_rows',(select count(*) from public.current_fixture_tactical_matchups where gameweek=v_gw and evidence->>'method'='fixture_tactical_matchup_v0.1.1')) from (values('DB_FUNCTION:public.refresh_fixture_tactical_matchups_v011(p_gameweek integer)')) v(k)
  union all select k,'P4_ROLE_PROFILE_REALIZED_OVERLAY','STATE_SELECTION',case when exists(select 1 from public.current_player_role_profiles cp join public.current_realized_player_roles rr using(player_id) where cp.primary_role=rr.latest_realized_role) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('overlap_rows',(select count(*) from public.current_player_role_profiles cp join public.current_realized_player_roles rr using(player_id)),'matching_realized_primary_roles',(select count(*) from public.current_player_role_profiles cp join public.current_realized_player_roles rr using(player_id) where cp.primary_role=rr.latest_realized_role),'numeric_role_uplift_enabled',false) from (values('DB_RELATION:public.current_player_role_profiles')) v(k)
  union all select k,'P4_CURRENT_FIXTURE_SELECTOR_C0166','STATE_SELECTION',case when (select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw)>0 and (select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw and source_snapshot->>'generator'='production_fixture_v0.3_c0166')=(select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('gameweek',v_gw,'current_fixture_rows',(select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw),'c0166_rows',(select count(*) from public.current_production_fixture_prediction_v01 where gameweek=v_gw and source_snapshot->>'generator'='production_fixture_v0.3_c0166')) from (values('DB_RELATION:public.current_production_fixture_prediction_v01')) v(k)
  union all select k,'P4_REALIZED_ROLE_STATE_PRESENT','STATE_SELECTION',case when exists(select 1 from public.current_realized_player_roles where latest_realized_role is not null) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('current_role_rows',(select count(*) from public.current_realized_player_roles),'realized_role_rows',(select count(*) from public.current_realized_player_roles where latest_realized_role is not null)) from (values('DB_RELATION:public.current_realized_player_roles')) v(k)
  union all select k,'P4_OPTIMIZER_READONLY_BEHAVIOR','RUNTIME_PROBE',case when exists(select 1 from public.fpl_full_pool_optimizer_runs where result_status='OPTIMIZED_READ_ONLY' and decisioning=false and writes_manager_plan=false) then 'PASS' else 'FAIL' end,private.c0213_component_definition_hash_v01(k),jsonb_build_object('latest_run',(select to_jsonb(x) from (select id,gameweek,horizon,optimizer_version,objective,objective_gap_to_second,edge_classification,search_exact,decisioning,writes_manager_plan,result_status from public.fpl_full_pool_optimizer_runs order by id desc limit 1) x)) from (values('EDGE_FUNCTION:fpl-full-pool-optimizer')) v(k);
  get diagnostics v_inserted=row_count;
  return private.c0213_behavioral_consumption_status_v01()||jsonb_build_object('gameweek_tested',v_gw,'prediction_run_id',v_run,'new_test_rows',v_inserted,'probe_player_id',c.player_id,'probe_match_id',c.match_id);
end $$;
revoke all on function private.run_c0213_behavioral_consumption_tests_v01(integer) from public,anon,authenticated;
grant execute on function private.run_c0213_behavioral_consumption_tests_v01(integer) to service_role;

insert into private.c0213_change_consumption_contracts(change_id,pathway,consumer_or_evaluator_ref,evidence)
select c.change_id,'LEGACY_RECONCILED','C0213 historical reconciliation',jsonb_build_object('status',c.status,'delivery_stage',c.delivery_stage,'model_effect',c.model_effect,'implementation_refs',to_jsonb(c.implementation_refs),'reconciled_by','C0213_P4')
from public.change_tracker_working c
where c.status='Completed' and c.delivery_stage='Verified'
  and not (lower(coalesce(c.model_effect,'')) in ('n/a','none') or lower(coalesce(c.model_effect,'')) like 'none %' or lower(coalesce(c.model_effect,'')) like 'none —%' or lower(coalesce(c.model_effect,'')) like 'no direct model effect%' or lower(coalesce(c.model_effect,'')) like 'audit only%' or lower(coalesce(c.model_effect,'')) like 'presentation/%' or lower(coalesce(c.model_effect,'')) like 'presentation %')
on conflict(change_id) do nothing;

insert into private.c0213_change_consumption_contracts(change_id,pathway,consumer_or_evaluator_ref,evidence) values
('C0034','BLOCKED_EXTERNAL_SOURCE','third normalized pre-kickoff Correct Score source','{"reason":"external provider output unavailable; no model effect until source gate passes"}'::jsonb),
('C0049','RESEARCH_INFRASTRUCTURE','A0005/W0001 forward validation infrastructure','{"role":"self-evaluator infrastructure"}'::jsonb),
('C0066','RESEARCH_EVALUATOR_OR_GATE','private.signal_effect_promotion_gate_status_v01() + A0005','{"promotion":"forward validation required"}'::jsonb),
('C0074','RESEARCH_EVALUATOR_OR_GATE','private.signal_effect_promotion_gate_status_v01() + A0005','{"promotion":"interaction terms require stable incremental forward value"}'::jsonb),
('C0082','BLOCKED_EXTERNAL_SOURCE','licensed spatial/tracking source gate','{"reason":"true spatial/pressing/line-height evidence unavailable"}'::jsonb),
('C0091','RESEARCH_EVALUATOR_OR_GATE','A0004/C0049 forward ablation infrastructure','{"promotion":"quality/absence layer remains observational until forward ablation"}'::jsonb),
('C0104','RESEARCH_EVALUATOR_OR_GATE','private.a0005_forward_validation_status_v01()','{"promotion":"GW2 validation + GW3 test manual gate"}'::jsonb),
('C0105','RESEARCH_EVALUATOR_OR_GATE','private.a0005_forward_validation_status_v01()','{"promotion":"candidate vs baseline forward comparison"}'::jsonb),
('C0112','RESEARCH_EVALUATOR_OR_GATE','private.a0005_forward_validation_status_v01()','{"promotion":"persistent Elo forward validation"}'::jsonb),
('C0120','RESEARCH_EVALUATOR_OR_GATE','private.c0120_forward_evaluation_v01()','{"experiment":"E0007"}'::jsonb),
('C0139','RESEARCH_INFRASTRUCTURE','private.c0139_zero_cost_source_status_v01() + private.c0139_fotmob_metric_status_v01()','{"model_effect_enabled":false}'::jsonb),
('C0154','RESEARCH_EVALUATOR_OR_GATE','C0154 chronology-safe holdout/forward gate + C0196 selector/tail audit','{"production":"only bounded derivative via C0159; research artifact unchanged"}'::jsonb),
('C0166','PRODUCTION_CONSUMER','private.refresh_c0166_production_fixture_forecasts_v01(integer)','{"bounded_abs_log_cap":0.04,"audit":"private.c0166_production_evidence_audit_v01(integer)"}'::jsonb),
('C0203','PROGRAM_UMBRELLA','C0204-C0211 child contracts','{"mixed_program":true}'::jsonb),
('C0206','RESEARCH_EVALUATOR_OR_GATE','C0206 backtest/sensitivity + governed prior eligibility','{"shadow_until_validated":true}'::jsonb)
on conflict(change_id) do update set pathway=excluded.pathway,consumer_or_evaluator_ref=excluded.consumer_or_evaluator_ref,evidence=excluded.evidence,verified_at=clock_timestamp();
