-- C0227 — append-only projection uncertainty diagnostics.
-- Decision-Control only: no xPts mutation and no historical forecast rewrite.

create table if not exists public.fpl_projection_uncertainty_snapshots(
  id bigserial primary key,
  change_id text not null default 'C0227',
  prediction_run_id bigint not null,
  gameweek integer not null,
  player_id bigint not null,
  captured_at timestamptz not null default now(),
  expected_points numeric not null,
  expected_minutes numeric not null,
  p_start numeric,
  role text,
  role_confidence numeric,
  legacy_model_confidence numeric,
  current_completed_apps integer not null default 0,
  current_completed_minutes integer not null default 0,
  current_goals numeric not null default 0,
  current_xg numeric not null default 0,
  current_penalties_missed integer not null default 0,
  finishing_gap numeric,
  minutes_risk boolean not null,
  role_uncertainty boolean not null,
  low_legacy_confidence boolean not null,
  sparse_current_evidence boolean not null,
  regression_dependency boolean not null,
  uncertainty_class text not null check(uncertainty_class in ('LOW','MEDIUM','HIGH')),
  uncertainty_vector jsonb not null,
  model_effect_enabled boolean not null default false,
  historical_forecasts_rewritten boolean not null default false,
  uncertainty_version text not null default 'C0227_UNCERTAINTY_V01',
  supersedes_id bigint references public.fpl_projection_uncertainty_snapshots(id)
);
create unique index if not exists fpl_projection_uncertainty_snapshots_run_player_version_uq
  on public.fpl_projection_uncertainty_snapshots(prediction_run_id,player_id,uncertainty_version);
alter table public.fpl_projection_uncertainty_snapshots enable row level security;

create or replace view public.current_fpl_projection_uncertainty_v01 as
select distinct on (prediction_run_id,player_id) *
from public.fpl_projection_uncertainty_snapshots
order by prediction_run_id,player_id,captured_at desc,id desc;

create or replace function private.refresh_c0227_projection_uncertainty_v02(p_gameweek integer)
returns jsonb language plpgsql security definer set search_path to 'public','private','pg_temp' as $function$
declare v_run bigint; v_inserted int:=0; v_now timestamptz:=now(); begin
 select id into v_run from public.gameweek_prediction_runs where gameweek=p_gameweek order by generated_at desc,id desc limit 1;
 if v_run is null then return jsonb_build_object('ok',false,'status','NO_PROJECTION_RUN','gameweek',p_gameweek); end if;
 with latest_actual as (
   select distinct on (pga.player_id,pga.gameweek) pga.*
   from public.player_gameweek_actuals pga
   where pga.gameweek<p_gameweek
   order by pga.player_id,pga.gameweek,pga.result_run_id desc,pga.id desc
 ), actual as (
   select player_id,count(*) filter(where minutes>0)::int apps,coalesce(sum(minutes),0)::int minutes,
          coalesce(sum(goals),0)::numeric goals,coalesce(sum(xg),0)::numeric xg,
          coalesce(sum(penalties_missed),0)::int pens_missed
   from latest_actual group by player_id
 ), src as (
   select mp.player_id,mp.expected_points,mp.expected_minutes,mp.p_start,mp.confidence,
          cfr.primary_role,cfr.confidence role_conf,
          coalesce(a.apps,0) apps,coalesce(a.minutes,0) minutes,coalesce(a.goals,0) goals,coalesce(a.xg,0) xg,coalesce(a.pens_missed,0) pens_missed,
          (mp.expected_minutes<65 or coalesce(mp.p_start,0)<0.75) minutes_risk,
          (coalesce(cfr.confidence,0)<0.75 or cfr.primary_role is null) role_uncertainty,
          (coalesce(mp.confidence,0)<0.55) low_legacy_confidence,
          (coalesce(a.minutes,0)<180) sparse_current_evidence,
          ((coalesce(a.goals,0)-coalesce(a.xg,0)<=-1.0 and coalesce(a.xg,0)>=1.0) or coalesce(a.pens_missed,0)>0) regression_dependency
   from public.model_predictions mp
   left join public.current_player_fixture_roles cfr on cfr.player_id=mp.player_id and cfr.gameweek=p_gameweek
   left join actual a on a.player_id=mp.player_id
   where mp.prediction_run_id=v_run
 ), classified as (
   select s.*,
     case when expected_minutes<60 or p_start<0.65 or role_uncertainty or
                    ((minutes_risk::int+low_legacy_confidence::int+sparse_current_evidence::int+regression_dependency::int)>=2)
          then 'HIGH'
          when minutes_risk or low_legacy_confidence or sparse_current_evidence or regression_dependency then 'MEDIUM'
          else 'LOW' end uncertainty_class
   from src s
 ), ins as (
 insert into public.fpl_projection_uncertainty_snapshots(
 prediction_run_id,gameweek,player_id,captured_at,expected_points,expected_minutes,p_start,role,role_confidence,legacy_model_confidence,
 current_completed_apps,current_completed_minutes,current_goals,current_xg,current_penalties_missed,finishing_gap,
 minutes_risk,role_uncertainty,low_legacy_confidence,sparse_current_evidence,regression_dependency,uncertainty_class,uncertainty_vector,model_effect_enabled,historical_forecasts_rewritten,uncertainty_version,supersedes_id)
 select v_run,p_gameweek,c.player_id,v_now,c.expected_points,c.expected_minutes,c.p_start,c.primary_role,c.role_conf,c.confidence,
        c.apps,c.minutes,c.goals,c.xg,c.pens_missed,round((c.goals-c.xg)::numeric,4),c.minutes_risk,c.role_uncertainty,c.low_legacy_confidence,c.sparse_current_evidence,c.regression_dependency,c.uncertainty_class,
        jsonb_build_object('semantics','DECISION_UNCERTAINTY_VECTOR_NOT_CALIBRATED_CI','actual_row_policy','LATEST_RESULT_RUN_PER_PLAYER_GW',
          'minutes',jsonb_build_object('expected_minutes',c.expected_minutes,'p_start',c.p_start,'risk',c.minutes_risk),
          'role',jsonb_build_object('role',c.primary_role,'confidence',c.role_conf,'uncertain',c.role_uncertainty),
          'legacy_model_confidence',c.confidence,'low_legacy_confidence',c.low_legacy_confidence,
          'current_evidence',jsonb_build_object('apps',c.apps,'minutes',c.minutes,'goals',c.goals,'xg',c.xg,'finishing_gap',round((c.goals-c.xg)::numeric,4),'penalties_missed',c.pens_missed,'sparse',c.sparse_current_evidence,'regression_dependency',c.regression_dependency),
          'effect_semantics','MAY_INVALIDATE_DECISION_EDGE_BUT_DOES_NOT_CHANGE_XPTS'),false,false,'C0227_UNCERTAINTY_V02',v1.id
 from classified c
 left join public.fpl_projection_uncertainty_snapshots v1 on v1.prediction_run_id=v_run and v1.player_id=c.player_id and v1.uncertainty_version='C0227_UNCERTAINTY_V01'
 on conflict(prediction_run_id,player_id,uncertainty_version) do nothing returning 1)
 select count(*) into v_inserted from ins;
 return jsonb_build_object('ok',true,'change_id','C0227','version','C0227_UNCERTAINTY_V02','gameweek',p_gameweek,'prediction_run_id',v_run,'inserted',v_inserted,
 'actual_row_policy','LATEST_RESULT_RUN_PER_PLAYER_GW','model_effect_enabled',false,'historical_forecasts_rewritten',false);
end $function$;

create or replace function private.c0227_player_sensitivity_v01(p_player_id bigint,p_gameweek integer)
returns jsonb language sql stable security definer set search_path to 'public','private','pg_temp' as $function$
with r as (select id from public.gameweek_prediction_runs where gameweek=p_gameweek order by generated_at desc,id desc limit 1),
u as (select x.* from public.current_fpl_projection_uncertainty_v01 x join r on r.id=x.prediction_run_id where x.player_id=p_player_id)
select coalesce((select jsonb_build_object(
 'player_id',player_id,'gameweek',gameweek,'uncertainty_class',uncertainty_class,
 'scenario_semantics','STRESS_TEST_TRIGGERS_NOT_ALTERNATE_FORECASTS',
 'scenarios',jsonb_strip_nulls(jsonb_build_object(
   'MINUTES_DOWNSIDE',case when minutes_risk then jsonb_build_object('active',true,'reason','Expected minutes <65 or P(start)<0.75; challenger must test a more secure same-position alternative inside the equivalence band.') end,
   'ROLE_DOWNSIDE',case when role_uncertainty then jsonb_build_object('active',true,'reason','Role missing or confidence <0.75; challenger must not rely on role-specific upside.') end,
   'EVIDENCE_SPARSITY',case when sparse_current_evidence then jsonb_build_object('active',true,'reason','<180 completed current-season minutes; challenger must test prior/sample uncertainty.') end,
   'REGRESSION_DEPENDENCY',case when regression_dependency then jsonb_build_object('active',true,'reason','Current projection relies on a player with material goals-xG underperformance and/or a missed penalty; compare a near-equal alternative not carrying this dependency.') end,
   'LEGACY_CONFIDENCE_LOW',case when low_legacy_confidence then jsonb_build_object('active',true,'reason','Inherited baseline model confidence <0.55; treat decimal edge as fragile.') end
  )),
 'may_invalidate_edge',uncertainty_class in ('MEDIUM','HIGH'),
 'changes_expected_points',false
 ) from u),jsonb_build_object('player_id',p_player_id,'gameweek',p_gameweek,'status','MISSING_UNCERTAINTY_STATE'))
$function$;

create or replace function private.c0227_uncertainty_status_v01(p_gameweek integer)
returns jsonb language sql stable security definer set search_path to 'public','private','pg_temp' as $function$
with r as (select id from public.gameweek_prediction_runs where gameweek=p_gameweek order by generated_at desc,id desc limit 1),
s as (select u.* from public.current_fpl_projection_uncertainty_v01 u join r on r.id=u.prediction_run_id)
select jsonb_build_object('ok',(select count(*) from s)>=500 and (select count(*) from s where uncertainty_version='C0227_UNCERTAINTY_V02')=(select count(*) from s),
 'gameweek',p_gameweek,'prediction_run_id',(select id from r),'rows',(select count(*) from s),'v02_rows',(select count(*) from s where uncertainty_version='C0227_UNCERTAINTY_V02'),
 'low',(select count(*) from s where uncertainty_class='LOW'),'medium',(select count(*) from s where uncertainty_class='MEDIUM'),'high',(select count(*) from s where uncertainty_class='HIGH'),
 'regression_dependency',(select count(*) from s where regression_dependency),'model_effect_enabled',false,'historical_forecasts_rewritten',false)
$function$;