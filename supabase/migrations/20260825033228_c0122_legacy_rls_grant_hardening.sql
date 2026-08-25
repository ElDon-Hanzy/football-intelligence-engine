-- C0122: Legacy RLS / direct-access hardening
-- Permission-only migration. No row data is mutated.

revoke all privileges on table
  public.app_settings,
  public.decision_snapshots,
  public.external_player_seasons,
  public.fpl_prices,
  public.gameweek_audit_summaries,
  public.gameweek_model_audits,
  public.gameweek_prediction_runs,
  public.gameweek_result_runs,
  public.historical_player_seasons,
  public.historical_team_seasons,
  public.matches,
  public.model_predictions,
  public.model_versions,
  public.player_gameweek_actuals,
  public.player_matches,
  public.player_projection_benchmarks,
  public.player_state,
  public.players,
  public.projection_benchmark_runs,
  public.source_sync_runs,
  public.squad_members,
  public.team_projection_benchmarks,
  public.team_state,
  public.teams
from anon, authenticated;

revoke all privileges on all sequences in schema public from anon, authenticated;

revoke execute on function public.evaluate_blind_gw_replay_v01(bigint) from public, anon, authenticated;
revoke execute on function public.evaluate_form_decay_shadow_v01(bigint) from public, anon, authenticated;
revoke execute on function public.generate_form_decay_shadow_v01(bigint) from public, anon, authenticated;
revoke execute on function public.generate_forward_team_strength_candidate_v03_elo(integer) from public, anon, authenticated;
revoke execute on function public.rebuild_historical_football_data_elo_v01() from public, anon, authenticated;

grant execute on function public.evaluate_blind_gw_replay_v01(bigint) to service_role;
grant execute on function public.evaluate_form_decay_shadow_v01(bigint) to service_role;
grant execute on function public.generate_form_decay_shadow_v01(bigint) to service_role;
grant execute on function public.generate_forward_team_strength_candidate_v03_elo(integer) to service_role;
grant execute on function public.rebuild_historical_football_data_elo_v01() to service_role;

revoke all on schema private from public, anon, authenticated;
revoke execute on all functions in schema private from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on all functions in schema private to service_role;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema private revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema private grant execute on functions to service_role;
