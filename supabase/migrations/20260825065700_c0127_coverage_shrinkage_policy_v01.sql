-- C0127 — Coverage shrinkage policy v0.1
-- Retrospective research only; does not connect to forecasts.

create table if not exists public.signal_coverage_policy_benchmarks (
  id bigserial primary key,
  policy_key text not null,
  change_id text not null,
  coverage_bin text not null,
  min_sample_l10 integer,
  max_sample_l10 integer,
  row_count integer not null,
  comparator_manifest jsonb not null default '{}'::jsonb,
  benchmark_metrics jsonb not null default '{}'::jsonb,
  decision text not null,
  actual_data_used boolean not null default false,
  model_effect_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique(policy_key, coverage_bin),
  check(actual_data_used=false),
  check(model_effect_enabled=false)
);

alter table public.signal_coverage_policy_benchmarks enable row level security;
revoke all on public.signal_coverage_policy_benchmarks from anon, authenticated;
grant select,insert on public.signal_coverage_policy_benchmarks to service_role;
grant usage,select on sequence public.signal_coverage_policy_benchmarks_id_seq to service_role;

create or replace function private.block_signal_coverage_policy_mutation_v01()
returns trigger language plpgsql set search_path=public,pg_temp as $$
begin raise exception 'signal coverage policy evidence is append-only'; end; $$;
revoke all on function private.block_signal_coverage_policy_mutation_v01() from public,anon,authenticated;
grant execute on function private.block_signal_coverage_policy_mutation_v01() to service_role;

drop trigger if exists signal_coverage_policy_benchmarks_no_mutation on public.signal_coverage_policy_benchmarks;
create trigger signal_coverage_policy_benchmarks_no_mutation
before update or delete on public.signal_coverage_policy_benchmarks
for each row execute function private.block_signal_coverage_policy_mutation_v01();

insert into public.signal_coverage_policy_benchmarks(
 policy_key,change_id,coverage_bin,min_sample_l10,max_sample_l10,row_count,
 comparator_manifest,benchmark_metrics,decision
) values
('COVPOL0001','C0127','VERY_SPARSE_1_4',1,4,6,
 '{"candidate_weights":{"zero":0,"linear":"n/10","quadratic":"(n/10)^2","cubic":"(n/10)^3"},"source":"chronology-safe retrospective audit"}'::jsonb,
 '{"evidence_strength":"insufficient","baseline_zero_required":true}'::jsonb,
 'SUPPRESS_PARTIAL_EFFECT'),
('COVPOL0001','C0127','SPARSE_5_7',5,7,42,
 '{"candidate_weights":{"zero":0,"linear":"n/10","quadratic":"(n/10)^2","cubic":"(n/10)^3"},"source":"chronology-safe retrospective audit"}'::jsonb,
 '{"baseline_zero_beats_linear_mae":true,"baseline_zero_beats_linear_rmse":true,"baseline_zero_beats_quadratic_mae":true,"baseline_zero_beats_quadratic_rmse":true,"baseline_zero_beats_cubic_mae":true,"baseline_zero_beats_cubic_rmse":true}'::jsonb,
 'SUPPRESS_PARTIAL_EFFECT'),
('COVPOL0001','C0127','NEAR_FULL_8_9',8,9,28,
 '{"candidate_weights":{"zero":0,"linear":"n/10","quadratic":"(n/10)^2","cubic":"(n/10)^3"},"source":"chronology-safe retrospective audit"}'::jsonb,
 '{"baseline_zero_beats_linear_mae":true,"baseline_zero_beats_linear_rmse":true,"baseline_zero_beats_quadratic_mae":true,"baseline_zero_beats_quadratic_rmse":true,"baseline_zero_beats_cubic_mae":true,"baseline_zero_beats_cubic_rmse":true}'::jsonb,
 'SUPPRESS_PARTIAL_EFFECT'),
('COVPOL0001','C0127','FULL_10',10,10,828,
 '{"candidate_weights":{"full":1},"source":"chronology-safe retrospective audit"}'::jsonb,
 '{"full_evidence_eligible":true}'::jsonb,
 'ALLOW_RESEARCH_COMPARATOR_WEIGHT')
on conflict do nothing;

create or replace function private.signal_effect_coverage_weight_v01(p_sample_l10 integer)
returns numeric language sql immutable security invoker set search_path=pg_catalog as $$
  select case
    when p_sample_l10 is null then null
    when p_sample_l10 < 10 then 0::numeric
    else 1::numeric
  end;
$$;
revoke all on function private.signal_effect_coverage_weight_v01(integer) from public,anon,authenticated;
grant execute on function private.signal_effect_coverage_weight_v01(integer) to service_role;

create or replace function private.signal_coverage_policy_status_v01()
returns jsonb language sql stable security definer set search_path=public,private,pg_temp as $$
select jsonb_build_object(
 'ok',true,'policy_key','COVPOL0001','change_id','C0127',
 'rule','NULL stays NULL; sample_l10 < 10 => 0; sample_l10 >= 10 => 1',
 'benchmarks',(select jsonb_agg(to_jsonb(b)-'id'-'created_at' order by min_sample_l10) from public.signal_coverage_policy_benchmarks b where policy_key='COVPOL0001'),
 'model_effect_enabled',false,'forecast_connection',false
);
$$;
revoke all on function private.signal_coverage_policy_status_v01() from public,anon,authenticated;
grant execute on function private.signal_coverage_policy_status_v01() to service_role;
