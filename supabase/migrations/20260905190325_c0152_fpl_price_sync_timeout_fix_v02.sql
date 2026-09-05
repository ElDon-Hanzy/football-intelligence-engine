do $$
declare r record;
begin
  for r in select jobid from cron.job where jobname='c0152-fpl-price-history-4h' loop
    perform cron.unschedule(r.jobid);
  end loop;
  perform cron.schedule(
    'c0152-fpl-price-history-4h',
    '5 */4 * * *',
    $cron$select net.http_get(url := 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/sync-fpl-data', timeout_milliseconds := 60000);$cron$
  );
end $$;