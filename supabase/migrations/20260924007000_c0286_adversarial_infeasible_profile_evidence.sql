-- An infeasible fresh-search profile is negative adversarial evidence, not an
-- infrastructure failure.  Preserve the response and allow the bounded batch
-- to test the remaining alternatives.

do $$
declare v_source text;
begin
  select p.prosrc into v_source
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.proname='c0240_capture_v01'
    and pg_get_function_identity_arguments(p.oid)='p_batch_id bigint';
  if v_source is null or position('v_body->>''status''=''ROLE_SAFE_PROFILE_SEARCH_FAILED''' in v_source)=0 then
    raise exception 'C0286 expected C0240 profile failure classifier was not found';
  end if;
  v_source:=replace(
    v_source,
    'v_body->>''status''=''ROLE_SAFE_PROFILE_SEARCH_FAILED''',
    'v_body->>''status'' in (''ROLE_SAFE_PROFILE_SEARCH_FAILED'',''FRESH_WILDCARD_SEARCH_FAILED'')'
  );
  execute format(
    'create or replace function private.c0240_capture_v01(p_batch_id bigint) returns jsonb language plpgsql security definer set search_path to ''private'', ''public'', ''net'', ''pg_temp'' as %L',
    v_source
  );
end
$$;

update private.c0240_adversarial_tasks
set status='COMPLETE',
    failure='INFEASIBLE_ROLE_SAFE_PROFILE',
    response=response || jsonb_build_object('infeasible_role_safe_profile',true)
where status='FAILED'
  and failure='FRESH_WILDCARD_SEARCH_FAILED'
  and phase='B_STRUCTURE';
