select cron.unschedule('football_intelligence_current_gw_bookmaker_ingest')
where exists (
  select 1 from cron.job
  where jobname='football_intelligence_current_gw_bookmaker_ingest'
);

select cron.schedule(
  'football_intelligence_current_gw_bookmaker_ingest',
  '*/15 * * * *',
  $$select private.maybe_ingest_current_bookmaker_odds_v01();$$
);
