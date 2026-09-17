-- C0279 P1: canonical season-performance state contract (shadow only)
-- Production selectors and historical forecasts are intentionally unchanged.

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
      when p_completed_matches = 1 then 0.40::numeric
      when p_completed_matches = 2 then 0.55::numeric
      when p_completed_matches = 3 then 0.65::numeric
      when p_completed_matches between 4 and 5 then 0.75::numeric
      when p_completed_matches = 6 then 0.80::numeric
      when p_completed_matches = 7 then 0.85::numeric
      when p_completed_matches = 8 then 0.90::numeric
      else 1.00::numeric
    end,
    case
      when p_completed_matches is null or p_completed_matches < 0 then null::numeric
      when p_completed_matches = 0 then 1.00::numeric
      when p_completed_matches = 1 then 0.60::numeric
      when p_completed_matches = 2 then 0.45::numeric
      when p_completed_matches = 3 then 0.35::numeric
      when p_completed_matches between 4 and 5 then 0.25::numeric
      when p_completed_matches = 6 then 0.20::numeric
      when p_completed_matches = 7 then 0.15::numeric
      when p_completed_matches = 8 then 0.10::numeric
      else 0.00::numeric
    end,
    case
      when p_completed_matches is null then 'INVALID_NULL_SAMPLE'
      when p_completed_matches < 0 then 'INVALID_NEGATIVE_SAMPLE'
      when p_completed_matches = 0 then 'PRIOR_ONLY_NO_CURRENT_MATCHES'
      when p_completed_matches = 1 then 'CURRENT_40_PRIOR_60'
      when p_completed_matches = 2 then 'CURRENT_55_PRIOR_45'
      when p_completed_matches = 3 then 'CURRENT_65_PRIOR_35'
      when p_completed_matches between 4 and 5 then 'CURRENT_75_PRIOR_25'
      when p_completed_matches = 6 then 'CURRENT_80_PRIOR_20'
      when p_completed_matches = 7 then 'CURRENT_85_PRIOR_15'
      when p_completed_matches = 8 then 'CURRENT_90_PRIOR_10'
      else 'CURRENT_100_PRIOR_0'
    end;
$function$;

revoke execute on function private.c0279_season_performance_weights_v01(integer)
from public, anon, authenticated;

create or replace function private.c0279_team_season_state_asof_v01(
  p_team_id bigint,
  p_target_kickoff timestamptz,
  p_season_start integer default null
)
returns table (
  contract_version text,
  state_id bigint,
  season_start integer,
  team_id bigint,
  target_kickoff timestamptz,
  state_as_of timestamptz,
  chronology_valid boolean,
  current_season_sample integer,
  current_season_weight numeric,
  previous_season_weight numeric,
  weight_band text,
  prior_source text,
  current_xg_for_90 numeric,
  prior_xg_for_90 numeric,
  blended_xg_for_90 numeric,
  current_xg_against_90 numeric,
  prior_xg_against_90 numeric,
  blended_xg_against_90 numeric,
  performance_inputs_complete boolean,
  orthogonal_modifiers_applied boolean,
  legacy_cross_season_l5_consumed boolean,
  legacy_cross_season_l10_consumed boolean,
  legacy_l20_consumed boolean,
  lineage jsonb,
  evidence_hash text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with chosen as (
    select s.*
    from public.current_season_team_performance_states s
    where s.team_id = p_team_id
      and s.as_of < p_target_kickoff
      and (p_season_start is null or s.season_start = p_season_start)
    order by s.as_of desc, s.id desc
    limit 1
  ),
  weighted as (
    select c.*, w.current_season_weight, w.previous_season_weight, w.weight_band
    from chosen c
    cross join lateral private.c0279_season_performance_weights_v01(c.completed_matches) w
  )
  select
    'c0279_season_state_v01'::text,
    w.id, w.season_start, w.team_id, p_target_kickoff, w.as_of,
    (w.as_of < p_target_kickoff),
    w.completed_matches, w.current_season_weight, w.previous_season_weight,
    w.weight_band, w.prior_source,
    w.current_xg_for_90, w.prior_xg_for_90,
    case
      when w.current_season_weight = 0 and w.prior_xg_for_90 is not null then w.prior_xg_for_90
      when w.previous_season_weight = 0 and w.current_xg_for_90 is not null then w.current_xg_for_90
      when w.current_xg_for_90 is not null and w.prior_xg_for_90 is not null
        then round(w.current_season_weight*w.current_xg_for_90 + w.previous_season_weight*w.prior_xg_for_90, 6)
      else null::numeric
    end,
    w.current_xg_against_90, w.prior_xg_against_90,
    case
      when w.current_season_weight = 0 and w.prior_xg_against_90 is not null then w.prior_xg_against_90
      when w.previous_season_weight = 0 and w.current_xg_against_90 is not null then w.current_xg_against_90
      when w.current_xg_against_90 is not null and w.prior_xg_against_90 is not null
        then round(w.current_season_weight*w.current_xg_against_90 + w.previous_season_weight*w.prior_xg_against_90, 6)
      else null::numeric
    end,
    ((w.current_season_weight = 0 or w.current_xg_for_90 is not null)
      and (w.previous_season_weight = 0 or w.prior_xg_for_90 is not null)
      and (w.current_season_weight = 0 or w.current_xg_against_90 is not null)
      and (w.previous_season_weight = 0 or w.prior_xg_against_90 is not null)),
    false, false, false, false,
    jsonb_build_object(
      'contract_version','c0279_season_state_v01',
      'source_relation','public.current_season_team_performance_states',
      'source_state_id',w.id,
      'source_evidence_hash',w.evidence_hash,
      'source_as_of',w.as_of,
      'target_kickoff',p_target_kickoff,
      'current_season_sample',w.completed_matches,
      'current_season_weight',w.current_season_weight,
      'previous_season_weight',w.previous_season_weight,
      'prior_source',w.prior_source,
      'legacy_weight_curve',w.source_manifest->>'weight_curve',
      'orthogonal_modifiers_applied',false,
      'legacy_cross_season_l5_consumed',false,
      'legacy_cross_season_l10_consumed',false,
      'legacy_l20_consumed',false,
      'missing_is_not_zero',true,
      'shadow_only',true,
      'production_effect',false
    ),
    encode(extensions.digest(concat_ws('|',
      'c0279_season_state_v01',w.id,w.evidence_hash,p_target_kickoff,
      w.completed_matches,w.current_season_weight,w.previous_season_weight,
      coalesce(w.current_xg_for_90::text,'UNKNOWN'),coalesce(w.prior_xg_for_90::text,'UNKNOWN'),
      coalesce(w.current_xg_against_90::text,'UNKNOWN'),coalesce(w.prior_xg_against_90::text,'UNKNOWN')
    ),'sha256'),'hex')
  from weighted w;
$function$;

revoke execute on function private.c0279_team_season_state_asof_v01(bigint,timestamptz,integer)
from public, anon, authenticated;

comment on function private.c0279_season_performance_weights_v01(integer)
is 'C0279 P1 canonical current/previous season performance weight schedule. Shadow-only contract.';

comment on function private.c0279_team_season_state_asof_v01(bigint,timestamptz,integer)
is 'C0279 P1 chronology-safe shadow season state. Pure performance blend; structural/tactical modifiers remain orthogonal and unapplied.';
