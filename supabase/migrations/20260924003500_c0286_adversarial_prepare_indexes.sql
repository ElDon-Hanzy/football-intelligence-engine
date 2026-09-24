-- C0286: keep the governed C0240 adversarial preparation inside the scheduler
-- statement timeout.  These indexes match its current run/gameweek lookups and
-- the DISTINCT ON ordering used by current_player_fixture_roles.

create index if not exists idx_model_predictions_run_gameweek_player
  on public.model_predictions (prediction_run_id, gameweek, player_id);

create index if not exists idx_player_fixture_roles_current_order
  on public.player_fixture_role_observations
  (match_id, player_id, captured_at desc, id desc);
