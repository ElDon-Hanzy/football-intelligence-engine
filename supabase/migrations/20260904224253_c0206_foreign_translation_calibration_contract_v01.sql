create table if not exists public.research_c0206_foreign_translation_pairs (
  id bigserial primary key,
  pair_key text not null unique,
  player_name text not null,
  player_identity_key text not null,
  source_season text not null,
  destination_season text not null,
  source_competition text not null,
  destination_competition text not null,
  source_club text,
  destination_club text,
  position_group text not null,
  source_minutes integer,
  destination_minutes integer,
  source_xg numeric,
  source_xa numeric,
  destination_xg numeric,
  destination_xa numeric,
  source_xg90 numeric generated always as (case when source_minutes>0 and source_xg is not null then 90.0*source_xg/source_minutes end) stored,
  source_xa90 numeric generated always as (case when source_minutes>0 and source_xa is not null then 90.0*source_xa/source_minutes end) stored,
  destination_xg90 numeric generated always as (case when destination_minutes>0 and destination_xg is not null then 90.0*destination_xg/destination_minutes end) stored,
  destination_xa90 numeric generated always as (case when destination_minutes>0 and destination_xa is not null then 90.0*destination_xa/destination_minutes end) stored,
  source_provenance jsonb not null default '{}'::jsonb,
  destination_provenance jsonb not null default '{}'::jsonb,
  cohort_split text not null,
  pair_quality_status text not null,
  evidence jsonb not null default '{}'::jsonb,
  research_only boolean not null default true,
  model_effect_enabled boolean not null default false,
  captured_at timestamptz not null default clock_timestamp(),
  constraint c0206_translation_pair_effect_off check (model_effect_enabled=false),
  constraint c0206_translation_pair_position check (position_group in ('DEF','MID','FWD')),
  constraint c0206_translation_pair_split check (cohort_split in ('TRAIN','VALIDATION','TEST')),
  constraint c0206_translation_pair_minutes check ((source_minutes is null or source_minutes>=0) and (destination_minutes is null or destination_minutes>=0))
);

create index if not exists idx_c0206_translation_pairs_league_pos
  on public.research_c0206_foreign_translation_pairs(source_competition,position_group,source_season,destination_season);

create or replace function private.block_c0206_translation_pair_mutation_v01()
returns trigger language plpgsql as $$
begin
  raise exception 'C0206 foreign translation pairs are append-only';
end $$;
drop trigger if exists trg_block_c0206_translation_pair_update on public.research_c0206_foreign_translation_pairs;
create trigger trg_block_c0206_translation_pair_update
before update or delete on public.research_c0206_foreign_translation_pairs
for each row execute function private.block_c0206_translation_pair_mutation_v01();

create table if not exists public.research_c0206_foreign_translation_contracts (
  contract_key text primary key,
  created_at timestamptz not null default clock_timestamp(),
  target_competition text not null,
  supported_source_competitions text[] not null,
  position_groups text[] not null,
  metrics text[] not null,
  transform text not null,
  model_family text not null,
  source_min_minutes_exploratory integer not null,
  source_min_minutes_preferred integer not null,
  destination_min_minutes integer not null,
  minimum_global_pairs integer not null,
  minimum_league_pairs integer not null,
  minimum_pl_to_pl_baseline_pairs integer not null,
  minimum_direct_league_position_pairs integer not null,
  interval_level numeric not null,
  required_baselines text[] not null,
  holdout_policy text not null,
  promotion_gates jsonb not null,
  evidence jsonb not null default '{}'::jsonb,
  model_effect_enabled boolean not null default false,
  constraint c0206_translation_contract_effect_off check (model_effect_enabled=false),
  constraint c0206_translation_contract_interval check (interval_level>0 and interval_level<1)
);

insert into public.research_c0206_foreign_translation_contracts(
  contract_key,target_competition,supported_source_competitions,position_groups,metrics,transform,model_family,
  source_min_minutes_exploratory,source_min_minutes_preferred,destination_min_minutes,
  minimum_global_pairs,minimum_league_pairs,minimum_pl_to_pl_baseline_pairs,minimum_direct_league_position_pairs,
  interval_level,required_baselines,holdout_policy,promotion_gates,evidence,model_effect_enabled)
values(
  'C0206_XG_XA_TRANSLATION_V01','Premier League',
  array['Ligue 1','Bundesliga','Serie A','La Liga'],array['DEF','MID','FWD'],array['xG90','xA90'],
  'asinh(rate / metric_scale); no epsilon; metric-specific scale estimated on TRAIN only',
  'hierarchical Student-t regression on transformed destination rate with source-rate slope, partially pooled source-league and position effects, league-position interaction only when supported, minute-reliability weighting, PL-to-PL club-change baseline, posterior predictive uncertainty',
  450,900,450,
  60,12,30,6,
  0.90,array['NAIVE_SAME_RATE','POSITION_PEER_RATE','PL_TO_PL_TRANSFER_BASELINE'],
  'Most recent eligible transfer season/cohort is TEST and is never used to estimate transforms, scales, hyperparameters or coefficients; earlier eligible pairs split TRAIN/VALIDATION by season before TEST.',
  jsonb_build_object(
    'global_pair_gate','>=60 eligible paired consecutive-season transfers across supported source leagues',
    'league_pair_gate','>=12 eligible pairs for a source-league direct effect; otherwise league effect remains strongly pooled',
    'pl_to_pl_baseline_gate','>=30 eligible PL-to-PL transfer pairs for club-change friction baseline',
    'league_position_gate','>=6 eligible pairs required before exposing a direct league-position interaction; otherwise use pooled position and league effects',
    'source_sample_gate','450 minutes exploratory; 900 minutes preferred for target-player prior; below 450 cannot use league translation',
    'destination_sample_gate','>=450 minutes for realized destination-rate calibration row',
    'uncertainty_gate','90% posterior predictive interval empirical coverage must be reasonably close to nominal on held-out TEST and not materially under-cover relative to baselines',
    'accuracy_gate','held-out MAE on xG90 and xA90 separately must improve over naive same-rate and position-peer baselines; no aggregate xGI-only promotion',
    'sensitivity_gate','recommendation/translated rank must not materially reverse under reasonable transform scale, minute gate, pooling and outlier assumptions',
    'cap_gate','target-player translated rate distribution must be conservatively capped/shrunk to current EPL position-price support until sample depth justifies relaxing it',
    'zero_handling','asinh transform supports zero rates; missing is null and never zero',
    'current_2026_27_target_outcomes_forbidden',true,
    'historical_forecasts_rewritten',false
  ),
  jsonb_build_object(
    'change_id','C0206','research_only',true,
    'architecture_basis','paired consecutive-season cross-league translation with partial pooling and held-out validation; coefficients must be fit from our xG/xA paired data, not borrowed from other target metrics',
    'noise_control_gate','no model effect until all promotion gates pass and governance review explicitly enables it',
    'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false
  ),false
)
on conflict (contract_key) do nothing;

create table if not exists public.research_c0206_foreign_translation_readiness_snapshots (
  id bigserial primary key,
  player_id bigint not null references public.players(id),
  captured_at timestamptz not null default clock_timestamp(),
  source_competition text,
  source_club text,
  position_group text,
  source_minutes integer,
  source_xg90 numeric,
  source_xa90 numeric,
  source_observation_id bigint references public.research_c0206_foreign_source_season_observations(id),
  source_metrics_complete boolean not null default false,
  source_450_gate boolean not null default false,
  source_900_gate boolean not null default false,
  translator_scope text not null,
  eligible_calibration_pair_count integer not null default 0,
  eligible_league_pair_count integer not null default 0,
  eligible_league_position_pair_count integer not null default 0,
  eligible_pl_to_pl_baseline_count integer not null default 0,
  calibration_contract_ready boolean not null default false,
  player_translation_ready boolean not null default false,
  decision text not null,
  evidence jsonb not null default '{}'::jsonb,
  model_effect_enabled boolean not null default false,
  constraint c0206_translation_readiness_effect_off check (model_effect_enabled=false)
);

create index if not exists idx_c0206_translation_readiness_player_time
  on public.research_c0206_foreign_translation_readiness_snapshots(player_id,captured_at desc);

create or replace function private.block_c0206_translation_readiness_mutation_v01()
returns trigger language plpgsql as $$
begin
  raise exception 'C0206 foreign translation readiness snapshots are append-only';
end $$;
drop trigger if exists trg_block_c0206_translation_readiness_update on public.research_c0206_foreign_translation_readiness_snapshots;
create trigger trg_block_c0206_translation_readiness_update
before update or delete on public.research_c0206_foreign_translation_readiness_snapshots
for each row execute function private.block_c0206_translation_readiness_mutation_v01();

create or replace function private.capture_c0206_foreign_translation_readiness_v01()
returns jsonb
language plpgsql security definer
set search_path=private,public,pg_temp
as $$
declare
  v_now timestamptz:=clock_timestamp();
  v_rows integer;
  v_contract public.research_c0206_foreign_translation_contracts%rowtype;
begin
  select * into v_contract from public.research_c0206_foreign_translation_contracts
  where contract_key='C0206_XG_XA_TRANSLATION_V01';
  if v_contract.contract_key is null then raise exception 'C0206 translation contract missing'; end if;

  with audit_time as (
    select max(captured_at) t from public.research_c0206_foreign_prior_source_audits
  ), audit as (
    select a.*,p.position
    from public.research_c0206_foreign_prior_source_audits a
    join audit_time t on t.t=a.captured_at
    join public.players p on p.id=a.player_id
    where a.research_path='FOREIGN_LEAGUE_TRANSLATION_REQUIRED'
  ), obs as (
    select distinct on (o.player_id)
      o.id observation_id,o.player_id,o.competition,o.source_club,o.minutes,o.xg90,o.xa90
    from public.research_c0206_foreign_source_season_observations o
    where o.season='2025-2026' and o.is_immediate_origin=true
    order by o.player_id,o.source_captured_at desc,o.id desc
  ), pair_stats as (
    select
      count(*) filter(where pair_quality_status='ELIGIBLE')::int global_pairs,
      count(*) filter(where pair_quality_status='ELIGIBLE' and source_competition='Premier League')::int pl_to_pl_pairs
    from public.research_c0206_foreign_translation_pairs
  ), z as (
    select a.player_id,a.source_league,a.source_club_name,a.position,
      o.observation_id,o.competition obs_comp,o.source_club obs_club,o.minutes,o.xg90,o.xa90,
      coalesce(ps.global_pairs,0) global_pairs,coalesce(ps.pl_to_pl_pairs,0) pl_to_pl_pairs,
      (select count(*) from public.research_c0206_foreign_translation_pairs q
       where q.pair_quality_status='ELIGIBLE' and q.source_competition=a.source_league)::int league_pairs,
      (select count(*) from public.research_c0206_foreign_translation_pairs q
       where q.pair_quality_status='ELIGIBLE' and q.source_competition=a.source_league and q.position_group=a.position)::int league_position_pairs
    from audit a left join obs o on o.player_id=a.player_id cross join pair_stats ps
  )
  insert into public.research_c0206_foreign_translation_readiness_snapshots(
    player_id,captured_at,source_competition,source_club,position_group,source_minutes,source_xg90,source_xa90,
    source_observation_id,source_metrics_complete,source_450_gate,source_900_gate,translator_scope,
    eligible_calibration_pair_count,eligible_league_pair_count,eligible_league_position_pair_count,eligible_pl_to_pl_baseline_count,
    calibration_contract_ready,player_translation_ready,decision,evidence,model_effect_enabled)
  select player_id,v_now,source_league,source_club_name,position,minutes,xg90,xa90,observation_id,
    (minutes is not null and xg90 is not null and xa90 is not null),
    coalesce(minutes>=v_contract.source_min_minutes_exploratory,false),
    coalesce(minutes>=v_contract.source_min_minutes_preferred,false),
    case
      when position='GKP' then 'GK_SEPARATE_MODEL'
      when not (source_league=any(v_contract.supported_source_competitions)) then 'SOURCE_LEAGUE_OUTSIDE_CONTRACT'
      when observation_id is null then 'SOURCE_OBSERVATION_MISSING'
      when minutes<v_contract.source_min_minutes_exploratory then 'OUTFIELD_SUPPORTED_LEAGUE_SOURCE_LT450'
      when minutes<v_contract.source_min_minutes_preferred then 'OUTFIELD_SUPPORTED_LEAGUE_EXPLORATORY_450_899'
      else 'OUTFIELD_SUPPORTED_LEAGUE_PREFERRED_SAMPLE'
    end,
    global_pairs,league_pairs,league_position_pairs,pl_to_pl_pairs,
    (global_pairs>=v_contract.minimum_global_pairs and pl_to_pl_pairs>=v_contract.minimum_pl_to_pl_baseline_pairs),
    (position<>'GKP'
      and source_league=any(v_contract.supported_source_competitions)
      and observation_id is not null
      and minutes>=v_contract.source_min_minutes_exploratory
      and global_pairs>=v_contract.minimum_global_pairs
      and pl_to_pl_pairs>=v_contract.minimum_pl_to_pl_baseline_pairs
      and league_pairs>=v_contract.minimum_league_pairs),
    case
      when position='GKP' then 'KEEP_EXCLUDED_GK_TRANSLATOR_SEPARATE'
      when not (source_league=any(v_contract.supported_source_competitions)) then 'KEEP_EXCLUDED_SOURCE_LEAGUE_OUTSIDE_VALIDATED_CONTRACT'
      when observation_id is null then 'KEEP_EXCLUDED_FOREIGN_SOURCE_OBSERVATION_MISSING'
      when minutes<v_contract.source_min_minutes_exploratory then 'KEEP_EXCLUDED_SOURCE_SAMPLE_LT450'
      when global_pairs<v_contract.minimum_global_pairs then 'KEEP_EXCLUDED_CALIBRATION_GLOBAL_SAMPLE_NOT_READY'
      when pl_to_pl_pairs<v_contract.minimum_pl_to_pl_baseline_pairs then 'KEEP_EXCLUDED_PL_TO_PL_FRICTION_BASELINE_NOT_READY'
      when league_pairs<v_contract.minimum_league_pairs then 'KEEP_EXCLUDED_LEAGUE_CALIBRATION_SAMPLE_NOT_READY'
      when minutes<v_contract.source_min_minutes_preferred then 'RESEARCH_ONLY_TRANSLATION_ELIGIBLE_LOW_CONFIDENCE_450_899'
      else 'RESEARCH_ONLY_TRANSLATION_ELIGIBLE_PENDING_HELDOUT_VALIDATION'
    end,
    jsonb_build_object(
      'change_id','C0206','contract_key',v_contract.contract_key,
      'source_observation_competition',obs_comp,'source_observation_club',obs_club,
      'source_identity_consistent',(obs_comp is null or obs_comp=source_league) and (obs_club is null or obs_club=source_club_name),
      'global_pair_gate_required',v_contract.minimum_global_pairs,'league_pair_gate_required',v_contract.minimum_league_pairs,
      'league_position_pair_gate_required',v_contract.minimum_direct_league_position_pairs,
      'pl_to_pl_baseline_gate_required',v_contract.minimum_pl_to_pl_baseline_pairs,
      'source_min_exploratory',v_contract.source_min_minutes_exploratory,
      'source_min_preferred',v_contract.source_min_minutes_preferred,
      'no_coefficients_fitted_yet',global_pairs=0,
      'current_2026_27_target_outcomes_used',false,
      'missing_data_is_not_zero',true,'historical_forecasts_rewritten',false
    ),false
  from z;
  get diagnostics v_rows=row_count;
  return jsonb_build_object('ok',true,'change_id','C0206','contract_key',v_contract.contract_key,
    'captured_at',v_now,'rows',v_rows,'model_effect_enabled',false,'historical_forecasts_rewritten',false);
end $$;

create or replace function private.c0206_foreign_translation_readiness_status_v01()
returns jsonb
language sql stable security definer
set search_path=private,public,pg_temp
as $$
with lt as (select max(captured_at) t from public.research_c0206_foreign_translation_readiness_snapshots),x as (
  select r.*,p.web_name,t.short_name destination
  from public.research_c0206_foreign_translation_readiness_snapshots r
  join lt on lt.t=r.captured_at join public.players p on p.id=r.player_id join public.teams t on t.id=p.team_id
)
select jsonb_build_object(
  'change_id','C0206','captured_at',(select t from lt),'rows',count(*),
  'source_complete',count(*) filter(where source_metrics_complete),
  'source_450_gate',count(*) filter(where source_450_gate),
  'source_900_gate',count(*) filter(where source_900_gate),
  'calibration_contract_ready',count(*) filter(where calibration_contract_ready),
  'player_translation_ready',count(*) filter(where player_translation_ready),
  'model_effect_violations',count(*) filter(where model_effect_enabled),
  'pair_counts',jsonb_build_object(
    'global',coalesce(max(eligible_calibration_pair_count),0),
    'pl_to_pl',coalesce(max(eligible_pl_to_pl_baseline_count),0)
  ),
  'players',coalesce(jsonb_agg(jsonb_build_object(
    'player_id',player_id,'name',web_name,'destination',destination,'position',position_group,
    'source_competition',source_competition,'source_club',source_club,'source_minutes',source_minutes,
    'xG90',round(source_xg90,4),'xA90',round(source_xa90,4),
    'gate450',source_450_gate,'gate900',source_900_gate,'scope',translator_scope,
    'global_pairs',eligible_calibration_pair_count,'league_pairs',eligible_league_pair_count,
    'league_position_pairs',eligible_league_position_pair_count,'pl_to_pl_pairs',eligible_pl_to_pl_baseline_count,
    'translation_ready',player_translation_ready,'decision',decision
  ) order by translator_scope,web_name),'[]'::jsonb)
) from x;
$$;