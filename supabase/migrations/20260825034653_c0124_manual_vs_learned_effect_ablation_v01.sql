-- C0124 — Historical manual-vs-learned signal-effect ablation v0.1
-- Production mirror. Research only; no forward activation.

create table if not exists public.signal_effect_ablation_results (
  id bigserial primary key, experiment_key text not null, change_id text not null,
  variant_key text not null, family_scope text not null, holdout_rows integer not null,
  baseline_mae numeric not null, variant_mae numeric not null,
  baseline_rmse numeric not null, variant_rmse numeric not null,
  coefficient_manifest jsonb not null default '{}'::jsonb,
  decision text not null, evidence jsonb not null default '{}'::jsonb,
  actual_data_used boolean not null default false,
  model_effect_enabled boolean not null default false,
  created_at timestamptz not null default now(), unique(experiment_key,variant_key),
  check(actual_data_used=false), check(model_effect_enabled=false)
);
create table if not exists public.signal_effect_family_decisions (
  id bigserial primary key, experiment_key text not null, change_id text not null,
  family_key text not null, decision text not null,
  supporting_variant_keys jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  forward_activation_allowed boolean not null default false,
  model_effect_enabled boolean not null default false,
  created_at timestamptz not null default now(), unique(experiment_key,family_key),
  check(forward_activation_allowed=false), check(model_effect_enabled=false)
);
alter table public.signal_effect_ablation_results enable row level security;
alter table public.signal_effect_family_decisions enable row level security;
revoke all on public.signal_effect_ablation_results, public.signal_effect_family_decisions from anon,authenticated;
grant select,insert on public.signal_effect_ablation_results, public.signal_effect_family_decisions to service_role;
grant usage,select on sequence public.signal_effect_ablation_results_id_seq, public.signal_effect_family_decisions_id_seq to service_role;

create or replace function private.block_signal_effect_ablation_mutation_v01()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'signal effect ablation evidence is append-only'; end; $$;
revoke all on function private.block_signal_effect_ablation_mutation_v01() from public,anon,authenticated;
grant execute on function private.block_signal_effect_ablation_mutation_v01() to service_role;
drop trigger if exists signal_effect_ablation_results_no_mutation on public.signal_effect_ablation_results;
create trigger signal_effect_ablation_results_no_mutation before update or delete on public.signal_effect_ablation_results for each row execute function private.block_signal_effect_ablation_mutation_v01();
drop trigger if exists signal_effect_family_decisions_no_mutation on public.signal_effect_family_decisions;
create trigger signal_effect_family_decisions_no_mutation before update or delete on public.signal_effect_family_decisions for each row execute function private.block_signal_effect_ablation_mutation_v01();

insert into public.research_experiments(
 experiment_key,change_id,parent_experiment_key,experiment_name,purpose,hypothesis,experiment_type,
 feature_schema_version,feature_families,baseline_model_version,candidate_model_version,outcome_model_version,
 chronology_policy,train_window,validation_window,test_window,coefficient_manifest,external_refs,definition_hash,
 status,actual_data_allowed_in_generation,forward_valid,model_effect_enabled)
select 'E0009','C0124',null,'Historical manual-vs-learned signal-effect ablation v0.1',
 'Compare expert-set residual heuristics with the regularized learned-effect decision on one untouched chronology-safe holdout.',
 'Only signal families that improve both MAE and RMSE may remain as research comparators; none may activate from retrospective evidence.',
 'ABLATION','historical_prematch_feature_archive_v0.1',
 '["RECENT_FORM","OPPONENT_DEFENCE_TREND","SCHEDULE_FATIGUE","REGULARIZED_MAIN_EFFECTS"]'::jsonb,
 'team_strength_linear_v0.1','manual_form_v0.2_decay_vs_RSE0001','xg_residual_mae_rmse',
 jsonb_build_object('retrospective_only',true,'train_end_exclusive','2026-01-31T00:00:00Z','gap_date','2026-01-31','holdout_start','2026-02-01T00:00:00Z','holdout_rows',210,'forward_activation',false),
 jsonb_build_object('rows',688,'end_exclusive','2026-01-31T00:00:00Z'),
 jsonb_build_object('rows',210,'start','2026-02-01T00:00:00Z'),null,
 jsonb_build_object('manual_own_form_max_log',0.05,'manual_opponent_defence_max_log',0.04,'learned_model','RSE0001'),
 jsonb_build_object('parent_change','C0072','regularized_model','RSE0001','benchmark_source','C0066'),
 md5(jsonb_build_object('experiment','E0009','holdout_rows',210,'manual_form',0.05,'manual_opp_def',0.04,'learned_model','RSE0001')::text),
 'REGISTERED',false,false,false
where not exists(select 1 from public.research_experiments where experiment_key='E0009');

insert into public.signal_effect_ablation_results(experiment_key,change_id,variant_key,family_scope,holdout_rows,baseline_mae,variant_mae,baseline_rmse,variant_rmse,coefficient_manifest,decision,evidence) values
('E0009','C0124','BASE_ZERO','CONTROL',210,.639759,.639759,.817821,.817821,'{}','CONTROL','{"residual_effects":"zero"}'),
('E0009','C0124','MANUAL_OWN_FORM','OWN_ATTACK_FORM',210,.639759,.638183,.817821,.818176,'{"max_log_effect":0.05,"coverage_scaled":true}','REJECT_STANDALONE_RMSE_REGRESSION','{"mae_delta":-0.001576,"rmse_delta":0.000355}'),
('E0009','C0124','MANUAL_OPP_DEF','OPPONENT_DEFENCE_TREND',210,.639759,.638962,.817821,.816760,'{"max_log_effect":0.04,"coverage_scaled":true}','RETAIN_SMALL_RESEARCH_COMPARATOR','{"mae_delta":-0.000797,"rmse_delta":-0.001061}'),
('E0009','C0124','MANUAL_FORM_COMBINED','RECENT_FORM_PACKAGE',210,.639759,.637791,.817821,.817136,'{"own_form_max_log":0.05,"opponent_defence_max_log":0.04,"coverage_scaled":true}','RETAIN_SMALL_RESEARCH_COMPARATOR','{"mae_delta":-0.001968,"rmse_delta":-0.000685}'),
('E0009','C0124','LEARNED_RSE0001','REGULARIZED_MAIN_EFFECTS',210,.639759,.639759,.817821,.817821,'{"model_key":"RSE0001","selected_coefficients":"all_zero"}','SHRINK_TO_ZERO','{"reason":"no nonzero ridge candidate improved both inner-validation MAE and RMSE"}')
on conflict do nothing;

insert into public.signal_effect_family_decisions(experiment_key,change_id,family_key,decision,supporting_variant_keys,evidence) values
('E0009','C0124','RECENT_FORM_PACKAGE','RETAIN_SMALL_RESEARCH_COMPARATOR','["MANUAL_FORM_COMBINED","MANUAL_OWN_FORM","MANUAL_OPP_DEF"]','{"holdout_rows":210}'),
('E0009','C0124','OWN_ATTACK_FORM','DO_NOT_RETAIN_STANDALONE','["MANUAL_OWN_FORM"]','{"reason":"MAE improved but RMSE worsened"}'),
('E0009','C0124','OPPONENT_DEFENCE_TREND','RETAIN_SMALL_RESEARCH_COMPARATOR','["MANUAL_OPP_DEF"]','{"reason":"both MAE and RMSE improved modestly"}'),
('E0009','C0124','REGULARIZED_MAIN_EFFECTS','SHRINK_TO_ZERO','["LEARNED_RSE0001"]','{"model_key":"RSE0001"}'),
('E0009','C0124','SCHEDULE_FATIGUE','REJECT_ZERO','[]','{"source_benchmark":"SEV1_20260824/SCHEDULE_FATIGUE","baseline_mae":0.6422,"candidate_mae":0.6426,"baseline_rmse":0.8203,"candidate_rmse":0.8207}')
on conflict do nothing;

create or replace function private.signal_effect_ablation_status_v01()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
select jsonb_build_object('ok',true,'experiment_key','E0009','change_id','C0124',
 'variants',(select jsonb_agg(to_jsonb(r)-'id'-'created_at' order by variant_key) from public.signal_effect_ablation_results r where experiment_key='E0009'),
 'family_decisions',(select jsonb_agg(to_jsonb(d)-'id'-'created_at' order by family_key) from public.signal_effect_family_decisions d where experiment_key='E0009'),
 'forward_activation_allowed',false,'model_effect_enabled',false);
$$;
revoke all on function private.signal_effect_ablation_status_v01() from public,anon,authenticated;
grant execute on function private.signal_effect_ablation_status_v01() to service_role;
