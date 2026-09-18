-- Pin the prospective cohort to the C0166 snapshot set frozen by C0279 P0.

with target as (
 select distinct on (s.match_id) s.id,s.match_id
 from public.fixture_prediction_snapshots s
 where s.gameweek=5
   and s.captured_at='2026-09-17 17:03:00.023321+00'::timestamptz
   and s.source_snapshot->>'generator'='production_fixture_v0.3_c0166'
 order by s.match_id,s.id
), target_run as (
 select id from public.c0279_shadow_evaluation_runs where contract_version='c0279_p8_shadow_evaluation_v01'
)
update public.c0279_prospective_shadow_cohort p
set snapshot_id=t.id
from target t,target_run r
where p.run_id=r.id and p.match_id=t.match_id;

with target_run as (
 select id from public.c0279_shadow_evaluation_runs where contract_version='c0279_p8_shadow_evaluation_v01'
), h as (
 select encode(extensions.digest(string_agg(concat_ws('|',s.id,s.match_id,s.home_lambda,s.away_lambda,s.score_matrix,s.markets),';' order by s.id),'sha256'),'hex') fixture_hash
 from public.c0279_prospective_shadow_cohort p
 join target_run r on r.id=p.run_id
 join public.fixture_prediction_snapshots s on s.id=p.snapshot_id
)
update public.c0279_prospective_shadow_cohort p
set fixture_hash=h.fixture_hash
from h,target_run r where p.run_id=r.id;

update public.c0279_shadow_evaluation_runs r
set summary=jsonb_set(summary,'{prospective_cohort}',(
 select jsonb_build_object('fixtures',count(*),'prediction_run_ids',jsonb_agg(distinct prediction_run_id),
   'frozen_before_kickoff',count(*) filter(where frozen_before_kickoff),
   'outcomes_available_at_freeze',count(*) filter(where outcome_available_at_freeze),
   'fixture_hash',min(fixture_hash),'player_projection_hash',min(player_projection_hash),
   'selection_policy','EXACT_P0_C0166_EVIDENCE_CUT_ONE_SNAPSHOT_PER_MATCH')
 from public.c0279_prospective_shadow_cohort p where p.run_id=r.id
),true)
where r.contract_version='c0279_p8_shadow_evaluation_v01';
