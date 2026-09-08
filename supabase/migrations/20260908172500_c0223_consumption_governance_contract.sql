-- C0223 — machine-readable production consumption contract.
insert into private.c0213_change_consumption_contracts(change_id,pathway,consumer_or_evaluator_ref,evidence,verified_at)
values(
 'C0223','PRODUCTION_CONSUMER',
 'VIEW:public.current_production_fixture_prediction_v01 + DB_FUNCTION:private.c0223_horizon_player_state_integrity_v01 + DB_FUNCTION:private.c0220_forecast_integrity_v01 + DB_FUNCTION:private.generate_upcoming_fpl_projection_core_v01 + EDGE_FUNCTION:fpl-full-pool-optimizer:v9',
 jsonb_build_object(
   'contract','C0223_EXACT_HORIZON_ROLE_AWARE_INTEGRATION_V01',
   'future_only',true,
   'canonical_fixture_selector',true,
   'projection_core_uses_canonical_selector',true,
   'exact_target_gw_state_required',true,
   'target_gw_state_ready',jsonb_build_object('GW4',true,'GW5',true,'GW6',true,'GW7',true,'GW8',true),
   'gw6_projection_run',1350,
   'gw6_projection_rows',604,
   'optimizer_version','C0223_ROLE_AWARE_FULL_POOL_V01',
   'optimizer_edge_version',9,
   'optimizer_test_request_id',3805,
   'numeric_role_points_adjustment',false,
   'role_decision_control_only',true,
   'research_model_promotions',jsonb_build_object('C0197',false,'C0202',false,'A0005',false,'W0002',false,'C0210',false,'C0211',false,'C0216',false),
   'historical_forecasts_rewritten',false
 ),clock_timestamp())
on conflict(change_id) do update set pathway=excluded.pathway,consumer_or_evaluator_ref=excluded.consumer_or_evaluator_ref,evidence=excluded.evidence,verified_at=excluded.verified_at;
