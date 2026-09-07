create table if not exists private.c0217_public_fpl_manager_state_audits (
  id bigserial primary key,
  entry_id bigint not null,
  target_gameweek integer not null,
  captured_at timestamptz not null default clock_timestamp(),
  current_state_visibility text not null,
  opening_free_transfers integer,
  locked_bank_tenths integer,
  acquisition_squad_cost_tenths integer,
  acquisition_cost_exact boolean not null default false,
  current_squad_proven boolean not null default false,
  endpoint_status jsonb not null default '{}'::jsonb,
  squad jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '{}'::jsonb
);
create index if not exists c0217_public_manager_audit_entry_gw_idx on private.c0217_public_fpl_manager_state_audits(entry_id,target_gameweek,captured_at desc);
revoke all on private.c0217_public_fpl_manager_state_audits from public,anon,authenticated;
grant select,insert on private.c0217_public_fpl_manager_state_audits to service_role;
grant usage,select on sequence private.c0217_public_fpl_manager_state_audits_id_seq to service_role;

create or replace function private.block_c0217_public_manager_audit_mutation_v01()
returns trigger language plpgsql set search_path='pg_catalog','private','public' as $$
begin raise exception 'C0217 public manager-state audit is append-only'; end $$;
drop trigger if exists trg_block_c0217_public_manager_audit_mutation on private.c0217_public_fpl_manager_state_audits;
create trigger trg_block_c0217_public_manager_audit_mutation before update or delete on private.c0217_public_fpl_manager_state_audits for each row execute function private.block_c0217_public_manager_audit_mutation_v01();