-- Enriched Shadow Outcome Replay v0.1
-- Retrospective research only. Never rewrites frozen historical forecasts.
-- Generation excludes actual outcomes; evaluation is a separate post-generation step.

create table if not exists public.enriched_shadow_runs (
  id bigserial primary key,
  gameweek integer not null,
  shadow_version text not null,
  created_at timestamptz not null default now(),
  source_replay_run_id bigint not null references public.blind_fixture_replay_runs(id),
  run_hash text not null unique,
  integration_policy jsonb not null,
  actual_data_used boolean not null default false check (actual_data_used=false),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  forward_valid boolean not null default false check (forward_valid=false)
);

create table if not exists public.enriched_shadow_predictions (
  id bigserial primary key,
  run_id bigint not null references public.enriched_shadow_runs(id) on delete cascade,
  match_id bigint not null references public.matches(id),
  gameweek integer not null,
  kickoff_time timestamptz not null,
  baseline_origin text not null,
  original_comparison_available boolean not null,
  baseline_home_lambda numeric,
  baseline_away_lambda numeric,
  shadow_home_lambda numeric not null,
  shadow_away_lambda numeric not null,
  baseline_top_scoreline text,
  shadow_top_scoreline text not null,
  baseline_score_matrix jsonb,
  shadow_score_matrix jsonb not null,
  baseline_markets jsonb,
  shadow_markets jsonb not null,
  adjustments jsonb not null,
  input_cutoff timestamptz,
  evidence jsonb not null default '{}'::jsonb,
  prediction_hash text not null,
  actual_data_used boolean not null default false check (actual_data_used=false),
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  forward_valid boolean not null default false check (forward_valid=false),
  unique(run_id,match_id),
  unique(run_id,prediction_hash)
);

create table if not exists public.enriched_shadow_evaluations (
  id bigserial primary key,
  run_id bigint not null references public.enriched_shadow_runs(id) on delete cascade,
  match_id bigint not null references public.matches(id),
  evaluated_at timestamptz not null default now(),
  actual_home_score integer not null,
  actual_away_score integer not null,
  actual_outcome text not null,
  baseline_predicted_outcome text,
  shadow_predicted_outcome text not null,
  baseline_outcome_hit boolean,
  shadow_outcome_hit boolean not null,
  baseline_top_scoreline_hit boolean,
  shadow_top_scoreline_hit boolean not null,
  baseline_actual_score_probability numeric,
  shadow_actual_score_probability numeric,
  baseline_score_log_loss numeric,
  shadow_score_log_loss numeric,
  baseline_brier_1x2 numeric,
  shadow_brier_1x2 numeric,
  brier_delta_shadow_minus_baseline numeric,
  baseline_home_goal_error numeric,
  baseline_away_goal_error numeric,
  shadow_home_goal_error numeric not null,
  shadow_away_goal_error numeric not null,
  comparison_status text not null,
  model_effect_enabled boolean not null default false check (model_effect_enabled=false),
  unique(run_id,match_id)
);

alter table public.enriched_shadow_runs enable row level security;
alter table public.enriched_shadow_predictions enable row level security;
alter table public.enriched_shadow_evaluations enable row level security;
revoke all on public.enriched_shadow_runs,public.enriched_shadow_predictions,public.enriched_shadow_evaluations from anon,authenticated;
grant select,insert,update on public.enriched_shadow_runs,public.enriched_shadow_predictions,public.enriched_shadow_evaluations to service_role;
grant usage,select on sequence public.enriched_shadow_runs_id_seq,public.enriched_shadow_predictions_id_seq,public.enriched_shadow_evaluations_id_seq to service_role;

create index if not exists enriched_shadow_runs_source_idx on public.enriched_shadow_runs(source_replay_run_id);
create index if not exists enriched_shadow_predictions_match_idx on public.enriched_shadow_predictions(match_id);
create index if not exists enriched_shadow_predictions_run_match_idx on public.enriched_shadow_predictions(run_id,match_id);
create index if not exists enriched_shadow_evaluations_match_idx on public.enriched_shadow_evaluations(match_id);
create index if not exists enriched_shadow_evaluations_run_match_idx on public.enriched_shadow_evaluations(run_id,match_id);

create or replace function private.shadow_poisson_bundle(p_home numeric,p_away numeric)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with grid as (
    select h,a,
      exp(-p_home)*power(p_home,h)/factorial(h::bigint) *
      exp(-p_away)*power(p_away,a)/factorial(a::bigint) as pr
    from generate_series(0,7) h cross join generate_series(0,7) a
  ), ranked as (
    select h,a,pr,row_number() over(order by pr desc,h,a) rn from grid
  ), agg as (
    select
      sum(pr) filter(where h>a) home_win,
      sum(pr) filter(where h=a) draw,
      sum(pr) filter(where h<a) away_win,
      sum(pr) filter(where h+a>=3) over25,
      sum(pr) filter(where h>0 and a>0) btts,
      jsonb_object_agg(h::text||'-'||a::text,round(pr,6)) score_matrix
    from grid
  ), top5 as (
    select jsonb_agg(jsonb_build_object('score',h::text||'-'||a::text,'prob',round(pr,6)) order by rn) top_scorelines
    from ranked where rn<=5
  )
  select jsonb_build_object(
    'score_matrix',agg.score_matrix,
    'top_scorelines',top5.top_scorelines,
    'markets',jsonb_build_object(
      'home_win',round(agg.home_win,4),'draw',round(agg.draw,4),'away_win',round(agg.away_win,4),
      'over_2_5',round(agg.over25,4),'under_2_5',round(1-agg.over25,4),
      'btts_yes',round(agg.btts,4),'btts_no',round(1-agg.btts,4),
      'home_clean_sheet',round(exp(-p_away),4),'away_clean_sheet',round(exp(-p_home),4)
    )
  ) from agg cross join top5
$$;

create or replace function public.generate_enriched_shadow_gw_v01(p_gameweek integer)
returns jsonb
language plpgsql
set search_path = public, private, pg_temp
as $$
declare
  v_source_run bigint;
  v_run bigint;
  v_hash text;
  v_existing bigint;
  v_count integer:=0;
  v_policy jsonb:=jsonb_build_object(
    'version','enriched_shadow_v0.1','research_type','RETROSPECTIVE_ENRICHED_SHADOW',
    'goal_integration','bounded log-lambda adjustments','wide_max_log_effect',0.04,
    'aerial_set_piece_max_log_effect',0.035,'central_creation_max_log_effect',0.05,
    'recent_attack_max_log_effect',0.05,'opponent_defence_max_log_effect',0.04,
    'positive_transition_max_log_effect',0.025,'schedule_fatigue_max_log_effect',0.03,
    'personnel_attack_max_log_effect',0.05,'opponent_personnel_defence_max_log_effect',0.04,
    'total_log_effect_cap',0.12,
    'transition_policy','positive opportunity may add small upside; low transition opportunity does not penalize possession attacks',
    'personnel_policy','position-aware role-continuity proxy; not player ability',
    'missing_policy','missing contribution remains unavailable and applies no shadow adjustment; it is not interpreted as zero football strength',
    'coefficient_policy','fixed conservative heuristic coefficients; not optimized on GW1 results',
    'actual_scores_excluded_from_generation',true,'model_effect_enabled',false,'forward_valid',false
  );
begin
  select id into v_source_run from public.blind_fixture_replay_runs where gameweek=p_gameweek order by created_at desc,id desc limit 1;
  if v_source_run is null then raise exception 'No blind replay run for GW %',p_gameweek; end if;
  v_hash:=md5(jsonb_build_object('gameweek',p_gameweek,'source_replay_run_id',v_source_run,'policy',v_policy)::text);
  select id into v_existing from public.enriched_shadow_runs where run_hash=v_hash;
  if v_existing is not null then return jsonb_build_object('ok',true,'run_id',v_existing,'existing',true,'gameweek',p_gameweek,'model_effect_enabled',false,'forward_valid',false); end if;
  insert into public.enriched_shadow_runs(gameweek,shadow_version,source_replay_run_id,run_hash,integration_policy)
  values(p_gameweek,'enriched_shadow_v0.1',v_source_run,v_hash,v_policy) returning id into v_run;

  with br as materialized (
    select b.*,m.home_team_id,m.away_team_id from public.blind_fixture_replay_matches b join public.matches m on m.id=b.match_id where b.run_id=v_source_run
  ), missing as materialized (select * from br where not base_prediction_available),
  hist as materialized (select * from public.historical_team_seasons where season='2025-2026'),
  lg as materialized (select sum(xg_for)/nullif(sum(matches),0) lgavg from hist),
  pre_rows as materialized (
    select mb.match_id,fr.home_team_id team_id,fr.home_xg xgf,fr.away_xg xga from missing mb join public.matches fr on fr.source='fpl_core_insights' and fr.competition='friendly' and fr.finished=true and fr.kickoff_time<mb.kickoff_time
    union all
    select mb.match_id,fr.away_team_id,fr.away_xg,fr.home_xg from missing mb join public.matches fr on fr.source='fpl_core_insights' and fr.competition='friendly' and fr.finished=true and fr.kickoff_time<mb.kickoff_time
  ), pre as materialized (
    select match_id,team_id,count(*) matches,count(*) filter(where xgf is not null and xga is not null) xg_matches,sum(xgf) filter(where xgf is not null and xga is not null) xgf,sum(xga) filter(where xgf is not null and xga is not null) xga from pre_rows group by match_id,team_id
  ), state0 as materialized (
    select mb.match_id,t.id team_id,
      case when h.matches is not null and h.matches>0 then ((h.xg_for+l.lgavg*6)/(h.matches+6)) else l.lgavg*.86 end prior_for,
      case when h.matches is not null and h.matches>0 then ((h.xg_against+l.lgavg*6)/(h.matches+6)) else l.lgavg*1.14 end prior_against,
      case when h.matches is not null and h.matches>0 then 18::numeric else 10::numeric end prior_w,
      coalesce(p.xg_matches,0) xgm,p.xgf,p.xga
    from missing mb cross join public.teams t cross join lg l left join hist h on h.team_code=t.team_code left join pre p on p.match_id=mb.match_id and p.team_id=t.id where t.fpl_team_id is not null
  ), states as materialized (
    select *,case when xgm>0 then (prior_for*prior_w+(xgf/xgm)*(xgm*.35))/(prior_w+xgm*.35) else prior_for end xg_for_90,case when xgm>0 then (prior_against*prior_w+(xga/xgm)*(xgm*.35))/(prior_w+xgm*.35) else prior_against end xg_against_90 from state0
  ), safe_league as materialized (select match_id,avg(xg_for_90) league from states group by match_id),
  safe_base as materialized (
    select mb.match_id,sl.league*1.06*power(hs.xg_for_90/sl.league,.90)*power(as_.xg_against_90/sl.league,.70)*1.04 home_lambda,sl.league*1.06*power(as_.xg_for_90/sl.league,.90)*power(hs.xg_against_90/sl.league,.70)*.97 away_lambda
    from missing mb join safe_league sl on sl.match_id=mb.match_id join states hs on hs.match_id=mb.match_id and hs.team_id=mb.home_team_id join states as_ on as_.match_id=mb.match_id and as_.team_id=mb.away_team_id
  ), bases as materialized (
    select br.*,coalesce(br.home_lambda,sb.home_lambda) baseline_home_lambda,coalesce(br.away_lambda,sb.away_lambda) baseline_away_lambda,
      case when br.base_prediction_available then coalesce(br.base_prediction_origin,'SAVED_OR_RECONSTRUCTED_PREKICKOFF_BASE') else 'SAFE_PREMATCH_PRIOR_RECONSTRUCTION_NO_ELO' end baseline_origin2,
      br.base_prediction_available original_comparison_available2
    from br left join safe_base sb on sb.match_id=br.match_id
  ), side_base as materialized (
    select b.match_id,b.gameweek,b.kickoff_time,b.home_team_id team_id,b.away_team_id opp_id,'HOME'::text side,b.baseline_home_lambda base_lambda from bases b
    union all select b.match_id,b.gameweek,b.kickoff_time,b.away_team_id,b.home_team_id,'AWAY'::text,b.baseline_away_lambda from bases b
  ), sig as materialized (
    select s.match_id,s.team_id,
      max(s.score) filter(where s.signal_key='wide_channel_pressure') wide,max(s.confidence) filter(where s.signal_key='wide_channel_pressure') wide_c,max(s.data_coverage) filter(where s.signal_key='wide_channel_pressure') wide_cov,
      max(s.score) filter(where s.signal_key='aerial_set_piece_mismatch') aerial,max(s.confidence) filter(where s.signal_key='aerial_set_piece_mismatch') aerial_c,max(s.data_coverage) filter(where s.signal_key='aerial_set_piece_mismatch') aerial_cov,
      max(s.score) filter(where s.signal_key='central_creation_vs_block') central,max(s.confidence) filter(where s.signal_key='central_creation_vs_block') central_c,max(s.data_coverage) filter(where s.signal_key='central_creation_vs_block') central_cov,
      max(s.score) filter(where s.signal_key='direct_transition_opportunity') trans,max(s.confidence) filter(where s.signal_key='direct_transition_opportunity') trans_c,max(s.data_coverage) filter(where s.signal_key='direct_transition_opportunity') trans_cov,
      max(s.score) filter(where s.signal_key='personnel_disruption') disruption,max(s.confidence) filter(where s.signal_key='personnel_disruption') disruption_c,max(s.evidence_cutoff) signal_cutoff
    from public.blind_fixture_replay_signals s where s.run_id=v_source_run group by s.match_id,s.team_id
  ), posmix as materialized (
    select r.match_id,r.team_id,max(r.captured_at) personnel_cutoff,
      avg(case p.position when 'FWD' then 1 when 'MID' then .7 when 'DEF' then .25 when 'GKP' then .1 else .4 end) attack_mix,
      avg(case p.position when 'DEF' then 1 when 'GKP' then 1 when 'MID' then .35 when 'FWD' then .1 else .4 end) defense_mix
    from public.player_replacement_quality_observations r join public.players p on p.id=r.target_player_id
    where r.gameweek=p_gameweek and r.captured_at<r.kickoff_time and r.evidence->>'method'='replacement_proxy_v0.1.1' group by r.match_id,r.team_id
  ), feat as materialized (select * from public.team_intelligence_features where gameweek=p_gameweek),
  x as materialized (
    select s.*,sg.wide,sg.wide_c,sg.wide_cov,sg.aerial,sg.aerial_c,sg.aerial_cov,sg.central,sg.central_c,sg.central_cov,sg.trans,sg.trans_c,sg.trans_cov,sg.disruption,sg.disruption_c,
      osg.disruption opp_disruption,osg.disruption_c opp_disruption_c,pm.attack_mix,opm.defense_mix opp_defense_mix,
      (tf.l5_xg_for-tf.l10_xg_for) attack_trend,tf.sample_l10 attack_n,tf.rest_days,tf.matches_prev_7d,(ofe.l10_xg_against-ofe.l5_xg_against) opp_def_trend,ofe.sample_l10 opp_def_n,
      greatest(sg.signal_cutoff,osg.signal_cutoff,pm.personnel_cutoff,opm.personnel_cutoff,tf.previous_match,ofe.previous_match) contextual_cutoff
    from side_base s left join sig sg on sg.match_id=s.match_id and sg.team_id=s.team_id left join sig osg on osg.match_id=s.match_id and osg.team_id=s.opp_id
    left join posmix pm on pm.match_id=s.match_id and pm.team_id=s.team_id left join posmix opm on opm.match_id=s.match_id and opm.team_id=s.opp_id
    left join feat tf on tf.match_id=s.match_id and tf.team_id=s.team_id left join feat ofe on ofe.match_id=s.match_id and ofe.team_id=s.opp_id
  ), contrib as materialized (
    select x.*,
      case when wide is null then null else (wide-.5)*2*.04*wide_c*wide_cov end wide_adj,
      case when aerial is null then null else (aerial-.5)*2*.035*aerial_c*aerial_cov end aerial_adj,
      case when central is null then null else (central-.5)*2*.05*central_c*central_cov end central_adj,
      case when trans is null then null else greatest(trans-.55,0)/.45*.025*trans_c*trans_cov end transition_adj,
      case when attack_trend is null then null else greatest(-1::numeric,least(1::numeric,attack_trend/.5))*.05*least(1::numeric,coalesce(attack_n,0)/10.0) end form_attack_adj,
      case when opp_def_trend is null then null else -greatest(-1::numeric,least(1::numeric,opp_def_trend/.5))*.04*least(1::numeric,coalesce(opp_def_n,0)/10.0) end opp_def_adj,
      case when rest_days is null or rest_days>21 then 0::numeric when rest_days<4 then -least(1::numeric,(4-rest_days)/3)*.03*.9 when matches_prev_7d>=3 then -.02*.9 when rest_days between 7 and 14 then least(1::numeric,(rest_days-6)/8)*.01*.9 else 0::numeric end schedule_adj,
      case when disruption is null or attack_mix is null then null else -disruption*disruption_c*.05*attack_mix end personnel_attack_adj,
      case when opp_disruption is null or opp_defense_mix is null then null else opp_disruption*opp_disruption_c*.04*opp_defense_mix end opponent_personnel_adj
    from x
  ), adjusted as materialized (
    select c.*,greatest(-.12::numeric,least(.12::numeric,coalesce(wide_adj,0)+coalesce(aerial_adj,0)+coalesce(central_adj,0)+coalesce(transition_adj,0)+coalesce(form_attack_adj,0)+coalesce(opp_def_adj,0)+coalesce(schedule_adj,0)+coalesce(personnel_attack_adj,0)+coalesce(opponent_personnel_adj,0))) total_log_adj from contrib c
  ), side_out as materialized (
    select a.*,a.base_lambda*exp(a.total_log_adj) shadow_lambda,
      jsonb_build_object('wide',jsonb_build_object('score',wide,'contribution',wide_adj),'aerial_set_piece',jsonb_build_object('score',aerial,'contribution',aerial_adj),'central_creation',jsonb_build_object('score',central,'contribution',central_adj),'transition',jsonb_build_object('score',trans,'contribution',transition_adj),'recent_attack',jsonb_build_object('xg_trend',attack_trend,'contribution',form_attack_adj),'opponent_recent_defence',jsonb_build_object('xga_improvement',opp_def_trend,'contribution',opp_def_adj),'schedule_fatigue',jsonb_build_object('rest_days',rest_days,'matches_prev_7d',matches_prev_7d,'contribution',schedule_adj),'personnel_attack',jsonb_build_object('disruption',disruption,'position_mix',attack_mix,'contribution',personnel_attack_adj),'opponent_personnel_defence',jsonb_build_object('disruption',opp_disruption,'position_mix',opp_defense_mix,'contribution',opponent_personnel_adj),'total_log_adjustment',total_log_adj,'lambda_multiplier',exp(total_log_adj)) side_adjustments
    from adjusted a
  ), combined as materialized (
    select b.match_id,b.gameweek,b.kickoff_time,b.baseline_origin2,b.original_comparison_available2,b.baseline_home_lambda,b.baseline_away_lambda,
      max(so.shadow_lambda) filter(where so.side='HOME') shadow_home_lambda,max(so.shadow_lambda) filter(where so.side='AWAY') shadow_away_lambda,
      ((jsonb_agg(so.side_adjustments) filter(where so.side='HOME'))->0) home_adjustments,
      ((jsonb_agg(so.side_adjustments) filter(where so.side='AWAY'))->0) away_adjustments,
      greatest(b.evidence_cutoff,max(so.contextual_cutoff)) input_cutoff
    from bases b join side_out so on so.match_id=b.match_id
    group by b.match_id,b.gameweek,b.kickoff_time,b.baseline_origin2,b.original_comparison_available2,b.baseline_home_lambda,b.baseline_away_lambda,b.evidence_cutoff
  ), bundled as materialized (
    select c.*,private.shadow_poisson_bundle(c.baseline_home_lambda,c.baseline_away_lambda) baseline_bundle,private.shadow_poisson_bundle(c.shadow_home_lambda,c.shadow_away_lambda) shadow_bundle from combined c
  ), ins as (
    insert into public.enriched_shadow_predictions(run_id,match_id,gameweek,kickoff_time,baseline_origin,original_comparison_available,baseline_home_lambda,baseline_away_lambda,shadow_home_lambda,shadow_away_lambda,baseline_top_scoreline,shadow_top_scoreline,baseline_score_matrix,shadow_score_matrix,baseline_markets,shadow_markets,adjustments,input_cutoff,evidence,prediction_hash)
    select v_run,b.match_id,b.gameweek,b.kickoff_time,b.baseline_origin2,b.original_comparison_available2,round(b.baseline_home_lambda,3),round(b.baseline_away_lambda,3),round(b.shadow_home_lambda,3),round(b.shadow_away_lambda,3),
      b.baseline_bundle->'top_scorelines'->0->>'score',b.shadow_bundle->'top_scorelines'->0->>'score',b.baseline_bundle->'score_matrix',b.shadow_bundle->'score_matrix',b.baseline_bundle->'markets',b.shadow_bundle->'markets',
      jsonb_build_object('home',b.home_adjustments,'away',b.away_adjustments,'policy',v_policy),b.input_cutoff,
      jsonb_build_object('source_replay_run_id',v_source_run,'generation_excluded_actual_scores',true,'baseline_is_original_comparable',b.original_comparison_available2,'baseline_origin',b.baseline_origin2,'match1_safe_baseline_excludes_postkickoff_elo',not b.original_comparison_available2),
      md5(jsonb_build_object('run',v_run,'match',b.match_id,'base_h',round(b.baseline_home_lambda,6),'base_a',round(b.baseline_away_lambda,6),'shadow_h',round(b.shadow_home_lambda,6),'shadow_a',round(b.shadow_away_lambda,6),'policy',v_policy)::text)
    from bundled b returning 1
  ) select count(*) into v_count from ins;
  return jsonb_build_object('ok',true,'run_id',v_run,'existing',false,'gameweek',p_gameweek,'predictions',v_count,'source_replay_run_id',v_source_run,'actual_data_used',false,'model_effect_enabled',false,'forward_valid',false);
end $$;

create or replace function public.evaluate_enriched_shadow_gw_v01(p_run_id bigint)
returns jsonb language plpgsql set search_path = public, private, pg_temp as $$
declare v_count integer:=0;
begin
  with src as materialized (
    select p.*,m.finished,m.home_score,m.away_score,case when m.home_score>m.away_score then 'HOME' when m.home_score<m.away_score then 'AWAY' else 'DRAW' end actual_outcome,m.home_score::text||'-'||m.away_score::text score_key
    from public.enriched_shadow_predictions p join public.matches m on m.id=p.match_id where p.run_id=p_run_id and m.finished=true and m.home_score is not null and m.away_score is not null
  ), calc as materialized (
    select s.*,
      case when (baseline_markets->>'home_win')::numeric >= greatest((baseline_markets->>'draw')::numeric,(baseline_markets->>'away_win')::numeric) then 'HOME' when (baseline_markets->>'away_win')::numeric >= greatest((baseline_markets->>'home_win')::numeric,(baseline_markets->>'draw')::numeric) then 'AWAY' else 'DRAW' end baseline_outcome,
      case when (shadow_markets->>'home_win')::numeric >= greatest((shadow_markets->>'draw')::numeric,(shadow_markets->>'away_win')::numeric) then 'HOME' when (shadow_markets->>'away_win')::numeric >= greatest((shadow_markets->>'home_win')::numeric,(shadow_markets->>'draw')::numeric) then 'AWAY' else 'DRAW' end shadow_outcome,
      nullif((baseline_score_matrix->>score_key)::numeric,0) baseline_score_prob,nullif((shadow_score_matrix->>score_key)::numeric,0) shadow_score_prob
    from src s
  ), metrics as materialized (
    select c.*,
      power((baseline_markets->>'home_win')::numeric-(case when actual_outcome='HOME' then 1 else 0 end),2)+power((baseline_markets->>'draw')::numeric-(case when actual_outcome='DRAW' then 1 else 0 end),2)+power((baseline_markets->>'away_win')::numeric-(case when actual_outcome='AWAY' then 1 else 0 end),2) baseline_brier,
      power((shadow_markets->>'home_win')::numeric-(case when actual_outcome='HOME' then 1 else 0 end),2)+power((shadow_markets->>'draw')::numeric-(case when actual_outcome='DRAW' then 1 else 0 end),2)+power((shadow_markets->>'away_win')::numeric-(case when actual_outcome='AWAY' then 1 else 0 end),2) shadow_brier
    from calc c
  ), ins as (
    insert into public.enriched_shadow_evaluations(run_id,match_id,actual_home_score,actual_away_score,actual_outcome,baseline_predicted_outcome,shadow_predicted_outcome,baseline_outcome_hit,shadow_outcome_hit,baseline_top_scoreline_hit,shadow_top_scoreline_hit,baseline_actual_score_probability,shadow_actual_score_probability,baseline_score_log_loss,shadow_score_log_loss,baseline_brier_1x2,shadow_brier_1x2,brier_delta_shadow_minus_baseline,baseline_home_goal_error,baseline_away_goal_error,shadow_home_goal_error,shadow_away_goal_error,comparison_status)
    select p_run_id,m.match_id,m.home_score,m.away_score,m.actual_outcome,m.baseline_outcome,m.shadow_outcome,
      case when m.original_comparison_available then m.baseline_outcome=m.actual_outcome else null end,m.shadow_outcome=m.actual_outcome,
      case when m.original_comparison_available then m.baseline_top_scoreline=m.score_key else null end,m.shadow_top_scoreline=m.score_key,
      case when m.original_comparison_available then m.baseline_score_prob else null end,m.shadow_score_prob,
      case when m.original_comparison_available and m.baseline_score_prob is not null then -ln(greatest(m.baseline_score_prob,1e-9)) else null end,case when m.shadow_score_prob is not null then -ln(greatest(m.shadow_score_prob,1e-9)) else null end,
      case when m.original_comparison_available then m.baseline_brier else null end,m.shadow_brier,case when m.original_comparison_available then m.shadow_brier-m.baseline_brier else null end,
      case when m.original_comparison_available then m.home_score-m.baseline_home_lambda else null end,case when m.original_comparison_available then m.away_score-m.baseline_away_lambda else null end,m.home_score-m.shadow_home_lambda,m.away_score-m.shadow_away_lambda,
      case when not m.original_comparison_available then 'SHADOW_ONLY_NO_ORIGINAL_BASE' when m.shadow_brier<m.baseline_brier-.01 then 'SHADOW_BETTER' when m.shadow_brier>m.baseline_brier+.01 then 'SHADOW_WORSE' else 'SIMILAR' end
    from metrics m
    on conflict(run_id,match_id) do update set evaluated_at=now(),actual_home_score=excluded.actual_home_score,actual_away_score=excluded.actual_away_score,actual_outcome=excluded.actual_outcome,baseline_predicted_outcome=excluded.baseline_predicted_outcome,shadow_predicted_outcome=excluded.shadow_predicted_outcome,baseline_outcome_hit=excluded.baseline_outcome_hit,shadow_outcome_hit=excluded.shadow_outcome_hit,baseline_top_scoreline_hit=excluded.baseline_top_scoreline_hit,shadow_top_scoreline_hit=excluded.shadow_top_scoreline_hit,baseline_actual_score_probability=excluded.baseline_actual_score_probability,shadow_actual_score_probability=excluded.shadow_actual_score_probability,baseline_score_log_loss=excluded.baseline_score_log_loss,shadow_score_log_loss=excluded.shadow_score_log_loss,baseline_brier_1x2=excluded.baseline_brier_1x2,shadow_brier_1x2=excluded.shadow_brier_1x2,brier_delta_shadow_minus_baseline=excluded.brier_delta_shadow_minus_baseline,baseline_home_goal_error=excluded.baseline_home_goal_error,baseline_away_goal_error=excluded.baseline_away_goal_error,shadow_home_goal_error=excluded.shadow_home_goal_error,shadow_away_goal_error=excluded.shadow_away_goal_error,comparison_status=excluded.comparison_status returning 1
  ) select count(*) into v_count from ins;
  return jsonb_build_object('ok',true,'run_id',p_run_id,'evaluated',v_count,'model_effect_enabled',false);
end $$;

revoke all on function public.generate_enriched_shadow_gw_v01(integer) from public,anon,authenticated;
revoke all on function public.evaluate_enriched_shadow_gw_v01(bigint) from public,anon,authenticated;
grant execute on function public.generate_enriched_shadow_gw_v01(integer) to service_role;
grant execute on function public.evaluate_enriched_shadow_gw_v01(bigint) to service_role;
