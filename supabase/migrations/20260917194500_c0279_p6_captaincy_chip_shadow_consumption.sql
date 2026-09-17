-- C0279 P6 captaincy and chip shadow consumption
-- Supporting evidence only; C0248/C0277/C0276 authority unchanged; zero production effect.

CREATE OR REPLACE FUNCTION private.c0279_captaincy_chip_shadow_v01(p_manager_state_id bigint, p_prediction_run_id bigint, p_cycle_id bigint)
 RETURNS TABLE(contract_version text, manager_state_id bigint, prediction_run_id bigint, cycle_id bigint, gameweek integer, player_id bigint, player_name text, team_short text, in_manager_squad boolean, named_challenger boolean, primary_environment text, selected_family text, expected_minutes numeric, start_probability numeric, minutes_role_gate text, expected_points numeric, p_blank numeric, p_10_plus numeric, p_15_plus numeric, p_20_plus numeric, p10_at_4_plus numeric, environment_upside numeric, shadow_captaincy_score numeric, shadow_rank bigint, nomination_class text, incumbent_c0248_captain boolean, whole_xv_count integer, named_challenger_count integer, whole_xv_coverage_complete boolean, named_challenger_coverage_complete boolean, c0277_gate_class text, c0277_recommended_chip text, c0277_play_now_authorized boolean, triple_captain_evidence_class text, captain_selection_authorized boolean, chip_execution_authorized boolean, production_effect boolean, lineage jsonb, evidence_hash text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with ms as (
 select m.gameweek,m.evidence from public.fpl_manager_state_snapshots m where m.id=p_manager_state_id
), squad as (
 select (x->>'player_id')::bigint player_id,true in_squad,false named
 from ms cross join lateral jsonb_array_elements(ms.evidence->'squad')x
), challengers as (
 select distinct unnest(r.required_player_ids) player_id,false in_squad,true named
 from public.fpl_named_challenger_registry r cross join ms
 where r.gameweek=ms.gameweek and r.active
), candidate_ids as (
 select player_id,bool_or(in_squad) in_squad,bool_or(named) named
 from (select * from squad union all select * from challengers)x group by player_id
), snap as (
 select distinct on(f.match_id) f.id,f.match_id
 from public.fixture_prediction_snapshots f
 join public.model_predictions mp on mp.match_id=f.match_id and mp.prediction_run_id=p_prediction_run_id
 cross join ms
 where f.gameweek=ms.gameweek and f.is_pre_kickoff and f.captured_at<f.kickoff_time
 order by f.match_id,f.captured_at desc,f.id desc
), p5 as (
 select p.* from snap s cross join lateral private.c0279_conditional_player_snapshot_v01(s.id,p_prediction_run_id)p
), base as (
 select c.*,p5.player_name,p5.team_short,p5.primary_environment,p5.selected_family,p5.expected_minutes,
 p5.start_probability,p5.minutes_role_gate,p5.p10_at_4_plus,p5.match_id,
 mp.expected_points,mp.p_blank,mp.p_10_plus,mp.p_15_plus,mp.p_20_plus,
 greatest(0,p5.p10_at_4_plus-mp.p_10_plus) env_upside
 from candidate_ids c join p5 using(player_id)
 join public.model_predictions mp on mp.player_id=c.player_id and mp.prediction_run_id=p_prediction_run_id and mp.match_id=p5.match_id
), scored as (
 select b.*,round(expected_points+4*p_10_plus+6*p_15_plus+10*p_20_plus+
 case when primary_environment='HIGH_SCORING' then 2*env_upside else 0 end,6) cap_score
 from base b
), ranked as (
 select s.*,case when minutes_role_gate='ELIGIBLE' then
 row_number() over(order by (minutes_role_gate='ELIGIBLE') desc,cap_score desc,expected_points desc,player_id)
 end eligible_rank
 from scored s
), dc as (
 select coalesce(d.model_error_margin_points,1) margin
 from public.fpl_decision_control_runs d cross join ms
 where d.gameweek=ms.gameweek order by d.id desc limit 1
), lead as (
 select max(cap_score) filter(where eligible_rank=1) lead_score,
 max(cap_score) filter(where eligible_rank=2) second_score from ranked
), cov as (
 select (select count(*) from squad)::int squad_n,
 (select count(*) from challengers)::int named_n,
 count(*) filter(where in_squad)::int covered_squad,
 count(*) filter(where named)::int covered_named from base
), inc as (
 select nullif(r.result#>>'{summary,selected_normal_path,first_action,captain_player_id}','')::bigint captain_id
 from public.fpl_sequential_planner_runs r cross join ms
 where r.gameweek=ms.gameweek order by r.id desc limit 1
), chip as (
 select private.c0276_chip_opportunity_gate_v01(p_cycle_id) j
), gate as (
 select j#>>'{gate_class}' gate_class,j#>>'{recommended_current_chip}' chip,
 coalesce((j#>>'{play_now_authorized}')::boolean,false) play_now from chip
)
select 'c0279_captaincy_chip_shadow_v01',p_manager_state_id,p_prediction_run_id,p_cycle_id,ms.gameweek,
 r.player_id,r.player_name,r.team_short,r.in_squad,r.named,r.primary_environment,r.selected_family,
 r.expected_minutes,r.start_probability,r.minutes_role_gate,r.expected_points,r.p_blank,r.p_10_plus,r.p_15_plus,r.p_20_plus,
 r.p10_at_4_plus,round(r.env_upside,6),r.cap_score,r.eligible_rank,
 case when r.minutes_role_gate<>'ELIGIBLE' then 'BLOCKED_BY_XMINS_ROLE'
      when r.eligible_rank=1 and lead.lead_score-lead.second_score<dc.margin then 'SHADOW_EQUIVALENT_LEAD'
      when r.eligible_rank=2 and lead.lead_score-lead.second_score<dc.margin then 'SHADOW_EQUIVALENT_CHALLENGER'
      when r.eligible_rank=1 then 'SHADOW_LEAD_NOMINEE'
      when r.eligible_rank<=5 then 'SHADOW_SHORTLIST'
      else 'OUTSIDE_SHADOW_SHORTLIST' end,
 (r.player_id=inc.captain_id),cov.squad_n,cov.named_n,
 cov.squad_n=15 and cov.covered_squad=cov.squad_n,
 cov.covered_named=cov.named_n,
 gate.gate_class,gate.chip,gate.play_now,
 case when r.minutes_role_gate<>'ELIGIBLE' then 'NOT_ELIGIBLE_FOR_TC'
      when r.eligible_rank<>1 then 'NOT_LEAD_NOMINEE'
      when gate.gate_class='RESERVE_FOR_FUTURE' or not gate.play_now then 'BLOCKED_BY_C0277_RESERVATION'
      else 'EVIDENCE_ONLY_REQUIRES_EXISTING_FINAL_GATES' end,
 false,false,false,
 jsonb_build_object('contract_version','c0279_captaincy_chip_shadow_v01','manager_state_id',p_manager_state_id,
 'prediction_run_id',p_prediction_run_id,'cycle_id',p_cycle_id,'whole_xv_compared',true,
 'named_challengers_compared',cov.covered_named=cov.named_n,'c0248_authority_unchanged',true,
 'c0277_gate_consumed',true,'model_error_margin_points',dc.margin,'lead_edge',round(lead.lead_score-lead.second_score,6),'noise_control_applied',true,'cannot_select_captain',true,'cannot_execute_chip',true,
 'shadow_only',true,'production_effect',false,'historical_row_mutated',false),
 encode(extensions.digest(concat_ws('|','c0279_captaincy_chip_shadow_v01',p_manager_state_id,p_prediction_run_id,
 p_cycle_id,r.player_id,r.cap_score,r.eligible_rank,gate.gate_class,gate.chip),'sha256'),'hex')
from ranked r cross join cov cross join inc cross join gate cross join ms cross join dc cross join lead
order by r.eligible_rank nulls last,r.cap_score desc;
$function$

revoke all on function private.c0279_captaincy_chip_shadow_v01(bigint,bigint,bigint) from public,anon,authenticated;
comment on function private.c0279_captaincy_chip_shadow_v01(bigint,bigint,bigint) is 'C0279 P6 private shadow adapter. Compares the complete manager XV plus all active named challengers, consumes P5 conditional upside and the binding C0277 opportunity-cost gate, but cannot select a captain or execute a chip.';
