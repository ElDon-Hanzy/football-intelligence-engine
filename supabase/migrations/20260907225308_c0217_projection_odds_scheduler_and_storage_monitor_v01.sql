create table if not exists private.c0217_storage_growth_daily (
  captured_date date primary key,
  captured_at timestamptz not null default clock_timestamp(),
  database_bytes bigint not null,
  top_relations jsonb not null,
  evidence jsonb not null default '{}'::jsonb
);
revoke all on private.c0217_storage_growth_daily from public, anon, authenticated;
grant select,insert on private.c0217_storage_growth_daily to service_role;

create or replace function private.c0217_capture_storage_growth_v01()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','private','public'
as $$
declare
  v_date date := current_date;
  v_bytes bigint;
  v_top jsonb;
begin
  v_bytes := pg_database_size(current_database());
  select coalesce(jsonb_agg(x order by (x->>'bytes')::bigint desc),'[]'::jsonb)
  into v_top
  from (
    select jsonb_build_object(
      'relation',format('%I.%I',n.nspname,c.relname),
      'bytes',pg_total_relation_size(c.oid),
      'table_bytes',pg_relation_size(c.oid),
      'index_bytes',pg_indexes_size(c.oid)
    ) x
    from pg_class c
    join pg_namespace n on n.oid=c.relnamespace
    where c.relkind='r' and n.nspname in ('public','private')
    order by pg_total_relation_size(c.oid) desc
    limit 25
  ) s;

  insert into private.c0217_storage_growth_daily(captured_date,captured_at,database_bytes,top_relations,evidence)
  values(v_date,clock_timestamp(),v_bytes,v_top,jsonb_build_object('change_id','C0217','contract_version','C0217_STORAGE_V01'))
  on conflict(captured_date) do nothing;

  return jsonb_build_object('ok',true,'change_id','C0217','captured_date',v_date,'database_bytes',v_bytes,'database_mb',round(v_bytes/1024.0/1024.0,2),'top_relations',v_top);
end $$;
revoke all on function private.c0217_capture_storage_growth_v01() from public,anon,authenticated;
grant execute on function private.c0217_capture_storage_growth_v01() to service_role;

create or replace function private.c0217_projection_horizon_cycle_v01()
returns jsonb
language plpgsql
security definer
set search_path='pg_catalog','private','public'
as $$
declare
  v_now timestamptz := clock_timestamp();
  r record;
  v_idx integer := 0;
  v_latest timestamptz;
  v_result jsonb;
  v_actions jsonb := '[]'::jsonb;
  v_reason text;
begin
  if not pg_try_advisory_xact_lock(hashtext('C0217_PROJECTION_HORIZON_CYCLE')) then
    return jsonb_build_object('ok',true,'change_id','C0217','status','SKIPPED_LOCKED');
  end if;

  for r in
    select m.gameweek,min(m.kickoff_time)-interval '90 minutes' deadline_at
    from public.matches m
    where m.source='fpl' and m.gameweek between 1 and 38
    group by m.gameweek
    having min(m.kickoff_time)-interval '90 minutes' > v_now
    order by m.gameweek
    limit 3
  loop
    v_idx := v_idx + 1;
    select max(g.generated_at) into v_latest
    from public.gameweek_prediction_runs g
    where g.gameweek=r.gameweek
      and g.run_type='pre_deadline'
      and g.frozen=true
      and g.generated_at<r.deadline_at;

    v_result := null;
    if v_idx=1 then
      if v_latest is null then
        v_reason := 'PRIMARY_INITIAL';
        v_result := private.generate_upcoming_fpl_snapshot_v01(r.gameweek,true);
      elsif v_now >= r.deadline_at-interval '2 hours' then
        if not exists(
          select 1 from public.gameweek_prediction_runs g
          where g.gameweek=r.gameweek and g.run_type='pre_deadline' and g.frozen=true
            and g.generated_at>=r.deadline_at-interval '2 hours'
            and g.generated_at<r.deadline_at
        ) then
          v_reason := 'PRIMARY_FINAL_T_MINUS_2H';
          v_result := private.generate_upcoming_fpl_snapshot_v01(r.gameweek,true);
        else
          v_reason := 'PRIMARY_FINAL_ALREADY_CAPTURED';
        end if;
      elsif v_latest <= v_now-interval '24 hours' then
        v_reason := 'PRIMARY_DAILY';
        v_result := private.generate_upcoming_fpl_snapshot_v01(r.gameweek,true);
      else
        v_reason := 'PRIMARY_DAILY_NOT_DUE';
      end if;
    else
      if v_latest is null then
        v_reason := 'FORWARD_BASELINE_INITIAL';
        v_result := private.generate_upcoming_fpl_snapshot_v01(r.gameweek,true);
      else
        v_reason := 'FORWARD_BASELINE_PRESENT';
      end if;
    end if;

    v_actions := v_actions || jsonb_build_array(jsonb_build_object(
      'gameweek',r.gameweek,
      'horizon_position',v_idx,
      'deadline_at',r.deadline_at,
      'previous_latest_snapshot',v_latest,
      'action_reason',v_reason,
      'generator_result',v_result
    ));
  end loop;

  return jsonb_build_object(
    'ok',true,'change_id','C0217','contract_version','C0217_PROJECTION_CADENCE_V01',
    'captured_at',v_now,'policy',jsonb_build_object(
      'primary','one full snapshot per 24h plus one final snapshot beginning 2h before deadline',
      'forward_gws','one baseline snapshot each until promoted into primary slot',
      'historical_forecasts_rewritten',false
    ),'actions',v_actions
  );
end $$;
revoke all on function private.c0217_projection_horizon_cycle_v01() from public,anon,authenticated;
grant execute on function private.c0217_projection_horizon_cycle_v01() to service_role;

create index if not exists odds_raw_snapshots_latest_payload_hash_idx
on public.odds_raw_snapshots(provider,provider_event_id,bookmaker,captured_at desc)
include(payload_hash)
where payload_hash is not null;

select cron.alter_job(13,'*/15 * * * *','select private.c0217_projection_horizon_cycle_v01();',null,null,true);
select cron.alter_job(22,null,null,null,null,false);

do $$
begin
  if not exists(select 1 from cron.job where jobname='football_intelligence_c0217_storage_daily') then
    perform cron.schedule('football_intelligence_c0217_storage_daily','25 0 * * *','select private.c0217_capture_storage_growth_v01();');
  end if;
end $$;