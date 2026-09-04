create or replace function private.capture_c0206_historical_epl_bootstrap_shadow_v03()
returns jsonb
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_v01 jsonb;
  v_source_capture timestamptz;
  v_now timestamptz;
  v_rows integer;
  v_candidates integer;
begin
  v_v01:=private.capture_c0206_historical_epl_bootstrap_shadow_v01();
  v_source_capture:=(v_v01->>'captured_at')::timestamptz;
  v_now:=clock_timestamp();

  with src as (
    select s.*
    from public.research_c0206_historical_epl_bootstrap_snapshots s
    where s.captured_at=v_source_capture
  ), validated as (
    select src.*,
      v.id validation_id,
      coalesce(v.approved_for_same_league_prior,false) provenance_approved,
      v.legacy_source,
      v.corroboration_source,
      v.xgi90_abs_diff,
      v.historical_start_rate_validated
    from src
    left join lateral (
      select vv.*
      from public.research_c0206_historical_prior_validations vv
      where vv.player_id=src.player_id
        and vv.historical_season=src.historical_season
      order by vv.validated_at desc,vv.id desc
      limit 1
    ) v on true
  )
  insert into public.research_c0206_historical_epl_bootstrap_snapshots(
    player_id,captured_at,historical_season,historical_minutes,historical_starts,historical_xg90,historical_xa90,quality_prior_confidence,
    transfer_event_type,transfer_event_at,transfer_time_precision,post_transfer_observed_rows,post_transfer_apps,post_transfer_starts,post_transfer_minutes,
    peer_count,peer_expected_minutes,peer_start_probability,peer_appearance_probability,peer_starter_minutes,peer_xg90,peer_xa90,peer_q95_xg90,peer_q95_xa90,
    bootstrap_expected_minutes,bootstrap_start_probability,bootstrap_appearance_probability,bootstrap_starter_minutes,bootstrap_xg90,bootstrap_xa90,bootstrap_dc_probability,
    candidate_live_restore,decision,evidence,model_effect_enabled)
  select
    player_id,v_now,historical_season,historical_minutes,historical_starts,historical_xg90,historical_xa90,quality_prior_confidence,
    transfer_event_type,transfer_event_at,transfer_time_precision,post_transfer_observed_rows,post_transfer_apps,post_transfer_starts,post_transfer_minutes,
    peer_count,peer_expected_minutes,peer_start_probability,peer_appearance_probability,peer_starter_minutes,peer_xg90,peer_xa90,peer_q95_xg90,peer_q95_xa90,
    bootstrap_expected_minutes,bootstrap_start_probability,bootstrap_appearance_probability,bootstrap_starter_minutes,bootstrap_xg90,bootstrap_xa90,bootstrap_dc_probability,
    candidate_live_restore and provenance_approved,
    case
      when candidate_live_restore and provenance_approved then 'CANDIDATE_LIVE_RESTORE_SAME_LEAGUE_HISTORY_PROVENANCE_VALIDATED'
      when candidate_live_restore and not provenance_approved then 'KEEP_EXCLUDED_HISTORICAL_PROVENANCE_UNVALIDATED'
      else decision
    end,
    evidence || jsonb_build_object(
      'shadow_version','C0206_V03_PROVENANCE_CHRONOLOGY_FIXED',
      'source_shadow_capture',v_source_capture,
      'validation_id',validation_id,
      'provenance_approved',provenance_approved,
      'legacy_source',legacy_source,
      'corroboration_source',corroboration_source,
      'xgi90_abs_diff',xgi90_abs_diff,
      'legacy_ingester_missing_to_zero_risk',true,
      'historical_start_rate_validated',coalesce(historical_start_rate_validated,false),
      'historical_start_rate_used',false,
      'missing_metric_promotion_requires_explicit_validation',true,
      'historical_forecasts_rewritten',false
    ),
    false
  from validated;

  get diagnostics v_rows=row_count;
  select count(*) into v_candidates
  from public.research_c0206_historical_epl_bootstrap_snapshots
  where captured_at=v_now and candidate_live_restore;

  return jsonb_build_object(
    'ok',true,'change_id','C0206','shadow_version','V03_PROVENANCE_CHRONOLOGY_FIXED',
    'source_v01',v_v01,'source_capture',v_source_capture,'captured_at',v_now,
    'rows',v_rows,'candidate_live_restores',v_candidates,
    'model_effect_enabled',false,'historical_forecasts_rewritten',false
  );
end $$;