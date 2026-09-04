create or replace function private.invoke_c0202_historical_side_ground_truth_v01(p_gameweeks integer[])
returns bigint
language plpgsql
security definer
set search_path=private,public,vault,net,pg_temp
as $$
declare
  v_token text;
  v_request_id bigint;
  v_gw integer;
begin
  if p_gameweeks is null or cardinality(p_gameweeks) < 1 or cardinality(p_gameweeks) > 5 then
    raise exception 'Provide 1-5 gameweeks';
  end if;
  foreach v_gw in array p_gameweeks loop
    if v_gw < 1 or v_gw > 38 then raise exception 'Invalid gameweek %',v_gw; end if;
  end loop;
  select decrypted_secret into v_token from vault.decrypted_secrets where name='FOOTBALL_ENGINE_ADMIN_TOKEN' order by created_at desc limit 1;
  if v_token is null then raise exception 'Engine admin token missing'; end if;
  select net.http_post(
    url:='https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1/ingest-c0202-historical-side-ground-truth',
    body:=jsonb_build_object('gameweeks',to_jsonb(p_gameweeks)),
    headers:=jsonb_build_object('Content-Type','application/json','x-engine-token',v_token),
    timeout_milliseconds:=60000
  ) into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function private.invoke_c0202_historical_side_ground_truth_v01(integer[]) from public,anon,authenticated;