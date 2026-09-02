create or replace function private.maybe_ingest_current_bookmaker_odds_v01()
returns jsonb
language plpgsql
security definer
set search_path = 'private','public','pg_temp'
as $function$
declare
  v_gameweek integer;
  v_next_kickoff timestamptz;
  v_last_started timestamptz;
  v_last_status text;
  v_due_interval interval;
  v_request_id bigint;
begin
  select min(m.gameweek)
  into v_gameweek
  from public.matches m
  where m.source='fpl'
    and m.gameweek is not null
    and m.kickoff_time > now();

  if v_gameweek is null then
    return jsonb_build_object('action','SKIPPED','reason','NO_UPCOMING_FPL_GAMEWEEK');
  end if;

  select min(m.kickoff_time)
  into v_next_kickoff
  from public.matches m
  where m.source='fpl'
    and m.gameweek=v_gameweek
    and m.kickoff_time > now();

  select r.started_at, r.status
  into v_last_started, v_last_status
  from public.odds_ingestion_runs r
  where r.gameweek=v_gameweek
  order by r.started_at desc, r.id desc
  limit 1;

  v_due_interval := case
    when v_next_kickoff - now() > interval '72 hours' then interval '6 hours'
    when v_next_kickoff - now() > interval '24 hours' then interval '3 hours'
    when v_next_kickoff - now() > interval '6 hours' then interval '1 hour'
    else interval '30 minutes'
  end;

  if v_last_started is not null then
    if coalesce(v_last_status,'') <> 'success' then
      v_due_interval := least(v_due_interval, interval '30 minutes');
    end if;
    if now() - v_last_started < v_due_interval then
      return jsonb_build_object(
        'action','SKIPPED',
        'reason','NOT_DUE',
        'gameweek',v_gameweek,
        'next_kickoff',v_next_kickoff,
        'last_started_at',v_last_started,
        'last_status',v_last_status,
        'due_interval_seconds',extract(epoch from v_due_interval)::bigint
      );
    end if;
  end if;

  v_request_id := private.invoke_engine_ingest(
    'ingest-bookmaker-odds',
    jsonb_build_object('gameweek',v_gameweek)
  );

  return jsonb_build_object(
    'action','INVOKED',
    'gameweek',v_gameweek,
    'next_kickoff',v_next_kickoff,
    'due_interval_seconds',extract(epoch from v_due_interval)::bigint,
    'request_id',v_request_id
  );
end
$function$;
