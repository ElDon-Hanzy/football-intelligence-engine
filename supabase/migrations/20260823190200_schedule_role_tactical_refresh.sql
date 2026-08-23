-- FPL-Core-Insights documents approximately twice-daily updates around 07:30 and 17:30 UTC.
-- Ingest at 08:00/18:00 UTC, then rebuild observational profiles twenty minutes later.
do $$
declare j bigint;
begin
  select jobid into j from cron.job where jobname='football_intelligence_competitive_core_ingest' limit 1;
  if j is null then
    perform cron.schedule('football_intelligence_competitive_core_ingest','0 8,18 * * *',$cmd$select private.invoke_engine_ingest('ingest-competitive-core-stats','{}'::jsonb);$cmd$);
  else
    perform cron.alter_job(job_id:=j,schedule:='0 8,18 * * *',command:=$cmd$select private.invoke_engine_ingest('ingest-competitive-core-stats','{}'::jsonb);$cmd$);
  end if;
  select jobid into j from cron.job where jobname='football_intelligence_role_tactical_refresh' limit 1;
  if j is null then
    perform cron.schedule('football_intelligence_role_tactical_refresh','20 8,18 * * *',$cmd$select private.invoke_engine_ingest('refresh-role-tactical-intelligence','{}'::jsonb);$cmd$);
  else
    perform cron.alter_job(job_id:=j,schedule:='20 8,18 * * *',command:=$cmd$select private.invoke_engine_ingest('refresh-role-tactical-intelligence','{}'::jsonb);$cmd$);
  end if;
end $$;
