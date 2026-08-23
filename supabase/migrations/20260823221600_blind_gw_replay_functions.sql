create or replace function public.generate_blind_gw_replay_v01(p_gameweek integer)
returns jsonb
language plpgsql
set search_path=public,private,pg_temp
as $function$
declare
  v_run_id bigint;
  v_hash text:=md5('blind_gw_replay_v0.1|'||p_gameweek::text||'|strict_no_current_competitive_results|20260823');
  v_matches integer:=0;
  v_signals integer:=0;
begin
  select id into v_run_id from public.blind_fixture_replay_runs where run_hash=v_hash;
  if v_run_id is not null then
    return jsonb_build_object('ok',true,'run_id',v_run_id,'gameweek',p_gameweek,'existing',true,'match_rows',(select count(*) from public.blind_fixture_replay_matches where run_id=v_run_id),'signal_rows',(select count(*) from public.blind_fixture_replay_signals where run_id=v_run_id),'actual_data_used',false,'model_effect_enabled',false);
  end if;

  insert into public.blind_fixture_replay_runs(gameweek,replay_version,run_hash,input_policy,actual_data_used,model_effect_enabled)
  values(p_gameweek,'blind_gw_replay_v0.1',v_hash,jsonb_build_object(
    'research_type','RETROSPECTIVE_BLIND_REPLAY',
    'forward_valid',false,
    'actual_scores_excluded_from_generation',true,
    'current_gameweek_results_excluded_from_generation',true,
    'team_style_input','pre-kickoff friendlies only',
    'player_role_input','event_role_v0.2.1 profiles with competitive_minutes=0 and evidence_cutoff before kickoff',
    'expected_xi_input','latest player model predictions generated before kickoff; FPL-valid formation proxy',
    'base_fixture_forecast_input','only genuine fixture_prediction_snapshots captured before kickoff',
    'personnel_disruption','only genuine pre-kickoff replacement observations; otherwise unavailable',
    'missing_data','ignored, never treated as zero'
  ),false,false) returning id into v_run_id;

  with fixtures as materialized (
    select id match_id,gameweek,kickoff_time,home_team_id,away_team_id
    from public.matches where source='fpl' and gameweek=p_gameweek
  ), base_pred as materialized (
    select distinct on (f.match_id) f.match_id,s.id snapshot_id,s.captured_at,s.home_lambda,s.away_lambda,s.top_scorelines,s.markets,s.score_matrix
    from fixtures f left join public.fixture_prediction_snapshots s on s.match_id=f.match_id and s.gameweek=f.gameweek and s.is_pre_kickoff=true and s.captured_at<f.kickoff_time
    order by f.match_id,s.captured_at desc nulls last
  ), pred_time as materialized (
    select f.match_id,max(mp.generated_at) as generated_at
    from fixtures f left join public.model_predictions mp on mp.match_id=f.match_id and mp.gameweek=f.gameweek and mp.generated_at<f.kickoff_time
    group by f.match_id
  ), xi_presence as materialized (
    select f.match_id,
      exists(select 1 from public.model_predictions mp join public.players p on p.id=mp.player_id where mp.match_id=f.match_id and mp.gameweek=f.gameweek and mp.generated_at=pt.generated_at and p.team_id=f.home_team_id) home_xi,
      exists(select 1 from public.model_predictions mp join public.players p on p.id=mp.player_id where mp.match_id=f.match_id and mp.gameweek=f.gameweek and mp.generated_at=pt.generated_at and p.team_id=f.away_team_id) away_xi
    from fixtures f left join pred_time pt on pt.match_id=f.match_id
  ), ins as (
    insert into public.blind_fixture_replay_matches(run_id,match_id,gameweek,kickoff_time,base_prediction_snapshot_id,base_prediction_available,base_prediction_captured_at,home_lambda,away_lambda,top_scoreline,top_scoreline_probability,markets,score_matrix,player_prediction_as_of,home_expected_xi_available,away_expected_xi_available,evidence_cutoff,evidence,replay_hash,actual_data_used,model_effect_enabled)
    select v_run_id,f.match_id,f.gameweek,f.kickoff_time,b.snapshot_id,(b.snapshot_id is not null),b.captured_at,b.home_lambda,b.away_lambda,b.top_scorelines->0->>'score',nullif(b.top_scorelines->0->>'prob','')::numeric,b.markets,b.score_matrix,pt.generated_at,coalesce(x.home_xi,false),coalesce(x.away_xi,false),greatest(b.captured_at,pt.generated_at),jsonb_build_object('base_fixture_forecast_missing_reason',case when b.snapshot_id is null then 'No genuine fixture-level snapshot captured before kickoff' else null end,'player_prediction_missing_reason',case when pt.generated_at is null then 'No player prediction batch generated before kickoff' else null end),md5(v_run_id::text||'|'||f.match_id::text||'|match'),false,false
    from fixtures f left join base_pred b using(match_id) left join pred_time pt using(match_id) left join xi_presence x using(match_id)
    returning 1
  ) select count(*) into v_matches from ins;

  with fixtures as materialized (
    select id match_id,gameweek,kickoff_time,home_team_id,away_team_id from public.matches where source='fpl' and gameweek=p_gameweek
  ), sides as materialized (
    select match_id,gameweek,kickoff_time,home_team_id team_id,away_team_id opponent_team_id from fixtures
    union all select match_id,gameweek,kickoff_time,away_team_id,home_team_id from fixtures
  ), team_events as materialized (
    select s.match_id,s.team_id,s.opponent_team_id,s.kickoff_time,m.kickoff_time event_time,.3::numeric w,m.raw,true home
    from sides s join public.matches m on m.home_team_id=s.team_id and m.source='fpl_core_insights' and m.competition='friendly' and m.finished=true and m.kickoff_time<s.kickoff_time
    union all
    select s.match_id,s.team_id,s.opponent_team_id,s.kickoff_time,m.kickoff_time,.3,m.raw,false
    from sides s join public.matches m on m.away_team_id=s.team_id and m.source='fpl_core_insights' and m.competition='friendly' and m.finished=true and m.kickoff_time<s.kickoff_time
  ), raw_metrics as materialized (
    select match_id,team_id,opponent_team_id,kickoff_time,event_time,w,
      private.json_num(raw,case when home then 'home_possession' else 'away_possession' end) possession,
      private.json_num(raw,case when home then 'home_passes' else 'away_passes' end) passes,
      private.json_num(raw,case when home then 'home_opposition_half' else 'away_opposition_half' end) opposition_half,
      private.json_num(raw,case when home then 'home_accurate_long_balls' else 'away_accurate_long_balls' end) long_acc,
      private.json_num(raw,case when home then 'home_accurate_long_balls_pct' else 'away_accurate_long_balls_pct' end) long_pct,
      private.json_num(raw,case when home then 'home_accurate_crosses' else 'away_accurate_crosses' end) cross_acc,
      private.json_num(raw,case when home then 'home_accurate_crosses_pct' else 'away_accurate_crosses_pct' end) cross_pct,
      private.json_num(raw,case when home then 'home_touches_in_opposition_box' else 'away_touches_in_opposition_box' end) box_touches,
      private.json_num(raw,case when home then 'home_expected_goals_xg' else 'away_expected_goals_xg' end) xg,
      private.json_num(raw,case when home then 'home_xg_set_play' else 'away_xg_set_play' end) set_xg,
      private.json_num(raw,case when home then 'home_corners' else 'away_corners' end) corners,
      private.json_num(raw,case when home then 'home_clearances' else 'away_clearances' end) clearances,
      private.json_num(raw,case when home then 'home_interceptions' else 'away_interceptions' end) interceptions,
      private.json_num(raw,case when home then 'home_blocks' else 'away_blocks' end) blocks,
      private.json_num(raw,case when home then 'home_total_shots' else 'away_total_shots' end) shots
    from team_events
  ), vec as materialized (
    select *,case when passes>0 and opposition_half is not null then opposition_half/passes end territory,case when passes>0 and long_acc is not null and long_pct>0 then (long_acc/(long_pct/100))/passes end long_share,case when cross_acc is not null and cross_pct>0 then cross_acc/(cross_pct/100) end crosses_est
    from raw_metrics where possession is not null
  ), axes as materialized (
    select *,
      .55*greatest(0,least(1,(possession-38)/30))+.45*greatest(0,least(1,(coalesce(territory,.35)-.22)/.30)) control,
      .55*greatest(0,least(1,(coalesce(long_share,.08)-.035)/.13))+.45*greatest(0,least(1,(54-possession)/28)) direct,
      .65*greatest(0,least(1,coalesce(crosses_est,0)/18))+.35*greatest(0,least(1,coalesce(cross_acc,0)/5)) width,
      .40*greatest(0,least(1,coalesce(box_touches,0)/30))+.35*greatest(0,least(1,coalesce(xg,0)/2.2))+.25*greatest(0,least(1,coalesce(shots,0)/18)) box_occupation,
      .60*greatest(0,least(1,case when xg>.15 and set_xg is not null then (set_xg/xg)/.38 else 0 end))+.40*greatest(0,least(1,coalesce(corners,0)/8)) setp,
      .45*greatest(0,least(1,coalesce(clearances,0)/28))+.30*greatest(0,least(1,(58-possession)/30))+.25*greatest(0,least(1,(coalesce(interceptions,0)+coalesce(blocks,0))/12)) defb
    from vec
  ), team_profiles as materialized (
    select match_id,team_id,opponent_team_id,kickoff_time,max(event_time) team_evidence_cutoff,sum(w) weighted_matches,
      sum(control*w)/sum(w) team_control,sum(direct*w)/sum(w) team_directness,sum(width*w)/sum(w) team_width,sum(box_occupation*w)/sum(w) team_box,sum(setp*w)/sum(w) team_set_piece,sum(defb*w)/sum(w) team_defensive_block,
      least(.90,.30+.42*(1-exp(-sum(w)/2.5))) team_confidence
    from axes group by match_id,team_id,opponent_team_id,kickoff_time
  ), pred_time as materialized (
    select f.match_id,max(mp.generated_at) generated_at from fixtures f left join public.model_predictions mp on mp.match_id=f.match_id and mp.gameweek=f.gameweek and mp.generated_at<f.kickoff_time group by f.match_id
  ), pp as materialized (
    select s.match_id,s.team_id,s.opponent_team_id,s.kickoff_time,p.id player_id,p.position,mp.p_start,mp.expected_minutes,
      (.65*coalesce(mp.p_start,0)+.35*least(1,coalesce(mp.expected_minutes,0)/90))::numeric xi_score,pt.generated_at
    from sides s join pred_time pt on pt.match_id=s.match_id join public.model_predictions mp on mp.match_id=s.match_id and mp.gameweek=s.gameweek and mp.generated_at=pt.generated_at join public.players p on p.id=mp.player_id and p.team_id=s.team_id
  ), ranked as materialized (
    select pp.*,row_number() over(partition by match_id,team_id,position order by xi_score desc,expected_minutes desc nulls last,player_id) pos_rank from pp
  ), formations(def_n,mid_n,fwd_n) as (values (3,4,3),(3,5,2),(4,3,3),(4,4,2),(4,5,1),(5,2,3),(5,3,2),(5,4,1)), formation_scores as materialized (
    select r.match_id,r.team_id,r.opponent_team_id,r.kickoff_time,f.def_n,f.mid_n,f.fwd_n,sum(r.xi_score) filter(where (r.position='GKP' and r.pos_rank<=1) or (r.position='DEF' and r.pos_rank<=f.def_n) or (r.position='MID' and r.pos_rank<=f.mid_n) or (r.position='FWD' and r.pos_rank<=f.fwd_n)) formation_score,
      count(*) filter(where r.position='GKP' and r.pos_rank<=1) gk_count,count(*) filter(where r.position='DEF' and r.pos_rank<=f.def_n) def_count,count(*) filter(where r.position='MID' and r.pos_rank<=f.mid_n) mid_count,count(*) filter(where r.position='FWD' and r.pos_rank<=f.fwd_n) fwd_count
    from ranked r cross join formations f group by r.match_id,r.team_id,r.opponent_team_id,r.kickoff_time,f.def_n,f.mid_n,f.fwd_n
  ), chosen_form as materialized (
    select distinct on(match_id,team_id) * from formation_scores where gk_count=1 and def_count=def_n and mid_count=mid_n and fwd_count=fwd_n order by match_id,team_id,formation_score desc,def_n,mid_n,fwd_n
  ), xi as materialized (
    select r.*,cf.def_n,cf.mid_n,cf.fwd_n from ranked r join chosen_form cf using(match_id,team_id,opponent_team_id,kickoff_time)
    where (r.position='GKP' and r.pos_rank<=1) or (r.position='DEF' and r.pos_rank<=cf.def_n) or (r.position='MID' and r.pos_rank<=cf.mid_n) or (r.position='FWD' and r.pos_rank<=cf.fwd_n)
  ), xi_roles as materialized (
    select x.*,rr.primary_role,rr.confidence role_conf,rr.feature_vector,rr.evidence_cutoff role_evidence_cutoff
    from xi x left join lateral (
      select r.primary_role,r.confidence,r.feature_vector,r.evidence_cutoff from public.player_role_profile_observations r
      where r.player_id=x.player_id and r.taxonomy_version='event_role_v0.2.1' and coalesce(r.competitive_minutes,0)=0 and r.evidence_cutoff<x.kickoff_time
      order by r.observed_at desc,r.id desc limit 1
    ) rr on true
  ), role_agg as materialized (
    select match_id,team_id,opponent_team_id,kickoff_time,count(*) xi_expected,count(*) filter(where feature_vector is not null) role_covered,max(generated_at) player_pred_cutoff,max(role_evidence_cutoff) role_evidence_cutoff,avg(role_conf) filter(where feature_vector is not null) role_conf,
      avg((feature_vector->>'width')::numeric) filter(where feature_vector?'width') xi_width,avg((feature_vector->>'creation')::numeric) filter(where feature_vector?'creation') xi_creation,avg((feature_vector->>'progression')::numeric) filter(where feature_vector?'progression') xi_progression,avg((feature_vector->>'shot_threat')::numeric) filter(where feature_vector?'shot_threat') xi_shot,avg((feature_vector->>'box_occupation')::numeric) filter(where feature_vector?'box_occupation') xi_box,avg((feature_vector->>'defensive_load')::numeric) filter(where feature_vector?'defensive_load') xi_def,avg((feature_vector->>'aerial')::numeric) filter(where feature_vector?'aerial' and position in('MID','FWD')) attacker_aerial,avg((feature_vector->>'aerial')::numeric) filter(where feature_vector?'aerial' and position='DEF') defender_aerial,
      (count(*) filter(where primary_role in('WIDE_BACK','WING_BACK','WIDE_ATTACKER','WIDE_FORWARD')))::numeric/nullif(count(*) filter(where feature_vector is not null),0) wide_role_share,(count(*) filter(where primary_role in('CREATOR_10','BOX_TO_BOX','LINK_FORWARD')))::numeric/nullif(count(*) filter(where feature_vector is not null),0) creator_role_share,
      min(def_n)||'-'||min(mid_n)||'-'||min(fwd_n) fpl_shape
    from xi_roles group by match_id,team_id,opponent_team_id,kickoff_time
  ), replacement_agg as materialized (
    select s.match_id,s.team_id,count(*) target_count,count(distinct r.candidate_player_id) candidate_count,max(r.captured_at) replacement_cutoff,avg(r.confidence) replacement_confidence,max(((r.evidence->>'absence_relevance_proxy')::numeric)*(1-coalesce(r.composite_score,r.role_fit_score))) max_individual_disruption
    from sides s join public.player_replacement_quality_observations r on r.match_id=s.match_id and r.team_id=s.team_id and r.captured_at<s.kickoff_time and r.candidate_rank=1 and r.evidence->>'method'='replacement_proxy_v0.1.1'
    group by s.match_id,s.team_id
  ), base as materialized (
    select s.*,tp.team_evidence_cutoff,tp.team_control,tp.team_directness,tp.team_width,tp.team_set_piece,tp.team_defensive_block,tp.team_confidence,
      op.team_evidence_cutoff opponent_team_evidence_cutoff,op.team_control opponent_control,op.team_defensive_block opponent_defensive_block,op.team_confidence opponent_tactical_confidence,
      r.xi_expected,r.role_covered,r.player_pred_cutoff,r.role_evidence_cutoff,r.role_conf,r.xi_width,r.xi_creation,r.xi_progression,r.xi_shot,r.xi_box,r.xi_def,r.attacker_aerial,r.defender_aerial,r.wide_role_share,r.creator_role_share,r.fpl_shape,
      ro.xi_expected opponent_xi_expected,ro.role_covered opponent_role_covered,ro.role_conf opponent_role_conf,ro.xi_def opponent_xi_def,ro.defender_aerial opponent_defender_aerial,ro.wide_role_share opponent_wide_role_share,
      rep.target_count,rep.candidate_count,rep.replacement_cutoff,rep.replacement_confidence,rep.max_individual_disruption,
      case when r.xi_expected>0 then r.role_covered::numeric/r.xi_expected end role_coverage,case when ro.xi_expected>0 then ro.role_covered::numeric/ro.xi_expected end opponent_role_coverage
    from sides s left join team_profiles tp on tp.match_id=s.match_id and tp.team_id=s.team_id left join team_profiles op on op.match_id=s.match_id and op.team_id=s.opponent_team_id left join role_agg r on r.match_id=s.match_id and r.team_id=s.team_id left join role_agg ro on ro.match_id=s.match_id and ro.team_id=s.opponent_team_id left join replacement_agg rep on rep.match_id=s.match_id and rep.team_id=s.team_id
  ), comp as materialized (
    select b.*,
      private.weighted_mean(array[team_width,xi_width,xi_creation,wide_role_share],array[.38,.22,.20,.20]::numeric[]) wide_attack,
      private.weighted_mean(array[opponent_defensive_block,opponent_xi_def,opponent_wide_role_share],array[.45,.35,.20]::numeric[]) wide_resistance,
      private.weighted_mean(array[team_set_piece,team_width,attacker_aerial],array[.45,.20,.35]::numeric[]) aerial_attack,
      private.weighted_mean(array[opponent_defender_aerial,opponent_xi_def],array[.55,.45]::numeric[]) aerial_resistance,
      private.weighted_mean(array[team_control,xi_creation,xi_progression,creator_role_share],array[.30,.30,.25,.15]::numeric[]) central_attack,
      private.weighted_mean(array[opponent_defensive_block,opponent_xi_def],array[.55,.45]::numeric[]) central_resistance,
      private.weighted_mean(array[team_directness,xi_shot,xi_box,opponent_control,case when opponent_defensive_block is null then null else 1-opponent_defensive_block end],array[.30,.20,.15,.20,.15]::numeric[]) transition_opportunity,
      least(.80,private.weighted_mean(array[team_confidence,opponent_tactical_confidence,role_conf,opponent_role_conf],array[.30,.25,.25,.20]::numeric[])*least(coalesce(role_coverage,1),coalesce(opponent_role_coverage,1))) matchup_confidence,
      private.weighted_mean(array[role_coverage,opponent_role_coverage,case when team_control is null then null else 1::numeric end,case when opponent_control is null then null else 1::numeric end],array[.40,.35,.125,.125]::numeric[]) matchup_coverage,
      case when target_count is null then null else greatest(0::numeric,least(1::numeric,coalesce(max_individual_disruption,0)+.08*greatest(target_count-1,0)+.12*greatest(target_count-candidate_count,0))) end personnel_disruption,
      greatest(team_evidence_cutoff,opponent_team_evidence_cutoff,player_pred_cutoff,role_evidence_cutoff,replacement_cutoff) source_cutoff
    from base b
  ), sig as materialized (
    select c.*,x.signal_key,x.score_type,x.attack_component,x.resistance_component,x.score,
      case when x.score_type='ADVANTAGE' and x.score is null then 'INSUFFICIENT_DATA' when x.score_type='ADVANTAGE' and x.score>=.62 then 'ATTACK_ADVANTAGE' when x.score_type='ADVANTAGE' and x.score>=.55 then 'ATTACK_LEAN' when x.score_type='ADVANTAGE' and x.score<=.38 then 'DEFENSIVE_RESISTANCE' when x.score_type='ADVANTAGE' and x.score<=.45 then 'DEFENSIVE_LEAN' when x.score_type='ADVANTAGE' then 'BALANCED' when x.score_type='OPPORTUNITY' and x.score is null then 'INSUFFICIENT_DATA' when x.score_type='OPPORTUNITY' and x.score>=.62 then 'TRANSITION_OPPORTUNITY' when x.score_type='OPPORTUNITY' and x.score<=.38 then 'LOW_TRANSITION_OPPORTUNITY' when x.score_type='OPPORTUNITY' then 'MODERATE_TRANSITION_OPPORTUNITY' when x.score_type='DISRUPTION' and target_count is null then 'NO_PREMATCH_AVAILABILITY_CAPTURE' when x.score>=.35 then 'MATERIAL_DISRUPTION' when x.score>=.18 then 'MODERATE_DISRUPTION' else 'LOW_DISRUPTION' end direction,
      case when x.score_type='DISRUPTION' then least(.75,coalesce(replacement_confidence,.35)) else matchup_confidence end signal_confidence
    from comp c cross join lateral (values
      ('wide_channel_pressure','ADVANTAGE',c.wide_attack,c.wide_resistance,case when c.wide_attack is null or c.wide_resistance is null then null else greatest(0::numeric,least(1::numeric,.5+.5*(c.wide_attack-c.wide_resistance))) end),
      ('aerial_set_piece_mismatch','ADVANTAGE',c.aerial_attack,c.aerial_resistance,case when c.aerial_attack is null or c.aerial_resistance is null then null else greatest(0::numeric,least(1::numeric,.5+.5*(c.aerial_attack-c.aerial_resistance))) end),
      ('central_creation_vs_block','ADVANTAGE',c.central_attack,c.central_resistance,case when c.central_attack is null or c.central_resistance is null then null else greatest(0::numeric,least(1::numeric,.5+.5*(c.central_attack-c.central_resistance))) end),
      ('direct_transition_opportunity','OPPORTUNITY',c.transition_opportunity,c.opponent_defensive_block,c.transition_opportunity),
      ('personnel_disruption','DISRUPTION',null,null,c.personnel_disruption)
    ) x(signal_key,score_type,attack_component,resistance_component,score)
  ), ins as (
    insert into public.blind_fixture_replay_signals(run_id,match_id,gameweek,team_id,opponent_team_id,kickoff_time,signal_key,score_type,score,direction,attacking_component,resistance_component,confidence,data_coverage,evidence_cutoff,evidence,observation_hash,actual_data_used,forward_valid,model_effect_enabled)
    select v_run_id,match_id,gameweek,team_id,opponent_team_id,kickoff_time,signal_key,score_type,round(score,4),direction,round(attack_component,4),round(resistance_component,4),round(signal_confidence,4),round(matchup_coverage,4),source_cutoff,
      jsonb_build_object('method','blind_fixture_tactical_matchup_v0.1','research_type','RETROSPECTIVE_BLIND_REPLAY','forward_valid',false,'team_style_source','pre-kickoff friendlies only','expected_xi_method','latest pre-kickoff player predictions + FPL-valid shape proxy','fpl_shape',fpl_shape,'role_profile_rule','event_role_v0.2.1 with competitive_minutes=0 only','role_coverage',role_coverage,'opponent_role_coverage',opponent_role_coverage,'personnel_rule','only genuinely captured pre-kickoff replacement observations','no_current_gameweek_results_used',true,'actual_scores_used',false,'missing_components_ignored_not_zero',true,'limitations',jsonb_build_array('retrospective construction after outcomes','not forward-valid','no left/right flank assignment','no defensive pressing intensity','no defensive line height','personnel unavailable without genuine pre-match capture')),
      md5(v_run_id::text||'|'||match_id::text||'|'||team_id::text||'|'||signal_key),false,false,false
    from sig returning 1
  ) select count(*) into v_signals from ins;

  update public.blind_fixture_replay_matches m set evidence_cutoff=q.cutoff,evidence=m.evidence||jsonb_build_object('context_signal_count',q.n,'context_replay_available',q.n>0)
  from (select run_id,match_id,max(evidence_cutoff) cutoff,count(*) n from public.blind_fixture_replay_signals where run_id=v_run_id group by run_id,match_id) q
  where m.run_id=q.run_id and m.match_id=q.match_id;

  return jsonb_build_object('ok',true,'run_id',v_run_id,'gameweek',p_gameweek,'existing',false,'match_rows',v_matches,'signal_rows',v_signals,'actual_data_used',false,'forward_valid',false,'model_effect_enabled',false);
end $function$;

create or replace function public.evaluate_blind_gw_replay_v01(p_run_id bigint)
returns jsonb
language plpgsql
set search_path=public,private,pg_temp
as $function$
declare v_n integer:=0;
begin
  with src as materialized (
    select r.id replay_match_id,r.run_id,r.match_id,r.top_scoreline,r.score_matrix,r.markets,r.home_lambda,r.away_lambda,m.home_score,m.away_score,
      case when m.home_score>m.away_score then 'HOME' when m.home_score<m.away_score then 'AWAY' else 'DRAW' end actual_outcome,
      case when r.markets is null then null when greatest(coalesce((r.markets->>'home_win')::numeric,-1),coalesce((r.markets->>'draw')::numeric,-1),coalesce((r.markets->>'away_win')::numeric,-1))=coalesce((r.markets->>'home_win')::numeric,-1) then 'HOME' when greatest(coalesce((r.markets->>'home_win')::numeric,-1),coalesce((r.markets->>'draw')::numeric,-1),coalesce((r.markets->>'away_win')::numeric,-1))=coalesce((r.markets->>'draw')::numeric,-1) then 'DRAW' else 'AWAY' end predicted_outcome
    from public.blind_fixture_replay_matches r join public.matches m on m.id=r.match_id
    where r.run_id=p_run_id and m.finished=true and m.home_score is not null and m.away_score is not null
  ), calc as materialized (
    select s.*,(s.home_score::text||'-'||s.away_score::text) actual_score,
      case s.predicted_outcome when 'HOME' then (s.markets->>'home_win')::numeric when 'DRAW' then (s.markets->>'draw')::numeric when 'AWAY' then (s.markets->>'away_win')::numeric end predicted_outcome_probability,
      nullif(s.score_matrix->>(s.home_score::text||'-'||s.away_score::text),'')::numeric actual_score_probability,
      coalesce((s.markets->>'home_win')::numeric,0) ph,coalesce((s.markets->>'draw')::numeric,0) pd,coalesce((s.markets->>'away_win')::numeric,0) pa
    from src s
  ), ins as (
    insert into public.blind_fixture_replay_evaluations(run_id,match_id,actual_home_score,actual_away_score,actual_outcome,predicted_outcome,predicted_outcome_probability,predicted_outcome_hit,top_scoreline,top_scoreline_hit,actual_score_probability,actual_score_log_loss,home_goal_error,away_goal_error,total_goal_error,brier_1x2,evaluation,model_effect_enabled)
    select run_id,match_id,home_score,away_score,actual_outcome,predicted_outcome,predicted_outcome_probability,(predicted_outcome=actual_outcome),top_scoreline,(top_scoreline=actual_score),actual_score_probability,case when actual_score_probability>0 then -ln(actual_score_probability) end,case when home_lambda is not null then home_score-home_lambda end,case when away_lambda is not null then away_score-away_lambda end,case when home_lambda is not null and away_lambda is not null then (home_score+away_score)-(home_lambda+away_lambda) end,
      case when markets is null then null else power(ph-(case when actual_outcome='HOME' then 1 else 0 end),2)+power(pd-(case when actual_outcome='DRAW' then 1 else 0 end),2)+power(pa-(case when actual_outcome='AWAY' then 1 else 0 end),2) end,
      jsonb_build_object('actual_score',actual_score,'base_prediction_available',score_matrix is not null,'evaluation_uses_actuals_only_after_replay_generation',true),false
    from calc
    on conflict(run_id,match_id) do update set evaluated_at=clock_timestamp(),actual_home_score=excluded.actual_home_score,actual_away_score=excluded.actual_away_score,actual_outcome=excluded.actual_outcome,predicted_outcome=excluded.predicted_outcome,predicted_outcome_probability=excluded.predicted_outcome_probability,predicted_outcome_hit=excluded.predicted_outcome_hit,top_scoreline=excluded.top_scoreline,top_scoreline_hit=excluded.top_scoreline_hit,actual_score_probability=excluded.actual_score_probability,actual_score_log_loss=excluded.actual_score_log_loss,home_goal_error=excluded.home_goal_error,away_goal_error=excluded.away_goal_error,total_goal_error=excluded.total_goal_error,brier_1x2=excluded.brier_1x2,evaluation=excluded.evaluation
    returning 1
  ) select count(*) into v_n from ins;
  return jsonb_build_object('ok',true,'run_id',p_run_id,'evaluated_matches',v_n,'model_effect_enabled',false);
end $function$;
