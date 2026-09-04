alter table public.research_c0202_player_side_snapshots add column if not exists prior_appearances integer;
alter table public.research_c0202_player_side_snapshots add column if not exists median_position_y numeric;

insert into public.research_c0202_validation_runs(run_key,evidence_cutoff,definition,benchmark,decision)
values(
 'C0202_V02_EXACT_SIDE_CREATION_20260904',
 '2026-09-04T17:30:00Z',
 jsonb_build_object(
   'ground_truth','2025/26 confirmed lineups plus realized average positions from pinned FPL-Core commit 4f9cdaad9c60f62f3c5106753ccdfb6a467dcf04',
   'post_match_label_rule','realized lineup/average-position rows are labels only and never same-fixture pre-kickoff predictors',
   'average_position_orientation','stable across home/away; avg_y <=35 = attacking right, avg_y >=65 = attacking left; this coordinate convention is distinct from shot start_y',
   'forward_side_rule','median of previous three realized starts; HIGH only if all previous three starts agree in the same strict side band; MEDIUM if median resolves but previous three are not unanimous; otherwise UNRESOLVED',
   'chance_origin_proxy','player xA attributed to realized average-position side; central/mixed creators excluded rather than forced to a flank',
   'missing_data_rule','missing/unresolved is not zero'
 ),
 jsonb_build_object(
   'ground_truth_qa',jsonb_build_object('lineup_rows',15153,'matches',380,'starters',8360,'average_position_rows',11448,'captures',76,'violations',0),
   'side_inference',jsonb_build_object(
     'resolved_cases',3037,'overall_accuracy',0.945,
     'train_gw1_25',jsonb_build_object('resolved',1967,'accuracy',0.946,'unanimous_n',1198,'unanimous_accuracy',0.975),
     'holdout_gw26_38',jsonb_build_object('resolved',1070,'accuracy',0.942,'high_n',768,'high_accuracy',0.970,'medium_n',302,'medium_accuracy',0.871,'formation_change_n',333,'formation_change_accuracy',0.940)
   ),
   'chance_origin_coverage',jsonb_build_object('total_xa',680.051,'strict_side_xa',388.416,'strict_side_share',0.571),
   'creator_side_vulnerability',jsonb_build_object(
      'train_gw1_25',jsonb_build_object('n',440,'corr_p3',0.081,'corr_p5',0.073,'corr_p8',0.060,'p5_strong_direction_accuracy',0.524,'p5_strong_n',309),
      'holdout_gw26_38',jsonb_build_object('n',260,'corr_p3',-0.018,'corr_p5',-0.047,'corr_p8',-0.127,'p5_strong_direction_accuracy',0.469,'p5_strong_n',179),
      'decision','reject generic recent creator-side vulnerability as standalone xPts effect'
   )
 ),
 'PROMOTE_EXACT_SIDE_INFERENCE_TO_FORWARD_SHADOW_ONLY; KEEP_FLANK_XPTS_EFFECT_OFF'
)
on conflict do nothing;

create or replace function private.c0202_current_side_prior_v01()
returns table(
 player_id bigint,
 web_name text,
 prior_appearances integer,
 median_position_y numeric,
 left_n integer,
 right_n integer,
 inferred_attack_side text,
 confidence_band text,
 empirical_holdout_accuracy numeric,
 inference_method text
)
language sql stable set search_path=public,private,pg_temp as $$
with te as (
  select distinct on (source_match_id,venue) source_match_id,venue,fixture_kickoff
  from public.research_c0197_team_match_evidence
  where season='2025-2026'
  order by source_match_id,venue,captured_at desc
), hist as (
  select a.player_id,a.avg_y,te.fixture_kickoff,
         row_number() over(partition by a.player_id order by te.fixture_kickoff desc) rn
  from public.research_c0202_average_position_labels a
  join te on te.source_match_id=a.source_match_id and te.venue=a.team_side
  where a.season='2025-2026' and a.player_id is not null
), a as (
  select h.player_id,
         count(*)::integer prior_appearances,
         percentile_cont(.5) within group(order by h.avg_y)::numeric median_position_y,
         count(*) filter(where h.avg_y>=65)::integer left_n,
         count(*) filter(where h.avg_y<=35)::integer right_n
  from hist h where rn<=3 group by h.player_id
), x as (
  select a.*,
    case when prior_appearances=3 and left_n=3 then 'ATT_LEFT'
         when prior_appearances=3 and right_n=3 then 'ATT_RIGHT'
         when median_position_y>=65 then 'ATT_LEFT'
         when median_position_y<=35 then 'ATT_RIGHT'
         else 'UNRESOLVED' end inferred_attack_side,
    case when prior_appearances=3 and (left_n=3 or right_n=3) then 'HIGH'
         when median_position_y>=65 or median_position_y<=35 then 'MEDIUM'
         else 'UNRESOLVED' end confidence_band
  from a
)
select x.player_id,p.web_name,x.prior_appearances,x.median_position_y,x.left_n,x.right_n,x.inferred_attack_side,x.confidence_band,
       case when x.confidence_band='HIGH' then 0.970::numeric when x.confidence_band='MEDIUM' then 0.871::numeric else null end,
       'prior_3_realized_average_positions_v02'::text
from x join public.players p on p.id=x.player_id;
$$;
revoke all on function private.c0202_current_side_prior_v01() from public,anon,authenticated;

with candidates as (
  select r.match_id,r.player_id,r.team_id,r.opponent_team_id,r.primary_role,r.secondary_role,r.confidence role_confidence
  from public.current_player_fixture_roles r
  where r.gameweek=3 and r.expected_xi=true and (
    r.primary_role in ('WIDE_BACK','WING_BACK','WIDE_ATTACKER','WIDE_FORWARD') or
    (r.primary_role='UNRESOLVED' and r.secondary_role in ('WIDE_BACK','WING_BACK','WIDE_ATTACKER','WIDE_FORWARD'))
  )
), pri as (select * from private.c0202_current_side_prior_v01())
insert into public.research_c0202_player_side_snapshots(
 run_key,gameweek,match_id,player_id,team_id,opponent_team_id,primary_role,secondary_role,prior_shots,median_y,
 attack_side,side_confidence,inference_method,evidence,prior_appearances,median_position_y
)
select 'C0202_V02_EXACT_SIDE_CREATION_20260904',3,c.match_id,c.player_id,c.team_id,c.opponent_team_id,c.primary_role,c.secondary_role,0,null,
       coalesce(p.inferred_attack_side,'UNRESOLVED'),p.empirical_holdout_accuracy,
       coalesce(p.inference_method,'no_historical_average_position_prior_v02'),
       jsonb_build_object(
         'post_lock_research_reconstruction',true,
         'target_gameweek_actual_used',false,
         'historical_labels_only',true,
         'confidence_band',coalesce(p.confidence_band,'UNRESOLVED'),
         'empirical_holdout_accuracy_is_bucket_reliability_not_individual_probability',true,
         'role_confidence',c.role_confidence,
         'missing_is_not_zero',true
       ),
       coalesce(p.prior_appearances,0),p.median_position_y
from candidates c left join pri p on p.player_id=c.player_id
on conflict do nothing;

create or replace function private.c0202_status_v01()
returns jsonb language sql stable set search_path=public,private,pg_temp as $$
select jsonb_build_object(
  'change_id','C0202',
  'runs',(select count(*) from public.research_c0202_validation_runs),
  'player_side_snapshots',(select count(*) from public.research_c0202_player_side_snapshots),
  'v02_gw3_exact_side',jsonb_build_object(
     'rows',(select count(*) from public.research_c0202_player_side_snapshots where run_key='C0202_V02_EXACT_SIDE_CREATION_20260904'),
     'resolved',(select count(*) from public.research_c0202_player_side_snapshots where run_key='C0202_V02_EXACT_SIDE_CREATION_20260904' and attack_side<>'UNRESOLVED'),
     'high_confidence',(select count(*) from public.research_c0202_player_side_snapshots where run_key='C0202_V02_EXACT_SIDE_CREATION_20260904' and evidence->>'confidence_band'='HIGH')
  ),
  'latest_decision',(select decision from public.research_c0202_validation_runs order by frozen_at desc limit 1),
  'model_effect_enabled',false,
  'append_only',true
);
$$;
revoke all on function private.c0202_status_v01() from public,anon,authenticated;