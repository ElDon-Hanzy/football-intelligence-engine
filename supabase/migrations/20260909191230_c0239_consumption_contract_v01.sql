-- C0239 — serving reliability consumption contract.
-- Registry/governance only. No numeric model effect; no historical forecast rewrite.

insert into private.c0213_change_consumption_contracts(
  change_id,
  pathway,
  consumer_or_evaluator_ref,
  evidence,
  verified_at
)
values (
  'C0239',
  'PRODUCTION_CONSUMER',
  'EDGE_FUNCTION:fpl-manager-plan-api:v8 + EDGE_FUNCTION:fpl-api:v13 + EDGE_FUNCTION:engine-diagnostics-api:v4 + CRON:c0239_engine_diagnostics_cache_v01 + UI_V2:FplPage + PLAYWRIGHT:C0239_LIVE_PLAN_AND_PAGE',
  jsonb_build_object(
    'contract','C0239_SERVING_RELIABILITY_V01',
    'serving_only',true,
    'numeric_model_effect',false,
    'diagnostics_decoupled',true,
    'live_horizon_normalized',true,
    'fpl_external_overlay_bounded_ms',1500,
    'diagnostics_cache_schedule','*/15 * * * *',
    'code_head','82c1699c0d46e415b8d8d17d367eb85b875a2c7a',
    'code_head_workflow_run',34392882372,
    'historical_forecasts_rewritten',false
  ),
  clock_timestamp()
)
on conflict (change_id) do update
set pathway = excluded.pathway,
    consumer_or_evaluator_ref = excluded.consumer_or_evaluator_ref,
    evidence = excluded.evidence,
    verified_at = excluded.verified_at;
