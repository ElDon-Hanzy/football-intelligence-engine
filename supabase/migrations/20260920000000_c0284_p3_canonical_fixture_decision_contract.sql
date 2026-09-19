-- C0284 P3: canonical fixture decision contract.
-- Historical fixture snapshots remain append-only and are never updated here.

create or replace view public.current_fixture_decision_contract_v01
with (security_invoker = true)
as
with base as (
  select
    f.*,
    coalesce(
      f.raw_modal_score,
      (
        select e.key
        from jsonb_each_text(coalesce(f.score_matrix, '{}'::jsonb)) e
        where e.key ~ '^[0-9]+-[0-9]+$'
        order by e.value::numeric desc, e.key
        limit 1
      )
    ) as canonical_raw_modal_score
  from public.current_production_fixture_prediction_v01 f
), classified as (
  select
    b.*,
    e.primary_environment,
    e.environment_confidence,
    e.low_scoring_probability,
    e.normal_scoring_probability,
    e.high_scoring_probability,
    e.expected_total_goals,
    e.dominant_subtype,
    e.subtype_probabilities,
    e.matrix_coverage,
    sf.selected_family,
    sf.selected_family_group,
    sf.selected_family_probability,
    sf.representative_score,
    sf.representative_score_probability,
    sf.raw_modal_probability as canonical_raw_modal_probability,
    sf.raw_modal_family,
    sf.dominant_outcome,
    sf.outcome_edge,
    sf.direction_strength,
    sf.representative_outcome,
    sf.direction_family_coherent,
    sf.environment_family_coherent,
    sf.family_probabilities as score_family_probabilities,
    sf.selection_rule
  from base b
  cross join lateral private.c0279_scoring_environment_classify_v01(
    b.score_matrix,b.home_lambda,b.away_lambda,b.markets
  ) e
  cross join lateral private.c0279_score_family_classify_v01(
    b.score_matrix,e.primary_environment,b.markets,b.canonical_raw_modal_score
  ) sf
), ranked_environment as (
  select
    c.*,
    greatest(c.low_scoring_probability,c.normal_scoring_probability,c.high_scoring_probability) as top_environment_probability,
    case
      when c.primary_environment='LOW_SCORING' then greatest(c.normal_scoring_probability,c.high_scoring_probability)
      when c.primary_environment='NORMAL_SCORING' then greatest(c.low_scoring_probability,c.high_scoring_probability)
      when c.primary_environment='HIGH_SCORING' then greatest(c.low_scoring_probability,c.normal_scoring_probability)
      else null::numeric
    end as second_environment_probability
  from classified c
)
select
  r.id as snapshot_id,
  r.match_id,r.gameweek,r.model_version_id,r.captured_at,r.kickoff_time,
  r.is_pre_kickoff,r.frozen,r.home_lambda,r.away_lambda,r.score_matrix,r.top_scorelines,r.markets,
  r.confidence,r.change_reasons,r.source_snapshot,r.reason_manifest,
  'c0284_fixture_decision_v01'::text as decision_contract_version,
  r.primary_environment,
  jsonb_build_object(
    'low',r.low_scoring_probability,
    'normal',r.normal_scoring_probability,
    'high',r.high_scoring_probability
  ) as scoring_environment_probabilities,
  r.environment_confidence,
  case
    when r.primary_environment='INSUFFICIENT_EVIDENCE' then 'INSUFFICIENT_EVIDENCE'
    when r.top_environment_probability-r.second_environment_probability < .02 then 'BLENDED_NEAR_TIE'
    else 'PRIMARY'
  end as scoring_environment_state,
  r.expected_total_goals,r.dominant_subtype,r.subtype_probabilities,r.matrix_coverage,
  r.selected_family,r.selected_family_group,r.selected_family_probability,r.score_family_probabilities,
  r.representative_score,r.representative_score_probability,r.representative_outcome,
  r.canonical_raw_modal_score as raw_modal_score,
  r.canonical_raw_modal_probability as raw_modal_probability,
  r.raw_modal_family,
  r.dominant_outcome,
  r.outcome_edge,
  case when r.direction_strength='NO_MEANINGFUL_EDGE' then 'NO_MEANINGFUL_EDGE' else r.dominant_outcome end as result_decision,
  r.direction_strength,
  r.direction_family_coherent,r.environment_family_coherent,r.selection_rule,
  (r.is_pre_kickoff and r.captured_at < r.kickoff_time and r.matrix_coverage >= .95) as chronology_and_coverage_valid,
  encode(extensions.digest(concat_ws('|',
    'c0284_fixture_decision_v01',r.id,r.match_id,r.captured_at,
    r.primary_environment,r.low_scoring_probability,r.normal_scoring_probability,r.high_scoring_probability,
    r.selected_family,r.representative_score,r.canonical_raw_modal_score,r.dominant_outcome,r.direction_strength
  ),'sha256'),'hex') as decision_hash
from ranked_environment r;

comment on view public.current_fixture_decision_contract_v01 is
  'C0284 P3 canonical result/scoring-family contract. Full Low/Normal/High distribution is authoritative; near ties are disclosed; NO_MEANINGFUL_EDGE is never converted to DRAW; raw modal and outcome-coherent representative scores are separate. Source forecasts remain append-only.';

revoke all on public.current_fixture_decision_contract_v01 from anon;
grant select on public.current_fixture_decision_contract_v01 to authenticated,service_role;

create or replace function private.c0284_p3_decision_contract_tests_v01(p_gameweek integer)
returns table(test_name text,status text,evidence jsonb)
language sql
stable
security invoker
set search_path=''
as $function$
with d as (
  select * from public.current_fixture_decision_contract_v01 where gameweek=p_gameweek
), checks as (
  select 'ROW_COVERAGE'::text as test_name,
    case when count(*)=10 then 'PASS' else 'FAIL' end as status,
    jsonb_build_object('rows',count(*),'expected',10) as evidence from d
  union all
  select 'ENVIRONMENT_SUMS_TO_ONE',
    case when coalesce(max(abs((scoring_environment_probabilities->>'low')::numeric+(scoring_environment_probabilities->>'normal')::numeric+(scoring_environment_probabilities->>'high')::numeric-1)),1)<=.000002 then 'PASS' else 'FAIL' end,
    jsonb_build_object('max_absolute_error',coalesce(max(abs((scoring_environment_probabilities->>'low')::numeric+(scoring_environment_probabilities->>'normal')::numeric+(scoring_environment_probabilities->>'high')::numeric-1)),1)) from d
  union all
  select 'MATRIX_COVERAGE',
    case when count(*)>0 and bool_and(chronology_and_coverage_valid) then 'PASS' else 'FAIL' end,
    jsonb_build_object('minimum_matrix_coverage',min(matrix_coverage),'invalid_rows',count(*) filter(where not chronology_and_coverage_valid)) from d
  union all
  select 'NO_EDGE_NOT_DRAW',
    case when count(*) filter(where direction_strength='NO_MEANINGFUL_EDGE' and result_decision='DRAW')=0 then 'PASS' else 'FAIL' end,
    jsonb_build_object('violations',count(*) filter(where direction_strength='NO_MEANINGFUL_EDGE' and result_decision='DRAW')) from d
  union all
  select 'SCORES_SEPARATED',
    case when count(*) filter(where representative_score is null or raw_modal_score is null)=0 then 'PASS' else 'FAIL' end,
    jsonb_build_object('missing_rows',count(*) filter(where representative_score is null or raw_modal_score is null),'different_rows',count(*) filter(where representative_score is distinct from raw_modal_score)) from d
  union all
  select 'HIGH_SUBTYPE_PARENT',
    case when count(*) filter(where dominant_subtype in ('SHOOTOUT','DEMOLITION') and primary_environment<>'HIGH_SCORING')=0 then 'PASS' else 'FAIL' end,
    jsonb_build_object('violations',count(*) filter(where dominant_subtype in ('SHOOTOUT','DEMOLITION') and primary_environment<>'HIGH_SCORING')) from d
)
select test_name,status,evidence from checks;
$function$;

revoke all on function private.c0284_p3_decision_contract_tests_v01(integer) from public,anon,authenticated;
grant execute on function private.c0284_p3_decision_contract_tests_v01(integer) to service_role;
