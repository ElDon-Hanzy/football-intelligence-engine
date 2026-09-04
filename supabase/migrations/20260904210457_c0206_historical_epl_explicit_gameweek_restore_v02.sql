create or replace function private.finalize_c0206_historical_epl_restores_v02(p_target_gameweek integer)
returns jsonb
language plpgsql
security definer
set search_path=private,public,pg_temp
as $$
declare
 v_now timestamptz:=clock_timestamp();
 v_active_mv bigint;
 v_deadline timestamptz;
 v_count integer:=0;
 r record;
 v_match record;
 v_fx record;
 v_team_lambda numeric;
 v_opp_lambda numeric;
 v_lg numeric;
 v_la numeric;
 v_pcs numeric;
 v_pbonus numeric;
 v_xpts numeric;
 v_dist jsonb;
 v_conf numeric;
 v_pred_id bigint;
 v_event_id bigint;
begin
 if p_target_gameweek is null or p_target_gameweek<4 then
   raise exception 'C0206 historical EPL restore requires explicit target gameweek >= 4';
 end if;

 select min(kickoff_time)-interval '90 minutes' into v_deadline
 from public.matches
 where source='fpl' and gameweek=p_target_gameweek;
 if v_deadline is null then raise exception 'C0206 target GW% has no FPL fixtures',p_target_gameweek; end if;
 if v_deadline<=v_now then raise exception 'C0206 target GW% deadline is not open (% <= %)',p_target_gameweek,v_deadline,v_now; end if;

 select id into v_active_mv from public.model_versions where is_active=true order by id desc limit 1;
 if v_active_mv is null then raise exception 'C0206 active model version unavailable'; end if;

 for r in
   with lt as (select max(captured_at) t from public.research_c0206_historical_epl_bootstrap_snapshots)
   select s.*,p.web_name,p.position,p.now_cost,p.team_id,
          cs.id current_state_id,cs.expected_minutes current_xmin,cs.start_probability current_pstart,
          cs.appearance_probability current_pappear,cs.starter_minutes_estimate current_starter_mins,
          cs.xg90 current_xg90,cs.xa90 current_xa90,cs.dc_probability current_dc,cs.as_of current_as_of,
          bs.id base_state_id
   from public.research_c0206_historical_epl_bootstrap_snapshots s
   join lt on lt.t=s.captured_at
   join public.players p on p.id=s.player_id
   join public.current_player_state_latest cs on cs.player_id=s.player_id
   join public.current_player_state_base bs on bs.player_id=s.player_id
   where s.candidate_live_restore=true
     and s.evidence->>'provenance_approved'='true'
     and s.evidence->>'shadow_version'='C0206_V03_PROVENANCE_CHRONOLOGY_FIXED'
     and cs.expected_minutes is not null
     and cs.start_probability is not null
     and cs.appearance_probability is not null
     and cs.xg90 is not null
     and cs.xa90 is not null
     and cs.dc_probability is not null
     and not exists(
       select 1 from public.model_predictions mp
       where mp.player_id=s.player_id and mp.prediction_run_id is null
         and mp.gameweek=p_target_gameweek
         and mp.features->>'baseline_kind'='governed_historical_epl_bootstrap'
     )
 loop
   select m.id,m.home_team_id,m.away_team_id into v_match
   from public.matches m
   where m.source='fpl' and m.gameweek=p_target_gameweek and r.team_id in (m.home_team_id,m.away_team_id)
   limit 1;
   if v_match.id is null then continue; end if;

   select distinct on (f.match_id) f.home_lambda,f.away_lambda,f.captured_at into v_fx
   from public.fixture_prediction_snapshots f
   where f.match_id=v_match.id and f.is_pre_kickoff=true and f.captured_at<=v_now and f.captured_at<v_deadline+interval '90 minutes'
   order by f.match_id,f.captured_at desc;
   if v_fx.captured_at is null then continue; end if;

   if r.team_id=v_match.home_team_id then
     v_team_lambda:=private.fpl_adjusted_team_lambda_v01(v_match.home_team_id,v_match.away_team_id,v_fx.home_lambda,v_now);
     v_opp_lambda:=private.fpl_adjusted_team_lambda_v01(v_match.away_team_id,v_match.home_team_id,v_fx.away_lambda,v_now);
   else
     v_team_lambda:=private.fpl_adjusted_team_lambda_v01(v_match.away_team_id,v_match.home_team_id,v_fx.away_lambda,v_now);
     v_opp_lambda:=private.fpl_adjusted_team_lambda_v01(v_match.home_team_id,v_match.away_team_id,v_fx.home_lambda,v_now);
   end if;

   v_lg:=private.fpl_fixture_goal_lambda_v02(r.player_id,r.current_xmin,v_team_lambda,v_now);
   v_la:=private.fpl_fixture_assist_lambda_v02(r.player_id,r.current_xmin,v_team_lambda,v_now);
   v_pcs:=greatest(0,least(.95,exp(-v_opp_lambda)*r.current_pstart*least(1,r.current_starter_mins/60.0)));

   select coalesce(percentile_cont(.5) within group(order by z.p_bonus),.08) into v_pbonus
   from (
     select distinct on (mp.player_id) mp.player_id,mp.p_bonus
     from public.model_predictions mp join public.players pp on pp.id=mp.player_id
     where mp.prediction_run_id is null and pp.position=r.position
       and pp.now_cost between greatest(35,r.now_cost-5) and r.now_cost+5
       and mp.p_bonus is not null
     order by mp.player_id,mp.generated_at desc
   ) z;
   v_pbonus:=greatest(0,least(.5,v_pbonus));

   v_xpts:=least(1,r.current_xmin/25.0)+greatest(0,least(1,(r.current_xmin-20)/50.0))
     +(case r.position when 'GKP' then 6 when 'DEF' then 6 when 'MID' then 5 else 4 end)*v_lg+3*v_la
     +(case r.position when 'GKP' then 4 when 'DEF' then 4 when 'MID' then 1 else 0 end)*v_pcs
     +2*r.current_dc+1.6*v_pbonus
     -(case when r.position in ('GKP','DEF') then ((v_opp_lambda*least(r.current_xmin,90)/90.0)/2-(1-exp(-2*(v_opp_lambda*least(r.current_xmin,90)/90.0)))/4) else 0 end)
     +(case when r.position='GKP' then .55*v_opp_lambda*least(r.current_xmin,90)/90.0 else 0 end);
   v_xpts:=greatest(0,least(15,v_xpts));

   v_dist:=private.fpl_current_event_distribution_v01(r.position,r.current_xmin,r.current_pstart,r.current_pappear,v_lg,v_la,v_opp_lambda,r.current_dc,v_pbonus,v_xpts);
   v_conf:=greatest(.08,least(.30,coalesce(r.quality_prior_confidence,.20)*.35));

   insert into public.model_predictions(
     model_version_id,player_id,match_id,gameweek,generated_at,expected_minutes,expected_points,
     p_blank,p_5_plus,p_10_plus,p_15_plus,p_20_plus,p_start,p_clean_sheet,p_goal,p_assist,p_dc,p_bonus,
     ceiling_score,floor_score,confidence,features,prediction_run_id)
   values(
     v_active_mv,r.player_id,v_match.id,p_target_gameweek,v_now,r.current_xmin,v_xpts,
     (v_dist->>'p_blank')::numeric,(v_dist->>'p_5_plus')::numeric,(v_dist->>'p_10_plus')::numeric,
     (v_dist->>'p_15_plus')::numeric,(v_dist->>'p_20_plus')::numeric,r.current_pstart,v_pcs,
     1-exp(-v_lg),1-exp(-v_la),r.current_dc,v_pbonus,(v_dist->>'q90')::numeric,(v_dist->>'q25')::numeric,v_conf,
     jsonb_build_object(
       'engine','c0206_governed_historical_epl_bootstrap_v02','change_id','C0206',
       'baseline_kind','governed_historical_epl_bootstrap','historical_shadow_snapshot_id',r.id,
       'base_state_id',r.base_state_id,'current_state_id',r.current_state_id,
       'historical_minutes',r.historical_minutes,'historical_quality_confidence',r.quality_prior_confidence,
       'transfer_event_type',r.transfer_event_type,'transfer_event_at',r.transfer_event_at,
       'team_lambda',v_team_lambda,'opp_lambda',v_opp_lambda,'state_as_of',r.current_as_of,
       'fixture_cutoff',v_fx.captured_at,'deadline_at',v_deadline,'point_distribution',v_dist,
       'bootstrap_q95_xg90',r.peer_q95_xg90,'bootstrap_q95_xa90',r.peer_q95_xa90,
       'target_selector','explicit_gameweek_argument','provenance_approved',true,
       'provenance_validation_id',r.evidence->>'validation_id',
       'actual_data_used_for_target_gameweek',false,'historical_forecasts_rewritten',false,
       'missing_data_is_not_zero',true),null)
   returning id into v_pred_id;

   insert into public.fpl_projection_eligibility_events(player_id,eligibility_status,reason_code,reason_detail,change_id,evidence)
   values(r.player_id,'RESTORED','C0206_HISTORICAL_EPL_BOOTSTRAP_EXPLICIT_GW_V02',
     'Restored for an explicitly selected future Gameweek using provenance-validated, shrunk 2025/26 EPL rates plus transfer-aware peer minutes; historical start rate is not used.',
     'C0206',jsonb_build_object('historical_shadow_snapshot_id',r.id,'base_state_id',r.base_state_id,
       'current_state_id',r.current_state_id,'baseline_prediction_id',v_pred_id,'target_gameweek',p_target_gameweek,
       'deadline_at',v_deadline,'target_selector','explicit_gameweek_argument','provenance_approved',true,
       'historical_start_rate_used',false,'historical_forecasts_rewritten',false));

   insert into public.fpl_player_bootstrap_events(
     player_id,bootstrap_method,shadow_snapshot_id,base_state_id,current_state_id,baseline_prediction_id,target_gameweek,evidence)
   values(r.player_id,'C0206_HISTORICAL_EPL_BOOTSTRAP_V02_EXPLICIT_GW',null,r.base_state_id,r.current_state_id,v_pred_id,p_target_gameweek,
     jsonb_build_object('historical_shadow_snapshot_id',r.id,'xpts',v_xpts,'xmins',r.current_xmin,
       'p_start',r.current_pstart,'historical_minutes',r.historical_minutes,
       'historical_quality_confidence',r.quality_prior_confidence,'provenance_approved',true,
       'target_selector','explicit_gameweek_argument','model_effect_enabled',true,'future_only',true,
       'historical_start_rate_used',false,'historical_forecasts_rewritten',false))
   returning id into v_event_id;

   v_count:=v_count+1;
 end loop;

 return jsonb_build_object('ok',true,'change_id','C0206','restore_version','V02_EXPLICIT_GW',
   'restored_players',v_count,'gameweek',p_target_gameweek,'deadline_at',v_deadline,
   'historical_forecasts_rewritten',false);
end $$;