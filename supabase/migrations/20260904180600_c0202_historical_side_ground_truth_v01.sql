create table if not exists public.research_c0202_source_file_captures (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0202' check (change_id='C0202'),
  source_key text not null default 'fpl_core_insights_github' check (source_key='fpl_core_insights_github'),
  season text not null,
  gameweek integer not null check (gameweek between 1 and 60),
  file_kind text not null check (file_kind in ('lineups','average_positions')),
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
  captured_at timestamptz not null default clock_timestamp(),
  notes text
);

create index if not exists research_c0202_source_capture_lookup_idx
  on public.research_c0202_source_file_captures(season,gameweek,file_kind,captured_at desc);

create table if not exists public.research_c0202_lineup_labels (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0202' check (change_id='C0202'),
  source_file_capture_id bigint not null references public.research_c0202_source_file_captures(id),
  source_commit_sha text not null,
  season text not null,
  gameweek integer not null,
  source_match_id text not null,
  match_id bigint references public.matches(id),
  team_side text not null check (team_side in ('home','away')),
  source_team_code integer,
  team_id bigint references public.teams(id),
  source_player_id integer,
  player_id bigint references public.players(id),
  player_name text not null,
  position text,
  jersey_number integer,
  is_starting boolean not null,
  formation text,
  lineup_status text,
  mapping_status text not null check (mapping_status in ('mapped','historical_player_mapped_current','historical_source_only','unmapped_match','unmapped_player','unmapped_match_and_player')),
  source_row jsonb not null,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default clock_timestamp(),
  unique(source_file_capture_id,source_match_id,team_side,source_player_id,player_name)
);

create index if not exists research_c0202_lineup_player_idx
  on public.research_c0202_lineup_labels(player_id,gameweek,captured_at desc) where player_id is not null;
create index if not exists research_c0202_lineup_match_idx
  on public.research_c0202_lineup_labels(source_match_id,team_side,is_starting);

create table if not exists public.research_c0202_average_position_labels (
  id bigint generated always as identity primary key,
  change_id text not null default 'C0202' check (change_id='C0202'),
  source_file_capture_id bigint not null references public.research_c0202_source_file_captures(id),
  source_commit_sha text not null,
  season text not null,
  gameweek integer not null,
  source_match_id text not null,
  match_id bigint references public.matches(id),
  team_side text not null check (team_side in ('home','away')),
  source_player_id integer,
  player_id bigint references public.players(id),
  player_name text not null,
  jersey_number integer,
  position text,
  avg_x numeric not null,
  avg_y numeric not null,
  mapping_status text not null check (mapping_status in ('mapped','historical_player_mapped_current','historical_source_only','unmapped_match','unmapped_player','unmapped_match_and_player')),
  source_row jsonb not null,
  actual_data_used boolean not null default true,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  captured_at timestamptz not null default clock_timestamp(),
  unique(source_file_capture_id,source_match_id,team_side,source_player_id,player_name)
);

create index if not exists research_c0202_avgpos_player_idx
  on public.research_c0202_average_position_labels(player_id,gameweek,captured_at desc) where player_id is not null;
create index if not exists research_c0202_avgpos_match_idx
  on public.research_c0202_average_position_labels(source_match_id,team_side);

alter table public.research_c0202_source_file_captures enable row level security;
alter table public.research_c0202_lineup_labels enable row level security;
alter table public.research_c0202_average_position_labels enable row level security;
revoke all on public.research_c0202_source_file_captures from public,anon,authenticated;
revoke all on public.research_c0202_lineup_labels from public,anon,authenticated;
revoke all on public.research_c0202_average_position_labels from public,anon,authenticated;
revoke all on sequence public.research_c0202_source_file_captures_id_seq from public,anon,authenticated;
revoke all on sequence public.research_c0202_lineup_labels_id_seq from public,anon,authenticated;
revoke all on sequence public.research_c0202_average_position_labels_id_seq from public,anon,authenticated;

drop trigger if exists research_c0202_source_captures_append_only on public.research_c0202_source_file_captures;
create trigger research_c0202_source_captures_append_only before update or delete on public.research_c0202_source_file_captures for each row execute function private.block_c0202_research_mutation_v01();
drop trigger if exists research_c0202_lineup_labels_append_only on public.research_c0202_lineup_labels;
create trigger research_c0202_lineup_labels_append_only before update or delete on public.research_c0202_lineup_labels for each row execute function private.block_c0202_research_mutation_v01();
drop trigger if exists research_c0202_avgpos_labels_append_only on public.research_c0202_average_position_labels;
create trigger research_c0202_avgpos_labels_append_only before update or delete on public.research_c0202_average_position_labels for each row execute function private.block_c0202_research_mutation_v01();

create or replace function private.c0202_ground_truth_status_v01()
returns jsonb language sql stable set search_path=public,private,pg_temp as $$
select jsonb_build_object(
 'change_id','C0202',
 'captures',(select count(*) from public.research_c0202_source_file_captures),
 'capture_file_kinds',(select coalesce(jsonb_object_agg(file_kind,n),'{}'::jsonb) from (select file_kind,count(*) n from public.research_c0202_source_file_captures group by file_kind) s),
 'lineups',jsonb_build_object(
   'rows',(select count(*) from public.research_c0202_lineup_labels),
   'matches',(select count(distinct source_match_id) from public.research_c0202_lineup_labels),
   'starters',(select count(*) from public.research_c0202_lineup_labels where is_starting),
   'formations',(select count(*) from public.research_c0202_lineup_labels where formation is not null)
 ),
 'average_positions',jsonb_build_object(
   'rows',(select count(*) from public.research_c0202_average_position_labels),
   'matches',(select count(distinct source_match_id) from public.research_c0202_average_position_labels),
   'mapped_current_players',(select count(*) from public.research_c0202_average_position_labels where player_id is not null)
 ),
 'violations',jsonb_build_object(
   'model_effect_enabled',(select count(*) from (
      select model_effect_enabled from public.research_c0202_source_file_captures
      union all select model_effect_enabled from public.research_c0202_lineup_labels
      union all select model_effect_enabled from public.research_c0202_average_position_labels
   ) q where model_effect_enabled),
   'not_research_only',(select count(*) from (
      select research_only from public.research_c0202_source_file_captures
      union all select research_only from public.research_c0202_lineup_labels
      union all select research_only from public.research_c0202_average_position_labels
   ) q where not research_only)
 ),
 'post_match_labels_only',true
);
$$;
revoke all on function private.c0202_ground_truth_status_v01() from public,anon,authenticated;