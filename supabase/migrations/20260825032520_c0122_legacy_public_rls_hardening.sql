-- C0122: Harden legacy public tables that were still directly exposed.
-- Repository mirror of deployed production migration.

alter table public.player_role_intelligence enable row level security;
alter table public.projection_disagreement enable row level security;
alter table public.fixture_prediction_snapshots enable row level security;
alter table public.odds_provider_events enable row level security;
alter table public.odds_ingestion_runs enable row level security;
alter table public.odds_raw_snapshots enable row level security;
alter table public.odds_market_selections enable row level security;

revoke all privileges on table
  public.player_role_intelligence,
  public.projection_disagreement,
  public.fixture_prediction_snapshots,
  public.odds_provider_events,
  public.odds_ingestion_runs,
  public.odds_raw_snapshots,
  public.odds_market_selections
from anon, authenticated;

revoke execute on function public.generate_blind_gw_replay_v01(integer) from public, anon, authenticated;
grant execute on function public.generate_blind_gw_replay_v01(integer) to service_role;
