begin;

update private.c0213_retired_external_retirement_manifest
set retirement_state='DELETED',
    physical_delete_allowed=false,
    runtime_traffic_visibility='MANAGEMENT_API_LOGS_ZERO_POST_CALLER_REMOVAL_DELETE_VERIFIED',
    evidence = coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'change_id','C0213',
      'caller_identified',true,
      'caller_component_key','EDGE_FUNCTION:sync-gw-results',
      'caller_source_path','supabase/functions/sync-gw-results/index.ts',
      'caller_removed_repo_commit','2a563e2ce8b8bfedc2f03a5b9c30818bffc05ba8',
      'caller_removed_runtime_version',5,
      'caller_removed_runtime_sha256','707639a43f3626036fec83f2b833c290f57595c5da2368133203a8c5e0ba5e01',
      'last_seen_at','2026-09-07T08:15:11.935Z',
      'post_fix_silence_start','2026-09-07T17:12:00Z',
      'post_fix_audit_gw_count',0,
      'post_fix_sync_proof_count',1,
      'silence_gate_workflow_run_id',34146790315,
      'delete_workflow_run_id',34146869734,
      'delete_guard_commit','24cfc335bbd14f901de489e0745e52df01e8a95d',
      'physical_delete_verified',true,
      'physical_deleted_at','2026-09-07T17:15:56Z',
      'hold_reason',null,
      'physical_delete_blocker',null,
      'repo_exact_caller_found',true,
      'traffic_hold',false
    ),
    verified_at=now(),
    updated_at=now()
where component_key='EDGE_FUNCTION:audit-gw'
  and runtime_id='c45d961c-f053-4b18-89c4-478a28f85d80'::uuid
  and runtime_version=3
  and runtime_sha256='a9612f244c875f019d887b39b3e0b74e720a2b7b4f370b128e5581d9811415ae';

update private.c0213_external_components
set active=false,
    deployment_status='DELETED',
    repo_path='project-management/retired-runtime-archive/20260906/audit-gw',
    evidence = coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'caller_component_key','EDGE_FUNCTION:sync-gw-results',
      'caller_removed_repo_commit','2a563e2ce8b8bfedc2f03a5b9c30818bffc05ba8',
      'last_seen_at','2026-09-07T08:15:11.935Z',
      'post_fix_audit_gw_count',0,
      'silence_gate_workflow_run_id',34146790315,
      'delete_workflow_run_id',34146869734,
      'physical_delete_verified',true,
      'physical_deleted_at','2026-09-07T17:15:56Z',
      'traffic_hold',false,
      'hold_reason',null
    ),
    notes='Legacy GW audit Edge runtime physically retired after canonical sync-gw-results caller was removed and hosted logs proved zero post-fix traffic. Database-native audit/governance remains canonical.',
    updated_at=now()
where component_key='EDGE_FUNCTION:audit-gw';

update private.c0213_external_components
set runtime_version=5,
    evidence = coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'runtime_id','b491fc7f-eecd-4ac5-9354-228671cd8f8e',
      'runtime_sha256','707639a43f3626036fec83f2b833c290f57595c5da2368133203a8c5e0ba5e01',
      'retired_audit_gw_side_call_removed',true,
      'caller_cleanup_repo_commit','2a563e2ce8b8bfedc2f03a5b9c30818bffc05ba8',
      'live_proof_request_id',3501,
      'live_proof_http_status',200,
      'live_proof_result_run_id',185,
      'live_proof_unchanged',true,
      'silence_gate_workflow_run_id',34146790315
    ),
    notes='Canonical result-sync runtime. C0213 removed obsolete fire-and-forget audit-gw side-call; v5 live proof returned unchanged=true and no retired endpoint traffic.',
    updated_at=now()
where component_key='EDGE_FUNCTION:sync-gw-results';

commit;
