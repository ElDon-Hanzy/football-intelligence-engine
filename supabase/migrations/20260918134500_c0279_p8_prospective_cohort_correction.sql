-- Correct the live P8 freeze after validation exposed two model versions sharing
-- the later capture timestamp. Rebuild from the exact P0 evidence cut.

delete from public.c0279_prospective_shadow_cohort p
using public.c0279_shadow_evaluation_runs r
where p.run_id=r.id and r.contract_version='c0279_p8_shadow_evaluation_v01';

with frozen_fixture as (
 select distinct on (s.match_id) s.*
 from public.fixture_prediction_snapshots s
 where s.gameweek=5
   and s.captured_at='2026-09-17 17:03:00.023321+00'::timestamptz
   and s.source_snapshot->>'generator'='production_fixture_v0.3_c0166'
 order by s.match_id,s.id
), frozen_player_run as (
 select g.* from public.gameweek_prediction_runs g
 where g.gameweek=5 and g.frozen and not g.excluded_from_backtest
   and g.generated_at>=(select max(captured_at) from frozen_fixture)
   and g.generated_at<'2026-09-18 17:30:00+00'::timestamptz
 order by g.generated_at asc,g.id asc limit 1
), hashes as (
 select encode(extensions.digest(string_agg(concat_ws('|',s.id,s.match_id,s.home_lambda,s.away_lambda,s.score_matrix,s.markets),';' order by s.id),'sha256'),'hex') fixture_hash
 from frozen_fixture s
), player_hash as (
 select encode(extensions.digest(string_agg(concat_ws('|',mp.player_id,mp.match_id,mp.expected_minutes,mp.expected_points,mp.p_10_plus,mp.features),';' order by mp.player_id,mp.match_id),'sha256'),'hex') player_projection_hash
 from public.model_predictions mp join frozen_player_run g on g.id=mp.prediction_run_id
), target_run as (
 select id from public.c0279_shadow_evaluation_runs where contract_version='c0279_p8_shadow_evaluation_v01'
)
insert into public.c0279_prospective_shadow_cohort(
 run_id,snapshot_id,match_id,gameweek,prediction_run_id,captured_at,kickoff_time,
 fixture_hash,player_projection_hash,outcome_available_at_freeze,frozen_before_kickoff,production_effect
)
select r.id,s.id,s.match_id,s.gameweek,g.id,s.captured_at,s.kickoff_time,
 h.fixture_hash,ph.player_projection_hash,false,s.captured_at<s.kickoff_time,false
from frozen_fixture s cross join frozen_player_run g cross join hashes h cross join player_hash ph cross join target_run r;

update public.c0279_shadow_evaluation_runs r
set summary=jsonb_set(summary,'{prospective_cohort}',(
 select jsonb_build_object('fixtures',count(*),'prediction_run_ids',jsonb_agg(distinct prediction_run_id),
   'frozen_before_kickoff',count(*) filter(where frozen_before_kickoff),
   'outcomes_available_at_freeze',count(*) filter(where outcome_available_at_freeze),
   'fixture_hash',min(fixture_hash),'player_projection_hash',min(player_projection_hash),
   'selection_policy','EXACT_P0_EVIDENCE_CUT_ONE_SNAPSHOT_PER_MATCH')
 from public.c0279_prospective_shadow_cohort p where p.run_id=r.id
),true)
where r.contract_version='c0279_p8_shadow_evaluation_v01';
