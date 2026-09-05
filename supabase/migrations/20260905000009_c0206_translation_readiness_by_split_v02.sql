create or replace function private.c0206_foreign_translation_readiness_status_v02()
returns jsonb
language sql
stable
security definer
set search_path to 'private','public','pg_temp'
as $function$
with c as (
  select * from public.research_c0206_foreign_translation_contracts order by created_at desc limit 1
), p as (
  select * from public.research_c0206_foreign_translation_pairs where pair_quality_status='ELIGIBLE'
), split as (
  select cohort_split,
         count(*) total_pairs,
         count(*) filter(where source_competition='Premier League') pl_to_pl_pairs,
         count(*) filter(where source_competition<>'Premier League') foreign_pairs,
         count(*) filter(where source_competition<>'Premier League' and source_minutes>=900) foreign_source_ge900,
         count(*) filter(where source_minutes<450 or destination_minutes<450) minute_gate_violations,
         count(*) filter(where source_xg is null or source_xa is null or destination_xg is null or destination_xa is null) metric_missing,
         count(*) filter(where model_effect_enabled) model_effect_violations,
         count(*) filter(where coalesce((evidence->>'current_2026_27_target_outcomes_used')::boolean,false)) current_target_leakage
  from p group by cohort_split
), league as (
  select cohort_split,source_competition,count(*) pairs,
         jsonb_object_agg(position_group,n) position_pairs
  from (
    select cohort_split,source_competition,position_group,count(*) n
    from p where source_competition<>'Premier League'
    group by cohort_split,source_competition,position_group
  ) z group by cohort_split,source_competition
), league_json as (
  select cohort_split,jsonb_object_agg(source_competition,jsonb_build_object('pairs',pairs,'position_pairs',position_pairs)) leagues
  from league group by cohort_split
), train as (
  select coalesce((select total_pairs from split where cohort_split='TRAIN'),0) total_pairs,
         coalesce((select pl_to_pl_pairs from split where cohort_split='TRAIN'),0) pl_pairs,
         coalesce((select foreign_pairs from split where cohort_split='TRAIN'),0) foreign_pairs,
         coalesce((select minute_gate_violations+metric_missing+model_effect_violations+current_target_leakage from split where cohort_split='TRAIN'),0) integrity_violations
), holdout as (
  select coalesce(sum(minute_gate_violations+metric_missing+model_effect_violations+current_target_leakage),0) integrity_violations
  from split where cohort_split in ('VALIDATION','TEST')
)
select jsonb_build_object(
  'change_id','C0206','contract_key',c.contract_key,'model_effect_enabled',false,
  'contract',jsonb_build_object(
    'minimum_global_pairs',c.minimum_global_pairs,
    'minimum_pl_to_pl_baseline_pairs',c.minimum_pl_to_pl_baseline_pairs,
    'minimum_league_pairs',c.minimum_league_pairs,
    'minimum_direct_league_position_pairs',c.minimum_direct_league_position_pairs,
    'source_min_minutes_exploratory',c.source_min_minutes_exploratory,
    'source_min_minutes_preferred',c.source_min_minutes_preferred,
    'destination_min_minutes',c.destination_min_minutes,
    'holdout_policy',c.holdout_policy
  ),
  'splits',coalesce((select jsonb_object_agg(s.cohort_split,jsonb_build_object(
    'total_pairs',s.total_pairs,'foreign_pairs',s.foreign_pairs,'pl_to_pl_pairs',s.pl_to_pl_pairs,
    'foreign_source_ge900',s.foreign_source_ge900,'minute_gate_violations',s.minute_gate_violations,
    'metric_missing',s.metric_missing,'model_effect_violations',s.model_effect_violations,
    'current_target_leakage',s.current_target_leakage,'leagues',coalesce(lj.leagues,'{}'::jsonb)
  )) from split s left join league_json lj using(cohort_split)),'{}'::jsonb),
  'gates',jsonb_build_object(
    'train_total_ge_global_min',train.total_pairs>=c.minimum_global_pairs,
    'train_supported_foreign_ge_global_min',train.foreign_pairs>=c.minimum_global_pairs,
    'train_pl_to_pl_baseline_gate',train.pl_pairs>=c.minimum_pl_to_pl_baseline_pairs,
    'train_integrity_clean',train.integrity_violations=0,
    'holdout_integrity_clean',holdout.integrity_violations=0,
    'fit_ready_conservative',(train.foreign_pairs>=c.minimum_global_pairs and train.pl_pairs>=c.minimum_pl_to_pl_baseline_pairs and train.integrity_violations=0),
    'promotion_ready',false
  ),
  'notes',jsonb_build_array(
    'TRAIN alone is used for transform scales, hyperparameters and coefficients.',
    'VALIDATION and TEST never satisfy TRAIN sample gates and never tune the translator.',
    'Conservative fit gate interprets minimum_global_pairs over supported foreign source leagues; total TRAIN count is reported separately.',
    'Direct league and league-position effects remain pooled unless their TRAIN sample gates are independently met.'
  )
) from c cross join train cross join holdout;
$function$;
revoke all on function private.c0206_foreign_translation_readiness_status_v02() from public;
grant execute on function private.c0206_foreign_translation_readiness_status_v02() to service_role;