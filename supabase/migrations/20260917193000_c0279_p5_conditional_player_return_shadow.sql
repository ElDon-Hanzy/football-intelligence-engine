-- C0279 P5 conditional player-return shadow bridge
-- Shadow only; preserves canonical player forecasts and has zero production effect.

CREATE OR REPLACE FUNCTION private.c0279_conditional_player_return_v01(p_team_goal_states jsonb, p_scoring_share numeric, p_assist_share numeric, p_base jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
 v_g_labels text[]:=array['0','1','2','3','4_plus'];
 v_probs numeric[]:=array[
  coalesce((p_team_goal_states->>'0')::numeric,0),
  coalesce((p_team_goal_states->>'1')::numeric,0),
  coalesce((p_team_goal_states->>'2')::numeric,0),
  coalesce((p_team_goal_states->>'3')::numeric,0),
  coalesce((p_team_goal_states->>'4_plus')::numeric,0)
 ];
 v_goals numeric[]:=array[0,1,2,3,coalesce((p_team_goal_states->>'mean_4_plus')::numeric,4)];
 v_goal_lambda numeric:=coalesce((p_base->>'goal_lambda')::numeric,0);
 v_assist_lambda numeric:=coalesce((p_base->>'assist_lambda')::numeric,0);
 v_base_attack numeric;
 v_raw numeric[];
 v_raw_xp numeric[];
 v_norm numeric:=0;
 v_norm_xp numeric:=0;
 v_attack numeric;
 v_factor numeric;
 v_xfactor numeric;
 v_states jsonb:='{}'::jsonb;
 v_weighted jsonb;
 v_i integer;
 v_p5 numeric:=coalesce((p_base->>'p_5_plus')::numeric,0);
 v_p10 numeric:=coalesce((p_base->>'p_10_plus')::numeric,0);
 v_p15 numeric:=coalesce((p_base->>'p_15_plus')::numeric,0);
 v_p20 numeric:=coalesce((p_base->>'p_20_plus')::numeric,0);
 v_pblank numeric:=coalesce((p_base->>'p_blank')::numeric,1);
 v_xp numeric:=coalesce((p_base->>'expected_points')::numeric,0);
 v_pg numeric; v_pa numeric;
begin
 if p_team_goal_states is null or p_scoring_share is null or p_assist_share is null or p_base is null
    or p_scoring_share<0 or p_assist_share<0 then
   return jsonb_build_object('status','INSUFFICIENT_EVIDENCE','conditional_states','{}'::jsonb);
 end if;
 v_base_attack:=1-exp(-(v_goal_lambda+v_assist_lambda));
 for v_i in 1..5 loop
   v_attack:=1-power(greatest(0,1-least(.999999,p_scoring_share+p_assist_share)),v_goals[v_i]);
   v_raw[v_i]:=.35+.65*case when v_base_attack>0 then v_attack/v_base_attack else 0 end;
   v_raw_xp[v_i]:=.55+.45*case when v_base_attack>0 then v_attack/v_base_attack else 0 end;
   v_norm:=v_norm+v_probs[v_i]*v_raw[v_i];
   v_norm_xp:=v_norm_xp+v_probs[v_i]*v_raw_xp[v_i];
 end loop;
 if v_norm<=0 or v_norm_xp<=0 or abs((select sum(x) from unnest(v_probs)x)-1)>.01 then
   return jsonb_build_object('status','INSUFFICIENT_EVIDENCE','conditional_states','{}'::jsonb);
 end if;
 for v_i in 1..5 loop
   v_factor:=v_raw[v_i]/v_norm;
   v_xfactor:=v_raw_xp[v_i]/v_norm_xp;
   v_pg:=1-power(1-least(.999999,p_scoring_share),v_goals[v_i]);
   v_pa:=1-power(1-least(.999999,p_assist_share),v_goals[v_i]);
   v_states:=v_states||jsonb_build_object(v_g_labels[v_i],jsonb_build_object(
     'team_goal_probability',round(v_probs[v_i],6),
     'effective_team_goals',round(v_goals[v_i],6),
     'expected_player_goals',round(v_goals[v_i]*p_scoring_share,6),
     'expected_player_assists',round(v_goals[v_i]*p_assist_share,6),
     'p_goal',round(v_pg,6),'p_assist',round(v_pa,6),
     'p_attacking_return',round(1-power(greatest(0,1-least(.999999,p_scoring_share+p_assist_share)),v_goals[v_i]),6),
     'expected_points',round(greatest(0,v_xp*v_xfactor),6),
     'p_blank',round(greatest(0,least(1,1-(1-v_pblank)*v_factor)),6),
     'p_5_plus',round(greatest(0,least(1,v_p5*v_factor)),6),
     'p_10_plus',round(greatest(0,least(1,v_p10*v_factor)),6),
     'p_15_plus',round(greatest(0,least(1,v_p15*v_factor)),6),
     'p_20_plus',round(greatest(0,least(1,v_p20*v_factor)),6)
   ));
 end loop;
 v_weighted:=jsonb_build_object(
   'expected_points',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'expected_points')::numeric)) from generate_series(1,5)i),6),
   'p_blank',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'p_blank')::numeric)) from generate_series(1,5)i),6),
   'p_5_plus',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'p_5_plus')::numeric)) from generate_series(1,5)i),6),
   'p_10_plus',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'p_10_plus')::numeric)) from generate_series(1,5)i),6),
   'p_15_plus',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'p_15_plus')::numeric)) from generate_series(1,5)i),6),
   'p_20_plus',round((select sum(v_probs[i]*((v_states->v_g_labels[i]->>'p_20_plus')::numeric)) from generate_series(1,5)i),6)
 );
 return jsonb_build_object(
   'status','READY','conditional_states',v_states,'weighted_reconstruction',v_weighted,
   'base_attack_probability',round(v_base_attack,6),
   'scoring_share',round(p_scoring_share,8),'assist_share',round(p_assist_share,8),
   'conservation_rule','TEAM_GOALS_ALLOCATED_BY_NORMALIZED_PLAYER_EVENT_LAMBDA',
   'unconditional_anchor_preserved',true
 );
end;$function$

revoke all on function private.c0279_conditional_player_return_v01(jsonb,numeric,numeric,jsonb) from public,anon,authenticated;
comment on function private.c0279_conditional_player_return_v01(jsonb,numeric,numeric,jsonb) is 'C0279 P5 pure shadow conditional player-return bridge. Reconstructs goal-state-conditioned player outcomes while preserving the canonical unconditional projection anchor.';

CREATE OR REPLACE FUNCTION private.c0279_conditional_player_snapshot_v01(p_snapshot_id bigint, p_prediction_run_id bigint)
 RETURNS TABLE(contract_version text, snapshot_id bigint, prediction_run_id bigint, match_id bigint, gameweek integer, team_id bigint, team_short text, side text, primary_environment text, selected_family text, player_id bigint, player_name text, player_position text, player_role text, expected_minutes numeric, start_probability numeric, minutes_role_gate text, goal_lambda numeric, assist_lambda numeric, scoring_share numeric, assist_share numeric, team_goal_states jsonb, conditional_returns jsonb, weighted_reconstruction jsonb, p10_at_0_goals numeric, p10_at_1_goal numeric, p10_at_2_goals numeric, p10_at_3_goals numeric, p10_at_4_plus numeric, team_reconciliation jsonb, chronology_valid boolean, production_effect boolean, lineage jsonb, evidence_hash text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with fx as (
 select f.*,m.home_team_id,m.away_team_id
 from public.fixture_prediction_snapshots f join public.matches m on m.id=f.match_id
 where f.id=p_snapshot_id
), env as (
 select s.* from private.c0279_score_family_snapshot_v01(p_snapshot_id)s
), cells as (
 select split_part(j.key,'-',1)::int h,split_part(j.key,'-',2)::int a,j.value::numeric p
 from fx cross join lateral jsonb_each_text(fx.score_matrix)j
 where j.key~'^[0-9]+-[0-9]+$'
), sides as (
 select home_team_id team_id,'HOME'::text side from fx
 union all select away_team_id,'AWAY' from fx
), goal_mass as (
 select s.team_id,s.side,
 sum(c.p) coverage,
 sum(c.p*(case when s.side='HOME' then c.h else c.a end)) mean_goals,
 sum(c.p) filter(where (case when s.side='HOME' then c.h else c.a end)=0) p0,
 sum(c.p) filter(where (case when s.side='HOME' then c.h else c.a end)=1) p1,
 sum(c.p) filter(where (case when s.side='HOME' then c.h else c.a end)=2) p2,
 sum(c.p) filter(where (case when s.side='HOME' then c.h else c.a end)=3) p3,
 sum(c.p) filter(where (case when s.side='HOME' then c.h else c.a end)>=4) p4,
 sum(c.p*(case when s.side='HOME' then c.h else c.a end)) filter(where (case when s.side='HOME' then c.h else c.a end)>=4) g4
 from sides s cross join cells c group by s.team_id,s.side
), team_states as (
 select team_id,side,jsonb_build_object(
  '0',round(p0/nullif(coverage,0),8),'1',round(p1/nullif(coverage,0),8),
  '2',round(p2/nullif(coverage,0),8),'3',round(p3/nullif(coverage,0),8),
  '4_plus',round(p4/nullif(coverage,0),8),
  'mean_4_plus',round(coalesce(g4/nullif(p4,0),4),8),
  'matrix_mean_goals',round(mean_goals/nullif(coverage,0),8),
  'coverage',round(coverage,8)
 ) states
 from goal_mass
), pool as (
 select mp.*,p.web_name,p.position,p.team_id,t.short_name,
 coalesce(ps.role,p.position) resolved_role,
 coalesce(nullif(mp.features#>>'{point_distribution,events,goal_lambda}','')::numeric,0) gl,
 coalesce(nullif(mp.features#>>'{point_distribution,events,assist_lambda}','')::numeric,0) al
 from fx join public.model_predictions mp on mp.match_id=fx.match_id and mp.prediction_run_id=p_prediction_run_id
 join public.players p on p.id=mp.player_id join public.teams t on t.id=p.team_id
 left join public.current_player_state_latest ps on ps.player_id=mp.player_id
 where p.team_id in(fx.home_team_id,fx.away_team_id)
), weights as (
 select p.*,sum(gl) over(partition by team_id) team_gl,sum(al) over(partition by team_id) team_al
 from pool p
), prepared as (
 select w.*,ts.side,ts.states,
 case when w.expected_minutes>=60 and w.p_start>=.65 and w.resolved_role is not null then 'ELIGIBLE'
      when w.expected_minutes>=30 and w.p_start>=.30 and w.resolved_role is not null then 'WATCH'
      else 'BLOCKED' end gate,
 case when team_gl>0 then gl/team_gl else 0 end ss,
 case when team_al>0 then al/team_al else 0 end asi,
 jsonb_build_object('expected_points',expected_points,'p_blank',p_blank,'p_5_plus',p_5_plus,
 'p_10_plus',p_10_plus,'p_15_plus',p_15_plus,'p_20_plus',p_20_plus,
 'goal_lambda',gl,'assist_lambda',al) base
 from weights w join team_states ts using(team_id)
), bridged as (
 select p.*,private.c0279_conditional_player_return_v01(states,ss,asi,base) bridge
 from prepared p
), recon as (
 select team_id,jsonb_build_object(
  'scoring_share_sum',round(sum(ss),8),'assist_share_sum',round(sum(asi),8),
  'goal_allocation_conserved',abs(sum(ss)-1)<.000001,
  'assist_allocation_conserved',abs(sum(asi)-1)<.000001,
  'eligible_players',count(*) filter(where gate='ELIGIBLE'),
  'watch_players',count(*) filter(where gate='WATCH'),
  'blocked_players',count(*) filter(where gate='BLOCKED'),
  'player_count',count(*)
 ) reconciliation from prepared group by team_id
)
select 'c0279_conditional_player_return_v01',p_snapshot_id,p_prediction_run_id,fx.match_id,fx.gameweek,
 b.team_id,b.short_name,b.side,e.primary_environment,e.selected_family,
 b.player_id,b.web_name,b.position,b.resolved_role,b.expected_minutes,b.p_start,b.gate,b.gl,b.al,
 round(b.ss,8),round(b.asi,8),b.states,b.bridge,b.bridge->'weighted_reconstruction',
 (b.bridge#>>'{conditional_states,0,p_10_plus}')::numeric,
 (b.bridge#>>'{conditional_states,1,p_10_plus}')::numeric,
 (b.bridge#>>'{conditional_states,2,p_10_plus}')::numeric,
 (b.bridge#>>'{conditional_states,3,p_10_plus}')::numeric,
 (b.bridge#>>'{conditional_states,4_plus,p_10_plus}')::numeric,
 r.reconciliation,fx.is_pre_kickoff and fx.captured_at<fx.kickoff_time,false,
 jsonb_build_object('contract_version','c0279_conditional_player_return_v01','source_snapshot_id',p_snapshot_id,
 'prediction_run_id',p_prediction_run_id,'canonical_projection_unchanged',true,'shadow_only',true,
 'production_effect',false,'historical_row_mutated',false,'score_family_contract','c0279_score_family_v01'),
 encode(extensions.digest(concat_ws('|','c0279_conditional_player_return_v01',p_snapshot_id,p_prediction_run_id,
 b.player_id,b.ss,b.asi,b.bridge->'weighted_reconstruction'),'sha256'),'hex')
from bridged b join recon r using(team_id) cross join fx cross join env e;
$function$

revoke all on function private.c0279_conditional_player_snapshot_v01(bigint,bigint) from public,anon,authenticated;
comment on function private.c0279_conditional_player_snapshot_v01(bigint,bigint) is 'C0279 P5 private shadow wrapper. Propagates normalized team goal states into conditional player return distributions, exposes minutes/role gates and proves team/player goal and assist allocation conservation.';
