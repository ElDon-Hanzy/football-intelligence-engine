create or replace function private.invoke_engine_ingest(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'private', 'public', 'vault', 'net', 'pg_temp'
as $function$
declare v_token text; v_url text; v_request_id bigint;
begin
 if p_function not in (
  'ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds','refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats','refresh-role-tactical-intelligence','ingest-historical-role-evidence','refresh-forward-fixture-forecasts','refresh-forward-enriched-predictions','probe-zero-cost-football-sources','c0206-build-pl-transfer-pairs','c0206-build-understat-foreign-pairs-v02','c0206-build-understat-older-train-v01','c0206-fit-translation-shadow-v02','ingest-realized-player-roles','fpl-full-pool-optimizer','fpl-transfer-path-evaluator','fpl-decision-control','fpl-squad-ensemble','sync-fpl-manager-state','sync-fpl-actual-decision',
  'fpl-autonomy-ensemble','fpl-structural-control','fpl-team-regime-diagnostic','fpl-forward-management','fpl-or-utility','fpl-red-team','fpl-autonomous-gate','fpl-sequential-planner'
 ) then raise exception 'Function not allowed'; end if;
 select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
 if v_token is null then raise exception 'Engine admin token missing'; end if;
 v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
 select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
 return v_request_id;
end $function$;

select cron.unschedule(jobid)
from cron.job
where jobname = 'football_intelligence_fpl_actual_decision_sync';

select cron.schedule(
  'football_intelligence_fpl_actual_decision_sync',
  '2,17,32,47 * * * *',
  $$select private.invoke_engine_ingest('sync-fpl-actual-decision', jsonb_build_object('entry_id',3559923));$$
);
