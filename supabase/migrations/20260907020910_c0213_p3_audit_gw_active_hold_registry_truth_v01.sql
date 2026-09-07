-- C0213 P3: audit-gw remains physically ACTIVE because recent Management API
-- logs show engine-owned FootballIntelligence/0.3 traffic. Keep deployment_status
-- exactly ACTIVE so architecture consolidation counts it as a live RETIRED blocker.

update private.c0213_external_components
set deployment_status='ACTIVE',
    active=true,
    evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'traffic_hold',true,
      'hold_reason','RECENT_15_MIN_ENGINE_OWNED_TRAFFIC_CALLER_NOT_YET_LOCATED',
      'last_seen_at','2026-09-06T22:45:09.485Z',
      'user_agent','FootballIntelligence/0.3',
      'caller_forensics_workflow_run_id',34074994748
    ),
    updated_at=clock_timestamp()
where lifecycle='RETIRED' and component_name='audit-gw';
