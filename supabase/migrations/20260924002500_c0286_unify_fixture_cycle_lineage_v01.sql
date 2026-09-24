-- C0286: C0276 must use exactly the lineage hash consumed by the C0284
-- immutable publication freeze.  The prior MD5 over a different view made
-- MIXED_DECISION_CYCLE_FIXTURE_LINEAGE unavoidable.

create or replace function private.c0276_fixture_signature_v01(p_gameweek integer)
returns text
language sql
stable
security definer
set search_path to 'private', 'public', 'pg_temp'
as $$
  select encode(
    extensions.digest(
      string_agg(concat_ws('|',d.match_id,d.snapshot_id,d.decision_hash),',' order by d.match_id),
      'sha256'
    ),
    'hex'
  )
  from public.current_fixture_decision_contract_v01 d
  where d.gameweek=p_gameweek
$$;

comment on function private.c0276_fixture_signature_v01(integer) is
  'C0286 canonical fixture-decision lineage: byte-identical to C0284 freeze lineage_hash.';
