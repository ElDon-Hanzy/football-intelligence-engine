-- C0272 — post-audit consolidation, shadow portfolio cleanup and final-promotion hardening.
-- Production was applied first and independently verified; this migration reconciles source control.
-- No historical forecast rewrite. No new numeric player/fixture xPts adjustment.

-- A0005: retire scheduled forward experiment after no stable OOS edge.
DO $$
DECLARE v_job bigint;
BEGIN
  FOR v_job IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('football_intelligence_a0005_near_close','football_intelligence_a0005_evaluator')
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;
END $$;

UPDATE private.c0213_component_overrides
SET lifecycle='RETIRED',
    canonical_status='REJECTED',
    active_override=false,
    production_effect_enabled=false,
    rationale='Retired after forward evaluation failed to demonstrate a stable out-of-sample edge. Frozen evidence retained for audit; no further scheduled execution.',
    evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'c0272_decision','KILL',
      'reason','NO_STABLE_OUT_OF_SAMPLE_EDGE',
      'frozen_evidence_retained',true,
      'scheduled_execution_disabled',true
    ),
    updated_at=clock_timestamp()
WHERE change_id='A0005';

-- C0120: retire predictive-promotion hypothesis while preserving C0236 market/cache infrastructure.
UPDATE private.c0213_external_components
SET lifecycle='RETIRED',
    canonical_status='REJECTED',
    active=false,
    production_effect_enabled=false,
    notes='C0272: predictive-promotion hypothesis rejected after persistent non-positive/near-zero CLV evidence. Historical research utility may remain deployed but is not an active architecture component. C0236 price/cache infrastructure is unaffected.',
    evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'c0272_decision','KILL_PREDICTIVE_PROMOTION',
      'price_cache_retained',true,
      'numeric_production_effect',false
    ),
    updated_at=clock_timestamp()
WHERE component_key='EDGE_FUNCTION:c0120-historical-correct-score';

-- C0197: one final prospective shootout/regime window. No new captures after GW6.
CREATE OR REPLACE FUNCTION private.c0197_capture_next_shootout_forward_v01()
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
declare
  v_gw integer;
  v_cap jsonb;
  v_market jsonb;
  v_eval_gw integer;
  v_evaluated jsonb := '[]'::jsonb;
begin
  for v_eval_gw in
    select distinct s.gameweek
    from public.research_c0197_shootout_forward_snapshots s
    where s.run_key='C0197_SHOOTOUT_FORWARD_20260904_V01'
      and not exists (
        select 1
        from public.matches m
        join public.research_c0197_shootout_forward_snapshots sx
          on sx.match_id=m.id and sx.run_key=s.run_key and sx.gameweek=s.gameweek
        where sx.gameweek=s.gameweek and not m.finished
      )
  loop
    v_evaluated := v_evaluated || jsonb_build_array(private.c0197_evaluate_shootout_forward_v01(v_eval_gw));
  end loop;

  select min(gameweek) into v_gw
  from public.matches
  where gameweek is not null and not finished and kickoff_time>clock_timestamp();

  if v_gw is null then
    return jsonb_build_object(
      'state','NO_FUTURE_GAMEWEEK',
      'evaluations',v_evaluated,
      'hard_expiry_gameweek',6,
      'model_effect_enabled',false
    );
  end if;

  if v_gw > 6 then
    return jsonb_build_object(
      'state','HARD_EXPIRY_REACHED',
      'next_gameweek',v_gw,
      'hard_expiry_gameweek',6,
      'evaluations',v_evaluated,
      'new_capture_permitted',false,
      'model_effect_enabled',false
    );
  end if;

  v_cap := private.c0197_capture_shootout_forward_v01(v_gw,clock_timestamp());
  v_market := private.c0197_capture_shootout_market_checks_v01(v_gw);

  return jsonb_build_object(
    'state','OK',
    'gameweek',v_gw,
    'capture',v_cap,
    'market_checks',v_market,
    'evaluations',v_evaluated,
    'hard_expiry_gameweek',6,
    'model_effect_enabled',false
  );
end
$function$;

UPDATE private.c0213_component_overrides
SET rationale=CASE
      WHEN object_name='c0197_capture_next_shootout_forward_v01'
        THEN 'C0272: one final prospective C0197 shootout/regime window through GW6 only; hard expiry embedded in capture entrypoint.'
      ELSE rationale
    END,
    evidence=coalesce(evidence,'{}'::jsonb) || jsonb_build_object(
      'c0272_decision','CONTINUE_ONE_FINAL_PROSPECTIVE_WINDOW',
      'hard_expiry_gameweek',6,
      'numeric_production_effect',false
    ),
    updated_at=clock_timestamp()
WHERE change_id='C0197'
  AND object_name IN ('c0197_capture_next_shootout_forward_v01','c0197_capture_shootout_forward_v01','c0197_evaluate_shootout_forward_v01');

-- C0202: promote only the validated HIGH-confidence categorical side state as factual role metadata.
-- It does not alter primary_role, role score, xMins, lambda or xPts.
CREATE OR REPLACE FUNCTION public.refresh_player_fixture_role_snapshots(p_gameweek integer DEFAULT NULL::integer)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  n integer:=0;
  v_now timestamptz:=clock_timestamp();
  v_gw integer:=p_gameweek;
begin
  if v_gw is null then
    select m.gameweek into v_gw
    from public.matches m
    where m.source='fpl' and m.gameweek is not null and m.kickoff_time>v_now
    order by m.kickoff_time
    limit 1;
  end if;

  if v_gw is null then
    return jsonb_build_object(
      'ok',true,'gameweek',null,'inserted',0,
      'bridge_version','c0272_side_state_v01',
      'attack_side_numeric_xpts_effect',false
    );
  end if;

  with future as materialized (
    select m.id,m.gameweek,m.kickoff_time
    from public.matches m
    where m.source='fpl' and m.gameweek=v_gw and m.kickoff_time>v_now
  ),
  src as materialized (
    select
      a.id availability_observation_id,
      a.match_id,a.team_id,a.opponent_team_id,a.player_id,a.expected_xi,a.availability_status,
      a.confidence availability_confidence,
      f.kickoff_time fixture_kickoff,
      rp.id quantitative_profile_observation_id,
      bp.observed_at quantitative_profile_observed_at,
      bp.taxonomy_version quantitative_profile_taxonomy_version,
      rp.observed_at overlay_observed_at,
      rp.taxonomy_version overlay_taxonomy_version,
      rp.primary_role,rp.secondary_role,rp.primary_score,rp.secondary_score,rp.confidence role_conf,
      rp.observation_hash overlay_profile_hash,
      rp.evidence overlay_evidence,
      sp.inferred_attack_side attack_side,
      sp.confidence_band attack_side_confidence,
      sp.empirical_holdout_accuracy attack_side_holdout_accuracy,
      sp.inference_method attack_side_inference_method
    from public.current_player_fixture_availability a
    join future f on f.id=a.match_id
    left join public.current_player_role_profiles rp
      on rp.player_id=a.player_id and rp.evidence_cutoff<f.kickoff_time
    left join public.player_role_profile_observations bp
      on bp.id=rp.id
    left join private.c0202_current_side_prior_v01() sp
      on sp.player_id=a.player_id and sp.confidence_band='HIGH'
  ),
  ins as (
    insert into public.player_fixture_role_observations(
      match_id,gameweek,team_id,opponent_team_id,player_id,kickoff_time,captured_at,
      profile_observed_at,taxonomy_version,primary_role,secondary_role,primary_score,secondary_score,
      expected_xi,availability_status,confidence,evidence,observation_hash,model_effect_enabled
    )
    select
      match_id,v_gw,team_id,opponent_team_id,player_id,fixture_kickoff,v_now,
      quantitative_profile_observed_at,
      coalesce(quantitative_profile_taxonomy_version,'event_role_v0.1'),
      primary_role,secondary_role,primary_score,secondary_score,expected_xi,availability_status,
      case when role_conf is null then null else least(role_conf,coalesce(availability_confidence,1)) end,
      jsonb_build_object(
        'role_profile_status',case when overlay_profile_hash is null then 'NO_EVENT_PROFILE' else 'AVAILABLE' end,
        'availability_observation_id',availability_observation_id,
        'role_profile_hash',overlay_profile_hash,
        'quantitative_role_profile_observation_id',quantitative_profile_observation_id,
        'quantitative_role_profile_observed_at',quantitative_profile_observed_at,
        'quantitative_role_profile_taxonomy_version',quantitative_profile_taxonomy_version,
        'role_overlay_taxonomy_version',overlay_taxonomy_version,
        'role_overlay_observed_at',overlay_observed_at,
        'realized_role_applied',coalesce(overlay_taxonomy_version like '%+realized_v0.1',false),
        'role_semantics',case
          when coalesce(overlay_taxonomy_version like '%+realized_v0.1',false)
            then 'REALIZED_TACTICAL_ROLE_WITH_BASE_QUANT_PROFILE'
          else 'ARCHETYPE_PROFILE'
        end,
        'role_is_archetype_not_exact_tactical_position',
          not coalesce(overlay_taxonomy_version like '%+realized_v0.1',false),
        'realized_role_source',overlay_evidence->>'realized_role_source',
        'realized_role_known_at',overlay_evidence->>'realized_role_known_at',
        'attack_side_inference',attack_side,
        'attack_side_confidence',attack_side_confidence,
        'attack_side_holdout_accuracy',attack_side_holdout_accuracy,
        'attack_side_inference_method',attack_side_inference_method,
        'attack_side_state_promoted',attack_side is not null,
        'attack_side_numeric_xpts_effect',false,
        'numeric_role_uplift_enabled',false,
        'consumer_bridge_version','c0272_side_state_v01',
        'model_effect_enabled',false
      ),
      md5(jsonb_build_object(
        'match_id',match_id,
        'player_id',player_id,
        'availability_id',availability_observation_id,
        'overlay_profile_hash',overlay_profile_hash,
        'quantitative_profile_observation_id',quantitative_profile_observation_id,
        'quantitative_profile_taxonomy_version',quantitative_profile_taxonomy_version,
        'overlay_taxonomy_version',overlay_taxonomy_version,
        'expected_xi',expected_xi,
        'availability',availability_status,
        'attack_side_inference',attack_side,
        'attack_side_confidence',attack_side_confidence,
        'attack_side_inference_method',attack_side_inference_method,
        'consumer_bridge_version','c0272_side_state_v01'
      )::text),
      false
    from src
    on conflict(match_id,player_id,observation_hash) do nothing
    returning 1
  )
  select count(*) into n from ins;

  return jsonb_build_object(
    'ok',true,
    'gameweek',v_gw,
    'inserted',n,
    'bridge_version','c0272_side_state_v01',
    'attack_side_state_scope','HIGH_CONFIDENCE_ONLY',
    'attack_side_numeric_xpts_effect',false,
    'numeric_role_uplift_enabled',false,
    'model_effect_enabled',false
  );
end
$function$;

-- C0230: team-regime remains a useful shadow advisory, but an unvalidated shadow cannot block publication.
CREATE OR REPLACE FUNCTION private.c0237_publish_current_fpl_plan_pre_c0248_v01(
  p_gameweek integer,
  p_horizon integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private'
AS $function$
declare
  v_uncertainty jsonb;
  v_regime_id bigint;
  v_adv record;
  v_core jsonb;
  v_core_id bigint;
  v_core_row public.fpl_live_plan_publications%rowtype;
  v_consistency jsonb;
  v_pub_status text;
  v_survivor jsonb;
  v_gw_plan jsonb;
  v_bench jsonb:='[]'::jsonb;
  v_plan jsonb;
  v_signature text;
  v_id bigint;
begin
  v_uncertainty:=private.c0227_uncertainty_status_v01(p_gameweek);
  v_consistency:=private.c0242_consistency_status_v01(p_gameweek,p_horizon);

  select id into v_regime_id
  from public.fpl_team_regime_diagnostic_runs
  where gameweek=p_gameweek
  order by captured_at desc,id desc
  limit 1;

  select id,stability_status,result,ensemble_run_id,structural_run_id,forward_run_id,
         or_utility_run_id,red_team_run_id,manager_state_id
    into v_adv
  from public.fpl_final_adversarial_runs
  where gameweek=p_gameweek and horizon=p_horizon
  order by captured_at desc,id desc
  limit 1;

  if not coalesce((v_uncertainty->>'ok')::boolean,false)
     or coalesce((v_uncertainty->>'rows')::integer,0)=0
     or v_adv.id is null
     or not coalesce((v_consistency->>'ok')::boolean,false) then
    return jsonb_build_object(
      'ok',false,
      'status','PUBLICATION_NOT_READY',
      'gameweek',p_gameweek,
      'reason','REQUIRED_DECISION_LAYERS_NOT_READY',
      'uncertainty',v_uncertainty,
      'team_regime_run_id',v_regime_id,
      'team_regime_advisory_only',true,
      'c0240_run_id',v_adv.id,
      'c0242',v_consistency,
      'historical_forecasts_rewritten',false
    );
  end if;

  v_core:=private.c0237_publish_current_fpl_plan_core_v01(p_gameweek,p_horizon);
  if not coalesce((v_core->>'ok')::boolean,false) then return v_core; end if;

  v_core_id:=(v_core->>'publication_id')::bigint;
  select * into v_core_row from public.fpl_live_plan_publications where id=v_core_id;

  if coalesce((v_core_row.layer_lineage->'ensemble'->>'run_id')::bigint,0)<>coalesce(v_adv.ensemble_run_id,0)
     or coalesce((v_core_row.layer_lineage->'structural'->>'run_id')::bigint,0)<>coalesce(v_adv.structural_run_id,0)
     or coalesce((v_core_row.layer_lineage->'forward_management'->>'run_id')::bigint,0)<>coalesce(v_adv.forward_run_id,0)
     or coalesce((v_core_row.layer_lineage->'or_utility'->>'run_id')::bigint,0)<>coalesce(v_adv.or_utility_run_id,0)
     or coalesce((v_core_row.layer_lineage->'red_team'->>'run_id')::bigint,0)<>coalesce(v_adv.red_team_run_id,0)
     or coalesce(v_core_row.manager_state_id,0)<>coalesce(v_adv.manager_state_id,0) then
    return jsonb_build_object('ok',false,'status','PUBLICATION_NOT_READY','reason','C0240_LINEAGE_MISMATCH','c0240_run_id',v_adv.id,'historical_forecasts_rewritten',false);
  end if;

  if coalesce((v_adv.result->>'current_prediction_run_id')::bigint,0)<>coalesce(v_core_row.prediction_run_id,0) then
    return jsonb_build_object('ok',false,'status','PUBLICATION_NOT_READY','reason','C0240_PREDICTION_LINEAGE_MISMATCH','c0240_run_id',v_adv.id,'c0240_prediction_run_id',v_adv.result->>'current_prediction_run_id','publication_prediction_run_id',v_core_row.prediction_run_id,'historical_forecasts_rewritten',false);
  end if;

  v_survivor:=v_adv.result->'survivor';
  if v_survivor is null or jsonb_array_length(coalesce(v_survivor->'squad','[]'::jsonb))<>15 then
    return jsonb_build_object('ok',false,'status','PUBLICATION_NOT_READY','reason','C0240_SURVIVOR_INVALID');
  end if;

  select g into v_gw_plan
  from jsonb_array_elements(coalesce(v_survivor->'gameweeks','[]'::jsonb)) g
  where (g->>'gameweek')::integer=p_gameweek
  limit 1;

  if v_gw_plan is null then
    return jsonb_build_object('ok',false,'status','PUBLICATION_NOT_READY','reason','C0240_CURRENT_GW_PLAN_MISSING');
  end if;

  select coalesce(jsonb_agg(x.player_id order by x.is_gkp desc,x.expected_points desc nulls last,x.player_id),'[]'::jsonb)
    into v_bench
  from (
    select (s->>'player_id')::integer player_id,
           case when s->>'position'='GKP' then 1 else 0 end is_gkp,
           mp.expected_points
    from jsonb_array_elements(v_survivor->'squad') s
    left join public.model_predictions mp
      on mp.prediction_run_id=v_core_row.prediction_run_id
     and mp.player_id=(s->>'player_id')::integer
    where not ((s->>'player_id')::integer=any(array(select jsonb_array_elements_text(v_gw_plan->'starting_xi')::integer)))
  ) x;

  v_pub_status:=case when coalesce((v_consistency->>'decision_consistency_ready')::boolean,false)
                     then v_core_row.publication_status else 'CONTESTED' end;

  v_plan:=v_core_row.plan||jsonb_build_object(
    'source','C0237_ALWAYS_LIVE_PLAN_V05_C0242_CONSISTENCY',
    'selection_policy','C0240_SURVIVOR_WITH_C0242_NAMED_CHALLENGER_AND_CAPTAINCY_EQUIVALENCE; FINAL_AUTHORITY_REMAINS_C0234',
    'status',v_pub_status,
    'scenario',v_survivor->>'scenario','horizon',p_horizon,
    'transfers',coalesce(v_survivor->'transfers','[]'::jsonb),
    'captain_player_id',(v_gw_plan->>'captain_player_id')::integer,
    'vice_player_id',(v_gw_plan->>'vice_player_id')::integer,
    'starting_xi',v_gw_plan->'starting_xi','bench_order',v_bench,
    'gw_expected_xi_points',(v_gw_plan->>'xi_expected_points')::numeric,
    'captain_extra_expected_points',(v_gw_plan->>'captain_extra_expected_points')::numeric,
    'expected_gain_horizon',coalesce((v_survivor->>'objective_gain_vs_roll')::numeric,(v_survivor->>'objective')::numeric-(v_adv.result->'provisional_baseline'->>'roll_objective')::numeric),
    'objective',(v_survivor->>'objective')::numeric,'itb_tenths',(v_survivor->>'itb_tenths')::integer,
    'strategic',v_survivor->'strategic','squad',v_survivor->'squad','c0240_run_id',v_adv.id,'c0240_status',v_adv.stability_status,
    'captaincy_decision_class',v_consistency->'captaincy'->>'decision_class',
    'captaincy_nominal_mean_leader',v_consistency->'captaincy'->'nominal_mean_leader',
    'captaincy_tail_leader',v_consistency->'captaincy'->'tail_leader',
    'captaincy_floor_leader',v_consistency->'captaincy'->'floor_leader',
    'captaincy_equivalent_candidates',v_consistency->'captaincy'->'equivalent_candidates',
    'named_challengers',v_consistency->'named_challengers'
  );

  v_signature:=md5(v_core_row.input_signature||'|C0237_V05|C0227='||v_uncertainty::text||'|C0230_ADVISORY='||coalesce(v_regime_id::text,'NONE')||'|C0240='||v_adv.id::text||':'||v_adv.stability_status||':'||coalesce(v_survivor->>'objective','')||'|C0242='||v_consistency::text);

  insert into public.fpl_live_plan_publications(
    gameweek,horizon,publication_stage,publication_status,final_status,execution_authorized,prediction_run_id,
    manager_state_id,optimizer_run_id,autonomous_gate_run_id,plan,alternatives,research_inputs,blockers,freshness,
    layer_lineage,input_signature,source,historical_forecasts_rewritten
  )
  values(
    v_core_row.gameweek,v_core_row.horizon,v_core_row.publication_stage,v_pub_status,v_core_row.final_status,
    v_core_row.execution_authorized,v_core_row.prediction_run_id,v_core_row.manager_state_id,v_core_row.optimizer_run_id,
    v_core_row.autonomous_gate_run_id,v_plan,v_core_row.alternatives,v_core_row.research_inputs,
    v_core_row.blockers||jsonb_build_object(
      'c0240_status',v_adv.stability_status,
      'c0240_blockers',coalesce(v_adv.result->'blockers','[]'::jsonb),
      'c0242_decision_consistency_ready',v_consistency->'decision_consistency_ready',
      'c0242_named_challengers',v_consistency->'named_challengers',
      'captaincy_decision_class',v_consistency->'captaincy'->>'decision_class',
      'c0230_team_regime_advisory_only',true,
      'c0230_team_regime_run_id',v_regime_id
    ),
    v_core_row.freshness,
    v_core_row.layer_lineage||jsonb_build_object(
      'uncertainty',jsonb_build_object('change_id','C0227','status',v_uncertainty,'required_for_publication',true),
      'final_adversarial',jsonb_build_object('change_id','C0240','run_id',v_adv.id,'status',v_adv.stability_status,'prediction_run_id',v_adv.result->>'current_prediction_run_id','coverage',v_adv.result->'coverage','required_for_publication',true,'required_for_final',true),
      'decision_consistency',jsonb_build_object('change_id','C0242','status',v_consistency,'required_for_publication',true,'required_for_final',true),
      'shadow_team_regime_required_for_publication',false,
      'shadow_team_regime_advisory',jsonb_build_object('change_id','C0230','run_id',v_regime_id,'blocking',false,'numeric_projection_effect',false),
      'publication_contract','C0230_ADVISORY_ONLY; C0227_C0240_C0242_REQUIRED'
    ),
    v_signature,'C0237_ALWAYS_LIVE_PLAN_V05',false
  )
  on conflict(input_signature) do nothing
  returning id into v_id;

  if v_id is null then select id into v_id from public.fpl_live_plan_publications where input_signature=v_signature; end if;

  return jsonb_build_object(
    'ok',true,'publication_id',v_id,'gameweek',p_gameweek,'publication_stage',v_core_row.publication_stage,
    'publication_status',v_pub_status,'execution_authorized',v_core_row.execution_authorized,'final_status',v_core_row.final_status,
    'all_required_layers_evaluated',true,'c0240_survivor_rendered',true,'c0242_consistency_rendered',true,
    'captaincy_decision_class',v_consistency->'captaincy'->>'decision_class','uncertainty',v_uncertainty,
    'team_regime_run_id',v_regime_id,'team_regime_advisory_only',true,'c0240_run_id',v_adv.id,
    'c0240_status',v_adv.stability_status,'c0242',v_consistency,'shadow_numeric_production_effect',false,
    'historical_forecasts_rewritten',false
  );
end
$function$;

-- C0248 final-window control-plane watcher. It never executes a transfer or weakens promotion/gate criteria.
CREATE OR REPLACE FUNCTION private.c0272_final_promotion_watch_v01(
  p_gameweek integer DEFAULT NULL::integer,
  p_horizon integer DEFAULT 5,
  p_execute boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'private', 'vault', 'net', 'pg_temp'
AS $function$
declare
  v_now timestamptz:=clock_timestamp();
  v_gw integer:=p_gameweek;
  v_deadline timestamptz;
  v_threshold timestamptz;
  v_pred_id bigint;
  v_pred_at timestamptz;
  v_candidate public.fpl_sequential_planner_runs%rowtype;
  v_peer public.fpl_sequential_planner_runs%rowtype;
  v_prod public.fpl_sequential_planner_runs%rowtype;
  v_gate public.fpl_autonomous_gate_runs%rowtype;
  v_beam integer;
  v_peer_beam integer;
  v_req bigint;
  v_prom jsonb;
  v_pub jsonb;
begin
  if p_horizon < 1 or p_horizon > 5 then return jsonb_build_object('ok',false,'status','INVALID_HORIZON','horizon',p_horizon); end if;

  if v_gw is null then
    select r.gameweek,r.deadline_at into v_gw,v_deadline
    from public.gameweek_prediction_runs r
    where r.deadline_at>v_now
    order by r.deadline_at asc,r.gameweek asc
    limit 1;
  else
    select r.deadline_at into v_deadline
    from public.gameweek_prediction_runs r
    where r.gameweek=v_gw
    order by r.generated_at desc,r.id desc
    limit 1;
  end if;

  if v_gw is null or v_deadline is null then return jsonb_build_object('ok',true,'status','NO_UPCOMING_GAMEWEEK','executed',false); end if;
  v_threshold:=v_deadline-interval '2 hours';

  if v_now < v_threshold then
    return jsonb_build_object('ok',true,'status','OUTSIDE_FINAL_WINDOW','gameweek',v_gw,'deadline_at',v_deadline,'final_refresh_threshold',v_threshold,'executed',false);
  end if;
  if v_now >= v_deadline then
    return jsonb_build_object('ok',true,'status','DEADLINE_CLOSED','gameweek',v_gw,'deadline_at',v_deadline,'executed',false);
  end if;

  select r.id,r.generated_at into v_pred_id,v_pred_at
  from public.gameweek_prediction_runs r
  where r.gameweek=v_gw
  order by r.generated_at desc,r.id desc
  limit 1;

  if v_pred_id is null or v_pred_at < v_threshold then
    return jsonb_build_object('ok',true,'status','WAITING_FOR_FINAL_T_MINUS_2_PROJECTION','gameweek',v_gw,'deadline_at',v_deadline,'final_refresh_threshold',v_threshold,'latest_prediction_run_id',v_pred_id,'latest_prediction_at',v_pred_at,'executed',false);
  end if;

  select * into v_candidate
  from public.fpl_sequential_planner_runs
  where gameweek=v_gw and horizon=p_horizon
    and planner_version='C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE'
    and prediction_run_ids[1]=v_pred_id
  order by captured_at desc,id desc
  limit 1;

  if v_candidate.id is null then
    if not p_execute then return jsonb_build_object('ok',true,'status','NEEDS_PRIMARY_BEAM','gameweek',v_gw,'prediction_run_id',v_pred_id,'requested_beam',6,'executed',false); end if;
    v_req:=private.invoke_engine_ingest('fpl-sequential-planner',jsonb_build_object('gameweek',v_gw,'horizon',p_horizon,'branch_beam_width',6));
    return jsonb_build_object('ok',true,'status','PRIMARY_BEAM_REQUESTED','gameweek',v_gw,'prediction_run_id',v_pred_id,'requested_beam',6,'request_id',v_req,'executed',true);
  end if;

  v_beam:=coalesce((v_candidate.search_config->>'branch_beam_width')::integer,8);
  v_peer_beam:=case when v_beam=6 then 8 else 6 end;

  select * into v_peer
  from public.fpl_sequential_planner_runs
  where gameweek=v_gw and horizon=p_horizon
    and planner_version='C0248_SEQUENTIAL_PLANNER_V06_CUTOVER_CANDIDATE'
    and id<>v_candidate.id
    and manager_state_id=v_candidate.manager_state_id
    and prediction_run_ids=v_candidate.prediction_run_ids
    and coalesce((search_config->>'branch_beam_width')::integer,-1)=v_peer_beam
  order by captured_at desc,id desc
  limit 1;

  if v_peer.id is null then
    if not p_execute then return jsonb_build_object('ok',true,'status','NEEDS_CROSS_BEAM_PEER','gameweek',v_gw,'candidate_run_id',v_candidate.id,'candidate_beam',v_beam,'requested_beam',v_peer_beam,'prediction_run_id',v_pred_id,'executed',false); end if;
    v_req:=private.invoke_engine_ingest('fpl-sequential-planner',jsonb_build_object('gameweek',v_gw,'horizon',p_horizon,'branch_beam_width',v_peer_beam));
    return jsonb_build_object('ok',true,'status','CROSS_BEAM_PEER_REQUESTED','gameweek',v_gw,'candidate_run_id',v_candidate.id,'candidate_beam',v_beam,'requested_beam',v_peer_beam,'prediction_run_id',v_pred_id,'request_id',v_req,'executed',true);
  end if;

  select * into v_prod
  from public.fpl_sequential_planner_runs
  where gameweek=v_gw and horizon=p_horizon
    and planner_version='C0248_SEQUENTIAL_PLANNER_V06_PRODUCTION_SELECTED'
    and production_selected and not shadow_only
    and manager_state_id=v_candidate.manager_state_id
    and prediction_run_ids=v_candidate.prediction_run_ids
  order by captured_at desc,id desc
  limit 1;

  if v_prod.id is null then
    if not p_execute then return jsonb_build_object('ok',true,'status','READY_FOR_PROMOTION','gameweek',v_gw,'candidate_run_id',v_candidate.id,'peer_run_id',v_peer.id,'prediction_run_id',v_pred_id,'executed',false); end if;
    v_prom:=private.c0248_promote_verified_candidate_v01(v_gw,p_horizon);
    if not coalesce((v_prom->>'ok')::boolean,false) then
      return jsonb_build_object('ok',false,'status','PROMOTION_FAILED','gameweek',v_gw,'candidate_run_id',v_candidate.id,'peer_run_id',v_peer.id,'promotion',v_prom,'executed',true);
    end if;
    select * into v_prod from public.fpl_sequential_planner_runs where id=(v_prom->>'production_run_id')::bigint;
    v_req:=private.invoke_engine_ingest('fpl-autonomous-gate',jsonb_build_object('gameweek',v_gw,'horizon',p_horizon));
    return jsonb_build_object('ok',true,'status','PROMOTED_AND_GATE_REQUESTED','gameweek',v_gw,'prediction_run_id',v_pred_id,'promotion',v_prom,'production_run_id',v_prod.id,'gate_request_id',v_req,'executed',true);
  end if;

  select * into v_gate
  from public.fpl_autonomous_gate_runs
  where gameweek=v_gw and horizon=p_horizon
  order by captured_at desc,id desc
  limit 1;

  if v_gate.id is null
     or v_gate.captured_at < v_prod.captured_at
     or coalesce((v_gate.result->'decision_context'->>'c0248_planner_run_id')::bigint,0)<>v_prod.id then
    if not p_execute then return jsonb_build_object('ok',true,'status','PRODUCTION_SELECTED_GATE_STALE','gameweek',v_gw,'production_run_id',v_prod.id,'latest_gate_run_id',v_gate.id,'executed',false); end if;
    v_req:=private.invoke_engine_ingest('fpl-autonomous-gate',jsonb_build_object('gameweek',v_gw,'horizon',p_horizon));
    return jsonb_build_object('ok',true,'status','GATE_REFRESH_REQUESTED','gameweek',v_gw,'production_run_id',v_prod.id,'request_id',v_req,'executed',true);
  end if;

  if not p_execute then
    return jsonb_build_object('ok',true,'status','READY_TO_PUBLISH_GATE_STATE','gameweek',v_gw,'production_run_id',v_prod.id,'gate_run_id',v_gate.id,'gate_final_status',v_gate.final_status,'executed',false);
  end if;

  v_pub:=private.c0237_publish_current_fpl_plan_v01(v_gw,p_horizon);
  return jsonb_build_object('ok',coalesce((v_pub->>'ok')::boolean,false),'status','FINAL_PROMOTION_CYCLE_COMPLETE','gameweek',v_gw,'prediction_run_id',v_pred_id,'production_run_id',v_prod.id,'gate_run_id',v_gate.id,'gate_final_status',v_gate.final_status,'publication',v_pub,'executed',true,'historical_forecasts_rewritten',false);
end
$function$;

INSERT INTO private.c0213_component_overrides(
  object_kind,object_schema,object_name,lifecycle,capability_key,canonical_status,
  canonical_component_key,production_effect_enabled,active_override,change_id,
  rationale,evidence,updated_at
)
VALUES(
  'DB_FUNCTION','private','c0272_final_promotion_watch_v01','INFRASTRUCTURE',
  'FPL_FINAL_DECISION_ORCHESTRATION','CANONICAL',null,false,true,'C0272',
  'Final-window orchestration only: sequentially ensures two same-lineage C0248 beams, deterministic promotion, autonomous-gate refresh and publication. It cannot weaken gates or execute transfers.',
  jsonb_build_object('numeric_projection_effect',false,'executes_transfers',false,'cross_beam_required',true,'one_heavy_request_per_pass',true,'final_window_only',true),
  clock_timestamp()
)
ON CONFLICT (object_kind,object_schema,object_name)
DO UPDATE SET lifecycle=excluded.lifecycle,capability_key=excluded.capability_key,canonical_status=excluded.canonical_status,
  canonical_component_key=excluded.canonical_component_key,production_effect_enabled=excluded.production_effect_enabled,
  active_override=excluded.active_override,change_id=excluded.change_id,rationale=excluded.rationale,
  evidence=excluded.evidence,updated_at=excluded.updated_at;

DO $$
DECLARE v_job bigint;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname='c0272_fpl_final_promotion_watch'
  LOOP PERFORM cron.unschedule(v_job); END LOOP;
  PERFORM cron.schedule('c0272_fpl_final_promotion_watch','*/5 * * * *','select private.c0272_final_promotion_watch_v01();');
END $$;

-- Consumption contracts for the only two C0272 pathways that are actually consumed downstream.
INSERT INTO private.c0213_change_consumption_contracts(change_id,pathway,consumer_or_evaluator_ref,evidence,verified_at)
VALUES(
  'C0202','PRODUCTION_CONSUMER',
  'DB_FUNCTION:private.c0202_current_side_prior_v01 -> DB_FUNCTION:public.refresh_player_fixture_role_snapshots -> TABLE:public.player_fixture_role_observations -> VIEW:public.current_player_fixture_roles',
  jsonb_build_object('contract','C0202_C0272_FACTUAL_SIDE_STATE_V01','scope','HIGH_CONFIDENCE_CATEGORICAL_SIDE_METADATA_ONLY','holdout_accuracy_high_confidence',0.970,'numeric_xpts_effect',false,'numeric_role_uplift_enabled',false,'model_effect_enabled',false,'generic_flank_xpts_hypothesis','REJECTED','historical_forecasts_rewritten',false),
  clock_timestamp()
),(
  'C0272','PRODUCTION_CONSUMER',
  'CRON:c0272_fpl_final_promotion_watch -> DB_FUNCTION:private.c0272_final_promotion_watch_v01 -> EDGE_FUNCTION:fpl-sequential-planner:v6 -> DB_FUNCTION:private.c0248_promote_verified_candidate_v01 -> EDGE_FUNCTION:fpl-autonomous-gate:v7 -> DB_FUNCTION:private.c0237_publish_current_fpl_plan_v01; DB_FUNCTION:private.c0202_current_side_prior_v01 -> DB_FUNCTION:public.refresh_player_fixture_role_snapshots -> VIEW:public.current_player_fixture_roles',
  jsonb_build_object('contract','C0272_POST_AUDIT_CONSOLIDATION_V01','numeric_xpts_effect',false,'c0202_side_state','HIGH_CONFIDENCE_FACTUAL_METADATA_ONLY','c0224','CONTINUE_SHADOW_NO_PRODUCTION_EFFECT','c0230','ADVISORY_NONBLOCKING','c0248_cross_beam_acceptance_unchanged',true,'one_heavy_request_per_watch_pass',true,'executes_transfers',false,'historical_forecasts_rewritten',false),
  clock_timestamp()
)
ON CONFLICT(change_id) DO UPDATE SET pathway=excluded.pathway,consumer_or_evaluator_ref=excluded.consumer_or_evaluator_ref,evidence=excluded.evidence,verified_at=excluded.verified_at;
