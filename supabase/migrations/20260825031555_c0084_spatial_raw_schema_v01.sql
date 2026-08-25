create table if not exists public.spatial_raw_match_manifests (
  id bigint generated always as identity primary key,
  provider text not null,
  product_name text not null,
  provider_match_id text not null,
  match_id bigint references public.matches(id),
  competition_key text,
  season_key text,
  kickoff_time timestamptz,
  source_schema_version text,
  sample_frequency_hz numeric,
  coordinate_reference jsonb not null default '{}'::jsonb,
  timing_reference jsonb not null default '{}'::jsonb,
  pitch_dimensions jsonb not null default '{}'::jsonb,
  license_scope jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  known_at timestamptz not null default clock_timestamp(),
  captured_at timestamptz not null default clock_timestamp(),
  source_manifest jsonb not null default '{}'::jsonb,
  manifest_hash text not null unique,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  created_at timestamptz not null default clock_timestamp(),
  unique(provider, product_name, provider_match_id, manifest_hash)
);

create table if not exists public.spatial_raw_artifacts (
  id bigint generated always as identity primary key,
  manifest_id bigint not null references public.spatial_raw_match_manifests(id),
  artifact_type text not null check (artifact_type in ('TRACKING','EVENTS','FREEZE_FRAMES','PHYSICAL','ZONES','LINEUPS','OTHER')),
  provider_artifact_id text,
  sequence_no integer not null default 0,
  content_type text,
  compression text,
  storage_uri text,
  inline_payload jsonb,
  byte_size bigint check (byte_size is null or byte_size >= 0),
  source_sha256 text not null,
  raw_coordinate_metadata jsonb not null default '{}'::jsonb,
  raw_time_metadata jsonb not null default '{}'::jsonb,
  source_updated_at timestamptz,
  known_at timestamptz not null default clock_timestamp(),
  captured_at timestamptz not null default clock_timestamp(),
  source_manifest jsonb not null default '{}'::jsonb,
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  created_at timestamptz not null default clock_timestamp(),
  check (storage_uri is not null or inline_payload is not null),
  unique(manifest_id, artifact_type, sequence_no, source_sha256)
);

create table if not exists public.spatial_raw_events (
  id bigint generated always as identity primary key,
  manifest_id bigint not null references public.spatial_raw_match_manifests(id),
  artifact_id bigint references public.spatial_raw_artifacts(id),
  provider_event_id text,
  sequence_index bigint,
  period smallint,
  provider_timestamp text,
  match_clock_ms bigint,
  event_type text,
  event_subtype text,
  provider_team_id text,
  provider_player_id text,
  team_id bigint references public.teams(id),
  player_id bigint references public.players(id),
  x_raw numeric,
  y_raw numeric,
  z_raw numeric,
  end_x_raw numeric,
  end_y_raw numeric,
  end_z_raw numeric,
  provider_zone_id text,
  provider_end_zone_id text,
  attacking_direction text,
  linked_tracking_frame bigint,
  raw_event_payload jsonb not null,
  event_hash text not null unique,
  source_updated_at timestamptz,
  known_at timestamptz not null default clock_timestamp(),
  captured_at timestamptz not null default clock_timestamp(),
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  created_at timestamptz not null default clock_timestamp(),
  unique(manifest_id, provider_event_id, event_hash)
);

create table if not exists public.spatial_provider_zone_definitions (
  id bigint generated always as identity primary key,
  manifest_id bigint not null references public.spatial_raw_match_manifests(id),
  provider_zone_id text not null,
  zone_label text,
  geometry_raw jsonb,
  coordinate_reference jsonb not null default '{}'::jsonb,
  raw_zone_payload jsonb not null default '{}'::jsonb,
  zone_hash text not null unique,
  known_at timestamptz not null default clock_timestamp(),
  captured_at timestamptz not null default clock_timestamp(),
  research_only boolean not null default true check (research_only),
  model_effect_enabled boolean not null default false check (not model_effect_enabled),
  created_at timestamptz not null default clock_timestamp(),
  unique(manifest_id, provider_zone_id, zone_hash)
);

create index if not exists spatial_raw_match_manifests_match_idx on public.spatial_raw_match_manifests(match_id,provider,product_name);
create index if not exists spatial_raw_artifacts_manifest_idx on public.spatial_raw_artifacts(manifest_id,artifact_type,sequence_no);
create index if not exists spatial_raw_events_match_clock_idx on public.spatial_raw_events(manifest_id,period,match_clock_ms,sequence_index);
create index if not exists spatial_raw_events_type_idx on public.spatial_raw_events(event_type,event_subtype);
create index if not exists spatial_provider_zone_manifest_idx on public.spatial_provider_zone_definitions(manifest_id,provider_zone_id);

create or replace function private.block_spatial_raw_mutation_v01()
returns trigger
language plpgsql
set search_path to 'public','private','pg_temp'
as $$
begin
  raise exception 'C0084 spatial raw tables are append-only; append a new manifest/artifact/event instead';
end;
$$;

drop trigger if exists spatial_raw_match_manifests_append_only on public.spatial_raw_match_manifests;
create trigger spatial_raw_match_manifests_append_only before update or delete on public.spatial_raw_match_manifests for each row execute function private.block_spatial_raw_mutation_v01();
drop trigger if exists spatial_raw_artifacts_append_only on public.spatial_raw_artifacts;
create trigger spatial_raw_artifacts_append_only before update or delete on public.spatial_raw_artifacts for each row execute function private.block_spatial_raw_mutation_v01();
drop trigger if exists spatial_raw_events_append_only on public.spatial_raw_events;
create trigger spatial_raw_events_append_only before update or delete on public.spatial_raw_events for each row execute function private.block_spatial_raw_mutation_v01();
drop trigger if exists spatial_provider_zone_definitions_append_only on public.spatial_provider_zone_definitions;
create trigger spatial_provider_zone_definitions_append_only before update or delete on public.spatial_provider_zone_definitions for each row execute function private.block_spatial_raw_mutation_v01();

alter table public.spatial_raw_match_manifests enable row level security;
alter table public.spatial_raw_artifacts enable row level security;
alter table public.spatial_raw_events enable row level security;
alter table public.spatial_provider_zone_definitions enable row level security;

revoke all on public.spatial_raw_match_manifests from anon, authenticated;
revoke all on public.spatial_raw_artifacts from anon, authenticated;
revoke all on public.spatial_raw_events from anon, authenticated;
revoke all on public.spatial_provider_zone_definitions from anon, authenticated;

comment on table public.spatial_raw_match_manifests is 'C0084 immutable provider-match manifest preserving native coordinate/time/schema/license metadata.';
comment on table public.spatial_raw_artifacts is 'C0084 immutable raw spatial artifact catalog. Large continuous tracking should remain file/chunk oriented via storage_uri rather than be exploded into millions of database rows.';
comment on table public.spatial_raw_events is 'C0084 immutable event index preserving provider-native coordinates/zones/timestamps plus exact raw event payload.';
comment on table public.spatial_provider_zone_definitions is 'C0084 immutable provider zone definitions so provider-native zone semantics can be reprocessed without loss.';
