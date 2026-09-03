create table if not exists public.research_c0197_chaos_shadow_runs (
  run_key text primary key,
  change_id text not null default 'C0197' check (change_id='C0197'),
  created_at timestamptz not null default now(),
  definition jsonb not null,
  train_seasons jsonb not null,
  validation_season text not null,
  test_season text not null,
  selected_scale numeric not null default 0,
  conclusion text not null,
  status text not null default 'SHADOW_REJECTED_NO_EDGE',
  research_only boolean not null default true check (research_only=true),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false)
);

create table if not exists public.research_c0197_chaos_shadow_predictions (
  run_key text not null references public.research_c0197_chaos_shadow_runs(run_key),
  source_match_id text not null,
  season text not null,
  split text not null check (split in ('TRAIN','VALIDATION','TEST')),
  match_date date not null,
  home_team text not null,
  away_team text not null,
  actual_total_goals integer not null,
  market_over25_probability numeric not null,
  market_poisson_mu numeric not null,
  home_history_n integer,
  away_history_n integer,
  feature_eligible boolean not null,
  goal_variance_signal numeric,
  shot_variance_signal numeric,
  sot_variance_signal numeric,
  conversion_variance_signal numeric,
  chaos_z numeric,
  p4_plus numeric not null,
  p5_plus numeric not null,
  p6_plus numeric not null,
  p7_plus numeric not null,
  baseline_total_goal_logloss numeric not null,
  selected_dispersion_scale numeric not null default 0 check (selected_dispersion_scale=0),
  research_only boolean not null default true check (research_only=true),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  primary key (run_key, source_match_id)
);

create table if not exists public.research_c0197_chaos_shadow_grid_results (
  run_key text not null references public.research_c0197_chaos_shadow_runs(run_key),
  baseline_type text not null,
  evaluation_season text not null,
  activation_rule text not null,
  scale numeric not null,
  total_goal_logloss numeric not null,
  notes text,
  research_only boolean not null default true check (research_only=true),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  primary key (run_key, baseline_type, evaluation_season, activation_rule, scale)
);

create table if not exists public.research_c0197_chaos_shadow_tail_calibration (
  run_key text not null references public.research_c0197_chaos_shadow_runs(run_key),
  season text not null,
  bucket text not null,
  n integer not null,
  actual_p4_plus numeric not null,
  predicted_p4_plus numeric not null,
  actual_p5_plus numeric not null,
  predicted_p5_plus numeric not null,
  actual_p6_plus numeric not null,
  predicted_p6_plus numeric not null,
  actual_p7_plus numeric not null,
  predicted_p7_plus numeric not null,
  research_only boolean not null default true check (research_only=true),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  primary key (run_key, season, bucket)
);

alter table public.research_c0197_chaos_shadow_runs enable row level security;
alter table public.research_c0197_chaos_shadow_predictions enable row level security;
alter table public.research_c0197_chaos_shadow_grid_results enable row level security;
alter table public.research_c0197_chaos_shadow_tail_calibration enable row level security;
revoke all on public.research_c0197_chaos_shadow_runs from anon, authenticated;
revoke all on public.research_c0197_chaos_shadow_predictions from anon, authenticated;
revoke all on public.research_c0197_chaos_shadow_grid_results from anon, authenticated;
revoke all on public.research_c0197_chaos_shadow_tail_calibration from anon, authenticated;

create or replace function private.block_c0197_chaos_shadow_mutation_v01()
returns trigger language plpgsql set search_path = private, public, pg_temp as $$
begin
  raise exception 'C0197 chaos shadow evidence is append-only';
end; $$;

revoke all on function private.block_c0197_chaos_shadow_mutation_v01() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['research_c0197_chaos_shadow_runs','research_c0197_chaos_shadow_predictions','research_c0197_chaos_shadow_grid_results','research_c0197_chaos_shadow_tail_calibration'] loop
    execute format('drop trigger if exists %I on public.%I', 'trg_'||t||'_append_only', t);
    execute format('create trigger %I before update or delete on public.%I for each row execute function private.block_c0197_chaos_shadow_mutation_v01()', 'trg_'||t||'_append_only', t);
  end loop;
end $$;

create or replace function private.c0197_chaos_shadow_status_v01()
returns jsonb language sql stable set search_path = private, public, pg_temp as $$
select jsonb_build_object(
 'change_id','C0197',
 'runs',(select count(*) from public.research_c0197_chaos_shadow_runs),
 'latest_run',(select run_key from public.research_c0197_chaos_shadow_runs order by created_at desc limit 1),
 'predictions',(select count(*) from public.research_c0197_chaos_shadow_predictions),
 'feature_eligible',(select count(*) from public.research_c0197_chaos_shadow_predictions where feature_eligible),
 'selected_scale',(select selected_scale from public.research_c0197_chaos_shadow_runs order by created_at desc limit 1),
 'conclusion',(select conclusion from public.research_c0197_chaos_shadow_runs order by created_at desc limit 1),
 'model_effect_enabled',false
);
$$;
revoke all on function private.c0197_chaos_shadow_status_v01() from public, anon, authenticated;
