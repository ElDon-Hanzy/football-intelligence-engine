create or replace function private.invoke_c0197_historical_free_source_v01(
  p_season text,
  p_gameweeks integer[],
  p_as_of timestamptz default now()
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
  if p_season not in ('2024-2025','2025-2026') then raise exception 'unsupported season'; end if;
  if p_gameweeks is null or cardinality(p_gameweeks) < 1 or cardinality(p_gameweeks) > 5 then raise exception 'provide 1-5 gameweeks'; end if;
  if exists(select 1 from unnest(p_gameweeks) g where g < 1 or g > 38) then raise exception 'invalid gameweek'; end if;
  if p_as_of > now() + interval '5 minutes' then raise exception 'as_of cannot be in future'; end if;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  select net.http_post(
    url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/ingest-c0197-historical-free-source-evidence',
    body:=jsonb_build_object('season',p_season,'gameweeks',to_jsonb(p_gameweeks),'as_of',p_as_of),
    headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),
    timeout_milliseconds:=60000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.invoke_c0197_historical_free_source_v01(text,integer[],timestamptz) from public,anon,authenticated;