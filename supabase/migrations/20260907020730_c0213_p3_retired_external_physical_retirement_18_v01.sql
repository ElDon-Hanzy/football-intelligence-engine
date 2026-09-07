-- C0213 P3: reconcile 18 physically retired external runtimes after guarded
-- Supabase Management API deletion. audit-gw remains on explicit traffic HOLD.

do $$
declare
  v_deleted text[] := array[
    'c0206-build-understat-foreign-pairs','c0206-fit-translation-shadow-v01','fpl-dashboard',
    'generate-fixture-predictions','generate-fpl-predictions','generate-fpl-predictions-v012',
    'generate-fpl-predictions-v013','optimize-fpl-squad','projection-benchmark-api','publish-dashboard',
    'refresh-player-state','refresh-player-state-v012','refresh-team-state','sync-core-insights',
    'sync-current-team-meta','sync-fpl','sync-historical-priors','sync-team-priors'
  ];
begin
  if (select count(*) from private.c0213_retired_external_retirement_manifest where slug=any(v_deleted)) <> 18 then
    raise exception 'C0213 retirement manifest does not contain exact 18 approved targets';
  end if;
  if exists (
    select 1 from private.c0213_retired_external_retirement_manifest
    where slug=any(v_deleted)
      and (durable_rollback_source_status <> 'REPO_SOURCE_PRESENT' or static_dependency_proof_ok is not true)
  ) then
    raise exception 'C0213 approved retirement target failed rollback/static proof gate';
  end if;

  update private.c0213_retired_external_retirement_manifest
  set retirement_state='DELETED',
      physical_delete_allowed=false,
      runtime_traffic_visibility='MANAGEMENT_API_LOGS_AUDITED_20260820_TO_20260907',
      evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
        'physical_delete_verified',true,
        'physical_delete_workflow_run_id',34075158188,
        'physical_delete_workflow_commit','7de99737ad89891a7fe0d06e861682200a24b2a9',
        'traffic_audit_workflow_run_id',34074665804,
        'traffic_audit_window_start','2026-08-20T00:00:00Z',
        'traffic_audit_completed_at','2026-09-07T01:59:53Z',
        'management_api_runtime_identity_verified',true,
        'rollback_source_preserved',true
      ),
      verified_at=clock_timestamp(),
      updated_at=clock_timestamp()
  where slug=any(v_deleted);

  update private.c0213_retired_external_retirement_manifest
  set retirement_state='HOLD',
      physical_delete_allowed=false,
      runtime_traffic_visibility='MANAGEMENT_API_TRAFFIC_HOLD',
      evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
        'traffic_audit_workflow_run_id',34074665804,
        'recent_forensics_workflow_run_id',34074870999,
        'caller_forensics_workflow_run_id',34074994748,
        'historical_non_options_invocations',184,
        'last_seen_at','2026-09-06T22:45:09.485Z',
        'recent_user_agent','FootballIntelligence/0.3',
        'repo_exact_caller_found',false,
        'db_function_cron_view_exact_caller_found',false,
        'hold_reason','RECENT_15_MIN_ENGINE_OWNED_TRAFFIC_CALLER_NOT_YET_LOCATED'
      ),
      verified_at=clock_timestamp(),
      updated_at=clock_timestamp()
  where slug='audit-gw';

  update private.c0213_external_components
  set active=false,
      deployment_status='DELETED',
      evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
        'physical_delete_verified',true,
        'workflow_run_id',34075158188,
        'workflow_commit','7de99737ad89891a7fe0d06e861682200a24b2a9'
      ),
      updated_at=clock_timestamp()
  where lifecycle='RETIRED' and component_name=any(v_deleted);

  update private.c0213_external_components
  set active=true,
      deployment_status='ACTIVE_TRAFFIC_HOLD',
      evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
        'traffic_hold',true,
        'last_seen_at','2026-09-06T22:45:09.485Z',
        'user_agent','FootballIntelligence/0.3',
        'caller_forensics_workflow_run_id',34074994748
      ),
      updated_at=clock_timestamp()
  where lifecycle='RETIRED' and component_name='audit-gw';
end $$;
