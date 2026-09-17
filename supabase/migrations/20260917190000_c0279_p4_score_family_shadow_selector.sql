-- C0279 P4 score-family shadow selector
-- Shadow only; zero production effect.

CREATE OR REPLACE FUNCTION private.c0279_score_family_classify_v01(p_score_matrix jsonb, p_primary_environment text, p_markets jsonb, p_raw_modal_score text)
 RETURNS TABLE(selected_family text, selected_family_group text, selected_family_probability numeric, representative_score text, representative_score_probability numeric, raw_modal_score text, raw_modal_probability numeric, raw_modal_family text, dominant_outcome text, outcome_edge numeric, direction_strength text, representative_outcome text, direction_family_coherent boolean, environment_family_coherent boolean, uncertainty_disclosed boolean, family_probabilities jsonb, matrix_coverage numeric, selection_rule text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
with cells as (
 select split_part(e.key,'-',1)::int h,split_part(e.key,'-',2)::int a,e.value::numeric p,
 case
  when split_part(e.key,'-',1)::int=split_part(e.key,'-',2)::int and split_part(e.key,'-',1)::int+split_part(e.key,'-',2)::int<=2 then 'LOW_SCORING_PARITY'
  when split_part(e.key,'-',1)::int=split_part(e.key,'-',2)::int then 'HIGH_SCORING_PARITY'
  when split_part(e.key,'-',1)::int>=2 and split_part(e.key,'-',2)::int>=2 and split_part(e.key,'-',1)::int+split_part(e.key,'-',2)::int>=5 then 'SHOOTOUT'
  when abs(split_part(e.key,'-',1)::int-split_part(e.key,'-',2)::int)>=3 and split_part(e.key,'-',1)::int>split_part(e.key,'-',2)::int then 'HOME_DEMOLITION'
  when abs(split_part(e.key,'-',1)::int-split_part(e.key,'-',2)::int)>=3 then 'AWAY_DEMOLITION'
  when split_part(e.key,'-',1)::int-split_part(e.key,'-',2)::int=2 then 'COMFORTABLE_HOME_WIN'
  when split_part(e.key,'-',2)::int-split_part(e.key,'-',1)::int=2 then 'COMFORTABLE_AWAY_WIN'
  when split_part(e.key,'-',1)::int>split_part(e.key,'-',2)::int then 'NARROW_HOME_WIN'
  else 'NARROW_AWAY_WIN' end family,
 case when split_part(e.key,'-',1)::int>split_part(e.key,'-',2)::int then 'HOME'
      when split_part(e.key,'-',1)::int<split_part(e.key,'-',2)::int then 'AWAY' else 'DRAW' end outcome,
 e.key score
 from jsonb_each_text(coalesce(p_score_matrix,'{}'::jsonb))e where e.key~'^[0-9]+-[0-9]+$'
), mass as(select sum(p)m from cells),
fam as (select family,sum(p)prob from cells group by family),
market as (
 select nullif(p_markets->>'home_win','')::numeric hp,nullif(p_markets->>'draw','')::numeric dp,nullif(p_markets->>'away_win','')::numeric ap
), dir as (
 select *,case when hp>=dp and hp>=ap then 'HOME' when ap>=hp and ap>=dp then 'AWAY' else 'DRAW' end dom,
 greatest(hp,dp,ap) top_p,
 case when hp>=dp and hp>=ap then greatest(dp,ap) when ap>=hp and ap>=dp then greatest(hp,dp) else greatest(hp,ap) end second_p
 from market
), eligible as (
 select f.*,case
  when p_primary_environment='HIGH_SCORING' then family in('HIGH_SCORING_PARITY','SHOOTOUT','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN','HOME_DEMOLITION','AWAY_DEMOLITION')
  when p_primary_environment='LOW_SCORING' then family in('LOW_SCORING_PARITY','NARROW_HOME_WIN','NARROW_AWAY_WIN','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN')
  when p_primary_environment='NORMAL_SCORING' then family in('LOW_SCORING_PARITY','HIGH_SCORING_PARITY','NARROW_HOME_WIN','NARROW_AWAY_WIN','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN')
  else false end ok
 from fam f
), chosen as (
 select e.* from eligible e cross join mass ms
 where e.ok and ms.m>=.95 order by e.prob desc,e.family limit 1
), rep as (
 select c.* from cells c cross join chosen f cross join dir d
 where c.family=f.family
 order by (c.outcome=d.dom) desc,c.p desc,c.h+c.a desc,c.h desc limit 1
), raw as (select c.* from cells c where c.score=p_raw_modal_score limit 1),
probs as(select jsonb_object_agg(family,round(prob/nullif((select m from mass),0),6))j from fam)
select ch.family,
 case when ch.family in('HOME_DEMOLITION','AWAY_DEMOLITION') then 'DEMOLITION' else ch.family end,
 round(ch.prob/nullif(ms.m,0),6),r.score,round(r.p/nullif(ms.m,0),6),
 p_raw_modal_score,round(rw.p/nullif(ms.m,0),6),rw.family,d.dom,round(d.top_p-d.second_p,6),
 case when d.top_p-d.second_p>=.08 then 'STRONG' when d.top_p-d.second_p>=.04 then 'SLIGHT' else 'NO_MEANINGFUL_EDGE' end,
 r.outcome,(r.outcome=d.dom),
 case when p_primary_environment='HIGH_SCORING' then ch.family in('HIGH_SCORING_PARITY','SHOOTOUT','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN','HOME_DEMOLITION','AWAY_DEMOLITION')
      when p_primary_environment='LOW_SCORING' then ch.family in('LOW_SCORING_PARITY','NARROW_HOME_WIN','NARROW_AWAY_WIN','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN')
      when p_primary_environment='NORMAL_SCORING' then ch.family in('LOW_SCORING_PARITY','HIGH_SCORING_PARITY','NARROW_HOME_WIN','NARROW_AWAY_WIN','COMFORTABLE_HOME_WIN','COMFORTABLE_AWAY_WIN')
      else false end,
 (d.top_p-d.second_p<.08 or r.outcome<>d.dom),pr.j,round(ms.m,6),
 case when r.outcome=d.dom then 'ENVIRONMENT_FAMILY_THEN_DIRECTION_COHERENT_CELL'
      else 'ENVIRONMENT_FAMILY_WITH_DIRECTION_CONFLICT_DISCLOSED' end
from chosen ch cross join rep r cross join dir d cross join mass ms cross join probs pr left join raw rw on true
union all
select 'INSUFFICIENT_EVIDENCE','INSUFFICIENT_EVIDENCE',null::numeric,null::text,null::numeric,
 p_raw_modal_score,null::numeric,null::text,null::text,null::numeric,'INSUFFICIENT_EVIDENCE',null::text,
 false,false,true,'{}'::jsonb,round(coalesce(ms.m,0),6),'INSUFFICIENT_EVIDENCE'
from mass ms where not exists(select 1 from chosen);
$function$

revoke all on function private.c0279_score_family_classify_v01(jsonb,text,jsonb,text) from public,anon,authenticated;
comment on function private.c0279_score_family_classify_v01(jsonb,text,jsonb,text) is 'C0279 P4 private shadow score-family selector. Aggregates the full exact-score matrix, preserves the raw modal cell, selects an environment-eligible family and direction-aware representative, and fails closed below 95% matrix coverage.';

CREATE OR REPLACE FUNCTION private.c0279_score_family_snapshot_v01(p_snapshot_id bigint)
 RETURNS TABLE(contract_version text, snapshot_id bigint, match_id bigint, gameweek integer, primary_environment text, environment_confidence numeric, selected_family text, selected_family_group text, selected_family_probability numeric, representative_headline_score text, representative_score_probability numeric, raw_modal_score text, raw_modal_probability numeric, raw_modal_family text, dominant_outcome text, outcome_edge numeric, direction_strength text, representative_outcome text, direction_family_coherent boolean, environment_family_coherent boolean, uncertainty_disclosed boolean, family_probabilities jsonb, matrix_coverage numeric, selection_rule text, chronology_valid boolean, production_effect boolean, lineage jsonb, evidence_hash text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select 'c0279_score_family_v01',f.id,f.match_id,f.gameweek,e.primary_environment,e.environment_confidence,
 c.selected_family,c.selected_family_group,c.selected_family_probability,c.representative_score,c.representative_score_probability,
 c.raw_modal_score,c.raw_modal_probability,c.raw_modal_family,c.dominant_outcome,c.outcome_edge,c.direction_strength,
 c.representative_outcome,c.direction_family_coherent,c.environment_family_coherent,c.uncertainty_disclosed,
 c.family_probabilities,c.matrix_coverage,c.selection_rule,
 f.is_pre_kickoff and f.captured_at<f.kickoff_time,false,
 jsonb_build_object('contract_version','c0279_score_family_v01','source_snapshot_id',f.id,'scoring_environment_contract','c0279_scoring_environment_v01','raw_modal_preserved',true,'raw_modal_is_diagnostic',true,'selected_from_aggregated_family',true,'shadow_only',true,'production_effect',false,'historical_row_mutated',false),
 encode(extensions.digest(concat_ws('|','c0279_score_family_v01',f.id,e.primary_environment,c.selected_family,c.selected_family_probability,c.representative_score,c.representative_score_probability,c.raw_modal_score,c.dominant_outcome,c.outcome_edge),'sha256'),'hex')
from public.fixture_prediction_snapshots f
cross join lateral private.c0279_scoring_environment_classify_v01(f.score_matrix,f.home_lambda,f.away_lambda,f.markets)e
cross join lateral private.c0279_score_family_classify_v01(f.score_matrix,e.primary_environment,f.markets,f.raw_modal_score)c
where f.id=p_snapshot_id;
$function$

revoke all on function private.c0279_score_family_snapshot_v01(bigint) from public,anon,authenticated;
comment on function private.c0279_score_family_snapshot_v01(bigint) is 'C0279 P4 private shadow snapshot wrapper. Zero production effect; preserves raw modal and aggregated-family lineage.';
