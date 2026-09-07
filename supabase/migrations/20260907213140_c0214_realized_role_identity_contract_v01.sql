insert into public.fotmob_player_identity_observations(change_id,source_fotmob_player_id,player_id,mapping_method,confidence,evidence,observed_at,observation_hash)
select 'C0214',710159,27,'VERIFIED_COMMON_NAME_TEAM',1.0,
       jsonb_build_object('source_name','Ezri Konsa','fpl_first_name','Ezri','fpl_second_name','Konsa Ngoyo','fpl_web_name','Konsa','team_id',1,'reason','Source common name + first name + current team identity uniquely resolve player'),
       clock_timestamp(),
       encode(digest('C0214|fotmob_identity|710159|27|VERIFIED_COMMON_NAME_TEAM','sha256'),'hex')
where not exists (
  select 1 from public.fotmob_player_identity_observations
  where source_fotmob_player_id=710159 and player_id=27
);

create or replace function private.c0213_p2_current_lineage_v02(p_gameweek integer default null)
returns jsonb
language plpgsql
security definer
set search_path to 'private','public','pg_temp'
as $function$
declare
  v jsonb;
  v_gw integer;
  v_prev integer;
  v_result_id bigint;
  v_result_final boolean:=false;
  v_expected_starters integer:=0;
  v_role_mapped integer:=0;
  v_role_at timestamptz;
  v_role_cron_status text;
  v_role_cron_at timestamptz;
  v_role_ready boolean:=false;
  v_optimizer_ready boolean:=false;
  v_evidence_ready boolean:=false;
  v_decision_ready boolean:=false;
  v_blockers jsonb;
  v_lineage jsonb;
begin
  v:=private.c0213_p2_current_lineage_v01(p_gameweek);
  if not coalesce((v->>'ok')::boolean,false) then return v; end if;
  v_gw:=(v->>'gameweek')::integer;
  v_prev:=(v->>'previous_gameweek')::integer;

  select id,is_final into v_result_id,v_result_final
  from public.gameweek_result_runs where gameweek=v_prev
  order by observed_at desc,id desc limit 1;

  if v_result_id is not null then
    select count(distinct player_id) filter(where starts>0)
      into v_expected_starters
    from public.player_gameweek_actuals
    where result_run_id=v_result_id and gameweek=v_prev;
  end if;

  select max(r.captured_at),
         count(distinct coalesce(r.player_id,i.player_id))
           filter(where r.is_starting and r.realized_role is not null and r.production_role_enabled and coalesce(r.player_id,i.player_id) is not null)
    into v_role_at,v_role_mapped
  from public.realized_player_role_observations r
  left join public.current_fotmob_player_identities i
    on i.source_fotmob_player_id=r.source_fotmob_player_id
  where r.gameweek=v_prev;

  select run_status,end_time into v_role_cron_status,v_role_cron_at
  from private.c0213_p2_latest_cron_runs_v01 where jobid=26;

  v_role_ready:=coalesce(v_result_final,false)
    and v_expected_starters>0
    and v_role_mapped>=v_expected_starters
    and coalesce(v_role_cron_status='succeeded',false)
    and v_role_cron_at>=clock_timestamp()-interval '2 hours';

  select exists(
    select 1 from jsonb_array_elements(v->'lineage') x
    where x->>'stage'='FULL_POOL_OPTIMIZER' and x->>'state'='READY'
  ) into v_optimizer_ready;
  select exists(
    select 1 from jsonb_array_elements(v->'lineage') x
    where x->>'stage'='DECISION_READINESS' and x->>'state'='READY'
  ) into v_evidence_ready;

  v_decision_ready:=coalesce((v->>'projection_ready')::boolean,false)
    and coalesce(v_result_final,false)
    and v_role_ready
    and v_optimizer_ready
    and v_evidence_ready;

  select coalesce(jsonb_agg(
    case
      when x->>'stage'='REALIZED_ROLES' then
        x || jsonb_build_object(
          'state',case when not coalesce(v_result_final,false) then 'WAITING_FOR_FINAL_RESULTS' when v_role_ready then 'READY' else 'BLOCKED' end,
          'data_at',v_role_at,
          'mapped_starters',v_role_mapped,
          'expected_starters',v_expected_starters,
          'source_result_run_id',v_result_id,
          'coverage_ratio',case when v_expected_starters>0 then round(v_role_mapped::numeric/v_expected_starters,4) else null end,
          'identity_contract','C0214_CANONICAL_FOTMOB_IDENTITY_V01'
        )
      when x->>'stage'='SAVED_MANAGER_PLAN' then
        x || jsonb_build_object(
          'state',case when x->'manager_plan_id' is not null and x->>'manager_plan_id'<>'null' then 'READY' when v_decision_ready then 'MISSING_REQUIRED_OUTPUT' else 'NOT_YET_ALLOWED' end
        )
      else x
    end order by (x->>'stage_order')::integer
  ),'[]'::jsonb) into v_lineage
  from jsonb_array_elements(v->'lineage') x;

  select coalesce(jsonb_agg(b),'[]'::jsonb) into v_blockers
  from jsonb_array_elements(v->'blockers') b
  where b->>'code'<>'REALIZED_ROLE_REFRESH_INCOMPLETE'
    and b->>'code'<>'MANAGER_PLAN_MISSING_AFTER_READINESS';

  if coalesce(v_result_final,false) and not v_role_ready then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object(
      'stage','REALIZED_ROLES','code','REALIZED_ROLE_REFRESH_INCOMPLETE',
      'mapped_starters',v_role_mapped,'expected_starters',v_expected_starters,
      'source_result_run_id',v_result_id
    ));
  end if;

  if v_decision_ready and not exists(
    select 1 from public.fpl_manager_plans where gameweek=v_gw
  ) then
    v_blockers:=v_blockers||jsonb_build_array(jsonb_build_object('stage','SAVED_MANAGER_PLAN','code','MANAGER_PLAN_MISSING_AFTER_READINESS'));
  end if;

  return (v - 'lineage' - 'blockers' - 'decision_ready' - 'contract_version')
    || jsonb_build_object(
      'lineage',v_lineage,
      'blockers',v_blockers,
      'decision_ready',v_decision_ready,
      'contract_version','C0214_P2_IDENTITY_V01',
      'realized_role_latest_result_fix',true,
      'canonical_identity_resolution',true
    );
end $function$;

create or replace function private.c0214_realized_role_identity_integrity_v01(p_gameweek integer default null)
returns jsonb
language sql
security definer
set search_path to 'private','public','pg_temp'
as $function$
with g as (
  select coalesce(p_gameweek,(select max(gameweek) from public.gameweek_result_runs where is_final))::integer as gw
), rr as (
  select r.*,coalesce(r.player_id,i.player_id) as resolved_player_id,
         case when r.player_id is not null then r.mapping_status else i.mapping_method end as resolved_mapping_method
  from public.realized_player_role_observations r
  left join public.current_fotmob_player_identities i on i.source_fotmob_player_id=r.source_fotmob_player_id
  join g on g.gw=r.gameweek
  where r.is_starting and r.realized_role is not null and r.production_role_enabled
), latest_result as (
  select gr.id,gr.gameweek from public.gameweek_result_runs gr join g on g.gw=gr.gameweek order by gr.observed_at desc,gr.id desc limit 1
), exp as (
  select count(distinct a.player_id) filter(where a.starts>0)::integer as n
  from public.player_gameweek_actuals a join latest_result l on l.id=a.result_run_id and l.gameweek=a.gameweek
), s as (
  select count(distinct player_id) filter(where player_id is not null)::integer as raw_direct_mapped,
         count(distinct resolved_player_id) filter(where resolved_player_id is not null)::integer as canonically_resolved,
         count(distinct source_fotmob_player_id) filter(where resolved_player_id is null)::integer as unresolved_source_players
  from rr
)
select jsonb_build_object(
  'ok',(select canonically_resolved from s)>=(select n from exp) and (select unresolved_source_players from s)=0,
  'gameweek',(select gw from g),
  'expected_starters',(select n from exp),
  'raw_direct_mapped',(select raw_direct_mapped from s),
  'canonically_resolved',(select canonically_resolved from s),
  'unresolved_source_players',(select unresolved_source_players from s),
  'contract_version','C0214_CANONICAL_FOTMOB_IDENTITY_V01',
  'numeric_role_uplift_enabled',false,
  'missing_data_is_not_zero',true
);
$function$;

revoke all on function private.c0214_realized_role_identity_integrity_v01(integer) from public,anon,authenticated;
grant execute on function private.c0214_realized_role_identity_integrity_v01(integer) to service_role;
