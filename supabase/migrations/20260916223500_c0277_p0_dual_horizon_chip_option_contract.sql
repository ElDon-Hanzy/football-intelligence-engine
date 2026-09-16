create or replace function private.c0277_dual_horizon_chip_option_status_v01(p_gameweek integer, p_exact_decision_horizon integer default 3, p_seasonal_chip_end_gameweek integer default 19)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
 v_exact jsonb; v_struct jsonb; v_exact_weeks int[]; v_struct_weeks int[]; v_expected int;
 v_exact_complete boolean; v_struct_complete boolean; v_bounded boolean; v_rec text;
begin
 if p_gameweek is null or p_exact_decision_horizon < 1 or p_exact_decision_horizon > 5 or p_seasonal_chip_end_gameweek < p_gameweek then
   return jsonb_build_object('ok',false,'status','C0277_INVALID_HORIZON_CONTRACT','change_id','C0277','historical_forecasts_rewritten',false);
 end if;
 v_exact := private.c0276_bounded_chip_option_value_status_v01(p_gameweek,p_exact_decision_horizon);
 v_struct := private.c0248_structural_chip_window_status_v01(p_gameweek);
 if not coalesce((v_exact->>'ok')::boolean,false) then
   return jsonb_build_object('ok',false,'status','C0277_EXACT_HORIZON_NOT_READY','change_id','C0277','exact_decision_horizon',p_exact_decision_horizon,'seasonal_chip_end_gameweek',p_seasonal_chip_end_gameweek,'exact_status',v_exact->>'status','historical_forecasts_rewritten',false);
 end if;
 if not coalesce((v_struct->>'ok')::boolean,false) then
   return jsonb_build_object('ok',false,'status','C0277_STRUCTURAL_HORIZON_NOT_READY','change_id','C0277','exact_decision_horizon',p_exact_decision_horizon,'seasonal_chip_end_gameweek',p_seasonal_chip_end_gameweek,'structural_status',v_struct->>'status','historical_forecasts_rewritten',false);
 end if;
 select coalesce(array_agg(x::int order by x::int),'{}'::int[]) into v_exact_weeks from jsonb_array_elements_text(coalesce(v_struct->'exact_numerical_gameweeks','[]'::jsonb)) x where x::int between p_gameweek and p_seasonal_chip_end_gameweek;
 select coalesce(array_agg(x::int order by x::int),'{}'::int[]) into v_struct_weeks from jsonb_array_elements_text(coalesce(v_struct->'structural_only_gameweeks','[]'::jsonb)) x where x::int between p_gameweek and p_seasonal_chip_end_gameweek;
 v_expected := p_seasonal_chip_end_gameweek-p_gameweek+1;
 v_exact_complete := coalesce(array_length(v_exact_weeks,1),0) >= least(p_exact_decision_horizon,v_expected);
 v_struct_complete := (coalesce(array_length(v_exact_weeks,1),0)+coalesce(array_length(v_struct_weeks,1),0)) >= v_expected;
 v_bounded := coalesce((v_exact->>'bounded_no_chip_robust')::boolean,false);
 v_rec := case when v_bounded and v_struct_complete then 'NONE' else 'UNRESOLVED' end;
 return jsonb_build_object('ok',true,'status','C0277_DUAL_HORIZON_CONTRACT_V01_EVALUATED','change_id','C0277','gameweek',p_gameweek,'exact_decision_horizon',p_exact_decision_horizon,'exact_planner_run_id',(v_exact->>'planner_run_id')::bigint,'seasonal_chip_end_gameweek',p_seasonal_chip_end_gameweek,'seasonal_window_length',v_expected,'exact_numerical_gameweeks',to_jsonb(v_exact_weeks),'structural_only_gameweeks',to_jsonb(v_struct_weeks),'exact_horizon_coverage_complete',v_exact_complete,'seasonal_structural_coverage_complete',v_struct_complete,'season_best_chip_weeks_resolved',coalesce((v_struct->>'season_best_chip_weeks_resolved')::boolean,false),'bounded_current_no_chip_robust',v_bounded,'recommended_current_chip',v_rec,'authorization_class',case when v_rec='NONE' then 'PRESERVE' else 'UNRESOLVED_FAIL_CLOSED' end,'exact_option_value',v_exact,'policy',jsonb_build_object('exact_and_seasonal_horizons_are_distinct',true,'no_fabricated_future_player_precision',true,'structural_future_evidence_can_reserve_option_value',true,'structural_future_evidence_cannot_authorize_chip_spend',true,'only_robust_play_may_eventually_authorize_chip',true,'c0248_remains_selected_path_authority',true,'does_not_execute',true),'historical_forecasts_rewritten',false);
end $$;
revoke all on function private.c0277_dual_horizon_chip_option_status_v01(integer,integer,integer) from public;
grant execute on function private.c0277_dual_horizon_chip_option_status_v01(integer,integer,integer) to service_role;
