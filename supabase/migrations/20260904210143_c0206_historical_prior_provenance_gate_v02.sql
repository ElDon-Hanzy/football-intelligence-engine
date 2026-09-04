create table if not exists public.research_c0206_historical_prior_validations (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  historical_season text not null,
  validated_at timestamptz not null default clock_timestamp(),
  legacy_source text not null,
  corroboration_source text not null,
  legacy_minutes integer,
  corroborated_minutes integer,
  legacy_xg numeric,
  corroborated_xg numeric,
  legacy_xa numeric,
  corroborated_xa numeric,
  xgi90_abs_diff numeric,
  historical_start_rate_validated boolean not null default false,
  approved_for_same_league_prior boolean not null default false,
  evidence jsonb not null default '{}'::jsonb,
  model_effect_enabled boolean not null default false,
  constraint c0206_hist_validation_effect_off check (model_effect_enabled=false)
);

create index if not exists idx_c0206_hist_validation_player_time
  on public.research_c0206_historical_prior_validations(player_id,historical_season,validated_at desc);

create or replace function private.block_c0206_hist_validation_mutation_v01()
returns trigger language plpgsql as $$
begin
  raise exception 'C0206 historical prior validations are append-only';
end $$;

drop trigger if exists trg_block_c0206_hist_validation_update on public.research_c0206_historical_prior_validations;
create trigger trg_block_c0206_hist_validation_update
before update or delete on public.research_c0206_historical_prior_validations
for each row execute function private.block_c0206_hist_validation_mutation_v01();

create or replace function private.capture_c0206_historical_epl_bootstrap_shadow_v02()
returns jsonb
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
  v_v01 jsonb;
  v_source_capture timestamptz;
  v_now timestamptz:=clock_timestamp();
  v_rows integer;
  v_candidates integer;
begin
  v_v01:=private.capture_c0206_historical_epl_bootstrap_shadow_v01();
  select max(captured_at) into v_source_capture
  from public.research_c0206_historical_epl_bootstrap_snapshots
  where captured_at < v_now;

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
      'shadow_version','C0206_V02_PROVENANCE_GATE',
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
    'ok',true,'change_id','C0206','shadow_version','V02_PROVENANCE_GATE',
    'source_v01',v_v01,'captured_at',v_now,'rows',v_rows,
    'candidate_live_restores',v_candidates,'model_effect_enabled',false,
    'historical_forecasts_rewritten',false
  );
end $$;

create or replace function private.c0206_historical_prior_validation_status_v01()
returns jsonb
language sql
stable
security definer
set search_path=private,public,pg_temp
as $$
with latest as (
  select distinct on (v.player_id,v.historical_season)
    v.*,p.web_name,t.short_name club,p.position
  from public.research_c0206_historical_prior_validations v
  join public.players p on p.id=v.player_id
  join public.teams t on t.id=p.team_id
  order by v.player_id,v.historical_season,v.validated_at desc,v.id desc
)
select jsonb_build_object(
  'change_id','C0206',
  'rows',count(*),
  'approved',count(*) filter(where approved_for_same_league_prior),
  'model_effect_violations',count(*) filter(where model_effect_enabled),
  'players',coalesce(jsonb_agg(jsonb_build_object(
    'player_id',player_id,'name',web_name,'club',club,'position',position,
    'season',historical_season,'legacy_source',legacy_source,
    'corroboration_source',corroboration_source,'minutes',legacy_minutes,
    'corroborated_minutes',corroborated_minutes,'xgi90_abs_diff',xgi90_abs_diff,
    'historical_start_rate_validated',historical_start_rate_validated,
    'approved',approved_for_same_league_prior
  ) order by web_name),'[]'::jsonb)
) from latest;
$$;