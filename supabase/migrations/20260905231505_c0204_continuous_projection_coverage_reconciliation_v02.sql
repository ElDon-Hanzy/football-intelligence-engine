create or replace function private.c0204_reconcile_projection_coverage_v02(
  p_gameweek integer,
  p_as_of timestamptz default clock_timestamp()
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_inserted integer := 0;
  v_players jsonb := '[]'::jsonb;
begin
  if p_gameweek is null or p_gameweek not between 1 and 38 then
    raise exception 'C0204 reconciliation requires target gameweek 1..38';
  end if;

  perform pg_advisory_xact_lock(hashtext('C0204_PROJECTION_COVERAGE_RECONCILE'));

  with missing as materialized (
    select r.*
    from private.c0204_projection_coverage_rows_v01(p_gameweek,p_as_of) r
    where r.coverage_status='UNGOVERNED_MISSING'
  ), ins as (
    insert into public.fpl_projection_eligibility_events(
      player_id,event_at,eligibility_status,reason_code,reason_detail,change_id,evidence
    )
    select
      m.player_id,
      p_as_of,
      'EXCLUDED',
      'PENDING_GOVERNED_PRIOR_C0206',
      'C0204 continuous coverage reconciliation: player has no complete production projection inputs and remains explicitly excluded until C0206 or another governed path supplies validated evidence.',
      'C0204',
      jsonb_build_object(
        'reconciliation_version','C0204_V02_CONTINUOUS',
        'detected_gameweek',p_gameweek,
        'fpl_player_id',m.fpl_player_id,
        'player_status',m.player_status,
        'player_position',m.player_position,
        'team_id',m.team_id,
        'coverage_reason',m.reason_code,
        'has_current_state',m.has_current_state,
        'has_baseline_prediction',m.has_baseline_prediction,
        'missing_data_is_not_zero',true,
        'validated_prior_created',false,
        'model_effect_enabled',false,
        'historical_forecasts_rewritten',false
      )
    from missing m
    where not exists (
      select 1
      from public.fpl_projection_eligibility_events e
      where e.player_id=m.player_id
        and e.event_at<=p_as_of
        and e.eligibility_status='EXCLUDED'
        and e.reason_code='PENDING_GOVERNED_PRIOR_C0206'
        and not exists (
          select 1
          from public.fpl_projection_eligibility_events e2
          where e2.player_id=e.player_id
            and (e2.event_at>e.event_at or (e2.event_at=e.event_at and e2.id>e.id))
            and e2.event_at<=p_as_of
        )
    )
    returning player_id
  )
  select count(*),coalesce(jsonb_agg(player_id order by player_id),'[]'::jsonb)
    into v_inserted,v_players
  from ins;

  return jsonb_build_object(
    'ok',true,
    'change_id','C0204',
    'reconciliation_version','C0204_V02_CONTINUOUS',
    'gameweek',p_gameweek,
    'as_of',p_as_of,
    'new_governed_exclusions',v_inserted,
    'player_ids',v_players,
    'missing_data_is_not_zero',true,
    'validated_prior_created',false,
    'historical_forecasts_rewritten',false
  );
end;
$$;

revoke all on function private.c0204_reconcile_projection_coverage_v02(integer,timestamptz) from public, anon, authenticated;
grant execute on function private.c0204_reconcile_projection_coverage_v02(integer,timestamptz) to service_role;

create or replace function private.generate_upcoming_fpl_snapshot_v01(
  p_gameweek integer default null,
  p_force boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_gw integer;
  v_cov jsonb;
  v_reconcile jsonb;
  v_res jsonb;
  v_run_id bigint;
begin
  if p_gameweek is null then
    select x.gameweek into v_gw
    from (
      select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at
      from public.matches m where m.source='fpl' and m.gameweek between 1 and 38
      group by m.gameweek
    ) x
    where x.deadline_at>v_now order by x.gameweek limit 1;
  else
    v_gw:=p_gameweek;
  end if;
  if v_gw is null then
    return jsonb_build_object('ok',false,'status','NO_FUTURE_GAMEWEEK','change_id','C0204');
  end if;

  v_cov:=private.c0204_projection_coverage_summary_v01(v_gw,v_now);

  if coalesce((v_cov->>'ungoverned_missing_count')::integer,0)>0 then
    v_reconcile:=private.c0204_reconcile_projection_coverage_v02(v_gw,v_now);
    v_cov:=private.c0204_projection_coverage_summary_v01(v_gw,v_now);
  else
    v_reconcile:=jsonb_build_object(
      'ok',true,
      'change_id','C0204',
      'reconciliation_version','C0204_V02_CONTINUOUS',
      'gameweek',v_gw,
      'new_governed_exclusions',0,
      'player_ids','[]'::jsonb,
      'missing_data_is_not_zero',true,
      'validated_prior_created',false,
      'historical_forecasts_rewritten',false
    );
  end if;

  if coalesce((v_cov->>'ungoverned_missing_count')::integer,0)>0 then
    insert into public.fpl_projection_coverage_audits(
      prediction_run_id,gameweek,captured_at,projectable_count,governed_excluded_count,
      ungoverned_missing_count,total_fpl_players,coverage
    )
    values(
      null,v_gw,clock_timestamp(),
      (v_cov->>'projectable_count')::integer,
      (v_cov->>'governed_excluded_count')::integer,
      (v_cov->>'ungoverned_missing_count')::integer,
      (v_cov->>'total_fpl_players')::integer,
      v_cov || jsonb_build_object('coverage_reconciliation',v_reconcile)
    );
    return jsonb_build_object(
      'ok',false,
      'status','C0204_PROJECTION_COVERAGE_BLOCKED',
      'gameweek',v_gw,
      'projection_coverage',v_cov,
      'coverage_reconciliation',v_reconcile,
      'historical_forecasts_rewritten',false
    );
  end if;

  v_res:=private.generate_upcoming_fpl_snapshot_c0160_legacy_v01(v_gw,p_force);
  if v_res ? 'run_id' then v_run_id:=(v_res->>'run_id')::bigint; end if;

  insert into public.fpl_projection_coverage_audits(
    prediction_run_id,gameweek,captured_at,projectable_count,governed_excluded_count,
    ungoverned_missing_count,total_fpl_players,coverage
  )
  values(
    v_run_id,v_gw,clock_timestamp(),
    (v_cov->>'projectable_count')::integer,
    (v_cov->>'governed_excluded_count')::integer,
    (v_cov->>'ungoverned_missing_count')::integer,
    (v_cov->>'total_fpl_players')::integer,
    v_cov || jsonb_build_object('coverage_reconciliation',v_reconcile)
  );

  return v_res || jsonb_build_object(
    'change_id','C0204',
    'projection_coverage',v_cov,
    'coverage_reconciliation',v_reconcile,
    'historical_forecasts_rewritten',false
  );
end;
$$;

revoke all on function private.generate_upcoming_fpl_snapshot_v01(integer,boolean) from public, anon, authenticated;
grant execute on function private.generate_upcoming_fpl_snapshot_v01(integer,boolean) to service_role;
