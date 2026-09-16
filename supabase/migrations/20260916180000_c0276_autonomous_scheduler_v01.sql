create or replace function private.c0276_autonomous_tick_v01()
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare c bigint; r jsonb;
begin
  perform pg_advisory_xact_lock(hashtext('C0276_AUTONOMOUS_TICK_V01'));
  select id into c
  from public.fpl_decision_cycles
  where status in ('READY','STALE','RUNNING','FAILED','BLOCKED')
  order by gameweek desc, id desc
  limit 1;
  if c is null then
    return jsonb_build_object('ok',false,'status','NO_ACTIVE_DECISION_CYCLE','executed',false,'bounded_one_node',true,'historical_forecasts_rewritten',false,'external_fpl_execution',false);
  end if;
  r := private.c0276_event_converge_one_v01(c);
  return jsonb_build_object('ok',true,'status','C0276_AUTONOMOUS_TICK_COMPLETE','cycle_id',c,'result',r,'bounded_one_node',true,'historical_forecasts_rewritten',false,'external_fpl_execution',false);
end $$;

select cron.schedule(
  'c0276-autonomous-decision-tick-v01',
  '*/5 * * * *',
  $cron$select private.c0276_autonomous_tick_v01();$cron$
);