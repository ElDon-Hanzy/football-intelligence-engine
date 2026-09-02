create or replace function private.refresh_current_gameweek_bookmaker_odds_v01()
returns bigint
language plpgsql
security definer
set search_path = private, public, pg_temp
as $$
declare
  v_gameweek integer;
  v_last_success timestamptz;
  v_request_id bigint;
begin
  select m.gameweek
    into v_gameweek
  from public.matches m
  where m.source='fpl'
    and m.gameweek is not null
    and m.kickoff_time > now()
  group by m.gameweek
  order by min(m.kickoff_time)
  limit 1;

  if v_gameweek is null then
    return null;
  end if;

  select max(r.finished_at)
    into v_last_success
  from public.odds_ingestion_runs r
  where r.gameweek=v_gameweek
    and r.status='success';

  if v_last_success is not null and v_last_success > now() - interval '4 hours' then
    return null;
  end if;

  select private.invoke_engine_ingest(
    'ingest-bookmaker-odds',
    jsonb_build_object('gameweek',v_gameweek,'bookmakers','Bet365,Unibet')
  ) into v_request_id;

  return v_request_id;
end
$$;

select cron.unschedule(jobid)
from cron.job
where jobname='football_intelligence_bookmaker_odds_refresh';

select cron.schedule(
  'football_intelligence_bookmaker_odds_refresh',
  '17 * * * *',
  $$select private.refresh_current_gameweek_bookmaker_odds_v01();$$
);
