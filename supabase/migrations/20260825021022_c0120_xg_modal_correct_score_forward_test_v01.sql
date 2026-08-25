create or replace function private.c0120_forward_candidates_v01()
returns table(
  experiment_key text,
  match_id bigint,
  split text,
  gameweek integer,
  kickoff_time timestamptz,
  home_team text,
  away_team text,
  modal_total integer,
  selection_key text,
  selection_name text,
  selection_total integer,
  qualifying_combos integer,
  min_gap numeric,
  min_model_probability numeric,
  avg_model_probability numeric,
  avg_bookmaker_devig_probability numeric,
  min_raw_ev numeric,
  avg_raw_ev numeric,
  best_odds numeric,
  best_bookmaker text,
  snapshot_quality text,
  market_manifest jsonb,
  actual_data_used boolean,
  model_effect_enabled boolean
)
language sql
stable
set search_path = public, private, pg_temp
as $function$
with pred as materialized (
  select w.match_id,w.split,w.variant_key,w.home_lambda,w.away_lambda,w.top_scoreline,
    (split_part(w.top_scoreline,'-',1)::int+split_part(w.top_scoreline,'-',2)::int) modal_total,
    (w.home_lambda+w.away_lambda)-(split_part(w.top_scoreline,'-',1)::int+split_part(w.top_scoreline,'-',2)::int) gap
  from public.walk_forward_ablation_predictions w
  join public.walk_forward_ablation_runs r on r.id=w.ablation_run_id
  where r.ablation_key='A0005'
    and w.variant_key in ('BASE_V03_ELO','FULL_V04_ELO_NO_SCHEDULE')
    and (w.home_lambda+w.away_lambda)-(split_part(w.top_scoreline,'-',1)::int+split_part(w.top_scoreline,'-',2)::int)>=1.2
    and w.actual_data_used=false and w.model_effect_enabled=false
), matches0 as materialized (
  select distinct p.match_id,m.gameweek,m.kickoff_time,m.home_team_id,m.away_team_id
  from pred p join public.matches m on m.id=p.match_id
), snapshots as materialized (
  select s.match_id,s.bookmaker,s.raw_snapshot_id,s.captured_at,max(s.source_timestamp) source_timestamp,m.kickoff_time,
    case when s.captured_at between m.kickoff_time-interval '20 minutes' and m.kickoff_time-interval '5 minutes' then 'NEAR_CLOSE' else 'EARLY_FALLBACK' end snapshot_quality
  from public.odds_market_selections s
  join matches0 m on m.match_id=s.match_id
  where s.market_key='correct_score' and s.bookmaker in ('Bet365','Unibet')
    and s.captured_at<m.kickoff_time and coalesce(s.source_timestamp,s.captured_at)<m.kickoff_time
  group by s.match_id,s.bookmaker,s.raw_snapshot_id,s.captured_at,m.kickoff_time
), ranked as materialized (
  select x.*,row_number() over(partition by x.match_id,x.bookmaker order by case when x.snapshot_quality='NEAR_CLOSE' then 0 else 1 end,x.captured_at desc,x.raw_snapshot_id desc) rn
  from snapshots x
), chosen as materialized (
  select * from ranked where rn=1
), score_rows as materialized (
  select c.match_id,c.bookmaker,c.raw_snapshot_id,c.captured_at,c.snapshot_quality,
    s.selection_key,s.selection_name,s.decimal_odds,s.implied_probability,
    split_part(s.selection_key,'_',1)::int hg,split_part(s.selection_key,'_',2)::int ag,
    sum(s.implied_probability) over(partition by c.match_id,c.bookmaker,c.raw_snapshot_id) parseable_implied_sum
  from chosen c
  join public.odds_market_selections s on s.raw_snapshot_id=c.raw_snapshot_id and s.market_key='correct_score'
  where split_part(s.selection_key,'_',1)~'^\d+$' and split_part(s.selection_key,'_',2)~'^\d+$'
), calc as materialized (
  select p.match_id,p.split,p.variant_key,p.modal_total,p.gap,b.bookmaker,b.raw_snapshot_id,b.captured_at,b.snapshot_quality,
    b.selection_key,b.selection_name,b.hg,b.ag,b.hg+b.ag selection_total,b.decimal_odds,
    exp(-p.home_lambda)*power(p.home_lambda,b.hg)/factorial(b.hg)
      * exp(-p.away_lambda)*power(p.away_lambda,b.ag)/factorial(b.ag) model_p,
    b.implied_probability/nullif(b.parseable_implied_sum,0) bookmaker_devig_p
  from pred p join score_rows b on b.match_id=p.match_id
  where b.hg+b.ag>p.modal_total
), robust as materialized (
  select c.match_id,c.split,max(c.modal_total) modal_total,c.selection_key,c.selection_name,max(c.selection_total) selection_total,
    count(*)::int qualifying_combos,
    min(c.gap) min_gap,min(c.model_p) min_model_p,avg(c.model_p) avg_model_p,avg(c.bookmaker_devig_p) avg_book_p,
    min(c.model_p*c.decimal_odds-1) min_ev,avg(c.model_p*c.decimal_odds-1) avg_ev,max(c.decimal_odds) best_odds,
    (array_agg(c.bookmaker order by c.decimal_odds desc,c.bookmaker))[1] best_bookmaker,
    case when bool_and(c.snapshot_quality='NEAR_CLOSE') then 'NEAR_CLOSE' else 'EARLY_FALLBACK' end snapshot_quality,
    jsonb_agg(jsonb_build_object('variant',c.variant_key,'bookmaker',c.bookmaker,'raw_snapshot_id',c.raw_snapshot_id,'captured_at',c.captured_at,'snapshot_quality',c.snapshot_quality,'odds',c.decimal_odds,'model_probability',round(c.model_p,6),'bookmaker_devig_probability',round(c.bookmaker_devig_p,6),'raw_ev',round(c.model_p*c.decimal_odds-1,6)) order by c.variant_key,c.bookmaker) market_manifest
  from calc c
  group by c.match_id,c.split,c.selection_key,c.selection_name
  having count(*)=4 and count(distinct c.variant_key)=2 and count(distinct c.bookmaker)=2
    and min(c.model_p)>=0.01 and min(c.model_p*c.decimal_odds-1)>0
)
select 'E0007'::text,r.match_id,r.split,m.gameweek,m.kickoff_time,ht.name,at.name,r.modal_total,r.selection_key,r.selection_name,r.selection_total,r.qualifying_combos,
  round(r.min_gap,3),round(r.min_model_p,6),round(r.avg_model_p,6),round(r.avg_book_p,6),round(r.min_ev,6),round(r.avg_ev,6),r.best_odds,r.best_bookmaker,r.snapshot_quality,r.market_manifest,false,false
from robust r
join public.matches m on m.id=r.match_id
join public.teams ht on ht.id=m.home_team_id
join public.teams at on at.id=m.away_team_id
order by m.kickoff_time,r.match_id,r.selection_total,r.selection_name;
$function$;

create or replace function private.c0120_forward_evaluation_v01()
returns jsonb
language sql
stable
set search_path = public, private, pg_temp
as $function$
with c as materialized (
  select * from private.c0120_forward_candidates_v01()
), finished as materialized (
  select c.*,m.home_score,m.away_score,(m.home_score+m.away_score) actual_total,(m.home_score::text||'-'||m.away_score::text) actual_score
  from c join public.matches m on m.id=c.match_id
  where m.finished=true and m.home_score is not null and m.away_score is not null
), selection_eval as materialized (
  select f.*,case when f.actual_score=f.selection_name then 1 else 0 end hit,
    case when f.actual_score=f.selection_name then f.best_odds-1 else -1 end selection_return,
    case when f.actual_total>f.modal_total then 1 else 0 end above_modal_hit
  from finished f
), fixture_eval as materialized (
  select match_id,split,max(gameweek) gameweek,max(home_team) home_team,max(away_team) away_team,max(actual_score) actual_score,max(actual_total) actual_total,
    count(*) candidate_count,max(above_modal_hit) above_modal_hit,
    case when max(hit)=1 then max(best_odds) filter(where hit=1)/count(*)::numeric-1 else -1 end basket_return
  from selection_eval group by match_id,split
), by_split as materialized (
  select split,count(*) fixtures_finished,sum(candidate_count) candidate_selections,
    avg(above_modal_hit::numeric) above_modal_hit_rate,avg(basket_return) fixture_basket_roi,
    (select avg(selection_return) from selection_eval se where se.split=f.split) selection_level_roi,
    (select sum(hit) from selection_eval se where se.split=f.split) exact_hits
  from fixture_eval f group by split
)
select jsonb_build_object(
  'ok',true,
  'change_id','C0120',
  'experiment_key','E0007',
  'definition',jsonb_build_object('gap_threshold',1.2,'model_probability_floor',0.01,'required_variants',jsonb_build_array('BASE_V03_ELO','FULL_V04_ELO_NO_SCHEDULE'),'required_bookmakers',jsonb_build_array('Bet365','Unibet'),'snapshot_rule','prefer genuine 5-20 minute near-close; otherwise latest captured_at<kickoff fallback','candidate_rule','higher-total exact score with raw EV > 0 across all four variant/bookmaker combinations','primary_roi','1 unit per fixture split equally across qualifying scorelines at best eligible bookmaker odds','no_retuning_from_gw2',true),
  'current_candidate_count',(select count(*) from c),
  'current_candidate_fixtures',(select count(distinct match_id) from c),
  'finished_candidate_fixtures',(select count(*) from fixture_eval),
  'split_metrics',coalesce((select jsonb_agg(jsonb_build_object('split',split,'fixtures_finished',fixtures_finished,'candidate_selections',candidate_selections,'above_modal_hit_rate',round(above_modal_hit_rate,4),'fixture_basket_roi',round(fixture_basket_roi,4),'selection_level_roi',round(selection_level_roi,4),'exact_hits',exact_hits) order by split) from by_split),'[]'::jsonb),
  'actual_data_used_in_generation',false,
  'model_effect_enabled',false
);
$function$;

revoke all on function private.c0120_forward_candidates_v01() from public,anon,authenticated;
revoke all on function private.c0120_forward_evaluation_v01() from public,anon,authenticated;
