create table if not exists public.research_c0206_translation_model_runs (
  run_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  change_id text not null default 'C0206' check (change_id='C0206'),
  model_version text not null,
  phase text not null check (phase in ('TRAIN_FIT','VALIDATION_EVAL','TEST_EVAL')),
  parent_run_id uuid null references public.research_c0206_translation_model_runs(run_id),
  training_pair_count integer not null default 0,
  evaluation_pair_count integer not null default 0,
  training_selector jsonb not null default '{}'::jsonb,
  fit_payload jsonb not null default '{}'::jsonb,
  evaluation_payload jsonb not null default '{}'::jsonb,
  gate_payload jsonb not null default '{}'::jsonb,
  evidence jsonb not null default '{}'::jsonb,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled)
);

create or replace function private.c0206_block_translation_model_run_mutation_v01()
returns trigger language plpgsql security definer set search_path=private,public,pg_temp as $$
begin
  raise exception 'research_c0206_translation_model_runs is append-only';
end $$;

drop trigger if exists trg_c0206_translation_model_runs_append_only on public.research_c0206_translation_model_runs;
create trigger trg_c0206_translation_model_runs_append_only
before update or delete on public.research_c0206_translation_model_runs
for each row execute function private.c0206_block_translation_model_run_mutation_v01();

create or replace function private.c0206_translation_model_status_v01()
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
with latest_train as (
  select * from public.research_c0206_translation_model_runs where phase='TRAIN_FIT' order by created_at desc limit 1
), latest_val as (
  select * from public.research_c0206_translation_model_runs where phase='VALIDATION_EVAL' order by created_at desc limit 1
), latest_test as (
  select * from public.research_c0206_translation_model_runs where phase='TEST_EVAL' order by created_at desc limit 1
)
select jsonb_build_object(
  'change_id','C0206',
  'latest_train',coalesce((select to_jsonb(t) from latest_train t),'null'::jsonb),
  'latest_validation',coalesce((select to_jsonb(v) from latest_val v),'null'::jsonb),
  'latest_test',coalesce((select to_jsonb(x) from latest_test x),'null'::jsonb),
  'model_effect_enabled',false
);
$$;

grant select on public.research_c0206_translation_model_runs to service_role;
grant execute on function private.c0206_translation_model_status_v01() to service_role;