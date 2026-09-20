-- C0284 P4: append-only fixture decision freezes and fail-closed publication authorization.
-- Source forecast rows remain untouched. A freeze copies the selected decision payload into
-- immutable items and binds it to a reproducible lineage hash.

create table if not exists public.c0284_fixture_decision_freezes (
  id bigint generated always as identity primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  cutoff_at timestamptz not null,
  captured_at timestamptz not null default clock_timestamp(),
  generator text not null,
  model_version_id bigint not null,
  model_version text not null,
  feature_version text not null,
  decision_cycle_id bigint references public.fpl_decision_cycles(id),
  player_prediction_run_id bigint references public.gameweek_prediction_runs(id),
  fixture_count integer not null check (fixture_count = 10),
  snapshot_ids bigint[] not null,
  lineage_hash text not null,
  payload_hash text not null,
  freeze_hash text not null unique,
  frozen boolean not null default true check (frozen = true),
  publication_authorized boolean not null default false,
  authorization_status text not null check (authorization_status in ('AUTHORIZED','BLOCKED')),
  blockers jsonb not null default '[]'::jsonb check (jsonb_typeof(blockers)='array'),
  historical_forecasts_rewritten boolean not null default false check (historical_forecasts_rewritten=false),
  created_by text not null default 'C0284_P4_FREEZE_V01',
  check ((publication_authorized and authorization_status='AUTHORIZED' and blockers='[]'::jsonb)
      or (not publication_authorized and authorization_status='BLOCKED'))
);

create table if not exists public.c0284_fixture_decision_freeze_items (
  freeze_id bigint not null references public.c0284_fixture_decision_freezes(id),
  ordinal integer not null check (ordinal between 1 and 10),
  snapshot_id bigint not null references public.fixture_prediction_snapshots(id),
  match_id bigint not null,
  decision_hash text not null,
  item_hash text not null,
  frozen_payload jsonb not null,
  primary key (freeze_id, ordinal),
  unique (freeze_id, snapshot_id),
  unique (freeze_id, match_id)
);

create index if not exists c0284_fixture_freezes_gw_latest_idx
  on public.c0284_fixture_decision_freezes(gameweek,captured_at desc,id desc);

alter table public.c0284_fixture_decision_freezes enable row level security;
alter table public.c0284_fixture_decision_freeze_items enable row level security;
revoke all on public.c0284_fixture_decision_freezes from anon,authenticated;
revoke all on public.c0284_fixture_decision_freeze_items from anon,authenticated;
grant select,insert on public.c0284_fixture_decision_freezes to service_role;
grant select,insert on public.c0284_fixture_decision_freeze_items to service_role;

create or replace function private.c0284_block_freeze_mutation_v01()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  raise exception 'C0284 fixture freezes are append-only';
end;
$$;

drop trigger if exists trg_c0284_block_freeze_mutation on public.c0284_fixture_decision_freezes;
create trigger trg_c0284_block_freeze_mutation before update or delete
on public.c0284_fixture_decision_freezes for each row
execute function private.c0284_block_freeze_mutation_v01();

drop trigger if exists trg_c0284_block_freeze_item_mutation on public.c0284_fixture_decision_freeze_items;
create trigger trg_c0284_block_freeze_item_mutation before update or delete
on public.c0284_fixture_decision_freeze_items for each row
execute function private.c0284_block_freeze_mutation_v01();

create or replace function private.c0284_freeze_fixture_decisions_v01(
  p_gameweek integer,
  p_cutoff_at timestamptz,
  p_decision_cycle_id bigint default null,
  p_player_prediction_run_id bigint default null
) returns jsonb
language plpgsql security invoker set search_path=''
as $$
declare
  v_count integer; v_generators integer; v_models integer; v_first_kickoff timestamptz;
  v_generator text; v_model_id bigint; v_model_version text; v_snapshot_ids bigint[];
  v_lineage_hash text; v_payload_hash text; v_freeze_hash text; v_freeze_id bigint; v_blockers jsonb := '[]'::jsonb;
  v_cycle public.fpl_decision_cycles%rowtype; v_player public.gameweek_prediction_runs%rowtype;
begin
  if p_gameweek not between 1 and 38 or p_cutoff_at is null then raise exception 'invalid freeze request'; end if;

  select count(*),count(distinct d.source_snapshot->>'generator'),count(distinct d.model_version_id),
         min(d.kickoff_time),min(d.source_snapshot->>'generator'),min(d.model_version_id),
         min(coalesce(d.source_snapshot->>'model_version',d.model_version_id::text)),
         array_agg(d.snapshot_id order by d.match_id)
  into v_count,v_generators,v_models,v_first_kickoff,v_generator,v_model_id,v_model_version,v_snapshot_ids
  from public.current_fixture_decision_contract_v01 d where d.gameweek=p_gameweek;

  if v_count<>10 then raise exception 'C0284 freeze blocked: expected 10 fixtures, found %',v_count; end if;
  if v_generators<>1 or v_models<>1 then raise exception 'C0284 freeze blocked: mixed fixture lineage'; end if;
  if p_cutoff_at>=v_first_kickoff then raise exception 'C0284 freeze blocked: cutoff is not pre-kickoff'; end if;
  if exists(select 1 from public.current_fixture_decision_contract_v01 d where d.gameweek=p_gameweek
            and (not d.chronology_and_coverage_valid or d.captured_at>p_cutoff_at)) then
    raise exception 'C0284 freeze blocked: selected snapshot violates chronology, coverage, or cutoff';
  end if;

  select encode(extensions.digest(string_agg(concat_ws('|',d.match_id,d.snapshot_id,d.decision_hash),',' order by d.match_id),'sha256'),'hex'),
         encode(extensions.digest(string_agg((to_jsonb(d)-'frozen')::text,',' order by d.match_id),'sha256'),'hex')
  into v_lineage_hash,v_payload_hash
  from public.current_fixture_decision_contract_v01 d where d.gameweek=p_gameweek;

  if p_decision_cycle_id is null then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','DECISION_CYCLE_MISSING'));
  else
    select * into v_cycle from public.fpl_decision_cycles where id=p_decision_cycle_id and gameweek=p_gameweek;
    if not found then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','DECISION_CYCLE_INVALID')); end if;
  end if;
  if p_player_prediction_run_id is null then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','PLAYER_PREDICTION_RUN_MISSING'));
  else
    select * into v_player from public.gameweek_prediction_runs where id=p_player_prediction_run_id and gameweek=p_gameweek and frozen=true;
    if not found then v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','PLAYER_PREDICTION_RUN_NOT_FROZEN')); end if;
  end if;
  if v_cycle.id is not null and v_player.id is not null and not (v_player.id=any(v_cycle.prediction_run_ids)) then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MIXED_DECISION_CYCLE_PLAYER_LINEAGE'));
  end if;
  if v_cycle.id is not null and v_cycle.fixture_lineage_signature is distinct from v_lineage_hash then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('code','MIXED_DECISION_CYCLE_FIXTURE_LINEAGE'));
  end if;

  v_freeze_hash:=encode(extensions.digest(concat_ws('|','C0284_P4_FREEZE_V01',p_gameweek,p_cutoff_at,
    v_lineage_hash,v_payload_hash,coalesce(v_cycle.id::text,'NONE'),coalesce(v_player.id::text,'NONE')),'sha256'),'hex');

  insert into public.c0284_fixture_decision_freezes(
    gameweek,cutoff_at,generator,model_version_id,model_version,feature_version,
    decision_cycle_id,player_prediction_run_id,fixture_count,snapshot_ids,lineage_hash,payload_hash,freeze_hash,
    publication_authorized,authorization_status,blockers
  ) values (
    p_gameweek,p_cutoff_at,v_generator,v_model_id,v_model_version,'c0284_current_season_state_v01',
    v_cycle.id,v_player.id,v_count,v_snapshot_ids,v_lineage_hash,v_payload_hash,v_freeze_hash,
    v_blockers='[]'::jsonb,case when v_blockers='[]'::jsonb then 'AUTHORIZED' else 'BLOCKED' end,v_blockers
  ) returning id into v_freeze_id;

  insert into public.c0284_fixture_decision_freeze_items(freeze_id,ordinal,snapshot_id,match_id,decision_hash,item_hash,frozen_payload)
  select v_freeze_id,row_number() over(order by d.match_id),d.snapshot_id,d.match_id,d.decision_hash,
         encode(extensions.digest((to_jsonb(d)-'frozen')::text,'sha256'),'hex'),
         (to_jsonb(d)-'frozen')||jsonb_build_object('frozen',true,'freeze_id',v_freeze_id,'freeze_lineage_hash',v_lineage_hash,'cutoff_at',p_cutoff_at)
  from public.current_fixture_decision_contract_v01 d where d.gameweek=p_gameweek order by d.match_id;

  return jsonb_build_object('ok',true,'freeze_id',v_freeze_id,'gameweek',p_gameweek,'frozen',true,
    'lineage_hash',v_lineage_hash,'payload_hash',v_payload_hash,'freeze_hash',v_freeze_hash,
    'publication_authorized',v_blockers='[]'::jsonb,'blockers',v_blockers);
end;
$$;

revoke all on function private.c0284_freeze_fixture_decisions_v01(integer,timestamptz,bigint,bigint) from public,anon,authenticated;
grant execute on function private.c0284_freeze_fixture_decisions_v01(integer,timestamptz,bigint,bigint) to service_role;

create or replace view public.c0284_fixture_publication_gate_v01 with (security_invoker=true) as
select distinct on (g.gameweek) g.* from (
  select f.id as freeze_id,f.gameweek,f.captured_at,f.cutoff_at,f.frozen,f.publication_authorized,
         f.authorization_status,f.blockers,f.generator,f.model_version_id,f.model_version,f.feature_version,
         f.decision_cycle_id,f.player_prediction_run_id,f.fixture_count,f.snapshot_ids,f.lineage_hash,f.payload_hash,f.freeze_hash
  from public.c0284_fixture_decision_freezes f
) g order by g.gameweek,g.captured_at desc,g.freeze_id desc;

create or replace view public.current_authorized_fixture_decision_v01 with (security_invoker=true) as
select i.frozen_payload
from public.c0284_fixture_publication_gate_v01 g
join public.c0284_fixture_decision_freeze_items i on i.freeze_id=g.freeze_id
where g.frozen=true and g.publication_authorized=true and g.authorization_status='AUTHORIZED' and g.blockers='[]'::jsonb;

revoke all on public.c0284_fixture_publication_gate_v01 from anon;
revoke all on public.current_authorized_fixture_decision_v01 from anon;
grant select on public.c0284_fixture_publication_gate_v01 to authenticated,service_role;
grant select on public.current_authorized_fixture_decision_v01 to authenticated,service_role;

comment on view public.current_authorized_fixture_decision_v01 is
  'Fail-closed C0284 fixture publication surface. Only immutable, ten-fixture, single-lineage freezes with a matching frozen player run and decision cycle are exposed.';
