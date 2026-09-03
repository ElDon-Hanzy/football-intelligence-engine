alter table public.research_c0197_source_file_captures drop constraint if exists research_c0197_source_file_captures_file_kind_check;
alter table public.research_c0197_source_file_captures add constraint research_c0197_source_file_captures_file_kind_check check (file_kind in ('matches','playermatchstats','shots','xg_by_minute','players'));

alter table public.research_c0197_team_match_evidence alter column match_id drop not null;
alter table public.research_c0197_team_match_evidence alter column team_id drop not null;
alter table public.research_c0197_team_match_evidence add column if not exists source_team_code integer;
alter table public.research_c0197_team_match_evidence add column if not exists source_team_name text;
alter table public.research_c0197_team_match_evidence add column if not exists mapping_status text;
alter table public.research_c0197_team_match_evidence add constraint research_c0197_team_mapping_status_check check (mapping_status is null or mapping_status in ('mapped','historical_source_only'));
create unique index if not exists research_c0197_team_match_source_identity_uidx on public.research_c0197_team_match_evidence(source_file_capture_id,source_match_id,source_team_code) where source_team_code is not null;

alter table public.research_c0197_player_match_evidence add column if not exists source_player_code integer;
alter table public.research_c0197_player_match_evidence add column if not exists source_team_code integer;
alter table public.research_c0197_player_match_evidence add column if not exists source_position text;
alter table public.research_c0197_player_match_evidence add column if not exists source_player_name text;
create index if not exists research_c0197_player_match_code_idx on public.research_c0197_player_match_evidence(source_player_code,season,gameweek) where source_player_code is not null;

alter table public.research_c0197_shot_events add column if not exists source_player_code integer;
alter table public.research_c0197_shot_events add column if not exists source_team_code integer;
create index if not exists research_c0197_shot_player_code_idx on public.research_c0197_shot_events(source_player_code,season,gameweek) where source_player_code is not null;

create or replace function private.c0197_free_source_status_v01()
returns jsonb
language sql
security definer
set search_path=public,private,pg_temp
as $$
select jsonb_build_object(
  'change_id','C0197',
  'source_file_captures',(select count(*) from public.research_c0197_source_file_captures),
  'latest_capture',(select max(captured_at) from public.research_c0197_source_file_captures),
  'file_coverage',(select coalesce(jsonb_agg(x order by x.season,x.gameweek,x.file_kind),'[]'::jsonb) from (
    select season,gameweek,file_kind,count(*) as captures,max(source_as_of) as latest_source_as_of,max(captured_at) as latest_capture
    from public.research_c0197_source_file_captures group by season,gameweek,file_kind
  ) x),
  'team',jsonb_build_object(
    'rows',(select count(*) from public.research_c0197_team_match_evidence),
    'internal_matches',(select count(distinct match_id) from public.research_c0197_team_match_evidence where match_id is not null),
    'source_matches',(select count(distinct season||'|'||source_match_id) from public.research_c0197_team_match_evidence),
    'source_teams',(select count(distinct season||'|'||source_team_code::text) from public.research_c0197_team_match_evidence where source_team_code is not null),
    'xg_rows',(select count(*) from public.research_c0197_team_match_evidence where xg_for is not null),
    'sot_rows',(select count(*) from public.research_c0197_team_match_evidence where shots_on_target_for is not null),
    'xgot_rows',(select count(*) from public.research_c0197_team_match_evidence where xgot_for is not null),
    'bc_rows',(select count(*) from public.research_c0197_team_match_evidence where big_chances_for is not null),
    'bcm_rows',(select count(*) from public.research_c0197_team_match_evidence where big_chances_missed_for is not null)
  ),
  'player',jsonb_build_object(
    'rows',(select count(*) from public.research_c0197_player_match_evidence),
    'mapped_current_rows',(select count(*) from public.research_c0197_player_match_evidence where player_id is not null),
    'stable_code_rows',(select count(*) from public.research_c0197_player_match_evidence where source_player_code is not null),
    'minutes_rows',(select count(*) from public.research_c0197_player_match_evidence where minutes is not null),
    'xg_rows',(select count(*) from public.research_c0197_player_match_evidence where xg is not null),
    'sot_rows',(select count(*) from public.research_c0197_player_match_evidence where shots_on_target is not null),
    'xgot_rows',(select count(*) from public.research_c0197_player_match_evidence where xgot is not null),
    'bcm_rows',(select count(*) from public.research_c0197_player_match_evidence where big_chances_missed is not null),
    'gk_postshot_rows',(select count(*) from public.research_c0197_player_match_evidence where xgot_faced is not null or goals_prevented is not null)
  ),
  'shots',jsonb_build_object(
    'rows',(select count(*) from public.research_c0197_shot_events),
    'mapped_match_rows',(select count(*) from public.research_c0197_shot_events where match_id is not null),
    'stable_player_code_rows',(select count(*) from public.research_c0197_shot_events where source_player_code is not null),
    'xg_rows',(select count(*) from public.research_c0197_shot_events where xg is not null),
    'xgot_rows',(select count(*) from public.research_c0197_shot_events where xgot is not null),
    'outcomes',(select coalesce(jsonb_agg(o order by o.outcome),'[]'::jsonb) from (select outcome,count(*) as rows from public.research_c0197_shot_events group by outcome) o)
  ),
  'violations',jsonb_build_object(
    'model_effect_enabled',(select count(*) from (select model_effect_enabled from public.research_c0197_source_file_captures union all select model_effect_enabled from public.research_c0197_team_match_evidence union all select model_effect_enabled from public.research_c0197_player_match_evidence union all select model_effect_enabled from public.research_c0197_shot_events) q where model_effect_enabled),
    'not_research_only',(select count(*) from (select research_only from public.research_c0197_source_file_captures union all select research_only from public.research_c0197_team_match_evidence union all select research_only from public.research_c0197_player_match_evidence union all select research_only from public.research_c0197_shot_events) q where not research_only)
  )
);
$$;
revoke all on function private.c0197_free_source_status_v01() from public,anon,authenticated;