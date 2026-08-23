-- Fix Mispricing Intelligence v0.1 historical ingestion idempotency for PostgREST upserts.
-- A partial unique index cannot be used by PostgREST on_conflict inference.
-- PostgreSQL UNIQUE still permits multiple NULL source_match_id values, preserving the intended nullable semantics.

drop index if exists public.tmi_source_match_team_uidx;

alter table public.team_match_intelligence
  add constraint tmi_source_match_team_unique
  unique (source, source_match_id, team_id);

notify pgrst, 'reload schema';
