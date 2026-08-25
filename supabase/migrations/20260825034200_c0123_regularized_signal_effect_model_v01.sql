-- C0123 — Regularized signal-effect model v0.1
-- Chronology-safe residual model registry. Research only; no model activation.

create table if not exists public.regularized_signal_effect_models (
  id bigserial primary key,
  model_key text not null unique,
  change_id text not null,
  target_version text not null,
  train_window jsonb not null,
  inner_validation_window jsonb not null,
  holdout_window jsonb not null,
  feature_manifest jsonb not null,
  penalty_grid jsonb not null,
  selected_penalty numeric,
  coefficients jsonb not null,
  selection_decision text not null,
  inner_validation_metrics jsonb not null,
  holdout_metrics jsonb not null,
  evidence jsonb not null default '{}'::jsonb,
  actual_data_used boolean not null default false,
  model_effect_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  check (actual_data_used=false),
  check (model_effect_enabled=false)
);

alter table public.regularized_signal_effect_models enable row level security;
revoke all on public.regularized_signal_effect_models from anon,authenticated;
grant select,insert on public.regularized_signal_effect_models to service_role;
grant usage,select on sequence public.regularized_signal_effect_models_id_seq to service_role;

create or replace function private.block_regularized_signal_effect_model_mutation_v01()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'regularized_signal_effect_models is append-only'; end; $$;
revoke all on function private.block_regularized_signal_effect_model_mutation_v01() from public,anon,authenticated;
grant execute on function private.block_regularized_signal_effect_model_mutation_v01() to service_role;

drop trigger if exists regularized_signal_effect_models_no_mutation on public.regularized_signal_effect_models;
create trigger regularized_signal_effect_models_no_mutation
before update or delete on public.regularized_signal_effect_models
for each row execute function private.block_regularized_signal_effect_model_mutation_v01();

insert into public.regularized_signal_effect_models(
  model_key,change_id,target_version,train_window,inner_validation_window,holdout_window,
  feature_manifest,penalty_grid,selected_penalty,coefficients,selection_decision,
  inner_validation_metrics,holdout_metrics,evidence
)
values(
  'RSE0001','C0123','c0067_attack_xg_residual_v01',
  jsonb_build_object('rows',688,'start','2024-09-28T11:30:00Z','end_exclusive','2026-01-31T00:00:00Z'),
  jsonb_build_object('inner_train_rows',488,'inner_train_end_exclusive','2025-11-01T00:00:00Z','inner_validation_rows',200,'inner_validation_start','2025-11-01T00:00:00Z','inner_validation_end_exclusive','2026-01-31T00:00:00Z'),
  jsonb_build_object('gap_rows',6,'gap_date','2026-01-31','holdout_rows',210,'holdout_start','2026-02-01T00:00:00Z','holdout_end','2026-05-24T23:59:59Z'),
  jsonb_build_object(
    'own_form_trend','(L5 xG for - L10 xG for) * min(1,sample_l10/10)',
    'opponent_defence_trend','(opponent L10 xGA - opponent L5 xGA) * min(1,opponent_sample_l10/10)',
    'short_rest','1 when days_since_previous < 4, else 0',
    'coverage_policy','coverage multiplies trend before fitting; unsupported families are not imputed',
    'baseline','team_strength_linear_v0.1 residual target'
  ),
  '[0,0.001,0.005,0.01,0.025,0.05,0.1,0.25,0.5,1.0]'::jsonb,
  null,
  jsonb_build_object('intercept',0,'own_form_trend',0,'opponent_defence_trend',0,'short_rest',0),
  'SHRINK_TO_ZERO_NO_DUAL_METRIC_GAIN',
  jsonb_build_object(
    'baseline_mae',0.668900,'baseline_rmse',0.806557,
    'best_rmse_candidate',jsonb_build_object('penalty',0,'mae',0.670355,'rmse',0.806177),
    'best_mae_candidate',jsonb_build_object('penalty',1.0,'mae',0.668669,'rmse',0.806834),
    'gate','candidate must improve both MAE and RMSE to keep non-zero learned effects'
  ),
  jsonb_build_object(
    'baseline_mae',0.639759,'baseline_rmse',0.817821,
    'unregularized_full_train',jsonb_build_object('mae',0.637819,'rmse',0.819550),
    'ridge_k1_full_train',jsonb_build_object('mae',0.637968,'rmse',0.818446),
    'selected_zero',jsonb_build_object('mae',0.639759,'rmse',0.817821),
    'interpretation','non-zero residual effects marginally improve MAE but worsen RMSE; no robust promotion'
  ),
  jsonb_build_object(
    'full_train_unregularized_coefficients',jsonb_build_object('intercept',-0.03868655,'own_form_trend',0.01985786,'opponent_defence_trend',0.04309021,'short_rest',0.17115045),
    'full_train_ridge_k1_coefficients',jsonb_build_object('intercept',-0.02497201,'own_form_trend',0.01086504,'opponent_defence_trend',0.01951307,'short_rest',0.08528795),
    'missing_is_not_zero',true,
    'actual_data_used_in_generation',false,
    'model_effect_enabled',false,
    'decision','Weak evidence shrinks to zero. No learned effect activated from retrospective data.'
  )
)
on conflict(model_key) do nothing;

insert into public.signal_effect_benchmarks(
  benchmark_key,signal_family,candidate_version,train_rows,holdout_rows,
  baseline_mae,candidate_mae,baseline_rmse,candidate_rmse,decision,evidence,model_effect_enabled
)
values(
  'RSE0001_20260825','REGULARIZED_MAIN_EFFECTS','ridge_standardized_v0.1_zero_gate',688,210,
  0.639759,0.639759,0.817821,0.817821,'SHRINK_TO_ZERO_NO_DUAL_METRIC_GAIN',
  jsonb_build_object('change_id','C0123','model_key','RSE0001','inner_validation_rows',200,'gap_rows',6,'holdout_rows',210,'note','Nonzero ridge candidates were not promoted because none improved both inner-validation MAE and RMSE.'),false
)
on conflict do nothing;

create or replace function private.regularized_signal_effect_model_status_v01()
returns jsonb language sql stable security definer
set search_path=public,private,pg_temp as $$
select coalesce((
  select jsonb_build_object(
    'ok',true,'model_key',model_key,'change_id',change_id,'selection_decision',selection_decision,
    'coefficients',coefficients,'train_window',train_window,'inner_validation_window',inner_validation_window,
    'holdout_window',holdout_window,'inner_validation_metrics',inner_validation_metrics,
    'holdout_metrics',holdout_metrics,'actual_data_used',actual_data_used,'model_effect_enabled',model_effect_enabled
  ) from public.regularized_signal_effect_models order by id desc limit 1
),jsonb_build_object('ok',false,'reason','NO_MODEL'));
$$;
revoke all on function private.regularized_signal_effect_model_status_v01() from public,anon,authenticated;
grant execute on function private.regularized_signal_effect_model_status_v01() to service_role;
