-- C0235: immutable PRE-FINAL production snapshot cadence.
-- Mirrors verified production state. Historical forecasts remain append-only.

create table if not exists public.fpl_prefinal_snapshot_history (
  id bigserial primary key,
  gameweek integer not null check (gameweek between 1 and 38),
  prediction_run_id bigint not null unique references public.gameweek_prediction_runs(id),
  captured_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  cadence_reason text not null,
  source_change_id text not null default 'C0235',
  metadata jsonb not null default '{}'::jsonb,
  historical_forecasts_rewritten boolean not null default false
);

create index if not exists fpl_prefinal_snapshot_history_gw_captured_idx
  on public.fpl_prefinal_snapshot_history (gameweek, captured_at desc);

create or replace view public.current_fpl_prefinal_snapshot_v01 as
select distinct on (h.gameweek)
  h.id,
  h.gameweek,
  h.prediction_run_id,
  h.captured_at,
  h.deadline_at,
  h.cadence_reason,
  h.source_change_id,
  h.metadata,
  r.generated_at,
  r.model_version_id,
  r.run_type,
  r.frozen,
  r.excluded_from_backtest,
  r.notes
from public.fpl_prefinal_snapshot_history h
join public.gameweek_prediction_runs r on r.id = h.prediction_run_id
order by h.gameweek, h.captured_at desc, h.id desc;

create or replace function private.c0235_capture_prefinal_snapshot_v01(
  p_gameweek integer,
  p_force boolean default true,
  p_reason text default 'PRIMARY_DAILY'
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'private', 'public'
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_deadline timestamptz;
  v_res jsonb;
  v_run_id bigint;
  v_hist_id bigint;
begin
  select min(m.kickoff_time) - interval '90 minutes'
  into v_deadline
  from public.matches m
  where m.source = 'fpl' and m.gameweek = p_gameweek;

  if v_deadline is null then
    return jsonb_build_object('ok',false,'status','NO_GAMEWEEK_DEADLINE','change_id','C0235','gameweek',p_gameweek);
  end if;

  if v_now >= v_deadline - interval '2 hours' then
    return jsonb_build_object(
      'ok',false,
      'status','PREFINAL_WINDOW_CLOSED_T_MINUS_2H',
      'change_id','C0235',
      'gameweek',p_gameweek,
      'deadline_at',v_deadline,
      'historical_forecasts_rewritten',false
    );
  end if;

  v_res := private.generate_upcoming_fpl_snapshot_v01(p_gameweek,p_force);
  if v_res ? 'run_id' then v_run_id := (v_res->>'run_id')::bigint; end if;

  if v_run_id is null then
    return v_res || jsonb_build_object(
      'change_id','C0235',
      'prefinal_status','NO_NEW_RUN',
      'prefinal_cadence_reason',p_reason,
      'historical_forecasts_rewritten',false
    );
  end if;

  insert into public.fpl_prefinal_snapshot_history(
    gameweek,prediction_run_id,captured_at,deadline_at,cadence_reason,source_change_id,metadata,historical_forecasts_rewritten
  ) values (
    p_gameweek,
    v_run_id,
    clock_timestamp(),
    v_deadline,
    p_reason,
    'C0235',
    jsonb_build_object(
      'contract_version','C0235_PREFINAL_PRODUCTION_V01',
      'generator_change_id',v_res->>'change_id',
      'generated_at',v_res->>'generated_at',
      'daily_pointer_not_forecast_rewrite',true,
      'stops_before_t_minus_2h',true
    ),
    false
  )
  on conflict (prediction_run_id) do update
    set cadence_reason = excluded.cadence_reason
  returning id into v_hist_id;

  return v_res || jsonb_build_object(
    'change_id','C0235',
    'prefinal_status','CAPTURED',
    'prefinal_history_id',v_hist_id,
    'prefinal_prediction_run_id',v_run_id,
    'prefinal_cadence_reason',p_reason,
    'prefinal_deadline_at',v_deadline,
    'historical_forecasts_rewritten',false
  );
end
$function$;

create or replace function private.c0217_projection_horizon_cycle_v01()
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'private', 'public'
as $function$
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
    select m.gameweek, min(m.kickoff_time) - interval '90 minutes' deadline_at
    from public.matches m
    where m.source='fpl' and m.gameweek between 1 and 38
    group by m.gameweek
    having min(m.kickoff_time) - interval '90 minutes' > v_now
    order by m.gameweek
    limit 3
  loop
    v_idx := v_idx + 1;

    select max(g.generated_at)
    into v_latest
    from public.gameweek_prediction_runs g
    where g.gameweek = r.gameweek
      and g.run_type = 'pre_deadline'
      and g.frozen = true
      and g.generated_at < r.deadline_at;

    v_result := null;

    if v_idx = 1 then
      if v_latest is null then
        v_reason := 'PRIMARY_INITIAL_PREFINAL';
        v_result := private.c0235_capture_prefinal_snapshot_v01(r.gameweek,true,v_reason);
      elsif v_now >= r.deadline_at - interval '2 hours' then
        if not exists(
          select 1
          from public.gameweek_prediction_runs g
          where g.gameweek = r.gameweek
            and g.run_type = 'pre_deadline'
            and g.frozen = true
            and g.generated_at >= r.deadline_at - interval '2 hours'
            and g.generated_at < r.deadline_at
        ) then
          v_reason := 'PRIMARY_FINAL_T_MINUS_2H';
          v_result := private.generate_upcoming_fpl_snapshot_v01(r.gameweek,true);
        else
          v_reason := 'PRIMARY_FINAL_ALREADY_CAPTURED';
        end if;
      elsif v_latest <= v_now - interval '24 hours' then
        v_reason := 'PRIMARY_DAILY_PREFINAL';
        v_result := private.c0235_capture_prefinal_snapshot_v01(r.gameweek,true,v_reason);
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
    'ok',true,
    'change_id','C0235',
    'parent_change_id','C0217',
    'contract_version','C0235_PREFINAL_CADENCE_V01',
    'captured_at',v_now,
    'policy',jsonb_build_object(
      'primary','one immutable PRE_FINAL snapshot per 24h until T-2h; then separate final snapshot',
      'forward_gws','one baseline snapshot each until promoted into primary slot',
      'historical_forecasts_rewritten',false
    ),
    'actions',v_actions
  );
end
$function$;
