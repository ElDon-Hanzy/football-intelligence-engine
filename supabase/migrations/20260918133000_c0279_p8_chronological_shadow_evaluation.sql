-- C0279 P8: chronological shadow evaluation and prospective cohort freeze.
-- Negative evidence is first-class. No production consumer is changed.

create table if not exists public.c0279_shadow_evaluation_runs (
  id bigint generated always as identity primary key,
  contract_version text not null unique,
  created_at timestamptz not null default now(),
  evaluation_status text not null check (evaluation_status in ('PASS','BLOCKED_FOR_PROMOTION','FAIL')),
  prior_season_status text not null,
  replay_status text not null,
  prospective_status text not null,
  player_tail_status text not null,
  captaincy_chip_status text not null,
  summary jsonb not null,
  negative_evidence jsonb not null,
  production_effect boolean not null default false check (not production_effect),
  evidence_hash text not null
);

create table if not exists public.c0279_fixture_shadow_evaluations (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.c0279_shadow_evaluation_runs(id),
  snapshot_id bigint not null references public.fixture_prediction_snapshots(id),
  match_id bigint not null references public.matches(id),
  gameweek integer not null,
  captured_at timestamptz not null,
  kickoff_time timestamptz not null,
  actual_home_goals integer not null,
  actual_away_goals integer not null,
  actual_outcome text not null,
  primary_environment text not null,
  actual_environment text not null,
  environment_hit boolean not null,
  selected_family text not null,
  actual_family text not null,
  family_hit boolean not null,
  representative_score text,
  representative_score_hit boolean not null,
  raw_modal_score text,
  raw_modal_score_hit boolean,
  actual_score_probability numeric not null,
  exact_score_log_loss numeric not null,
  brier_1x2 numeric not null,
  brier_over_2_5 numeric not null,
  brier_btts numeric not null,
  total_goal_absolute_error numeric not null,
  chronology_valid boolean not null,
  production_effect boolean not null default false check (not production_effect),
  evidence jsonb not null,
  evidence_hash text not null,
  unique(run_id,snapshot_id)
);

create table if not exists public.c0279_prospective_shadow_cohort (
  id bigint generated always as identity primary key,
  run_id bigint not null references public.c0279_shadow_evaluation_runs(id),
  snapshot_id bigint not null references public.fixture_prediction_snapshots(id),
  match_id bigint not null references public.matches(id),
  gameweek integer not null,
  prediction_run_id bigint not null references public.gameweek_prediction_runs(id),
  captured_at timestamptz not null,
  kickoff_time timestamptz not null,
  fixture_hash text not null,
  player_projection_hash text not null,
  outcome_available_at_freeze boolean not null,
  frozen_before_kickoff boolean not null,
  production_effect boolean not null default false check (not production_effect),
  unique(run_id,snapshot_id)
);

alter table public.c0279_shadow_evaluation_runs enable row level security;
alter table public.c0279_fixture_shadow_evaluations enable row level security;
alter table public.c0279_prospective_shadow_cohort enable row level security;

revoke all on public.c0279_shadow_evaluation_runs from public,anon,authenticated;
revoke all on public.c0279_fixture_shadow_evaluations from public,anon,authenticated;
revoke all on public.c0279_prospective_shadow_cohort from public,anon,authenticated;
grant select on public.c0279_shadow_evaluation_runs to service_role;
grant select on public.c0279_fixture_shadow_evaluations to service_role;
grant select on public.c0279_prospective_shadow_cohort to service_role;

create index if not exists c0279_fixture_eval_run_gw_idx
  on public.c0279_fixture_shadow_evaluations(run_id,gameweek);
create index if not exists c0279_prospective_run_gw_idx
  on public.c0279_prospective_shadow_cohort(run_id,gameweek);

insert into public.c0279_shadow_evaluation_runs(
  contract_version,evaluation_status,prior_season_status,replay_status,
  prospective_status,player_tail_status,captaincy_chip_status,summary,
  negative_evidence,production_effect,evidence_hash
)
values(
  'c0279_p8_shadow_evaluation_v01','BLOCKED_FOR_PROMOTION',
  'BLOCKED_NO_GENUINE_HISTORICAL_PREMATCH_PREDICTION_OUTCOME_PAIRS',
  'READY','FROZEN_PENDING_OUTCOMES',
  'BLOCKED_RETROACTIVE_ROLE_STATE_NOT_ASOF_SAFE',
  'BLOCKED_NO_CHRONOLOGICAL_DECISION_REPLAY',
  '{}'::jsonb,
  jsonb_build_array(
    jsonb_build_object('gate','PRIOR_SEASON_BACKTEST','status','BLOCKED','reason','Historical feature rows are chronology-safe but zero are genuine historical captures; no trustworthy prematch prediction/outcome pairs exist.'),
    jsonb_build_object('gate','PLAYER_TAIL_CALIBRATION','status','BLOCKED','reason','The P5 bridge resolves roles from current_player_state_latest, so retroactive use would leak later role state.'),
    jsonb_build_object('gate','CAPTAINCY_CHIP_REGRET','status','BLOCKED','reason','No immutable as-of replay of the full XV, named challengers and C0277 opportunity-cost state exists for GW1-GW4.'),
    jsonb_build_object('gate','GW1_FIXTURE_COVERAGE','status','PARTIAL','reason','Only eight of ten fixtures have eligible pre-kickoff fixture snapshots.')
  ),false,
  encode(extensions.digest('c0279_p8_shadow_evaluation_v01|BLOCKED_FOR_PROMOTION|negative_evidence_retained','sha256'),'hex')
)
on conflict(contract_version) do nothing;

with chosen as (
  select distinct on (s.match_id)
    s.*,m.home_score,m.away_score
  from public.fixture_prediction_snapshots s
  join public.matches m on m.id=s.match_id
  where s.gameweek between 1 and 4
    and s.captured_at<s.kickoff_time
    and m.finished
    and m.home_score is not null and m.away_score is not null
  order by s.match_id,s.captured_at desc,s.id desc
), classified as (
  select c.*,e.primary_environment,f.selected_family,f.representative_headline_score,
         f.raw_modal_score evaluated_raw_modal_score,
         case when c.home_score>c.away_score then 'HOME' when c.home_score<c.away_score then 'AWAY' else 'DRAW' end actual_outcome,
         case when c.home_score+c.away_score<=2 then 'LOW_SCORING'
              when c.home_score+c.away_score<=4 then 'NORMAL_SCORING' else 'HIGH_SCORING' end actual_environment,
         case
          when c.home_score=c.away_score and c.home_score+c.away_score<=2 then 'LOW_SCORING_PARITY'
          when c.home_score=c.away_score then 'HIGH_SCORING_PARITY'
          when c.home_score>=2 and c.away_score>=2 and c.home_score+c.away_score>=5 then 'SHOOTOUT'
          when abs(c.home_score-c.away_score)>=3 and c.home_score>c.away_score then 'HOME_DEMOLITION'
          when abs(c.home_score-c.away_score)>=3 then 'AWAY_DEMOLITION'
          when c.home_score-c.away_score=2 then 'COMFORTABLE_HOME_WIN'
          when c.away_score-c.home_score=2 then 'COMFORTABLE_AWAY_WIN'
          when c.home_score>c.away_score then 'NARROW_HOME_WIN'
          else 'NARROW_AWAY_WIN' end actual_family
  from chosen c
  cross join lateral private.c0279_scoring_environment_snapshot_v01(c.id)e
  cross join lateral private.c0279_score_family_snapshot_v01(c.id)f
), scored as (
  select x.*,
    coalesce(nullif(x.score_matrix->>concat(x.home_score,'-',x.away_score),'')::numeric,0.000000000001) actual_score_p,
    coalesce(nullif(x.markets->>'home_win','')::numeric,0) hp,
    coalesce(nullif(x.markets->>'draw','')::numeric,0) dp,
    coalesce(nullif(x.markets->>'away_win','')::numeric,0) ap,
    coalesce(nullif(x.markets->>'over_2_5','')::numeric,0) over_p,
    coalesce(nullif(x.markets->>'btts_yes','')::numeric,0) btts_p
  from classified x
), target_run as (
  select id from public.c0279_shadow_evaluation_runs where contract_version='c0279_p8_shadow_evaluation_v01'
)
insert into public.c0279_fixture_shadow_evaluations(
 run_id,snapshot_id,match_id,gameweek,captured_at,kickoff_time,
 actual_home_goals,actual_away_goals,actual_outcome,primary_environment,actual_environment,environment_hit,
 selected_family,actual_family,family_hit,representative_score,representative_score_hit,
 raw_modal_score,raw_modal_score_hit,actual_score_probability,exact_score_log_loss,
 brier_1x2,brier_over_2_5,brier_btts,total_goal_absolute_error,
 chronology_valid,production_effect,evidence,evidence_hash
)
select r.id,s.id,s.match_id,s.gameweek,s.captured_at,s.kickoff_time,
 s.home_score,s.away_score,s.actual_outcome,s.primary_environment,s.actual_environment,s.primary_environment=s.actual_environment,
 s.selected_family,s.actual_family,s.selected_family=s.actual_family,s.representative_headline_score,
 s.representative_headline_score=concat(s.home_score,'-',s.away_score),
 s.evaluated_raw_modal_score,
 case when s.evaluated_raw_modal_score is null then null else s.evaluated_raw_modal_score=concat(s.home_score,'-',s.away_score) end,
 s.actual_score_p,-ln(greatest(s.actual_score_p,0.000000000001)),
 power(s.hp-(s.actual_outcome='HOME')::int,2)+power(s.dp-(s.actual_outcome='DRAW')::int,2)+power(s.ap-(s.actual_outcome='AWAY')::int,2),
 power(s.over_p-((s.home_score+s.away_score)>2)::int,2),
 power(s.btts_p-((s.home_score>0 and s.away_score>0))::int,2),
 abs((s.home_lambda+s.away_lambda)-(s.home_score+s.away_score)),
 s.captured_at<s.kickoff_time,false,
 jsonb_build_object('snapshot_selection','LATEST_CAPTURE_STRICTLY_BEFORE_KICKOFF','score_matrix_preserved',true,
   'markets_preserved',true,'actual_data_used_in_generation',false,'production_effect',false),
 encode(extensions.digest(concat_ws('|','c0279_p8_fixture_v01',s.id,s.match_id,s.captured_at,s.home_score,s.away_score,
   s.primary_environment,s.selected_family,s.representative_headline_score,s.actual_score_p),'sha256'),'hex')
from scored s cross join target_run r
on conflict(run_id,snapshot_id) do nothing;

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
from frozen_fixture s cross join frozen_player_run g cross join hashes h cross join player_hash ph cross join target_run r
on conflict(run_id,snapshot_id) do nothing;

update public.c0279_shadow_evaluation_runs r
set summary=jsonb_build_object(
 'fixture_replay',(
   select jsonb_build_object(
    'fixtures',count(*),'gameweeks',jsonb_agg(distinct gameweek),
    'chronology_valid',count(*) filter(where chronology_valid),
    'environment_accuracy',round(avg(environment_hit::int),6),
    'family_accuracy',round(avg(family_hit::int),6),
    'representative_exact_accuracy',round(avg(representative_score_hit::int),6),
    'raw_modal_exact_accuracy',round(avg(raw_modal_score_hit::int) filter(where raw_modal_score_hit is not null),6),
    'mean_brier_1x2',round(avg(brier_1x2),6),
    'mean_brier_over_2_5',round(avg(brier_over_2_5),6),
    'mean_brier_btts',round(avg(brier_btts),6),
    'mean_exact_score_log_loss',round(avg(exact_score_log_loss),6),
    'mean_total_goal_absolute_error',round(avg(total_goal_absolute_error),6)
   ) from public.c0279_fixture_shadow_evaluations e where e.run_id=r.id
 ),
 'prospective_cohort',(
   select jsonb_build_object('fixtures',count(*),'prediction_run_ids',jsonb_agg(distinct prediction_run_id),
     'frozen_before_kickoff',count(*) filter(where frozen_before_kickoff),
     'outcomes_available_at_freeze',count(*) filter(where outcome_available_at_freeze),
     'fixture_hash',min(fixture_hash),'player_projection_hash',min(player_projection_hash))
   from public.c0279_prospective_shadow_cohort p where p.run_id=r.id
 ),
 'core_probability_delta','ZERO_BY_DESIGN_P3_P7_CONSUME_PRESERVED_MATRIX',
 'promotion_gate','BLOCKED_PENDING_GENUINE_PRIOR_SEASON_AND_ASOF_PLAYER_CAPTAINCY_REPLAY'
)
where r.contract_version='c0279_p8_shadow_evaluation_v01';

comment on table public.c0279_shadow_evaluation_runs is 'C0279 P8 append-only shadow evaluation ledger; zero production effect.';
comment on table public.c0279_fixture_shadow_evaluations is 'C0279 P8 chronology-safe GW1-GW4 fixture evaluation rows.';
comment on table public.c0279_prospective_shadow_cohort is 'C0279 P8 frozen GW5 prospective cohort; outcomes unavailable at freeze.';
