-- C0277 P1 — reservation-value evidence contract.
-- Future option value is never fabricated as points. Structural windows can reserve optionality but cannot authorize chip spend.
create or replace function private.c0277_reservation_value_status_v01(p_gameweek integer, p_exact_decision_horizon integer default 3, p_seasonal_chip_end_gameweek integer default 19)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 v_dual jsonb; v_struct jsonb; v_exact jsonb; v_nonstandard jsonb; v_double jsonb; v_blank jsonb;
 v_bb numeric; v_tc numeric; v_fh numeric; v_wc numeric; v_fh_break numeric; v_wc_break numeric;
 v_struct_complete boolean; v_best_resolved boolean;
begin
 v_dual:=private.c0277_dual_horizon_chip_option_status_v01(p_gameweek,p_exact_decision_horizon,p_seasonal_chip_end_gameweek);
 if not coalesce((v_dual->>'ok')::boolean,false) then return jsonb_build_object('ok',false,'status','C0277_DUAL_HORIZON_NOT_READY','change_id','C0277','upstream',v_dual,'historical_forecasts_rewritten',false); end if;
 v_struct:=private.c0248_structural_chip_window_status_v01(p_gameweek); v_exact:=v_dual->'exact_option_value';
 v_nonstandard:=coalesce(v_struct->'confirmed_nonstandard_structural_gameweeks','[]'::jsonb); v_double:=coalesce(v_struct->'confirmed_double_or_multi_gameweeks','[]'::jsonb); v_blank:=coalesce(v_struct->'confirmed_blank_gameweeks','[]'::jsonb);
 v_struct_complete:=coalesce((v_dual->>'seasonal_structural_coverage_complete')::boolean,false); v_best_resolved:=coalesce((v_dual->>'season_best_chip_weeks_resolved')::boolean,false);
 v_bb:=coalesce((v_exact->'bench_boost'->>'current_incremental_ev')::numeric,0); v_tc:=coalesce((v_exact->'triple_captain'->>'current_incremental_ev')::numeric,0); v_fh:=coalesce((v_exact->'free_hit'->>'current_edge')::numeric,0); v_wc:=coalesce((v_exact->'wildcard'->>'current_edge')::numeric,0);
 v_fh_break:=greatest(v_fh,0); v_wc_break:=greatest(v_wc,0);
 return jsonb_build_object('ok',true,'status','C0277_RESERVATION_VALUE_V01_EVALUATED','change_id','C0277','gameweek',p_gameweek,'exact_decision_horizon',p_exact_decision_horizon,'seasonal_chip_end_gameweek',p_seasonal_chip_end_gameweek,'structural_coverage_complete',v_struct_complete,'season_best_chip_weeks_resolved',v_best_resolved,
 'chips',jsonb_build_object(
  'BENCH_BOOST',jsonb_build_object('current_incremental_ev',round(v_bb,3),'reservation_class',case when jsonb_array_length(v_double)>0 then 'RESERVE_CONFIRMED_NONSTANDARD_OPPORTUNITY' else 'RESERVE_UNRESOLVED_FUTURE_OPTION' end,'reserved_structural_gameweeks',v_double,'numeric_future_reservation_value_points',null,'authorization_allowed',false),
  'TRIPLE_CAPTAIN',jsonb_build_object('current_incremental_ev',round(v_tc,3),'reservation_class',case when jsonb_array_length(v_double)>0 then 'RESERVE_CONFIRMED_NONSTANDARD_OPPORTUNITY' else 'RESERVE_UNRESOLVED_FUTURE_OPTION' end,'reserved_structural_gameweeks',v_double,'numeric_future_reservation_value_points',null,'authorization_allowed',false),
  'FREE_HIT',jsonb_build_object('current_incremental_ev',round(v_fh,3),'current_break_even_future_option_value_points',round(v_fh_break,3),'reservation_class',case when jsonb_array_length(v_nonstandard)>0 then 'RESERVE_CONFIRMED_BGW_DGW_ASYMMETRY' else 'RESERVE_UNRESOLVED_FUTURE_OPTION' end,'reserved_structural_gameweeks',v_nonstandard,'numeric_future_reservation_value_points',null,'authorization_allowed',false),
  'WILDCARD',jsonb_build_object('current_exact_horizon_edge',round(v_wc,3),'current_break_even_future_option_value_points',round(v_wc_break,3),'reservation_class','RESERVE_INFORMATION_AND_SQUAD_RESET_OPTION','reserved_structural_gameweeks','[]'::jsonb,'numeric_future_reservation_value_points',null,'authorization_allowed',false)),
 'one_chip_per_gameweek',jsonb_build_object('reserved_nonstandard_windows',v_nonstandard,'confirmed_double_windows',v_double,'confirmed_blank_windows',v_blank,'numeric_collision_ranking_authorized',v_best_resolved,'collision_policy','DO_NOT_DOUBLE_COUNT_SHARED_FUTURE_WINDOWS; RESERVATIONS ARE CONSTRAINT EVIDENCE, NOT ADDITIVE POINTS'),
 'current_action',jsonb_build_object('recommended_chip',v_dual->>'recommended_current_chip','authorization_class',v_dual->>'authorization_class','reservation_override_allowed',false),
 'policy',jsonb_build_object('reservation_value_is_not_fabricated_points',true,'unknown_future_option_value_is_not_zero',true,'structural_windows_reserve_optionality',true,'future_numeric_value_remains_null_without_decision_grade_evidence',true,'reservation_evidence_can_block_or_preserve_but_not_authorize_spend',true,'one_chip_per_gameweek_competition_preserved',true,'c0248_selected_path_authority_unchanged',true,'does_not_execute',true),'historical_forecasts_rewritten',false);
end $$;
revoke all on function private.c0277_reservation_value_status_v01(integer,integer,integer) from public;
grant execute on function private.c0277_reservation_value_status_v01(integer,integer,integer) to service_role;
