create or replace function private.c0214_add_parent_c0159_explanatory_candidates_v01(p_snapshot_run_id bigint)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare
  v_asof integer;
  v_target integer;
  v_count integer:=0;
begin
  select as_of_gameweek into v_asof
  from public.team_fact_snapshot_runs where id=p_snapshot_run_id;
  if v_asof is null then raise exception 'unknown snapshot %',p_snapshot_run_id; end if;
  v_target:=v_asof+1;

  delete from public.fixture_fact_candidates
  where snapshot_run_id=p_snapshot_run_id
    and fact_type like 'C0214_C0159_%';

  with pred as (
    select distinct on (fps.match_id)
      fps.match_id,fps.captured_at,fps.markets,fps.reason_manifest
    from public.fixture_prediction_snapshots fps
    join public.matches m on m.id=fps.match_id
    where fps.gameweek=v_target
      and fps.is_pre_kickoff=true
      and fps.captured_at<m.kickoff_time
      and fps.source_snapshot->>'generator'='production_fixture_v0.3_c0166'
    order by fps.match_id,fps.captured_at desc,fps.id desc
  ), sides as (
    select p.match_id,p.captured_at,p.markets,m.home_team_id,m.away_team_id,
           m.home_team_id as team_id,m.away_team_id as opponent_team_id,
           ht.name as team_name,at.name as opponent_name,x.obj as reason
    from pred p
    join public.matches m on m.id=p.match_id
    join public.teams ht on ht.id=m.home_team_id
    join public.teams at on at.id=m.away_team_id
    cross join lateral jsonb_array_elements(coalesce(p.reason_manifest#>'{parent_c0159_reason_manifest,home}','[]'::jsonb)) x(obj)
    union all
    select p.match_id,p.captured_at,p.markets,m.home_team_id,m.away_team_id,
           m.away_team_id,m.home_team_id,at.name,ht.name,x.obj
    from pred p
    join public.matches m on m.id=p.match_id
    join public.teams ht on ht.id=m.home_team_id
    join public.teams at on at.id=m.away_team_id
    cross join lateral jsonb_array_elements(coalesce(p.reason_manifest#>'{parent_c0159_reason_manifest,away}','[]'::jsonb)) x(obj)
  ), norm as (
    select s.*,
           s.reason->>'input' as input,
           (s.reason->>'applied_log_adjustment')::numeric as adj,
           case when coalesce((s.markets->>'home_win')::numeric,0)>=greatest(coalesce((s.markets->>'draw')::numeric,0),coalesce((s.markets->>'away_win')::numeric,0)) then 'H'
                when coalesce((s.markets->>'away_win')::numeric,0)>=greatest(coalesce((s.markets->>'draw')::numeric,0),coalesce((s.markets->>'home_win')::numeric,0)) then 'A'
                else 'D' end as top_outcome
    from sides s
    where s.reason ? 'applied_log_adjustment'
      and s.reason->>'input' in ('C0147_COMBINED','recent_attack_xg_l10','opponent_recent_defence_xga_l10')
  ), expanded as (
    select n.*,
           abs(n.adj) as magnitude,
           case when n.adj>=0 then n.team_id else n.opponent_team_id end as beneficiary_team_id,
           case n.input
             when 'C0147_COMBINED' then 'TACTICAL_COMBINED'
             when 'recent_attack_xg_l10' then 'RECENT_ATTACK_XG'
             when 'opponent_recent_defence_xga_l10' then 'OPPONENT_DEFENCE_XGA'
             else 'OTHER'
           end as family,
           case n.input
             when 'C0147_COMBINED' then
               case when n.adj>=0 then format('The calibrated tactical matchup layer slightly favors %s.',n.team_name)
                    else format('The calibrated tactical matchup layer slightly suppresses %s, favoring %s.',n.team_name,n.opponent_name) end
             when 'recent_attack_xg_l10' then
               case when n.adj>=0 then format('%s have generated %s xG/game across their last %s league matches versus a %s structural baseline.',n.team_name,to_char((n.reason->>'recent')::numeric,'FM0.00'),n.reason->>'sample',to_char((n.reason->>'structural')::numeric,'FM0.00'))
                    else format('%s have generated only %s xG/game across their last %s league matches versus a %s structural baseline, reducing their scoring outlook.',n.team_name,to_char((n.reason->>'recent')::numeric,'FM0.00'),n.reason->>'sample',to_char((n.reason->>'structural')::numeric,'FM0.00')) end
             when 'opponent_recent_defence_xga_l10' then
               case when n.adj>=0 then format('%s have allowed %s xGA/game across their last %s league matches versus a %s structural baseline, lifting %s''s scoring outlook.',n.opponent_name,to_char((n.reason->>'recent')::numeric,'FM0.00'),n.reason->>'sample',to_char((n.reason->>'structural')::numeric,'FM0.00'),n.team_name)
                    else format('%s have allowed only %s xGA/game across their last %s league matches versus a %s structural baseline, suppressing %s''s scoring outlook.',n.opponent_name,to_char((n.reason->>'recent')::numeric,'FM0.00'),n.reason->>'sample',to_char((n.reason->>'structural')::numeric,'FM0.00'),n.team_name) end
           end as line
    from norm n
    where abs(n.adj)>=0.0005
  )
  insert into public.fixture_fact_candidates(
    snapshot_run_id,match_id,gameweek,team_id,opponent_team_id,fact_type,
    usefulness_score,one_liner,payload,evidence_cutoff,alignment
  )
  select p_snapshot_run_id,e.match_id,v_target,e.beneficiary_team_id,
         case when e.beneficiary_team_id=e.home_team_id then e.away_team_id else e.home_team_id end,
         'C0214_C0159_'||e.family,
         0.86+least(0.12,e.magnitude*4.0),
         e.line,
         jsonb_build_object(
           'actual_model_input',true,
           'input',e.input,
           'family',e.family,
           'applied_log_magnitude',e.magnitude,
           'applied_log_adjustment',e.adj,
           'source','C0159 parent signed production input preserved in C0166 reason manifest',
           'parent_reason',e.reason,
           'explanation_contract','C0214_C0159_PARENT_V01'
         ),
         e.captured_at,
         case when e.top_outcome='H' and e.beneficiary_team_id=e.home_team_id then 'SUPPORTS'
              when e.top_outcome='A' and e.beneficiary_team_id=e.away_team_id then 'SUPPORTS'
              when e.top_outcome in ('H','A') then 'CONTRADICTS'
              else 'NEUTRAL' end
  from expanded e
  where e.line is not null and btrim(e.line)<>'';
  get diagnostics v_count=row_count;

  with r as (
    select id,row_number() over(partition by match_id order by usefulness_score desc,id) rn
    from public.fixture_fact_candidates where snapshot_run_id=p_snapshot_run_id
  )
  update public.fixture_fact_candidates c set candidate_rank=r.rn
  from r where c.id=r.id;

  return jsonb_build_object('ok',true,'snapshot_run_id',p_snapshot_run_id,'target_gameweek',v_target,'inserted',v_count,'contract_version','C0214_C0159_PARENT_V01','probabilities_changed',false);
end;
$function$;

revoke all on function private.c0214_add_parent_c0159_explanatory_candidates_v01(bigint) from public,anon,authenticated;
grant execute on function private.c0214_add_parent_c0159_explanatory_candidates_v01(bigint) to service_role;

create or replace function private.refresh_c0162_team_fact_layer_v04(p_as_of_gameweek integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public','private','pg_temp'
as $function$
declare v_base jsonb; v_run bigint; v_season jsonb; v_attr jsonb; v_parent jsonb; v_resid jsonb; v_model jsonb;
begin
  v_base:=private.refresh_c0162_team_fact_layer_v03(p_as_of_gameweek);
  v_run:=(v_base->>'snapshot_run_id')::bigint;
  v_season:=private.c0166_add_current_season_facts_v01(v_run);
  v_attr:=private.c0166_rebuild_explanatory_candidates_v01(v_run);
  v_parent:=private.c0214_add_parent_c0159_explanatory_candidates_v01(v_run);
  v_resid:=private.c0166_add_residual_counterpoints_v01(v_run);
  v_model:=private.c0166_add_model_thesis_candidates_v01(v_run);
  update public.team_fact_snapshot_runs
     set canonical_version='c0166_fact_layer_v04',
         notes=coalesce(notes,'{}'::jsonb)||jsonb_build_object('c0166',true,'season_aware',true,'symmetric_attribution',true,'c0214_parent_c0159_explanation',true)
   where id=v_run;
  return v_base||jsonb_build_object('c0166_season_facts',v_season,'c0166_attribution',v_attr,'c0214_parent_c0159_explanation',v_parent,'c0166_residuals',v_resid,'c0166_model_thesis',v_model,'version','c0166_fact_layer_v04+c0214_parent_explanation');
end;
$function$;
