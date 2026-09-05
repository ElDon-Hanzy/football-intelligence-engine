create or replace function private.invoke_engine_ingest(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'private','public','vault','net','pg_temp'
as $function$
declare v_token text; v_url text; v_request_id bigint;
begin
  if p_function not in (
    'ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds',
    'refresh-availability-intelligence','refresh-current-player-state','ingest-competitive-core-stats',
    'refresh-role-tactical-intelligence','ingest-historical-role-evidence','refresh-forward-fixture-forecasts',
    'refresh-forward-enriched-predictions','probe-zero-cost-football-sources',
    'c0206-build-pl-transfer-pairs','c0206-build-understat-foreign-pairs','c0206-build-understat-foreign-pairs-v02'
  ) then raise exception 'Function not allowed'; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/'||p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end
$function$;