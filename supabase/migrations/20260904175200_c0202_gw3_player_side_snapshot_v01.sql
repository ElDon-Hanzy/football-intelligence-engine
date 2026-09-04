with shot_times as (
  select s.player_id,s.start_y::numeric as y,s.shot_index,e.fixture_kickoff
  from public.research_c0197_shot_events s
  join (
    select season,source_match_id,max(fixture_kickoff) as fixture_kickoff
    from public.research_c0197_team_match_evidence
    group by season,source_match_id
  ) e on e.season=s.season and e.source_match_id=s.source_match_id
  where s.player_id is not null
    and s.start_y is not null
    and e.fixture_kickoff<'2026-09-04T17:30:00Z'
), candidates as (
  select r.match_id,r.player_id,r.team_id,r.opponent_team_id,r.primary_role,r.secondary_role,
         r.primary_score,r.secondary_score,r.confidence as role_confidence
  from public.current_player_fixture_roles r
  where r.gameweek=3
    and r.expected_xi=true
    and (
      r.primary_role in ('WIDE_BACK','WING_BACK','WIDE_ATTACKER','WIDE_FORWARD')
      or (r.primary_role='UNRESOLVED' and r.secondary_role in ('WIDE_BACK','WING_BACK','WIDE_ATTACKER','WIDE_FORWARD'))
    )
), agg as (
  select c.*,
         count(q.y) as prior_shots,
         percentile_cont(0.5) within group(order by q.y) as median_y
  from candidates c
  left join lateral (
    select st.y
    from shot_times st
    where st.player_id=c.player_id
    order by st.fixture_kickoff desc,st.shot_index desc
    limit 20
  ) q on true
  group by c.match_id,c.player_id,c.team_id,c.opponent_team_id,c.primary_role,c.secondary_role,c.primary_score,c.secondary_score,c.role_confidence
)
insert into public.research_c0202_player_side_snapshots(
  run_key,gameweek,match_id,player_id,team_id,opponent_team_id,primary_role,secondary_role,
  prior_shots,median_y,attack_side,side_confidence,inference_method,evidence
)
select 'C0202_V01_FLANK_SHADOW_20260904',3,match_id,player_id,team_id,opponent_team_id,primary_role,secondary_role,
       prior_shots,median_y,
       case when prior_shots<5 then 'UNRESOLVED'
            when median_y<45 then 'ATT_LEFT'
            when median_y>55 then 'ATT_RIGHT'
            when median_y<48 then 'LEFT_LEAN'
            when median_y>52 then 'RIGHT_LEAN'
            else 'MIXED' end,
       null,
       'prior_20_shot_median_v01',
       jsonb_build_object(
         'evidence_cutoff','2026-09-04T17:30:00Z',
         'role_confidence',role_confidence,
         'primary_score',primary_score,
         'secondary_score',secondary_score,
         'side_confidence_calibrated',false,
         'exact_tactical_side_from_role_taxonomy',false,
         'missing_is_not_zero',true
       )
from agg
on conflict do nothing;
