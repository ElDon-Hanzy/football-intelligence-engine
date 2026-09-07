create table if not exists private.c0217_odds_scope_cleanup_audits (
  id bigserial primary key,
  phase text not null check(phase in ('BEFORE','AFTER')),
  captured_at timestamptz not null default clock_timestamp(),
  allowed_markets text[] not null,
  raw_snapshot_rows bigint not null,
  raw_payload_bytes bigint not null,
  raw_market_objects bigint not null,
  normalized_rows bigint not null,
  normalized_allowed_rows bigint not null,
  normalized_other_rows bigint not null,
  raw_relation_bytes bigint not null,
  normalized_relation_bytes bigint not null,
  evidence jsonb not null default '{}'::jsonb
);
revoke all on private.c0217_odds_scope_cleanup_audits from public,anon,authenticated;
grant select,insert on private.c0217_odds_scope_cleanup_audits to service_role;
grant usage,select on sequence private.c0217_odds_scope_cleanup_audits_id_seq to service_role;

insert into private.c0217_odds_scope_cleanup_audits(
 phase,allowed_markets,raw_snapshot_rows,raw_payload_bytes,raw_market_objects,
 normalized_rows,normalized_allowed_rows,normalized_other_rows,raw_relation_bytes,normalized_relation_bytes,evidence)
select 'BEFORE',array['h2h','totals','btts','correct_score'],
 (select count(*) from public.odds_raw_snapshots),
 (select coalesce(sum(pg_column_size(payload)),0) from public.odds_raw_snapshots),
 (select coalesce(sum(jsonb_array_length(coalesce(payload->'markets','[]'::jsonb))),0) from public.odds_raw_snapshots),
 (select count(*) from public.odds_market_selections),
 (select count(*) from public.odds_market_selections where market_key in ('h2h','totals','btts','correct_score')),
 (select count(*) from public.odds_market_selections where market_key not in ('h2h','totals','btts','correct_score')),
 pg_total_relation_size('public.odds_raw_snapshots'::regclass),
 pg_total_relation_size('public.odds_market_selections'::regclass),
 jsonb_build_object('change_id','C0217','policy','remove historically stored markets outside the four user-approved main markets; preserve retained-market chronology');

with filtered as (
  select r.id,
    jsonb_set(
      r.payload,
      '{markets}',
      coalesce((
        select jsonb_agg(m)
        from jsonb_array_elements(coalesce(r.payload->'markets','[]'::jsonb)) m
        where lower(coalesce(m->>'name','')) in ('ml','correct score','both teams to score','totals','goals over under')
      ),'[]'::jsonb),
      true
    ) as new_payload
  from public.odds_raw_snapshots r
  where exists (
    select 1 from jsonb_array_elements(coalesce(r.payload->'markets','[]'::jsonb)) m
    where lower(coalesce(m->>'name','')) not in ('ml','correct score','both teams to score','totals','goals over under')
  )
)
update public.odds_raw_snapshots r
set payload=f.new_payload,
    payload_hash=null
from filtered f
where r.id=f.id;

delete from public.odds_market_selections
where market_key not in ('h2h','totals','btts','correct_score');

insert into private.c0217_odds_scope_cleanup_audits(
 phase,allowed_markets,raw_snapshot_rows,raw_payload_bytes,raw_market_objects,
 normalized_rows,normalized_allowed_rows,normalized_other_rows,raw_relation_bytes,normalized_relation_bytes,evidence)
select 'AFTER',array['h2h','totals','btts','correct_score'],
 (select count(*) from public.odds_raw_snapshots),
 (select coalesce(sum(pg_column_size(payload)),0) from public.odds_raw_snapshots),
 (select coalesce(sum(jsonb_array_length(coalesce(payload->'markets','[]'::jsonb))),0) from public.odds_raw_snapshots),
 (select count(*) from public.odds_market_selections),
 (select count(*) from public.odds_market_selections where market_key in ('h2h','totals','btts','correct_score')),
 (select count(*) from public.odds_market_selections where market_key not in ('h2h','totals','btts','correct_score')),
 pg_total_relation_size('public.odds_raw_snapshots'::regclass),
 pg_total_relation_size('public.odds_market_selections'::regclass),
 jsonb_build_object('change_id','C0217','retained_markets',jsonb_build_array('h2h','totals','btts','correct_score'),'historical_frozen_model_predictions_touched',false);