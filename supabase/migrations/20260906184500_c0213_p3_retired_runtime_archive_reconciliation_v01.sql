update private.c0213_retired_external_retirement_manifest
set repo_runtime_source_path = case slug
  when 'sync-fpl' then 'project-management/retired-runtime-archive/20260906/sync-fpl.bundle.json'
  when 'sync-core-insights' then 'project-management/retired-runtime-archive/20260906/sync-core-insights.bundle.json'
  when 'sync-historical-priors' then 'project-management/retired-runtime-archive/20260906/sync-historical-priors.bundle.json'
  when 'refresh-player-state' then 'project-management/retired-runtime-archive/20260906/refresh-player-state.bundle.json'
  when 'sync-team-priors' then 'project-management/retired-runtime-archive/20260906/sync-team-priors.bundle.json'
  when 'refresh-team-state' then 'project-management/retired-runtime-archive/20260906/refresh-team-state.bundle.json'
  when 'sync-current-team-meta' then 'project-management/retired-runtime-archive/20260906/sync-current-team-meta.bundle.json'
  when 'generate-fpl-predictions' then 'project-management/retired-runtime-archive/20260906/generate-fpl-predictions.bundle.json'
  when 'optimize-fpl-squad' then 'project-management/retired-runtime-archive/20260906/optimize-fpl-squad.bundle.json'
  when 'fpl-dashboard' then 'project-management/retired-runtime-archive/20260906/fpl-dashboard.bundle.json'
  when 'publish-dashboard' then 'project-management/retired-runtime-archive/20260906/publish-dashboard.bundle.json'
  when 'audit-gw' then 'project-management/retired-runtime-archive/20260906/audit-gw.bundle.json'
  when 'projection-benchmark-api' then 'project-management/retired-runtime-archive/20260906/projection-benchmark-api.bundle.json'
  when 'generate-fpl-predictions-v012' then 'project-management/retired-runtime-archive/20260906/generate-fpl-predictions-v012.bundle.json'
  when 'refresh-player-state-v012' then 'project-management/retired-runtime-archive/20260906/refresh-player-state-v012.bundle.json'
  when 'generate-fpl-predictions-v013' then 'project-management/retired-runtime-archive/20260906/generate-fpl-predictions-v013.bundle.json'
  when 'generate-fixture-predictions' then 'project-management/retired-runtime-archive/20260906/generate-fixture-predictions.bundle.json'
  when 'c0206-build-understat-foreign-pairs' then 'project-management/retired-runtime-archive/20260906/c0206-build-understat-foreign-pairs.bundle.json'
  else repo_runtime_source_path
end,
durable_rollback_source_status = 'REPO_SOURCE_PRESENT',
physical_delete_allowed = false,
rollback_requirement = case when slug='c0206-fit-translation-shadow-v01'
  then rollback_requirement
  else 'Exact live runtime bundle archived in GitHub; rollback by reconstructing the function from the recorded bundle with original verify_jwt setting and validating the recorded runtime SHA lineage.'
end,
evidence = coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
  'rollback_archive_verified', true,
  'archive_commit', '22ee2613a7d8ced3a18b3506b1c923a347b3c73b',
  'archive_date', '2026-09-06',
  'physical_delete_blocker', 'RUNTIME_TRAFFIC_VISIBILITY_AND_DELETE_TRANSPORT'
),
updated_at = now()
where retirement_state='STATIC_RETIREMENT_READY';
