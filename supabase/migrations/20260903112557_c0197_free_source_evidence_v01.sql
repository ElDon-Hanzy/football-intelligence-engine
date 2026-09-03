create or replace function private.block_c0197_research_mutation_v01()
returns trigger
language plpgsql
security definer
set search_path=public,private,pg_temp
as $$
begin
  raise exception 'C0197 research evidence is append-only';
end;
$$;

create table if not exists public.research_c0197_source_file_captures (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0197' check (change_id='C0197'),
  source_key text not null default 'fpl_core_insights_github' check (source_key='fpl_core_insights_github'),
  season text not null,
  gameweek integer not null check (gameweek between 0 and 60),
  file_kind text not null check (file_kind in ('matches','playermatchstats','shots','xg_by_minute')),
  source_repo text not null default 'olbauday/FPL-Core-Insights',
  source_path text not null,
  source_url text not null,
  source_commit_sha text not null,
  source_commit_at timestamptz not null,
  source_as_of timestamptz not null,
  payload_sha256 text not null,
  row_count integer not null check (row_count >= 0),
  observation_hash text not null unique,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default now(),
  notes text,
  check (source_commit_at <= source_as_of),
  check (source_as_of <= captured_at + interval '5 minutes')
);

create index if not exists research_c0197_source_file_captures_lookup_idx
  on public.research_c0197_source_file_captures(season,gameweek,file_kind,source_as_of desc,captured_at desc);

create table if not exists public.research_c0197_team_match_evidence (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0197' check (change_id='C0197'),
  source_key text not null default 'fpl_core_insights_github' check (source_key='fpl_core_insights_github'),
  source_file_capture_id bigint not null references public.research_c0197_source_file_captures(id),
  source_commit_sha text not null,
  season text not null,
  gameweek integer not null,
  source_match_id text not null,
  match_id bigint not null references public.matches(id),
  team_id bigint not null references public.teams(id),
  venue text not null check (venue in ('home','away')),
  fixture_kickoff timestamptz not null,
  goals_for numeric,
  goals_against numeric,
  xg_for numeric,
  xg_against numeric,
  shots_for numeric,
  shots_against numeric,
  shots_on_target_for numeric,
  shots_on_target_against numeric,
  xgot_for numeric,
  xgot_against numeric,
  big_chances_for numeric,
  big_chances_against numeric,
  big_chances_missed_for numeric,
  big_chances_missed_against numeric,
  keeper_saves_for numeric,
  keeper_saves_against numeric,
  source_row jsonb not null,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default now(),
  unique(source_file_capture_id,source_match_id,team_id)
);

create index if not exists research_c0197_team_match_evidence_team_idx
  on public.research_c0197_team_match_evidence(team_id,fixture_kickoff desc);
create index if not exists research_c0197_team_match_evidence_match_idx
  on public.research_c0197_team_match_evidence(match_id,team_id,captured_at desc);

create table if not exists public.research_c0197_player_match_evidence (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0197' check (change_id='C0197'),
  source_key text not null default 'fpl_core_insights_github' check (source_key='fpl_core_insights_github'),
  source_file_capture_id bigint not null references public.research_c0197_source_file_captures(id),
  source_commit_sha text not null,
  season text not null,
  gameweek integer not null,
  source_match_id text not null,
  match_id bigint references public.matches(id),
  source_player_id integer,
  player_id bigint references public.players(id),
  minutes integer,
  started boolean,
  goals integer,
  assists integer,
  xg numeric,
  xa numeric,
  xgot numeric,
  shots integer,
  shots_on_target integer,
  big_chances_missed integer,
  touches_opposition_box integer,
  xgot_faced numeric,
  goals_prevented numeric,
  penalties_scored integer,
  penalties_missed integer,
  mapping_status text not null check (mapping_status in ('mapped','unmapped_match','unmapped_player','unmapped_match_and_player')),
  source_row jsonb not null,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default now(),
  unique(source_file_capture_id,source_match_id,source_player_id)
);

create index if not exists research_c0197_player_match_evidence_player_idx
  on public.research_c0197_player_match_evidence(player_id,gameweek,captured_at desc) where player_id is not null;
create index if not exists research_c0197_player_match_evidence_match_idx
  on public.research_c0197_player_match_evidence(match_id,captured_at desc) where match_id is not null;

create table if not exists public.research_c0197_shot_events (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0197' check (change_id='C0197'),
  source_key text not null default 'fpl_core_insights_github' check (source_key='fpl_core_insights_github'),
  source_file_capture_id bigint not null references public.research_c0197_source_file_captures(id),
  source_commit_sha text not null,
  season text not null,
  gameweek integer not null,
  source_match_id text not null,
  match_id bigint references public.matches(id),
  shot_index integer not null,
  minute integer,
  added_time integer,
  is_home boolean,
  source_player_id integer,
  player_id bigint references public.players(id),
  outcome text,
  situation text,
  body_part text,
  xg numeric,
  xgot numeric,
  start_x numeric,
  start_y numeric,
  goal_mouth_y numeric,
  goal_mouth_z numeric,
  goal_mouth_location text,
  mapping_status text not null check (mapping_status in ('mapped','unmapped_match','unmapped_player','unmapped_match_and_player','no_player')),
  source_row jsonb not null,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default now(),
  unique(source_file_capture_id,source_match_id,shot_index)
);

create index if not exists research_c0197_shot_events_match_idx
  on public.research_c0197_shot_events(match_id,shot_index) where match_id is not null;
create index if not exists research_c0197_shot_events_player_idx
  on public.research_c0197_shot_events(player_id,captured_at desc) where player_id is not null;

create trigger research_c0197_source_file_captures_append_only_v01
before update or delete on public.research_c0197_source_file_captures
for each row execute function private.block_c0197_research_mutation_v01();
create trigger research_c0197_team_match_evidence_append_only_v01
before update or delete on public.research_c0197_team_match_evidence
for each row execute function private.block_c0197_research_mutation_v01();
create trigger research_c0197_player_match_evidence_append_only_v01
before update or delete on public.research_c0197_player_match_evidence
for each row execute function private.block_c0197_research_mutation_v01();
create trigger research_c0197_shot_events_append_only_v01
before update or delete on public.research_c0197_shot_events
for each row execute function private.block_c0197_research_mutation_v01();

alter table public.research_c0197_source_file_captures enable row level security;
alter table public.research_c0197_team_match_evidence enable row level security;
alter table public.research_c0197_player_match_evidence enable row level security;
alter table public.research_c0197_shot_events enable row level security;

revoke all on public.research_c0197_source_file_captures from public,anon,authenticated;
revoke all on public.research_c0197_team_match_evidence from public,anon,authenticated;
revoke all on public.research_c0197_player_match_evidence from public,anon,authenticated;
revoke all on public.research_c0197_shot_events from public,anon,authenticated;
revoke all on sequence public.research_c0197_source_file_captures_id_seq from public,anon,authenticated;
revoke all on sequence public.research_c0197_team_match_evidence_id_seq from public,anon,authenticated;
revoke all on sequence public.research_c0197_player_match_evidence_id_seq from public,anon,authenticated;
revoke all on sequence public.research_c0197_shot_events_id_seq from public,anon,authenticated;

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
    'matches',(select count(distinct match_id) from public.research_c0197_team_match_evidence),
    'xg_rows',(select count(*) from public.research_c0197_team_match_evidence where xg_for is not null),
    'sot_rows',(select count(*) from public.research_c0197_team_match_evidence where shots_on_target_for is not null),
    'xgot_rows',(select count(*) from public.research_c0197_team_match_evidence where xgot_for is not null),
    'bc_rows',(select count(*) from public.research_c0197_team_match_evidence where big_chances_for is not null),
    'bcm_rows',(select count(*) from public.research_c0197_team_match_evidence where big_chances_missed_for is not null)
  ),
  'player',jsonb_build_object(
    'rows',(select count(*) from public.research_c0197_player_match_evidence),
    'mapped_rows',(select count(*) from public.research_c0197_player_match_evidence where mapping_status='mapped'),
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
    'mapped_player_rows',(select count(*) from public.research_c0197_shot_events where player_id is not null),
    'xg_rows',(select count(*) from public.research_c0197_shot_events where xg is not null),
    'xgot_rows',(select count(*) from public.research_c0197_shot_events where xgot is not null),
    'outcomes',(select coalesce(jsonb_agg(o order by o.outcome),'[]'::jsonb) from (select outcome,count(*) as rows from public.research_c0197_shot_events group by outcome) o)
  ),
  'violations',jsonb_build_object(
    'model_effect_enabled',
      (select count(*) from (
        select model_effect_enabled from public.research_c0197_source_file_captures
        union all select model_effect_enabled from public.research_c0197_team_match_evidence
        union all select model_effect_enabled from public.research_c0197_player_match_evidence
        union all select model_effect_enabled from public.research_c0197_shot_events
      ) q where model_effect_enabled),
    'not_research_only',
      (select count(*) from (
        select research_only from public.research_c0197_source_file_captures
        union all select research_only from public.research_c0197_team_match_evidence
        union all select research_only from public.research_c0197_player_match_evidence
        union all select research_only from public.research_c0197_shot_events
      ) q where not research_only)
  )
);
$$;
revoke all on function private.c0197_free_source_status_v01() from public,anon,authenticated;