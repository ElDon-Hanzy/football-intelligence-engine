do $$
declare
  v_jobid bigint;
begin
  select jobid into v_jobid
  from cron.job
  where jobname='football_intelligence_availability_refresh'
  limit 1;

  if v_jobid is null then
    perform cron.schedule(
      'football_intelligence_availability_refresh',
      '0 */4 * * *',
      $cmd$select private.invoke_engine_ingest('refresh-availability-intelligence','{}'::jsonb);$cmd$
    );
  end if;
end
$$;
