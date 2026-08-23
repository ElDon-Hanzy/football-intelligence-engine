-- PostgREST/Supabase upsert must be able to infer a non-partial unique index
-- from onConflict='source,source_match_id,team_id'. PostgreSQL UNIQUE indexes
-- already permit multiple NULL source_match_id values, so no partial predicate is needed.
drop index if exists public.tmi_source_match_team_uidx;
create unique index tmi_source_match_team_uidx
  on public.team_match_intelligence(source, source_match_id, team_id);
