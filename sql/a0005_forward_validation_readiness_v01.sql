-- C0115: A0005 forward-validation readiness & near-close capture
-- Applied to production 2026-08-25.
-- Integrity rules:
--   * A0005 stays frozen.
--   * Near-close odds are captured only before kickoff and never reconstructed.
--   * Evaluation is append-only/idempotent and only attaches actuals after a match is finished.
--   * GW2 remains validation; GW3 remains separate test confirmation.

create or replace function private.capture_a0005_near_close_v01()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_ablation_id bigint;
  v_triggered_gameweeks integer[] := '{}';
  v_due_match_ids bigint[] := '{}';
  r record;
begin
  select id into v_ablation_id
  from public.walk_forward_ablation_runs
  where ablation_key='A0005';

  if v_ablation_id is null then
    raise exception 'A0005 not found';
  end if;

  if exists (
    select 1 from public.walk_forward_ablation_runs
    where id=v_ablation_id
      and (actual_data_used_in_generation or model_effect_enabled)
  ) then
    raise exception 'A0005 run integrity violation';
  end if;

  if exists (
    select 1 from public.walk_forward_ablation_predictions
    where ablation_run_id=v_ablation_id
      and (actual_data_used or model_effect_enabled)
  ) then
    raise exception 'A0005 prediction integrity violation';
  end if;

  for r in
    select c.gameweek,
           array_agg(c.match_id order by c.kickoff_time,c.match_id) as due_match_ids
    from public.walk_forward_fixture_cohort c
    join public.walk_forward_ablation_runs ar
      on ar.walk_forward_run_id=c.run_id
    where ar.id=v_ablation_id
      and c.inclusion_status='COMPLETE'
      and c.kickoff_time > clock_timestamp() + interval '5 minutes'
      and c.kickoff_time <= clock_timestamp() + interval '20 minutes'
      and not exists (
        select 1
        from public.odds_raw_snapshots o
        where o.match_id=c.match_id
          and o.pre_kickoff=true
          and o.captured_at >= c.kickoff_time - interval '25 minutes'
          and o.captured_at < c.kickoff_time
      )
    group by c.gameweek
  loop
    perform private.invoke_engine_ingest(
      'ingest-bookmaker-odds',
      jsonb_build_object(
        'gameweek',r.gameweek,
        'bookmakers','Bet365,Unibet',
        'capture_mode','A0005_NEAR_CLOSE'
      )
    );
    v_triggered_gameweeks := array_append(v_triggered_gameweeks,r.gameweek);
    v_due_match_ids := v_due_match_ids || r.due_match_ids;
  end loop;

  return jsonb_build_object(
    'ok',true,
    'ablation_key','A0005',
    'triggered_gameweeks',to_jsonb(v_triggered_gameweeks),
    'due_match_ids',to_jsonb(v_due_match_ids),
    'window','5_to_20_minutes_before_kickoff',
    'actual_data_used',false,
    'model_effect_enabled',false
  );
end;
$$;

create or replace function private.evaluate_a0005_forward_v01()
returns jsonb
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  v_ablation_id bigint;
  v_result jsonb;
begin
  select id into v_ablation_id
  from public.walk_forward_ablation_runs
  where ablation_key='A0005';

  if v_ablation_id is null then
    raise exception 'A0005 not found';
  end if;

  if exists (
    select 1 from public.walk_forward_ablation_runs
    where id=v_ablation_id
      and (actual_data_used_in_generation or model_effect_enabled)
  ) then
    raise exception 'A0005 run integrity violation';
  end if;

  if exists (
    select 1 from public.walk_forward_ablation_predictions
    where ablation_run_id=v_ablation_id
      and (actual_data_used or model_effect_enabled)
  ) then
    raise exception 'A0005 prediction integrity violation';
  end if;

  select public.evaluate_walk_forward_ablation_v01(v_ablation_id)
  into v_result;

  return v_result || jsonb_build_object(
    'ablation_key','A0005',
    'guarded',true,
    'append_only',true,
    'actual_data_used_in_generation',false,
    'model_effect_enabled',false
  );
end;
$$;

create or replace function private.a0005_forward_validation_status_v01()
returns jsonb
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
with ar as (
  select * from public.walk_forward_ablation_runs where ablation_key='A0005'
), cohort as (
  select c.*,m.finished,m.home_score,m.away_score
  from public.walk_forward_fixture_cohort c
  join ar on ar.walk_forward_run_id=c.run_id
  join public.matches m on m.id=c.match_id
  where c.inclusion_status='COMPLETE'
), pred as (
  select p.* from public.walk_forward_ablation_predictions p join ar on ar.id=p.ablation_run_id
), eval as (
  select e.* from public.walk_forward_ablation_evaluations e join ar on ar.id=e.ablation_run_id
), fixture_counts as (
  select split,
         count(*) as fixtures,
         count(*) filter(where finished and home_score is not null and away_score is not null) as finished_fixtures
  from cohort group by split
), evaluated_fixture_counts as (
  select split,count(distinct match_id) as evaluated_fixtures,count(*) as evaluation_rows
  from eval group by split
), variant_metrics as (
  select variant_key,split,count(*) n,
         avg(brier) avg_brier,
         avg(score_log_loss) avg_log_loss,
         avg(direction_hit::int::numeric) direction_accuracy,
         avg(process_mae) avg_process_mae,
         avg(gap_error) avg_gap_error
  from eval
  group by variant_key,split
), near_close as (
  select c.split,
         count(distinct c.match_id) filter(where exists (
           select 1 from public.odds_raw_snapshots o
           where o.match_id=c.match_id and o.pre_kickoff=true
             and o.captured_at >= c.kickoff_time-interval '25 minutes'
             and o.captured_at < c.kickoff_time
         )) as fixtures_with_near_close
  from cohort c group by c.split
), integrity as (
  select
    (select count(*) from ar where actual_data_used_in_generation or model_effect_enabled) as run_violations,
    (select count(*) from pred where actual_data_used or model_effect_enabled) as prediction_violations,
    (select count(*) from (
       select prediction_id,count(*) n from eval group by prediction_id having count(*)>1
     ) d) as duplicate_evaluation_predictions
), state as (
  select
    coalesce((select evaluated_fixtures from evaluated_fixture_counts where split='VALIDATION'),0) validation_evaluated,
    coalesce((select fixtures from fixture_counts where split='VALIDATION'),0) validation_total,
    coalesce((select evaluated_fixtures from evaluated_fixture_counts where split='TEST'),0) test_evaluated,
    coalesce((select fixtures from fixture_counts where split='TEST'),0) test_total
)
select jsonb_build_object(
  'ok',true,
  'ablation_key','A0005',
  'coverage',jsonb_build_object(
    'predictions',(select count(*) from pred),
    'fixtures',(select count(*) from cohort),
    'evaluations',(select count(*) from eval),
    'splits',coalesce((select jsonb_agg(jsonb_build_object(
      'split',f.split,'fixtures',f.fixtures,'finished_fixtures',f.finished_fixtures,
      'evaluated_fixtures',coalesce(e.evaluated_fixtures,0),'evaluation_rows',coalesce(e.evaluation_rows,0),
      'fixtures_with_near_close',coalesce(n.fixtures_with_near_close,0)
    ) order by f.split) from fixture_counts f left join evaluated_fixture_counts e using(split) left join near_close n using(split)),'[]'::jsonb)
  ),
  'integrity',(select to_jsonb(i) from integrity i),
  'variant_metrics',coalesce((select jsonb_agg(to_jsonb(v) order by split,variant_key) from variant_metrics v),'[]'::jsonb),
  'decision_state',(select case
    when validation_evaluated < validation_total then 'ACCUMULATING_GW2_VALIDATION'
    when validation_evaluated = validation_total and test_evaluated < test_total then 'GW2_COMPLETE_REVIEW_ONLY_NO_TUNING'
    when validation_evaluated = validation_total and test_evaluated = test_total then 'GW3_COMPLETE_PROMOTION_GATE_ELIGIBLE'
    else 'INTEGRITY_REVIEW_REQUIRED' end from state),
  'policy',jsonb_build_object(
    'gw2','validation_only_no_retuning',
    'gw3','separate_test_confirmation',
    'promotion','only_after_complete_forward_sample_and_manual_review',
    'missing_clv','null_not_reconstructed'
  )
);
$$;

do $$
begin
  if exists(select 1 from cron.job where jobname='football_intelligence_a0005_near_close') then
    perform cron.unschedule((select jobid from cron.job where jobname='football_intelligence_a0005_near_close' limit 1));
  end if;
  perform cron.schedule(
    'football_intelligence_a0005_near_close',
    '*/5 * * * *',
    'select private.capture_a0005_near_close_v01();'
  );

  if exists(select 1 from cron.job where jobname='football_intelligence_a0005_evaluator') then
    perform cron.unschedule((select jobid from cron.job where jobname='football_intelligence_a0005_evaluator' limit 1));
  end if;
  perform cron.schedule(
    'football_intelligence_a0005_evaluator',
    '8,23,38,53 * * * *',
    'select private.evaluate_a0005_forward_v01();'
  );
end;
$$;
