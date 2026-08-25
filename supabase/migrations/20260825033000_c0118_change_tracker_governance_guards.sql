-- C0118 — Governance enforcement & traceability audit
-- Keeps the Supabase working ledger machine-checkable without changing model outputs.

alter table public.change_tracker_working
  add column if not exists decision_required boolean not null default false;

alter table public.change_tracker_working
  add column if not exists decision_refs text[] not null default '{}'::text[];

create or replace function private.enforce_change_tracker_governance_v01()
returns trigger
language plpgsql
set search_path = public, private, pg_temp
as $$
begin
  if new.change_id !~ '^C[0-9]{4}$' then
    raise exception 'Invalid Change ID: %', new.change_id;
  end if;

  if new.status = 'Completed' and new.delivery_stage <> 'Verified' then
    raise exception 'Completed change % must have delivery_stage=Verified', new.change_id;
  end if;

  if new.status = 'Completed' and coalesce(cardinality(new.implementation_refs),0) = 0 then
    raise exception 'Completed change % must have at least one implementation reference', new.change_id;
  end if;

  if new.decision_required and coalesce(cardinality(new.decision_refs),0) = 0 then
    raise exception 'Decision-bearing change % must have at least one decision reference', new.change_id;
  end if;

  new.last_updated := clock_timestamp();
  return new;
end;
$$;

revoke all on function private.enforce_change_tracker_governance_v01() from public, anon, authenticated;

drop trigger if exists change_tracker_governance_guard_v01 on public.change_tracker_working;
create trigger change_tracker_governance_guard_v01
before insert or update on public.change_tracker_working
for each row execute function private.enforce_change_tracker_governance_v01();

create or replace function private.audit_change_tracker_governance_v01()
returns jsonb
language sql
stable
set search_path = public, private, pg_temp
as $$
select jsonb_build_object(
  'total_rows', count(*),
  'bad_change_ids', count(*) filter (where change_id !~ '^C[0-9]{4}$'),
  'completed_not_verified', count(*) filter (where status='Completed' and delivery_stage<>'Verified'),
  'completed_without_refs', count(*) filter (where status='Completed' and coalesce(cardinality(implementation_refs),0)=0),
  'decision_rows', count(*) filter (where decision_required),
  'decision_rows_without_refs', count(*) filter (where decision_required and coalesce(cardinality(decision_refs),0)=0),
  'ok', (
    count(*) filter (where change_id !~ '^C[0-9]{4}$') = 0
    and count(*) filter (where status='Completed' and delivery_stage<>'Verified') = 0
    and count(*) filter (where status='Completed' and coalesce(cardinality(implementation_refs),0)=0) = 0
    and count(*) filter (where decision_required and coalesce(cardinality(decision_refs),0)=0) = 0
  )
)
from public.change_tracker_working;
$$;

revoke all on function private.audit_change_tracker_governance_v01() from public, anon, authenticated;

-- Decision links are explicit data, not inferred from prose.
update public.change_tracker_working
set decision_required=true,
    decision_refs=case change_id
      when 'C0055' then array['DECISIONS_AND_HISTORY.md §5 Frozen forecasts and append-only history','DECISIONS_AND_HISTORY.md §13 Betting edge roadmap','DECISIONS_AND_HISTORY.md §19 Research edge is not a recommendation']
      when 'C0058' then array['DECISIONS_AND_HISTORY.md §14 Rejected approaches','PROJECT_STATE.md §6 Goal/outcome distribution']
      when 'C0082' then array['DECISIONS_AND_HISTORY.md §29 Box occupation is not pressing','DECISIONS_AND_HISTORY.md §41 No left/right claims without side/zone evidence','DECISIONS_AND_HISTORY.md §42 Transition opportunity is not high-line-vs-pace']
      when 'C0091' then array['DECISIONS_AND_HISTORY.md §31 Replacement quality remains disabled as a model effect','DECISIONS_AND_HISTORY.md §38 Replacement proxy promotion gate']
      when 'C0106' then array['DECISIONS_AND_HISTORY.md — venue/home-uplift rejection decision','PROJECT_STATE.md §5 Team-strength calibration']
      when 'C0107' then array['DECISIONS_AND_HISTORY.md — promoted-team prior decision','PROJECT_STATE.md §5 Team-strength calibration']
      when 'C0108' then array['DECISIONS_AND_HISTORY.md — cross-season form decay decision','PROJECT_STATE.md §5 Team-strength calibration']
      when 'C0112' then array['DECISIONS_AND_HISTORY.md — persistent Elo research decision','PROJECT_STATE.md §5 Team-strength calibration']
      when 'C0113' then array['DECISIONS_AND_HISTORY.md §5 Frozen forecasts and append-only history','PROJECT_STATE.md §11 Blind current-engine GW1 replay']
      when 'C0115' then array['DECISIONS_AND_HISTORY.md §5 Frozen forecasts and append-only history','PROJECT_STATE.md §13 Current major pending work']
      else decision_refs
    end
where change_id in ('C0055','C0058','C0082','C0091','C0106','C0107','C0108','C0112','C0113','C0115');
