create table if not exists private.c0213_retired_external_retirement_manifest (
  component_key text primary key,
  slug text not null unique,
  runtime_kind text not null check (runtime_kind in ('EDGE_FUNCTION','API')),
  runtime_id uuid not null,
  runtime_version integer not null check (runtime_version > 0),
  runtime_sha256 text not null check (length(runtime_sha256)=64),
  verify_jwt boolean not null,
  canonical_successor text,
  dependency_graph_incoming integer not null default 0 check (dependency_graph_incoming >= 0),
  dependency_graph_outgoing integer not null default 0 check (dependency_graph_outgoing >= 0),
  exact_db_consumer_count integer not null default 0 check (exact_db_consumer_count >= 0),
  exact_active_cron_consumer_count integer not null default 0 check (exact_active_cron_consumer_count >= 0),
  repo_runtime_source_path text,
  durable_rollback_source_status text not null check (durable_rollback_source_status in ('REPO_SOURCE_PRESENT','NOT_ARCHIVED')),
  runtime_traffic_visibility text not null default 'UNAVAILABLE_IN_CURRENT_CONNECTOR',
  static_dependency_proof_ok boolean not null default false,
  retirement_state text not null check (retirement_state in ('STATIC_RETIREMENT_READY','PLATFORM_DELETE_PENDING','DELETED','HOLD')),
  physical_delete_allowed boolean not null default false,
  rollback_requirement text not null,
  evidence jsonb not null default '{}'::jsonb,
  verified_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

revoke all on private.c0213_retired_external_retirement_manifest from public, anon, authenticated;
grant select, insert, update, delete on private.c0213_retired_external_retirement_manifest to service_role;

insert into private.c0213_retired_external_retirement_manifest (
 component_key,slug,runtime_kind,runtime_id,runtime_version,runtime_sha256,verify_jwt,canonical_successor,
 dependency_graph_incoming,dependency_graph_outgoing,exact_db_consumer_count,exact_active_cron_consumer_count,
 repo_runtime_source_path,durable_rollback_source_status,static_dependency_proof_ok,retirement_state,physical_delete_allowed,
 rollback_requirement,evidence
) values
('EDGE_FUNCTION:sync-fpl','sync-fpl','EDGE_FUNCTION','317ae632-6ccd-4c06-850e-afb1d82681ac',3,'601e57dc2fd677d38ee7b4f97b73c97d1a039df648325109acb435c7f8e8f5f9',false,'EDGE_FUNCTION:sync-fpl-data',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before Management API/CLI delete; rollback by redeploying captured v3 bundle with original JWT setting.',jsonb_build_object('change_id','C0213','proof','0 exact live consumers; cron 25 substring false positive resolved to sync-fpl-data')),
('EDGE_FUNCTION:sync-core-insights','sync-core-insights','EDGE_FUNCTION','d04b2ad3-dbcf-4f43-9642-4c339c599826',2,'60edea9c11458d4a9c3d6ec0a673c0c073c38e90122e5379cd051508fd1fb66d',false,'EDGE_FUNCTION:ingest-competitive-core-stats',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; rollback by redeploying captured v2 bundle.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:sync-historical-priors','sync-historical-priors','EDGE_FUNCTION','5de70e01-4e89-4391-b28b-6fd8f2b98d31',3,'2ceef729877fabf6e76304e58ea32ff66e6f31aaf7bfb431bfb533c39b324214',false,null,0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; no canonical live caller depends on this legacy historical-prior endpoint.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:refresh-player-state','refresh-player-state','EDGE_FUNCTION','f9236778-73cd-4f37-a1e4-dea394a760e6',6,'e4a885bfebad7bec2342de7c9864ccb87709440115ab4f3ba111963c27fbaf3b',false,'EDGE_FUNCTION:refresh-current-player-state',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; rollback by redeploying captured v6 bundle.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:sync-team-priors','sync-team-priors','EDGE_FUNCTION','eaffe5be-2b50-49d0-b3ad-1f9158054640',2,'75f0e64e58c3a3833e5fd2415725bc04c1923b4f9f76c0c54ad8108b239d57c2',false,'DB_FUNCTION:private.refresh_current_season_team_performance_v01(p_season_start integer, p_as_of timestamp with time zone)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; current team assimilation is database-native.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:refresh-team-state','refresh-team-state','EDGE_FUNCTION','bba4223e-2db7-406d-9314-3edcce3c390b',1,'2b451011ebc329547da1703b30525c1e764e07d6f1af9f49c6cda4616af49808',false,'DB_FUNCTION:private.refresh_current_season_team_performance_v01(p_season_start integer, p_as_of timestamp with time zone)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; current team assimilation is database-native.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:sync-current-team-meta','sync-current-team-meta','EDGE_FUNCTION','50b3969a-7e53-4631-8d37-79d3eb6c0e64',2,'26ca7a950be73fc20e4b76cf32a141db5545a2e55145da27ed090df2f8ef28e5',false,'EDGE_FUNCTION:sync-fpl-data',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; current FPL sync owns canonical current team metadata.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:generate-fpl-predictions','generate-fpl-predictions','EDGE_FUNCTION','93c935f0-4304-49a0-8997-de92868c6768',6,'6338f1121b34f80c550e7b745f001211d3d365e2babff480e9a5436ee4172b3f',false,'DB_FUNCTION:private.generate_upcoming_fpl_snapshot_v01(p_gameweek integer, p_force boolean)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; production FPL projection orchestration is database-native.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:optimize-fpl-squad','optimize-fpl-squad','EDGE_FUNCTION','1062a6d0-cb07-4afe-9c14-75fed992bcd2',3,'fd42dd112da2a076452ef1f3d8b3b376270a90a266b0f50706b6872cf650cbdc',false,'EDGE_FUNCTION:fpl-full-pool-optimizer',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; legacy endpoint only selected within current 15 and is superseded by canonical full-pool optimizer plus decision orchestration.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:fpl-dashboard','fpl-dashboard','EDGE_FUNCTION','876c162b-2217-45d1-b439-dbf7fc59eb84',3,'3390d4c1e26ff82ae69030943b6a602cbfa8ad4e9f8d548d5a93210e02497098',false,'UI:frontend-v2',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; dashboard is superseded by GitHub Pages frontend-v2.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:publish-dashboard','publish-dashboard','EDGE_FUNCTION','04df19b5-02df-42e0-8ed3-0c9daef985db',1,'54f67278d47e0adfb4f2acbdc5bda307597cbe3cf82912edf0eb8ff6a3e1993b',false,'WORKFLOW:github-pages-deploy',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; publication is superseded by GitHub Pages workflow.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:audit-gw','audit-gw','EDGE_FUNCTION','c45d961c-f053-4b18-89c4-478a28f85d80',3,'a9612f244c875f019d887b39b3e0b74e720a2b7b4f370b128e5581d9811415ae',false,null,0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; current audit and readiness checks are database-native.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:projection-benchmark-api','projection-benchmark-api','API','6ddeaf9a-753f-433c-b040-14c91f8a19cd',1,'130d6c6123a9703a69c5b1942566c6a5ad1824069010c4f9015222cd7c90e246',false,null,0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; no current repository, UI, cron, database or dependency-graph consumer exists.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:generate-fpl-predictions-v012','generate-fpl-predictions-v012','EDGE_FUNCTION','670dc7ee-a144-4faf-9464-d20428598083',6,'954a5c51eab214c7d3b8aa6bf619585bcb70a08c59b78608a1365a7785b794f3',false,'DB_FUNCTION:private.generate_upcoming_fpl_snapshot_v01(p_gameweek integer, p_force boolean)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; superseded sandbox prediction implementation.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:refresh-player-state-v012','refresh-player-state-v012','EDGE_FUNCTION','32a1729e-854e-4476-9065-5f5d547ad597',1,'71b8aa0a6e96cbe9e4b8d4ebe0f28c2ac47005ee594d30a513c407b384c53818',false,'EDGE_FUNCTION:refresh-current-player-state',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; superseded player-state implementation.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:generate-fpl-predictions-v013','generate-fpl-predictions-v013','EDGE_FUNCTION','883fd625-a202-4e01-9b7f-d8f52ff10f82',1,'be0c489594a6a17ef9878f374e59f38779204c757b150e3d297fd65cf5a31b7a',false,'DB_FUNCTION:private.generate_upcoming_fpl_snapshot_v01(p_gameweek integer, p_force boolean)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; old sandbox generator with embedded role multiplier is not production.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:generate-fixture-predictions','generate-fixture-predictions','EDGE_FUNCTION','426b0d58-0e9e-45ca-99c2-3b3c8e50ba71',1,'4a604faf2ed39d715cf13f1ce80b33f76bbf4c21e437b9c06abdfcbf22604d22',false,'DB_FUNCTION:private.refresh_c0166_fixture_cycle_v01(p_gameweek integer)',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; production fixture cycle is database-native.',jsonb_build_object('change_id','C0213')),
('EDGE_FUNCTION:c0206-build-understat-foreign-pairs','c0206-build-understat-foreign-pairs','EDGE_FUNCTION','791fcbf1-2de3-47a5-8d5c-97c3452ff418',1,'17febb99bc06523585bb1d4d53e147eb40119eae31fe0fb25e87f741d29f5553',false,'EDGE_FUNCTION:c0206-build-understat-foreign-pairs-v02',0,0,0,0,null,'NOT_ARCHIVED',true,'STATIC_RETIREMENT_READY',false,'Capture exact runtime source bundle before delete; v01 invocation is already blocked and exact allowlist check retains only v02.',jsonb_build_object('change_id','C0213','allowlist_probe','Function not allowed')),
('EDGE_FUNCTION:c0206-fit-translation-shadow-v01','c0206-fit-translation-shadow-v01','EDGE_FUNCTION','34f0342f-9ad0-4e33-b2bb-4993f1f233c2',1,'33e3f9a51b2ca371e58fa601c59840e233ea119ebc59f9606be52869fa0302b4',false,'EDGE_FUNCTION:c0206-fit-translation-shadow-v02',0,0,0,0,'supabase/functions/c0206-fit-translation-shadow-v01/index.ts','REPO_SOURCE_PRESENT',true,'STATIC_RETIREMENT_READY',false,'Repository source is durable rollback artifact; v01 invocation is already blocked. Delete only through explicit Management API/CLI action.',jsonb_build_object('change_id','C0213','allowlist_probe','Function not allowed'))
on conflict (component_key) do update set
 slug=excluded.slug,
 runtime_kind=excluded.runtime_kind,
 runtime_id=excluded.runtime_id,
 runtime_version=excluded.runtime_version,
 runtime_sha256=excluded.runtime_sha256,
 verify_jwt=excluded.verify_jwt,
 canonical_successor=excluded.canonical_successor,
 dependency_graph_incoming=excluded.dependency_graph_incoming,
 dependency_graph_outgoing=excluded.dependency_graph_outgoing,
 exact_db_consumer_count=excluded.exact_db_consumer_count,
 exact_active_cron_consumer_count=excluded.exact_active_cron_consumer_count,
 repo_runtime_source_path=excluded.repo_runtime_source_path,
 durable_rollback_source_status=excluded.durable_rollback_source_status,
 static_dependency_proof_ok=excluded.static_dependency_proof_ok,
 retirement_state=excluded.retirement_state,
 physical_delete_allowed=excluded.physical_delete_allowed,
 rollback_requirement=excluded.rollback_requirement,
 evidence=excluded.evidence,
 verified_at=now(),
 updated_at=now();

create or replace function private.c0213_retired_external_retirement_status_v01()
returns jsonb
language sql
security definer
set search_path = private, public, pg_temp
as $$
  select jsonb_build_object(
    'ok', count(*)=19
          and bool_and(static_dependency_proof_ok)
          and bool_and(dependency_graph_incoming=0)
          and bool_and(dependency_graph_outgoing=0)
          and bool_and(exact_db_consumer_count=0)
          and bool_and(exact_active_cron_consumer_count=0),
    'manifest_rows', count(*),
    'static_retirement_ready', count(*) filter (where retirement_state='STATIC_RETIREMENT_READY'),
    'platform_delete_pending', count(*) filter (where retirement_state='PLATFORM_DELETE_PENDING'),
    'physically_deleted', count(*) filter (where retirement_state='DELETED'),
    'holds', count(*) filter (where retirement_state='HOLD'),
    'durable_rollback_sources', count(*) filter (where durable_rollback_source_status='REPO_SOURCE_PRESENT'),
    'rollback_source_not_archived', count(*) filter (where durable_rollback_source_status='NOT_ARCHIVED'),
    'physical_delete_allowed', count(*) filter (where physical_delete_allowed),
    'runtime_traffic_visibility', min(runtime_traffic_visibility),
    'delete_transport_required', 'Supabase Management API DELETE /v1/projects/{ref}/functions/{slug} or supabase functions delete',
    'items', jsonb_agg(jsonb_build_object(
      'slug',slug,
      'kind',runtime_kind,
      'runtime_version',runtime_version,
      'sha256',runtime_sha256,
      'successor',canonical_successor,
      'rollback_source_status',durable_rollback_source_status,
      'state',retirement_state,
      'physical_delete_allowed',physical_delete_allowed
    ) order by slug)
  )
  from private.c0213_retired_external_retirement_manifest;
$$;

revoke all on function private.c0213_retired_external_retirement_status_v01() from public, anon, authenticated;
grant execute on function private.c0213_retired_external_retirement_status_v01() to service_role;
