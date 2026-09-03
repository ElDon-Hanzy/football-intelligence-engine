create or replace function private.invoke_c0197_free_source_evidence_v01(
  p_gameweek integer,
  p_as_of timestamptz default now(),
  p_season text default '2026-2027'
)
returns bigint
language plpgsql
security definer
set search_path=private,public,vault,net,pg_temp
as $$
declare
  v_token text;
  v_request_id bigint;
begin
  if p_gameweek < 0 or p_gameweek > 60 then raise exception 'invalid gameweek'; end if;
  if p_as_of > now() + interval '5 minutes' then raise exception 'as_of cannot be in the future'; end if;
  select decrypted_secret into v_token
  from vault.decrypted_secrets
  where name='FOOTBALL_ENGINE_ADMIN_TOKEN'
  order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  select net.http_post(
    url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/ingest-c0197-free-source-evidence',
    body:=jsonb_build_object('gameweek',p_gameweek,'as_of',p_as_of,'season',p_season),
    headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),
    timeout_milliseconds:=60000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.invoke_c0197_free_source_evidence_v01(integer,timestamptz,text) from public,anon,authenticated;