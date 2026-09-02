create table if not exists public.fpl_manager_state_snapshots (
  id bigserial primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  captured_at timestamptz not null default now(),
  free_transfers integer null check (free_transfers between 0 and 10),
  bank_tenths integer null check (bank_tenths >= 0),
  acquisition_squad_cost_tenths integer null check (acquisition_squad_cost_tenths >= 0),
  source text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists fpl_manager_state_snapshots_gw_latest_idx
  on public.fpl_manager_state_snapshots (gameweek, captured_at desc, id desc);

with latest_plan as (
  select p.*
  from public.fpl_manager_plans p
  where p.gameweek = 3
  order by p.captured_at desc, p.id desc
  limit 1
),
active_squad as (
  select sm.player_id, sm.acquired_at, sm.notes
  from public.squad_members sm
  where sm.active = true
),
gw1_price as (
  select distinct on (fp.player_id) fp.player_id, fp.price
  from public.fpl_prices fp
  join active_squad s on s.player_id = fp.player_id
  where fp.gameweek = 1
  order by fp.player_id, fp.captured_at desc, fp.id desc
),
ledger as (
  select
    count(*)::integer as active_count,
    count(*) filter (where coalesce(s.notes,'') ilike '%GW1 initial squad%')::integer as initial_count,
    count(g.price)::integer as priced_count,
    sum(g.price)::integer as acquisition_cost_tenths
  from active_squad s
  left join gw1_price g on g.player_id = s.player_id
),
derived as (
  select
    3 as gameweek,
    case when coalesce(lp.rationale->>'decision','') ilike '%both free transfers%' then 2 else null end as free_transfers,
    case when l.active_count = 15 and l.initial_count = 15 and l.priced_count = 15 and l.acquisition_cost_tenths = 1000 then 0 else null end as bank_tenths,
    case when l.priced_count = 15 then l.acquisition_cost_tenths else null end as acquisition_squad_cost_tenths,
    jsonb_build_object(
      'change_id','C0179',
      'plan_gameweek',lp.gameweek,
      'plan_captured_at',lp.captured_at,
      'plan_status',lp.status,
      'plan_source',lp.source,
      'plan_decision_text',lp.rationale->>'decision',
      'active_squad_count',l.active_count,
      'gw1_initial_note_count',l.initial_count,
      'gw1_priced_count',l.priced_count,
      'gw1_acquisition_cost_tenths',l.acquisition_cost_tenths,
      'bank_derivation','1000 budget minus acquisition cost; valid only because all 15 active members remain GW1-initial ledger members',
      'free_transfer_derivation','explicit latest saved manager-plan decision text says preserve both free transfers',
      'missing_is_not_zero',true
    ) as evidence
  from latest_plan lp cross join ledger l
)
insert into public.fpl_manager_state_snapshots(gameweek,captured_at,free_transfers,bank_tenths,acquisition_squad_cost_tenths,source,evidence)
select d.gameweek, now(), d.free_transfers, d.bank_tenths, d.acquisition_squad_cost_tenths,
       'C0179_DERIVED_AUDITED_MANAGER_STATE_V1', d.evidence
from derived d
where not exists (
  select 1 from public.fpl_manager_state_snapshots s
  where s.gameweek=d.gameweek and s.source='C0179_DERIVED_AUDITED_MANAGER_STATE_V1'
);
