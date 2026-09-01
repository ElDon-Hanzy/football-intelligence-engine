-- C0178 — deterministic current production fixture snapshot selector.
-- Read-path only: no forecast rows are updated, deleted or recalculated.

create or replace view public.current_production_fixture_prediction_v01 as
select distinct on (fps.match_id) fps.*
from public.fixture_prediction_snapshots fps
where fps.is_pre_kickoff = true
order by fps.match_id, fps.captured_at desc, fps.id desc;

comment on view public.current_production_fixture_prediction_v01 is
'C0178 deterministic current production fixture snapshot selector. Read-only over append-only snapshots; ties on captured_at resolve to the later appended downstream child via id DESC.';

create or replace view public.current_fixture_fact_candidates_v01 as
with latest_pred as (
  select p.match_id, p.markets
  from public.current_production_fixture_prediction_v01 p
), base as (
  select c.id,
         c.snapshot_run_id,
         c.match_id,
         c.gameweek,
         c.team_id,
         c.opponent_team_id,
         c.fact_type,
         c.usefulness_score,
         c.candidate_rank,
         c.one_liner,
         c.payload,
         c.source_fact_ids,
         c.evidence_cutoff,
         c.created_at,
         c.alignment,
         c.card_rank,
         case
           when coalesce((p.markets ->> 'home_win')::numeric,0) >= greatest(coalesce((p.markets ->> 'draw')::numeric,0),coalesce((p.markets ->> 'away_win')::numeric,0)) then 'H'::text
           when coalesce((p.markets ->> 'away_win')::numeric,0) >= greatest(coalesce((p.markets ->> 'draw')::numeric,0),coalesce((p.markets ->> 'home_win')::numeric,0)) then 'A'::text
           else 'D'::text
         end as top_outcome,
         m.home_team_id,
         m.away_team_id
  from public.fixture_fact_candidates c
  join public.latest_team_fact_snapshot_run_v01 r on r.id=c.snapshot_run_id
  join public.matches m on m.id=c.match_id
  left join latest_pred p on p.match_id=c.match_id
), aligned as (
  select b.*,
         case
           when coalesce((b.payload ->> 'actual_model_input')::boolean,false)=true then
             case
               when b.top_outcome='H' and b.team_id=b.home_team_id then 'SUPPORTS'::text
               when b.top_outcome='A' and b.team_id=b.away_team_id then 'SUPPORTS'::text
               when b.top_outcome=any(array['H'::text,'A'::text]) then 'CONTRADICTS'::text
               else 'NEUTRAL'::text
             end
           else b.alignment
         end as live_alignment
  from base b
), eligible as (
  select a.*,
         case
           when a.live_alignment='SUPPORTS'
            and coalesce((a.payload ->> 'actual_model_input')::boolean,false)=true
            and coalesce((a.payload ->> 'applied_log_magnitude')::numeric,0) >=
              case a.payload ->> 'family'
                when 'MATCHUP_XG' then 0.006
                when 'CURRENT_SEASON_PROCESS' then 0.004
                when 'VENUE_FORM' then 0.008
                when 'STREAK_PROFILE' then 0.006
                else 0.008
              end
           then true else false
         end as card_eligible
  from aligned a
), fam as (
  select e.*,
         row_number() over (
           partition by e.match_id,(e.payload ->> 'family')
           order by e.usefulness_score desc,e.id
         ) as family_rn
  from eligible e
), ranked as (
  select f.*,
         case
           when f.card_eligible and f.family_rn=1 then
             row_number() over (
               partition by f.match_id,f.card_eligible,(f.family_rn=1)
               order by f.usefulness_score desc,f.id
             )
           else null::bigint
         end as live_card_rank
  from fam f
)
select id,
       snapshot_run_id,
       match_id,
       gameweek,
       team_id,
       opponent_team_id,
       fact_type,
       usefulness_score,
       candidate_rank,
       one_liner,
       payload,
       source_fact_ids,
       evidence_cutoff,
       created_at,
       live_alignment as alignment,
       case when live_card_rank>=1 and live_card_rank<=3 then live_card_rank::integer else null::integer end as card_rank
from ranked;
