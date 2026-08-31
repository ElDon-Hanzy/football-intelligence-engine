create table if not exists public.fpl_actual_manager_decisions (
  id bigserial primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  captured_at timestamptz not null default now(),
  captain_player_id bigint references public.players(id),
  vice_player_id bigint references public.players(id),
  starting_xi jsonb,
  bench_order jsonb,
  chip text,
  source text not null default 'manager_confirmed',
  notes text,
  correction_of_id bigint references public.fpl_actual_manager_decisions(id)
);
create index if not exists idx_fpl_actual_manager_decisions_gw on public.fpl_actual_manager_decisions(gameweek,captured_at desc);
alter table public.fpl_actual_manager_decisions enable row level security;
revoke all on public.fpl_actual_manager_decisions from anon, authenticated;
revoke all on sequence public.fpl_actual_manager_decisions_id_seq from anon, authenticated;
create or replace function private.block_fpl_actual_manager_decision_mutation_v01()
returns trigger language plpgsql as $$begin raise exception 'FPL actual manager decisions are append-only; add a correction row instead'; end$$;
drop trigger if exists trg_block_fpl_actual_manager_decision_update on public.fpl_actual_manager_decisions;
create trigger trg_block_fpl_actual_manager_decision_update before update or delete on public.fpl_actual_manager_decisions for each row execute function private.block_fpl_actual_manager_decision_mutation_v01();
comment on table public.fpl_actual_manager_decisions is 'C0142 append-only overlay of manager-confirmed real FPL actions. Separate from immutable model decision_snapshots; latest captured row per GW is display-authoritative for actual action reporting.';
