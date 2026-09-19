-- C0284 P2: promote the chronology-benchmarked, current-season-first generator.

create table if not exists public.c0284_p2_promotion_runs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default clock_timestamp(),
  candidate_generator text not null,
  incumbent_generator text not null,
  benchmark_scope jsonb not null,
  benchmark_metrics jsonb not null,
  structural_gates jsonb not null,
  decision text not null check (decision in ('PROMOTE','HOLD','ROLLBACK')),
  production_effect boolean not null default false,
  evidence_hash text not null unique
);

alter table public.c0284_p2_promotion_runs enable row level security;
revoke all on public.c0284_p2_promotion_runs from anon, authenticated;
grant select,insert,update,delete on public.c0284_p2_promotion_runs to service_role;

insert into public.c0284_p2_promotion_runs(
  candidate_generator,incumbent_generator,benchmark_scope,benchmark_metrics,
  structural_gates,decision,production_effect,evidence_hash
) values (
  'forward_fixture_v0.3.0_c0284_current_season',
  'production_fixture_v0.3_c0166',
  jsonb_build_object(
    'cutoff_policy','COMMON_GAMEWEEK_DEADLINE',
    'candidate_replay_gameweeks',jsonb_build_array(2,3,4),
    'incumbent_common_gameweeks',jsonb_build_array(3,4),
    'settled_common_matches',20,
    'gw5_status','PARTIAL_6_OF_10_NOT_USED_FOR_PRIMARY_PROMOTION',
    'c0166_gw2_status','UNAVAILABLE_MODEL_NOT_YET_CREATED',
    'selection_warning','Retrospective replay supports non-inferiority; it is not labelled prospective validation.'
  ),
  jsonb_build_object(
    'common_gw3_gw4',jsonb_build_object(
      'candidate',jsonb_build_object('exact_score_logloss',2.8934,'brier_1x2',0.6789,'team_goal_mae',0.9111,'total_goal_mae',1.5799,'family_brier',0.6459),
      'incumbent',jsonb_build_object('exact_score_logloss',2.8878,'brier_1x2',0.6780,'team_goal_mae',0.8972,'total_goal_mae',1.5555,'family_brier',0.6446),
      'max_candidate_regression_pct',1.57,
      'noninferiority_limit_pct',2.0
    ),
    'candidate_gw2_gw4',jsonb_build_object(
      'regularized_exact_score_logloss',2.9731,
      'unregularized_exact_score_logloss',3.0223,
      'current_only_exact_score_logloss',3.1599
    ),
    'partial_gw5_6_matches',jsonb_build_object(
      'candidate_exact_score_logloss',3.1773,
      'incumbent_exact_score_logloss',3.1799,
      'candidate_brier_1x2',0.6391,
      'incumbent_brier_1x2',0.5868,
      'promotion_weight','ZERO_PRIMARY_CONFIRMATORY_ONLY'
    )
  ),
  jsonb_build_object(
    'current_season_is_baseline',true,
    'prior_schedule','25/25/25/25/20/15/10/5/0 percent for matches 1..9+',
    'prior_source_changes_schedule',false,
    'legacy_l5_consumed',false,
    'legacy_l10_consumed',false,
    'legacy_l20_consumed',false,
    'current_reliability_regularizer','TWO_CURRENT_LEAGUE_MEAN_PSEUDO_MATCHES',
    'regularizer_is_previous_season_weight',false,
    'state_integrity_blockers',0
  ),
  'PROMOTE',true,
  encode(extensions.digest('C0284_P2_PROMOTE_FORWARD_FIXTURE_V030_CURRENT_SEASON_20260919','sha256'),'hex')
) on conflict(evidence_hash) do nothing;

create or replace view public.current_production_fixture_prediction_v01
with (security_invoker = true)
as
select distinct on (fps.match_id)
  fps.id,fps.match_id,fps.gameweek,fps.model_version_id,fps.captured_at,fps.kickoff_time,
  fps.is_pre_kickoff,fps.frozen,fps.home_lambda,fps.away_lambda,fps.score_matrix,
  fps.top_scorelines,fps.markets,fps.confidence,fps.change_reasons,fps.source_snapshot,
  fps.headline_score,fps.headline_score_probability,fps.raw_modal_score,
  fps.raw_modal_probability,fps.script_family,fps.script_confidence,fps.reason_manifest
from public.fixture_prediction_snapshots fps
where fps.is_pre_kickoff=true
  and (
    fps.source_snapshot->>'generator'<>'forward_fixture_v0.3.0_c0284_current_season'
    or not exists (
      select 1 from public.current_season_state_integrity_v01 i
      where i.season_start=2026 and i.integrity_status like 'BLOCK_%'
    )
  )
order by fps.match_id,
  case fps.source_snapshot->>'generator'
    when 'forward_fixture_v0.3.0_c0284_current_season' then 0
    when 'production_fixture_v0.3_c0166' then 1
    when 'production_fixture_v0.2_c0159' then 2
    when 'forward_fixture_v0.2.0_current_season' then 3
    when 'forward_fixture_v0.1.3' then 4
    else 9
  end,
  fps.captured_at desc,fps.id desc;

comment on view public.current_production_fixture_prediction_v01 is
  'Canonical fixture selector. C0284 current-season-first forecasts lead only while the cutoff-safe season-state gate has no BLOCK status.';

revoke all on public.current_production_fixture_prediction_v01 from anon;
grant select on public.current_production_fixture_prediction_v01 to authenticated,service_role;

-- Scheduler deactivation is executed separately through cron.alter_job because
-- managed pg_cron protects cron.job from migration-role updates.
