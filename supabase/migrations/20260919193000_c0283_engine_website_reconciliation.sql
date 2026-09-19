-- C0283: canonical current-season weighting and public explanation alignment.
-- Historical fixture and player prediction snapshots remain immutable.

create or replace function private.c0279_season_performance_weights_v01(
  p_completed_matches integer
)
returns table (
  current_season_weight numeric,
  previous_season_weight numeric,
  weight_band text
)
language sql
immutable
security invoker
set search_path = ''
as $function$
  select
    case
      when p_completed_matches is null or p_completed_matches < 0 then null::numeric
      when p_completed_matches = 0 then 0.00::numeric
      when p_completed_matches between 1 and 4 then 0.75::numeric
      when p_completed_matches = 5 then 0.80::numeric
      when p_completed_matches = 6 then 0.85::numeric
      when p_completed_matches = 7 then 0.90::numeric
      when p_completed_matches = 8 then 0.95::numeric
      else 1.00::numeric
    end,
    case
      when p_completed_matches is null or p_completed_matches < 0 then null::numeric
      when p_completed_matches = 0 then 1.00::numeric
      when p_completed_matches between 1 and 4 then 0.25::numeric
      when p_completed_matches = 5 then 0.20::numeric
      when p_completed_matches = 6 then 0.15::numeric
      when p_completed_matches = 7 then 0.10::numeric
      when p_completed_matches = 8 then 0.05::numeric
      else 0.00::numeric
    end,
    case
      when p_completed_matches is null then 'INVALID_NULL_SAMPLE'
      when p_completed_matches < 0 then 'INVALID_NEGATIVE_SAMPLE'
      when p_completed_matches = 0 then 'PRIOR_ONLY_NO_CURRENT_MATCHES'
      when p_completed_matches between 1 and 4 then 'CURRENT_75_PRIOR_25'
      when p_completed_matches = 5 then 'CURRENT_80_PRIOR_20'
      when p_completed_matches = 6 then 'CURRENT_85_PRIOR_15'
      when p_completed_matches = 7 then 'CURRENT_90_PRIOR_10'
      when p_completed_matches = 8 then 'CURRENT_95_PRIOR_5'
      else 'CURRENT_100_PRIOR_0'
    end;
$function$;

revoke execute on function private.c0279_season_performance_weights_v01(integer)
from public, anon, authenticated;

comment on function private.c0279_season_performance_weights_v01(integer)
is 'Canonical season-performance weights: prior capped at 25% after the first completed match and zero from nine matches.';

create or replace view public.current_fixture_card_facts_v01 as
select
  id, snapshot_run_id, match_id, gameweek, team_id, opponent_team_id,
  fact_type, usefulness_score, candidate_rank, one_liner, payload,
  source_fact_ids, evidence_cutoff, created_at, alignment, card_rank
from public.current_fixture_modal_facts_v01
where alignment = 'SUPPORTS'
  and card_rank between 1 and 3
  and fact_type !~* '(^|_)(L5|L10|L20)(_|$)'
  and one_liner !~* 'last[[:space:]]+(five|10|ten|20|twenty)'
order by match_id, card_rank;

comment on view public.current_fixture_card_facts_v01
is 'Prediction-snapshot-aligned public card evidence. Legacy rolling cross-season L5/L10/L20 prose is excluded.';
