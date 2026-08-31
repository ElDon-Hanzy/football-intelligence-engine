create table if not exists public.fpl_manager_plans (
  id bigserial primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  captured_at timestamptz not null default now(),
  status text not null,
  horizon text not null default '3-5 GW',
  transfers jsonb not null default '[]'::jsonb,
  captain_player_id bigint references public.players(id),
  vice_player_id bigint references public.players(id),
  starting_xi jsonb,
  bench_order jsonb,
  chip text,
  gw_expected_xi_points numeric,
  expected_gain_current_gw numeric,
  expected_gain_horizon numeric,
  risk_level text,
  rationale jsonb not null default '{}'::jsonb,
  source text not null default 'full_pool_decision_control',
  supersedes_id bigint references public.fpl_manager_plans(id)
);
create index if not exists idx_fpl_manager_plans_gw on public.fpl_manager_plans(gameweek,captured_at desc);
alter table public.fpl_manager_plans enable row level security;
revoke all on public.fpl_manager_plans from anon, authenticated;
revoke all on sequence public.fpl_manager_plans_id_seq from anon, authenticated;
create or replace function private.block_fpl_manager_plan_mutation_v01()
returns trigger language plpgsql as $$begin raise exception 'FPL manager plans are append-only; add a superseding row instead'; end$$;
drop trigger if exists trg_block_fpl_manager_plan_update on public.fpl_manager_plans;
create trigger trg_block_fpl_manager_plan_update before update or delete on public.fpl_manager_plans for each row execute function private.block_fpl_manager_plan_mutation_v01();
comment on table public.fpl_manager_plans is 'C0144 append-only full-pool FPL recommendation overlay. Does not mutate actual squad or frozen model decisions; latest plan per GW is the current advisory plan.';
