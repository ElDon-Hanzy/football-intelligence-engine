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
  v_candidate_count integer := 0;
  v_inserted integer := 0;
  v_players jsonb := '[]'::jsonb;
  v_max_auto_govern integer := 10;
begin
  if p_gameweek is null or p_gameweek not between 1 and 38 then
    raise exception 'C0204 reconciliation requires target gameweek 1..38';
  end if;

  perform pg_advisory_xact_lock(hashtext('C0204_PROJECTION_COVERAGE_RECONCILE'));

  select count(*) into v_candidate_count
  from private.c0204_projection_coverage_rows_v01(p_gameweek,p_as_of) r
  where r.coverage_status='UNGOVERNED_MISSING'
    and r.reason_code='MISSING_STATE_AND_BASELINE'
    and r.latest_eligibility_status is null;

  if v_candidate_count > v_max_auto_govern then
    return jsonb_build_object(
      'ok',false,
      'status','ANOMALOUS_MASS_UNGOVERNED_COHORT',
      'change_id','C0204',
      'reconciliation_version','C0204_V03_SCOPE_GUARDED',
      'gameweek',p_gameweek,
      'as_of',p_as_of,
      'candidate_count',v_candidate_count,
      'max_auto_govern',v_max_auto_govern,
      'new_governed_exclusions',0,
      'player_ids','[]'::jsonb,
      'missing_data_is_not_zero',true,
      'validated_prior_created',false,
      'historical_forecasts_rewritten',false
    );
  end if;

  with missing as materialized (
    select r.*
    from private.c0204_projection_coverage_rows_v01(p_gameweek,p_as_of) r
    where r.coverage_status='UNGOVERNED_MISSING'
      and r.reason_code='MISSING_STATE_AND_BASELINE'
      and r.latest_eligibility_status is null
  ), ins as (
    insert into public.fpl_projection_eligibility_events(
      player_id,event_at,eligibility_status,reason_code,reason_detail,change_id,evidence
    )
    select
      m.player_id,
      p_as_of,
      'EXCLUDED',
      'PENDING_GOVERNED_PRIOR_C0206',
      'C0204 continuous coverage reconciliation: never-seen player has neither production state nor active-model baseline and remains explicitly excluded until C0206 or another governed path supplies validated evidence.',
      'C0204',
      jsonb_build_object(
        'reconciliation_version','C0204_V03_SCOPE_GUARDED',
        'auto_govern_scope','NEVER_SEEN_MISSING_STATE_AND_BASELINE_ONLY',
        'detected_gameweek',p_gameweek,
        'fpl_player_id',m.fpl_player_id,
        'player_status',m.player_status,
        'player_position',m.player_position,
        'team_id',m.team_id,
        'coverage_reason',m.reason_code,
        'has_current_state',m.has_current_state,
        'has_baseline_prediction',m.has_baseline_prediction,
        'prior_eligibility_status',m.latest_eligibility_status,
        'missing_data_is_not_zero',true,
        'validated_prior_created',false,
        'model_effect_enabled',false,
        'historical_forecasts_rewritten',false
      )
    from missing m
    returning player_id
  )
  select count(*),coalesce(jsonb_agg(player_id order by player_id),'[]'::jsonb)
    into v_inserted,v_players
  from ins;

  return jsonb_build_object(
    'ok',true,
    'status','RECONCILED',
    'change_id','C0204',
    'reconciliation_version','C0204_V03_SCOPE_GUARDED',
    'auto_govern_scope','NEVER_SEEN_MISSING_STATE_AND_BASELINE_ONLY',
    'gameweek',p_gameweek,
    'as_of',p_as_of,
    'candidate_count',v_candidate_count,
    'max_auto_govern',v_max_auto_govern,
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
