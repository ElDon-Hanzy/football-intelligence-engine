-- C0279 P3: full-distribution scoring-environment shadow
-- No production selector or historical forecast is changed.

CREATE OR REPLACE FUNCTION private.c0279_scoring_environment_classify_v01(p_score_matrix jsonb, p_home_lambda numeric, p_away_lambda numeric, p_markets jsonb)
 RETURNS TABLE(primary_environment text, environment_confidence numeric, low_scoring_probability numeric, normal_scoring_probability numeric, high_scoring_probability numeric, expected_total_goals numeric, over_2_5_probability numeric, btts_probability numeric, goals_0_1_probability numeric, goals_2_probability numeric, goals_3_4_probability numeric, goals_5_plus_probability numeric, dominant_subtype text, subtype_probabilities jsonb, matrix_coverage numeric, shootout_is_high_scoring boolean, demolition_is_high_scoring boolean, rationale text)
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
with cells as (select split_part(e.key,'-',1)::int h,split_part(e.key,'-',2)::int a,e.value::numeric p from jsonb_each_text(coalesce(p_score_matrix,'{}'::jsonb))e where e.key~'^[0-9]+-[0-9]+$'),
a as (select sum(p)mass,sum(p*(case when h+a<=1 then 1 when h+a=2 then .40 else 0 end))low_m,sum(p*(case when h+a=2 then .60 when h+a=3 then .70 when h+a=4 then .30 else 0 end))normal_m,sum(p*(case when h+a=3 then .30 when h+a=4 then .70 when h+a>=5 then 1 else 0 end))high_m,sum(p)filter(where h+a<=1)p01,sum(p)filter(where h+a=2)p2,sum(p)filter(where h+a between 3 and 4)p34,sum(p)filter(where h+a>=5)p5p,sum(p)filter(where h=a and h+a<=2)stalemate,sum(p)filter(where abs(h-a)=1 and h+a<=2)low_narrow,sum(p)filter(where greatest(h,a)>=2 and least(h,a)=0 and h+a<=2)defensive_control,sum(p)filter(where h=a and h+a between 2 and 4)balanced_draw,sum(p)filter(where abs(h-a)=1 and h+a between 2 and 4)conventional_narrow,sum(p)filter(where h=a and h+a>=4)high_draw,sum(p)filter(where h>=2 and a>=2 and h+a>=5)shootout,sum(p)filter(where h+a>=4 and abs(h-a)=2)attacking_dominance,sum(p)filter(where h+a>=4 and abs(h-a)>=3)demolition from cells),
n as(select *,low_m/nullif(mass,0)low_p,normal_m/nullif(mass,0)normal_p,high_m/nullif(mass,0)high_p,p_home_lambda+p_away_lambda total_lambda from a),
ranked as(select n.*,case when mass is null or mass<.95 or p_home_lambda is null or p_away_lambda is null then 'INSUFFICIENT_EVIDENCE' when total_lambda between 2.60 and 3.00 and greatest(low_p,high_p)-normal_p<.02 then 'NORMAL_SCORING' when low_p>=normal_p and low_p>=high_p then 'LOW_SCORING' when high_p>=low_p and high_p>=normal_p then 'HIGH_SCORING' else 'NORMAL_SCORING' end env from n),
conf as(select r.*,case env when 'LOW_SCORING' then low_p-greatest(normal_p,high_p) when 'HIGH_SCORING' then high_p-greatest(low_p,normal_p) when 'NORMAL_SCORING' then normal_p-greatest(low_p,high_p) else 0 end env_margin from ranked r),
sub as(select r.*,case when env='INSUFFICIENT_EVIDENCE' then 'INSUFFICIENT_EVIDENCE' when env='LOW_SCORING' then case when stalemate>=low_narrow and stalemate>=defensive_control then 'STALEMATE' when defensive_control>=low_narrow then 'DEFENSIVE_CONTROL' else 'NARROW_WIN' end when env='NORMAL_SCORING' then case when balanced_draw>=conventional_narrow then 'BALANCED_DRAW' else 'CONVENTIONAL_NARROW_WIN' end else case when shootout>=high_draw and shootout>=attacking_dominance and shootout>=demolition then 'SHOOTOUT' when demolition>=high_draw and demolition>=attacking_dominance then 'DEMOLITION' when attacking_dominance>=high_draw then 'ATTACKING_DOMINANCE' else 'HIGH_SCORING_DRAW' end end subtype from conf r)
select env,round(abs(env_margin),6),round(low_p,6),round(normal_p,6),round(high_p,6),round(total_lambda,6),nullif(p_markets->>'over_2_5','')::numeric,nullif(p_markets->>'btts_yes','')::numeric,round(p01/nullif(mass,0),6),round(p2/nullif(mass,0),6),round(p34/nullif(mass,0),6),round(p5p/nullif(mass,0),6),subtype,jsonb_build_object('low',jsonb_build_object('stalemate',round(stalemate/nullif(mass,0),6),'narrow_win',round(low_narrow/nullif(mass,0),6),'defensive_control',round(defensive_control/nullif(mass,0),6)),'normal',jsonb_build_object('balanced_draw',round(balanced_draw/nullif(mass,0),6),'conventional_narrow_win',round(conventional_narrow/nullif(mass,0),6)),'high',jsonb_build_object('high_scoring_draw',round(high_draw/nullif(mass,0),6),'shootout',round(shootout/nullif(mass,0),6),'attacking_dominance',round(attacking_dominance/nullif(mass,0),6),'demolition',round(demolition/nullif(mass,0),6))),round(mass,6),true,true,case env when 'INSUFFICIENT_EVIDENCE' then 'Score-matrix coverage or lambda evidence is missing; classification fails closed.' when 'HIGH_SCORING' then 'High-scoring probability membership is largest after aggregating the full score matrix; the isolated modal score is not the classifier.' when 'LOW_SCORING' then 'Low-scoring probability membership is largest after aggregating the full score matrix.' else 'Normal-scoring probability membership is largest, or the 2.6–3.0 expected-goal range is distributionally tied within two percentage points.' end from sub;
$function$
;

CREATE OR REPLACE FUNCTION private.c0279_scoring_environment_snapshot_v01(p_snapshot_id bigint)
 RETURNS TABLE(contract_version text, snapshot_id bigint, match_id bigint, gameweek integer, captured_at timestamp with time zone, kickoff_time timestamp with time zone, chronology_valid boolean, primary_environment text, environment_confidence numeric, low_scoring_probability numeric, normal_scoring_probability numeric, high_scoring_probability numeric, expected_total_goals numeric, over_2_5_probability numeric, btts_probability numeric, goals_0_1_probability numeric, goals_2_probability numeric, goals_3_4_probability numeric, goals_5_plus_probability numeric, dominant_subtype text, subtype_probabilities jsonb, matrix_coverage numeric, raw_modal_score text, raw_modal_probability numeric, raw_modal_is_diagnostic boolean, shootout_parent_environment text, demolition_parent_environment text, production_effect boolean, lineage jsonb, evidence_hash text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
select 'c0279_scoring_environment_v01',f.id,f.match_id,f.gameweek,f.captured_at,f.kickoff_time,
 f.is_pre_kickoff and f.captured_at<f.kickoff_time,
 c.primary_environment,c.environment_confidence,c.low_scoring_probability,c.normal_scoring_probability,c.high_scoring_probability,
 c.expected_total_goals,c.over_2_5_probability,c.btts_probability,c.goals_0_1_probability,c.goals_2_probability,c.goals_3_4_probability,c.goals_5_plus_probability,
 c.dominant_subtype,c.subtype_probabilities,c.matrix_coverage,
 f.raw_modal_score,f.raw_modal_probability,true,'HIGH_SCORING','HIGH_SCORING',false,
 jsonb_build_object('contract_version','c0279_scoring_environment_v01','source_snapshot_id',f.id,'source_generator',f.source_snapshot->>'generator','full_score_matrix_consumed',true,'raw_modal_is_diagnostic',true,'shootout_parent_environment','HIGH_SCORING','demolition_parent_environment','HIGH_SCORING','shadow_only',true,'production_effect',false,'historical_row_mutated',false),
 encode(extensions.digest(concat_ws('|','c0279_scoring_environment_v01',f.id,f.match_id,f.captured_at,c.primary_environment,c.low_scoring_probability,c.normal_scoring_probability,c.high_scoring_probability,c.dominant_subtype,c.matrix_coverage),'sha256'),'hex')
from public.fixture_prediction_snapshots f
cross join lateral private.c0279_scoring_environment_classify_v01(f.score_matrix,f.home_lambda,f.away_lambda,f.markets)c
where f.id=p_snapshot_id;
$function$
;

revoke execute on function private.c0279_scoring_environment_classify_v01(jsonb,numeric,numeric,jsonb) from public,anon,authenticated;
revoke execute on function private.c0279_scoring_environment_snapshot_v01(bigint) from public,anon,authenticated;

comment on function private.c0279_scoring_environment_classify_v01(jsonb,numeric,numeric,jsonb)
is 'C0279 P3 full-distribution LOW/NORMAL/HIGH scoring environment classifier. Shootout and demolition are HIGH subtypes.';
comment on function private.c0279_scoring_environment_snapshot_v01(bigint)
is 'C0279 P3 chronology-safe shadow scoring environment for an immutable fixture snapshot.';
