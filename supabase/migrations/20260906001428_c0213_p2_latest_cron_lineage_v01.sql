create or replace view private.c0213_p2_latest_cron_runs_v01 as
select distinct on (j.jobid)
  j.jobid,j.jobname,j.schedule,j.command,j.active,
  r.runid,r.status as run_status,r.return_message,r.start_time,r.end_time
from cron.job j
left join cron.job_run_details r on r.jobid=j.jobid
where j.active=true
order by j.jobid,r.start_time desc nulls last,r.runid desc nulls last;

revoke all on private.c0213_p2_latest_cron_runs_v01 from public,anon,authenticated;
grant select on private.c0213_p2_latest_cron_runs_v01 to service_role;
