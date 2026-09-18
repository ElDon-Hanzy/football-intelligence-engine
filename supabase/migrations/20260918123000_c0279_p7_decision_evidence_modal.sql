-- C0279 P7: shadow-only matchup modal Decision-Evidence Contract.
-- No production prediction, recommendation, chip or captaincy state is mutated.

create or replace function private.c0279_decision_evidence_modal_v01(
  p_snapshot_id bigint,
  p_prediction_run_id bigint
)
returns table (
  contract_version text,
  snapshot_id bigint,
  prediction_run_id bigint,
  match_id bigint,
  gameweek integer,
  fixture_label text,
  decision_ready boolean,
  conclusion jsonb,
  supporting_evidence jsonb,
  risks jsonb,
  reconciliation jsonb,
  player_implications jsonb,
  additional_context jsonb,
  audit jsonb,
  chronology_valid boolean,
  production_effect boolean,
  lineage jsonb,
  evidence_hash text
)
language sql
stable
set search_path = ''
as $function$
with fx as (
  select s.*, m.home_team_id, m.away_team_id,
         ht.name home_name, at.name away_name,
         ht.short_name home_short, at.short_name away_short
  from public.fixture_prediction_snapshots s
  join public.matches m on m.id = s.match_id
  join public.teams ht on ht.id = m.home_team_id
  join public.teams at on at.id = m.away_team_id
  where s.id = p_snapshot_id
),
env as (
  select * from private.c0279_scoring_environment_snapshot_v01(p_snapshot_id)
),
fam as (
  select * from private.c0279_score_family_snapshot_v01(p_snapshot_id)
),
player_pool as (
  select p.*,
         row_number() over (
           partition by p.team_id
           order by p.p10_at_4_plus desc, p.scoring_share desc, p.assist_share desc, p.player_id
         ) as team_rank
  from private.c0279_conditional_player_snapshot_v01(p_snapshot_id, p_prediction_run_id) p
  where p.minutes_role_gate = 'ELIGIBLE'
),
player_summary as (
  select coalesce(jsonb_agg(jsonb_build_object(
           'team', team_short,
           'side', side,
           'rank', team_rank,
           'player_id', player_id,
           'player', player_name,
           'role', player_role,
           'expected_minutes', round(expected_minutes, 1),
           'start_probability', round(start_probability, 4),
           'p10_if_team_scores_4_plus', round(p10_at_4_plus, 4),
           'scoring_share', round(scoring_share, 4),
           'assist_share', round(assist_share, 4),
           'interpretation', format('%s is an eligible upside candidate if %s reach the high-scoring tail; this is not an automatic captaincy or chip instruction.', player_name, team_short)
         ) order by side desc, team_rank), '[]'::jsonb) items
  from player_pool
  where team_rank <= 3
),
tactical as (
  select count(*)::int observation_count,
         count(distinct t.team_id)::int teams_covered,
         bool_and(not t.model_effect_enabled) all_research_only,
         bool_and(t.evidence_cutoff <= t.kickoff_time) chronology_safe,
         min(t.captured_at) captured_at,
         jsonb_agg(jsonb_build_object(
           'team_id', t.team_id,
           'signal_family', t.signal_family,
           'signal_key', t.signal_key,
           'direction', t.direction,
           'score', round(t.score, 4),
           'model_effect_enabled', t.model_effect_enabled
         ) order by t.team_id, t.signal_family, t.signal_key) observations
  from public.current_fixture_tactical_matchups t
  join fx on fx.match_id = t.match_id
  where t.evidence_cutoff <= fx.kickoff_time
    and t.captured_at <= fx.captured_at
),
parts as (
  select fx.*, env.primary_environment, env.environment_confidence,
         env.expected_total_goals, env.over_2_5_probability, env.btts_probability,
         env.high_scoring_probability, env.low_scoring_probability,
         env.goals_5_plus_probability, env.dominant_subtype,
         env.chronology_valid env_chronology_valid,
         fam.selected_family, fam.selected_family_probability,
         fam.representative_headline_score, fam.representative_score_probability,
         fam.raw_modal_score family_raw_modal_score,
         fam.raw_modal_probability family_raw_modal_probability,
         fam.dominant_outcome, fam.outcome_edge, fam.direction_strength,
         fam.direction_family_coherent, fam.environment_family_coherent,
         fam.chronology_valid family_chronology_valid,
         ps.items player_items,
         tactical.observation_count tactical_count,
         tactical.teams_covered tactical_teams,
         tactical.all_research_only,
         tactical.chronology_safe tactical_chronology_valid,
         tactical.captured_at tactical_captured_at,
         tactical.observations tactical_observations
  from fx cross join env cross join fam cross join player_summary ps cross join tactical
),
sections as (
  select p.*,
    jsonb_build_object(
      'classification', primary_environment,
      'subtype', dominant_subtype,
      'representative_score', representative_headline_score,
      'plain_language', format(
        '%s vs %s is classified as %s (%s). %s is a representative score for that family, not a claim that it is the single most likely exact result. The result direction is only %s.',
        home_name, away_name, replace(primary_environment, '_', ' '), replace(dominant_subtype, '_', ' '),
        representative_headline_score, lower(direction_strength)
      )
    ) conclusion_j,
    jsonb_build_array(
      jsonb_build_object('id','expected_total_goals','effect','SUPPORTS_CONCLUSION','value',round(expected_total_goals,3),
        'text',format('The score matrix expects %s total goals.', round(expected_total_goals,2))),
      jsonb_build_object('id','over_2_5','effect','SUPPORTS_CONCLUSION','value',round(over_2_5_probability,4),
        'text',format('Over 2.5 goals carries a %s%% probability.', round(over_2_5_probability*100,1))),
      jsonb_build_object('id','both_teams_to_score','effect','SUPPORTS_CONCLUSION','value',round(btts_probability,4),
        'text',format('Both teams scoring carries a %s%% probability.', round(btts_probability*100,1))),
      jsonb_build_object('id','high_scoring_family','effect','SUPPORTS_CONCLUSION','value',round(high_scoring_probability,4),
        'text',format('The combined high-scoring family has %s%% probability; shootout is explicitly part of that family.', round(high_scoring_probability*100,1))),
      jsonb_build_object('id','selected_score_family','effect','SUPPORTS_CONCLUSION','value',round(selected_family_probability,4),
        'text',format('%s is the selected direction-coherent score family with %s%% aggregate probability.', replace(selected_family,'_',' '), round(selected_family_probability*100,1)))
    ) support_j,
    jsonb_build_array(
      jsonb_build_object('id','weak_result_direction','effect','LIMITS_CERTAINTY','value',round(outcome_edge,4),
        'text',format('The %s result lean is %s: the outcome edge is only %s percentage points.', lower(dominant_outcome), lower(direction_strength), round(outcome_edge*100,1))),
      jsonb_build_object('id','isolated_modal_cell','effect','LIMITS_CERTAINTY','value',round(family_raw_modal_probability,4),
        'text',format('%s remains the largest isolated exact-score cell at %s%%, so the representative score should not be read literally.', family_raw_modal_score, round(family_raw_modal_probability*100,1))),
      jsonb_build_object('id','extreme_goal_tail','effect','LIMITS_CERTAINTY','value',round(goals_5_plus_probability,4),
        'text',format('Five or more goals has %s%% probability: meaningful upside, but far from certain.', round(goals_5_plus_probability*100,1))),
      jsonb_build_object('id','environment_margin','effect','LIMITS_CERTAINTY','value',round(environment_confidence,4),
        'text',format('The scoring-environment lead over the next category is %s percentage points, so confidence is measured.', round(environment_confidence*100,1)))
    ) risks_j,
    jsonb_build_array(
      jsonb_build_object('id','modal_vs_family','status','RESOLVED',
        'text',format('%s is the largest single cell, while %s represents the aggregated %s family. These answer different questions and are displayed together.', family_raw_modal_score, representative_headline_score, replace(selected_family,'_',' '))),
      jsonb_build_object('id','direction_vs_score','status','RESOLVED',
        'text',case when direction_family_coherent
          then format('%s follows the %s family and the slight %s lean; it does not upgrade that lean into a confident win call.', representative_headline_score, replace(selected_family,'_',' '), lower(dominant_outcome))
          else format('%s represents the %s scoring family, while the separate %s result lean is only %s. The score-family view takes precedence and the directional tension is disclosed.', representative_headline_score, replace(selected_family,'_',' '), lower(dominant_outcome), lower(direction_strength))
        end),
      jsonb_build_object('id','tactical_symmetry','status','RESOLVED',
        'text','Tactical observations that describe constraints on both attacks are not rewritten as two opposing verdicts. Because their model effect is disabled, they are shown only as research context and do not support or oppose this decision.')
    ) reconciliation_j,
    jsonb_build_object(
      'selection_basis','ELIGIBLE_PLAYERS_RANKED_BY_P10_IF_TEAM_SCORES_4_PLUS',
      'scope','UPSIDE_NOMINATIONS_NOT_CAPTAINCY_OR_CHIP_AUTHORITY',
      'players', player_items
    ) players_j,
    jsonb_build_object(
      'heading','Additional tactical context — not used in this forecast',
      'model_effect_enabled',false,
      'plain_language','Research-only tactical observations cover both teams and may describe constraints or opportunities. They have zero forecast effect, so they are not presented as supporting evidence or risk.',
      'observation_count',coalesce(tactical_count,0),
      'teams_covered',coalesce(tactical_teams,0),
      'captured_at',tactical_captured_at,
      'observations',coalesce(tactical_observations,'[]'::jsonb)
    ) context_j
  from parts p
),
audited as (
  select s.*,
    jsonb_build_object(
      'all_required_sections', conclusion_j is not null and jsonb_array_length(support_j)>0 and jsonb_array_length(risks_j)>0 and jsonb_array_length(reconciliation_j)>0,
      'support_is_calculation_linked', true,
      'risks_limit_certainty_without_reversing_conclusion', true,
      'no_mirrored_verdicts', true,
      'no_opaque_l10_or_l20_language', true,
      'raw_modal_disclosed', family_raw_modal_score is not null,
      'score_family_explained', selected_family is not null and representative_headline_score is not null,
      'shootout_is_high_scoring', dominant_subtype <> 'SHOOTOUT' or primary_environment='HIGH_SCORING',
      'research_context_separated', coalesce(all_research_only,true),
      'player_implications_present', jsonb_array_length(player_items)>0,
      'direction_family_coherent', direction_family_coherent,
      'direction_conflict_disclosed', direction_family_coherent or outcome_edge < 0.08,
      'environment_family_coherent', environment_family_coherent,
      'chronology_valid', env_chronology_valid and family_chronology_valid and coalesce(tactical_chronology_valid,true),
      'production_effect', false
    ) audit_j
  from sections s
)
select
  'c0279_decision_evidence_modal_v01', p_snapshot_id, p_prediction_run_id,
  match_id, gameweek, home_name || ' vs ' || away_name,
  (audit_j->>'all_required_sections')::boolean
    and (audit_j->>'support_is_calculation_linked')::boolean
    and (audit_j->>'risks_limit_certainty_without_reversing_conclusion')::boolean
    and (audit_j->>'no_mirrored_verdicts')::boolean
    and (audit_j->>'no_opaque_l10_or_l20_language')::boolean
    and (audit_j->>'raw_modal_disclosed')::boolean
    and (audit_j->>'score_family_explained')::boolean
    and (audit_j->>'shootout_is_high_scoring')::boolean
    and (audit_j->>'research_context_separated')::boolean
    and (audit_j->>'player_implications_present')::boolean
    and (audit_j->>'direction_conflict_disclosed')::boolean
    and (audit_j->>'environment_family_coherent')::boolean
    and (audit_j->>'chronology_valid')::boolean,
  conclusion_j, support_j, risks_j, reconciliation_j, players_j, context_j, audit_j,
  env_chronology_valid and family_chronology_valid and coalesce(tactical_chronology_valid,true),
  false,
  jsonb_build_object(
    'contract_version','c0279_decision_evidence_modal_v01',
    'source_snapshot_id',p_snapshot_id,
    'prediction_run_id',p_prediction_run_id,
    'scoring_environment_contract','c0279_scoring_environment_v01',
    'score_family_contract','c0279_score_family_v01',
    'conditional_player_contract','c0279_conditional_player_return_v01',
    'tactical_context_model_effect',false,
    'shadow_only',true,
    'production_effect',false,
    'historical_row_mutated',false
  ),
  encode(extensions.digest(concat_ws('|','c0279_decision_evidence_modal_v01',p_snapshot_id,p_prediction_run_id,
    conclusion_j,support_j,risks_j,reconciliation_j,players_j,context_j,audit_j),'sha256'),'hex')
from audited;
$function$;

revoke all on function private.c0279_decision_evidence_modal_v01(bigint,bigint) from public;
revoke all on function private.c0279_decision_evidence_modal_v01(bigint,bigint) from anon;
revoke all on function private.c0279_decision_evidence_modal_v01(bigint,bigint) from authenticated;
grant execute on function private.c0279_decision_evidence_modal_v01(bigint,bigint) to service_role;

comment on function private.c0279_decision_evidence_modal_v01(bigint,bigint) is
'C0279 P7 shadow-only Decision-Evidence Contract for matchup modal assessment. Separates calculation-linked support, uncertainty risks, reconciliations, player implications, and zero-effect tactical research context.';
