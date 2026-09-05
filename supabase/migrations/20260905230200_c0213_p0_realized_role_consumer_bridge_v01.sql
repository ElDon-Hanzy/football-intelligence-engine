create or replace function public.refresh_player_fixture_role_snapshots(p_gameweek integer default null::integer)
returns jsonb
language plpgsql
set search_path to 'public','pg_temp'
as $function$
declare
  n integer:=0;
  v_now timestamptz:=clock_timestamp();
  v_gw integer:=p_gameweek;
begin
  if v_gw is null then
    select m.gameweek into v_gw
    from public.matches m
    where m.source='fpl' and m.gameweek is not null and m.kickoff_time>v_now
    order by m.kickoff_time limit 1;
  end if;
  if v_gw is null then
    return jsonb_build_object('ok',true,'gameweek',null,'inserted',0,'bridge_version','c0213_p0_v01');
  end if;

  with future as materialized (
    select m.id,m.gameweek,m.kickoff_time
    from public.matches m
    where m.source='fpl' and m.gameweek=v_gw and m.kickoff_time>v_now
  ), src as materialized (
    select
      a.id availability_observation_id,
      a.match_id,a.team_id,a.opponent_team_id,a.player_id,a.expected_xi,a.availability_status,
      a.confidence availability_confidence,
      f.kickoff_time fixture_kickoff,
      rp.id quantitative_profile_observation_id,
      bp.observed_at quantitative_profile_observed_at,
      bp.taxonomy_version quantitative_profile_taxonomy_version,
      rp.observed_at overlay_observed_at,
      rp.taxonomy_version overlay_taxonomy_version,
      rp.primary_role,rp.secondary_role,rp.primary_score,rp.secondary_score,rp.confidence role_conf,
      rp.observation_hash overlay_profile_hash,
      rp.evidence overlay_evidence
    from public.current_player_fixture_availability a
    join future f on f.id=a.match_id
    left join public.current_player_role_profiles rp
      on rp.player_id=a.player_id and rp.evidence_cutoff<f.kickoff_time
    left join public.player_role_profile_observations bp
      on bp.id=rp.id
  ), ins as (
    insert into public.player_fixture_role_observations(
      match_id,gameweek,team_id,opponent_team_id,player_id,kickoff_time,captured_at,
      profile_observed_at,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,
      expected_xi,availability_status,confidence,evidence,observation_hash,model_effect_enabled
    )
    select
      match_id,v_gw,team_id,opponent_team_id,player_id,fixture_kickoff,v_now,
      quantitative_profile_observed_at,
      coalesce(quantitative_profile_taxonomy_version,'event_role_v0.1'),
      primary_role,secondary_role,primary_score,secondary_score,expected_xi,availability_status,
      case when role_conf is null then null else least(role_conf,coalesce(availability_confidence,1)) end,
      jsonb_build_object(
        'role_profile_status',case when overlay_profile_hash is null then 'NO_EVENT_PROFILE' else 'AVAILABLE' end,
        'availability_observation_id',availability_observation_id,
        'role_profile_hash',overlay_profile_hash,
        'quantitative_role_profile_observation_id',quantitative_profile_observation_id,
        'quantitative_role_profile_observed_at',quantitative_profile_observed_at,
        'quantitative_role_profile_taxonomy_version',quantitative_profile_taxonomy_version,
        'role_overlay_taxonomy_version',overlay_taxonomy_version,
        'role_overlay_observed_at',overlay_observed_at,
        'realized_role_applied',coalesce(overlay_taxonomy_version like '%+realized_v0.1',false),
        'role_semantics',case when coalesce(overlay_taxonomy_version like '%+realized_v0.1',false)
                              then 'REALIZED_TACTICAL_ROLE_WITH_BASE_QUANT_PROFILE'
                              else 'ARCHETYPE_PROFILE' end,
        'role_is_archetype_not_exact_tactical_position',not coalesce(overlay_taxonomy_version like '%+realized_v0.1',false),
        'realized_role_source',overlay_evidence->>'realized_role_source',
        'realized_role_known_at',overlay_evidence->>'realized_role_known_at',
        'numeric_role_uplift_enabled',false,
        'consumer_bridge_version','c0213_p0_v01',
        'model_effect_enabled',false
      ),
      md5(jsonb_build_object(
        'match_id',match_id,
        'player_id',player_id,
        'availability_id',availability_observation_id,
        'overlay_profile_hash',overlay_profile_hash,
        'quantitative_profile_observation_id',quantitative_profile_observation_id,
        'quantitative_profile_taxonomy_version',quantitative_profile_taxonomy_version,
        'overlay_taxonomy_version',overlay_taxonomy_version,
        'expected_xi',expected_xi,
        'availability',availability_status,
        'consumer_bridge_version','c0213_p0_v01'
      )::text),
      false
    from src
    on conflict(match_id,player_id,observation_hash) do nothing
    returning 1
  )
  select count(*) into n from ins;

  return jsonb_build_object(
    'ok',true,
    'gameweek',v_gw,
    'inserted',n,
    'bridge_version','c0213_p0_v01',
    'numeric_role_uplift_enabled',false,
    'model_effect_enabled',false
  );
end
$function$;

create or replace function private.c0213_p0_realized_role_consumer_integrity_v01(p_gameweek integer default null::integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_gw integer:=p_gameweek;
  v_now timestamptz:=clock_timestamp();
  v_total integer:=0;
  v_overlay integer:=0;
  v_overlay_resolved integer:=0;
  v_broken integer:=0;
  v_legacy_virtual integer:=0;
  v_numeric_uplift integer:=0;
begin
  if v_gw is null then
    select m.gameweek into v_gw
    from public.matches m
    where m.source='fpl' and m.gameweek is not null and m.kickoff_time>v_now
    order by m.kickoff_time limit 1;
  end if;

  with r as (
    select r.*,
      case when coalesce(r.evidence->>'quantitative_role_profile_observation_id','') ~ '^[0-9]+$'
           then (r.evidence->>'quantitative_role_profile_observation_id')::bigint end as quantitative_profile_id
    from public.current_player_fixture_roles r
    join public.matches m on m.id=r.match_id
    where r.gameweek=v_gw and r.expected_xi=true and m.kickoff_time>v_now
  ), x as (
    select r.*,bp.id resolved_profile_id
    from r
    left join public.player_role_profile_observations bp on bp.id=r.quantitative_profile_id
  )
  select
    count(*),
    count(*) filter(where coalesce((evidence->>'realized_role_applied')::boolean,false)),
    count(*) filter(where coalesce((evidence->>'realized_role_applied')::boolean,false) and resolved_profile_id is not null),
    count(*) filter(where coalesce((evidence->>'realized_role_applied')::boolean,false) and resolved_profile_id is null),
    count(*) filter(where taxonomy_version like '%+realized_v0.1'),
    count(*) filter(where coalesce((evidence->>'numeric_role_uplift_enabled')::boolean,false))
  into v_total,v_overlay,v_overlay_resolved,v_broken,v_legacy_virtual,v_numeric_uplift
  from x;

  return jsonb_build_object(
    'ok',coalesce(v_broken,0)=0 and coalesce(v_legacy_virtual,0)=0 and coalesce(v_numeric_uplift,0)=0,
    'change_id','C0213',
    'workstream','P0_REALIZED_ROLE_CONSUMER_BRIDGE',
    'bridge_version','c0213_p0_v01',
    'gameweek',v_gw,
    'expected_xi_rows',v_total,
    'realized_overlay_rows',v_overlay,
    'realized_overlay_resolved_quant_profile_rows',v_overlay_resolved,
    'broken_quantitative_profile_refs',v_broken,
    'legacy_virtual_taxonomy_current_rows',v_legacy_virtual,
    'numeric_role_uplift_enabled_rows',v_numeric_uplift,
    'model_effect_policy','No new role coefficient; realized tactical role changes categorical role state only and retains the pre-existing quantitative feature profile.'
  );
end
$function$;

revoke all on function private.c0213_p0_realized_role_consumer_integrity_v01(integer) from public,anon,authenticated;
grant execute on function private.c0213_p0_realized_role_consumer_integrity_v01(integer) to service_role;

comment on function public.refresh_player_fixture_role_snapshots(integer) is
'C0213 P0: fixture-role snapshots preserve realized tactical labels while pinning the physical quantitative role-profile identity/timestamp/taxonomy. No numeric role uplift is introduced.';
comment on function private.c0213_p0_realized_role_consumer_integrity_v01(integer) is
'C0213 P0 integrity gate: proves current expected-XI realized-role overlays resolve a physical quantitative role profile and do not enable a numeric role uplift.';
