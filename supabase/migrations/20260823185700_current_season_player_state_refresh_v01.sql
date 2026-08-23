create or replace view public.current_player_state_base
with (security_invoker=true)
as
select distinct on (ps.player_id)
  ps.*
from public.player_state ps
join public.model_versions mv on mv.id=ps.model_version_id and mv.is_active=true
where coalesce(ps.state->>'refresh_family','') <> 'current_season_official'
order by ps.player_id,ps.as_of desc,ps.id desc;

create or replace view public.current_player_state_latest
with (security_invoker=true)
as
select distinct on (ps.player_id)
  ps.*
from public.player_state ps
join public.model_versions mv on mv.id=ps.model_version_id and mv.is_active=true
order by ps.player_id,ps.as_of desc,ps.id desc;

revoke all on public.current_player_state_base from anon, authenticated;
revoke all on public.current_player_state_latest from anon, authenticated;
grant select on public.current_player_state_base to service_role;
grant select on public.current_player_state_latest to service_role;

create or replace function private.invoke_engine_ingest(p_function text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'private','public','vault','net','pg_temp'
as $$
declare
  v_token text;
  v_url text;
  v_request_id bigint;
begin
  if p_function not in ('ingest-team-history','ingest-understat-xg','ingest-bookmaker-odds','refresh-availability-intelligence','refresh-current-player-state') then
    raise exception 'Function not allowed';
  end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  v_url := 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/' || p_function;
  select net.http_post(url:=v_url,body:=coalesce(p_body,'{}'::jsonb),headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),timeout_milliseconds:=60000) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.invoke_engine_ingest(text,jsonb) from public, anon, authenticated;
grant execute on function private.invoke_engine_ingest(text,jsonb) to service_role;

select cron.alter_job(job_id := jobid, schedule := '10 */4 * * *')
from cron.job
where jobname='football_intelligence_availability_refresh';

do $$
declare v_jobid bigint;
begin
  select jobid into v_jobid from cron.job where jobname='football_intelligence_current_player_state_refresh' limit 1;
  if v_jobid is null then
    perform cron.schedule(
      'football_intelligence_current_player_state_refresh',
      '0 */4 * * *',
      $cmd$select private.invoke_engine_ingest('refresh-current-player-state','{}'::jsonb);$cmd$
    );
  end if;
end $$;
