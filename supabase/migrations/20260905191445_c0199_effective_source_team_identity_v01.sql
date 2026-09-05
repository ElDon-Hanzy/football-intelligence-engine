create or replace view private.c0199_team_match_identity_latest_v01 as
with ranked as (
  select e.*,row_number() over(partition by season,gameweek,source_match_id,team_id order by captured_at desc,id desc) rn
  from public.research_c0197_team_match_evidence e
)
select r.*,
       coalesce(r.source_team_code,
         case when r.venue='home' then nullif(regexp_replace(coalesce(r.source_row->>'home_team',''),'\.0$',''),'')::integer
              when r.venue='away' then nullif(regexp_replace(coalesce(r.source_row->>'away_team',''),'\.0$',''),'')::integer end
       ) as effective_source_team_code,
       coalesce(r.source_team_name,t.name) as effective_source_team_name,
       case when r.team_id is not null and coalesce(r.source_team_code,
         case when r.venue='home' then nullif(regexp_replace(coalesce(r.source_row->>'home_team',''),'\.0$',''),'')::integer
              when r.venue='away' then nullif(regexp_replace(coalesce(r.source_row->>'away_team',''),'\.0$',''),'')::integer end) is not null
         then 'mapped' else coalesce(r.mapping_status,'historical_source_only') end as effective_mapping_status
from ranked r left join public.teams t on t.id=r.team_id where r.rn=1;

create or replace view private.c0199_player_match_identity_latest_v01 as
with ranked as (
  select e.*,row_number() over(partition by season,gameweek,source_match_id,source_player_id order by captured_at desc,id desc) rn
  from public.research_c0197_player_match_evidence e
)
select r.*,r.source_team_code as effective_source_team_code,t.id as effective_team_id,t.name as effective_source_team_name
from ranked r left join public.teams t on t.team_code=r.source_team_code where r.rn=1;

create or replace view private.c0199_shot_identity_latest_v01 as
with ranked as (
  select e.*,row_number() over(partition by season,gameweek,source_match_id,shot_index order by captured_at desc,id desc) rn
  from public.research_c0197_shot_events e
)
select r.*,
       coalesce(r.source_team_code,case when r.is_home is true then th.effective_source_team_code when r.is_home is false then ta.effective_source_team_code end) effective_source_team_code
from ranked r
left join private.c0199_team_match_identity_latest_v01 th on th.season=r.season and th.gameweek=r.gameweek and th.source_match_id=r.source_match_id and th.venue='home'
left join private.c0199_team_match_identity_latest_v01 ta on ta.season=r.season and ta.gameweek=r.gameweek and ta.source_match_id=r.source_match_id and ta.venue='away'
where r.rn=1;

create or replace function private.c0199_source_team_identity_status_v01(p_season text default '2026-2027')
returns jsonb language sql stable security definer set search_path=private,public,pg_temp as $$
with tm as (
 select count(*) rows,count(*) filter(where effective_source_team_code is null) null_codes,count(*) filter(where effective_source_team_name is null) null_names
 from private.c0199_team_match_identity_latest_v01 where season=p_season
), pm as (
 select count(*) filter(where mapping_status='mapped') mapped_rows,
        count(*) filter(where mapping_status='mapped' and effective_source_team_code is null) mapped_null_codes,
        count(*) filter(where mapping_status='mapped' and effective_team_id is null) mapped_unresolved_team
 from private.c0199_player_match_identity_latest_v01 where season=p_season
), sh as (
 select count(*) rows,count(*) filter(where effective_source_team_code is null) null_codes
 from private.c0199_shot_identity_latest_v01 where season=p_season
), cap as (
 select count(*) filter(where file_kind='players') player_identity_captures,max(source_commit_at) latest_source_commit_at
 from public.research_c0197_source_file_captures where season=p_season
)
select jsonb_build_object('change_id','C0199','season',p_season,
 'team_rows',tm.rows,'team_null_codes',tm.null_codes,'team_null_names',tm.null_names,
 'mapped_player_rows',pm.mapped_rows,'mapped_player_null_codes',pm.mapped_null_codes,'mapped_player_unresolved_team',pm.mapped_unresolved_team,
 'shot_rows',sh.rows,'shot_null_codes',sh.null_codes,
 'player_identity_captures',cap.player_identity_captures,'latest_source_commit_at',cap.latest_source_commit_at,
 'identity_clean',tm.null_codes=0 and tm.null_names=0 and pm.mapped_null_codes=0 and pm.mapped_unresolved_team=0 and sh.null_codes=0,
 'model_effect_enabled',false,'historical_rows_rewritten',false)
from tm cross join pm cross join sh cross join cap;
$$;
revoke all on function private.c0199_source_team_identity_status_v01(text) from public;
grant execute on function private.c0199_source_team_identity_status_v01(text) to service_role;