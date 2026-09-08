-- C0223 — production consumption truth + exact-horizon state integrity

create or replace view public.current_production_fixture_prediction_v01 with (security_invoker=true) as
select distinct on (fps.match_id)
  fps.id,fps.match_id,fps.gameweek,fps.model_version_id,fps.captured_at,fps.kickoff_time,
  fps.is_pre_kickoff,fps.frozen,fps.home_lambda,fps.away_lambda,fps.score_matrix,
  fps.top_scorelines,fps.markets,fps.confidence,fps.change_reasons,fps.source_snapshot,
  fps.headline_score,fps.headline_score_probability,fps.raw_modal_score,fps.raw_modal_probability,
  fps.script_family,fps.script_confidence,fps.reason_manifest
from public.fixture_prediction_snapshots fps
where fps.is_pre_kickoff=true
order by fps.match_id,
  case fps.source_snapshot->>'generator'
    when 'production_fixture_v0.3_c0166' then 0
    when 'production_fixture_v0.2_c0159' then 1
    when 'forward_fixture_v0.1.3' then 2
    else 9
  end,
  fps.captured_at desc,fps.id desc;

create or replace function private.c0223_horizon_player_state_integrity_v01(p_gameweek integer)
returns jsonb language sql stable security definer
set search_path='public','private','pg_temp' as $$
with fx as (
  select id,home_team_id,away_team_id from public.matches where source='fpl' and gameweek=p_gameweek
), av as (
  select a.* from public.current_player_fixture_availability a where a.gameweek=p_gameweek
), rl as (
  select r.* from public.current_player_fixture_roles r where r.gameweek=p_gameweek
), et as (
  select home_team_id team_id from fx union select away_team_id from fx
), s as (
  select (select count(*) from fx) fixture_count,
    (select count(*) from et) expected_team_count,
    (select count(distinct team_id) from av) availability_team_count,
    (select count(distinct team_id) from rl) role_team_count,
    (select count(distinct player_id) from av) availability_players,
    (select count(distinct player_id) from rl) role_players,
    (select count(*) from av where expected_xi) expected_xi_rows,
    (select count(*) from rl where expected_xi) role_expected_xi_rows
)
select jsonb_build_object(
  'ok',fixture_count=10 and expected_team_count=20 and availability_team_count=20 and role_team_count=20 and availability_players>=550 and role_players>=550,
  'change_id','C0223','gameweek',p_gameweek,'fixture_count',fixture_count,'expected_team_count',expected_team_count,
  'availability_team_count',availability_team_count,'role_team_count',role_team_count,
  'availability_players',availability_players,'role_players',role_players,
  'availability_expected_xi_rows',expected_xi_rows,'role_expected_xi_rows',role_expected_xi_rows,
  'policy','EXACT_TARGET_GW_ONLY_NO_CROSS_GW_FALLBACK_ACCEPTED',
  'future_uncertainty_note','Current known state may carry forward only where no validated forward injury/rotation effect exists; lineage must still be target-GW specific.'
) from s; $$;
revoke all on function private.c0223_horizon_player_state_integrity_v01(integer) from public,anon,authenticated;

create or replace function private.c0220_forecast_integrity_v01(p_gameweek integer default null)
returns jsonb language plpgsql security definer
set search_path='public','private','pg_temp' as $$
declare
  v_gw integer:=p_gameweek;v_now timestamptz:=clock_timestamp();v_pen_attempts numeric;v_pen_scored numeric;
  v_role_adj integer;v_max_starts numeric;v_max_mins numeric;v_raw_max_starts numeric;v_raw_max_mins numeric;v_horizon jsonb;
begin
  if v_gw is null then select gameweek into v_gw from public.matches where source='fpl' and kickoff_time>v_now order by kickoff_time limit 1; end if;
  v_horizon:=private.c0223_horizon_player_state_integrity_v01(v_gw);
  with s as (select * from private.fpl_projection_player_state_v01(v_gw,v_now)),x as (
    select p.team_id,sum(s.start_probability) starts,sum(s.expected_minutes) mins,sum(s.raw_start_probability) raw_starts,sum(s.raw_expected_minutes) raw_mins
    from s join public.players p on p.id=s.player_id group by p.team_id)
  select max(starts),max(mins),max(raw_starts),max(raw_mins) into v_max_starts,v_max_mins,v_raw_max_starts,v_raw_max_mins from x;
  select count(*) into v_role_adj from private.fpl_projection_player_state_v01(v_gw,v_now) where role_regime_adjusted;
  select coalesce(sum(coalesce(penalties_scored,0)+coalesce(penalties_missed,0)),0),coalesce(sum(coalesce(penalties_scored,0)),0)
    into v_pen_attempts,v_pen_scored from public.historical_player_seasons where season=(select max(season) from public.historical_player_seasons);
  return jsonb_build_object(
    'ok',coalesce((v_horizon->>'ok')::boolean,false) and coalesce(v_max_starts,99)<=11.0001 and coalesce(v_max_mins,9999)<=990.01,
    'change_id','C0223','parent_change_id','C0220','gameweek',v_gw,'horizon_state_integrity',v_horizon,
    'role_regime_adjusted_players',v_role_adj,'raw_max_team_start_sum',round(v_raw_max_starts,4),
    'adjusted_max_team_start_sum',round(v_max_starts,4),'raw_max_team_minutes',round(v_raw_max_mins,2),
    'adjusted_max_team_minutes',round(v_max_mins,2),'league_penalty_attempts',v_pen_attempts,'league_penalty_scored',v_pen_scored,
    'league_penalty_attempt_rate',case when v_pen_attempts>0 then round(v_pen_attempts/(20.0*38.0),6) end,
    'league_penalty_conversion',case when v_pen_attempts>0 then round(v_pen_scored/v_pen_attempts,6) end,
    'penalty_hierarchy_source','current official FPL penalties_order; stale player_role_intelligence does not override current hierarchy',
    'research_model_promotions',jsonb_build_object('C0197',false,'C0202',false,'A0005',false,'W0002',false,'C0210',false,'C0211',false,'C0216',false),
    'historical_forecasts_rewritten',false);
end; $$;
revoke all on function private.c0220_forecast_integrity_v01(integer) from public,anon,authenticated;

insert into private.c0213_component_overrides(object_kind,object_schema,object_name,lifecycle,capability_key,canonical_status,canonical_component_key,production_effect_enabled,active_override,change_id,rationale,evidence,updated_at)
values
('DB_FUNCTION','private','fpl_fixture_goal_lambda_v03','PRODUCTION','FPL_PLAYER_GOAL_LAMBDA','CANONICAL',null,true,true,'C0220','Live C0220 player goal lambda transform; canonical since forecast-integrity cutover.','{}'::jsonb,clock_timestamp()),
('DB_FUNCTION','private','fpl_fixture_assist_lambda_v03','PRODUCTION','FPL_PLAYER_ASSIST_LAMBDA','CANONICAL',null,true,true,'C0220','Live C0220 player assist lambda transform; canonical since forecast-integrity cutover.','{}'::jsonb,clock_timestamp())
on conflict(object_kind,object_schema,object_name) do update set lifecycle=excluded.lifecycle,capability_key=excluded.capability_key,canonical_status=excluded.canonical_status,production_effect_enabled=excluded.production_effect_enabled,active_override=excluded.active_override,change_id=excluded.change_id,rationale=excluded.rationale,evidence=excluded.evidence,updated_at=excluded.updated_at;

update private.c0213_component_overrides
set lifecycle='RETIRED',canonical_status='LEGACY_ROLLBACK',production_effect_enabled=false,active_override=false,
    rationale='Superseded by v03 during C0220 forecast-integrity cutover.',updated_at=clock_timestamp()
where object_kind='DB_FUNCTION' and object_schema='private' and object_name in ('fpl_fixture_goal_lambda_v02','fpl_fixture_assist_lambda_v02');

insert into public.change_tracker_working(change_id,parent_id,workstream,item_type,title,description,status,delivery_stage,priority,phase,depends_on,acceptance_criteria,model_effect,integrity_rule,implementation_refs,notes,last_updated,temporary_working_ledger,decision_required,decision_refs)
values('C0223','C0220','FPL_FORECAST_INTEGRATION','Reliability','Production consumption truth + exact-horizon state + role-aware optimizer integration','Repair canonical fixture/registry lineage, fail closed on missing target-GW player state, then add role-aware optimizer decision control without an ad-hoc points coefficient.','In Progress','Deployed','Critical','Production integration',array['C0220'],'Canonical selector semantic; live v03 registry correct; GW4-GW8 exact availability/role state; optimizer role metadata and near-equal role-risk tiebreak; no shadow-model promotion; historical forecasts unchanged.','Future forecasts/optimizer only; no historical rewrite and no new research-family numeric promotion.','Missing target-GW state must fail closed; role can break statistically indistinguishable choices but cannot manufacture xPts.',array['supabase:migration:c0223_integration_truth_and_horizon_fail_closed'],'User requested integration repair followed by horizon-specific player state and role-aware optimization.',clock_timestamp(),true,false,array[]::text[])
on conflict(change_id) do update set status=excluded.status,delivery_stage=excluded.delivery_stage,implementation_refs=excluded.implementation_refs,notes=excluded.notes,last_updated=excluded.last_updated;
