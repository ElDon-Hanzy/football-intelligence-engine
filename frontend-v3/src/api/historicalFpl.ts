const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';

// Supabase's legacy anon JWT is a public browser credential used only for read-only UI endpoints.
const PUBLIC_SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type HistoricalPlayer = {
  id: number;
  name: string;
  team?: string | null;
  position?: string | null;
  xPts?: number | null;
  p10?: number | null;
  p15?: number | null;
  p20?: number | null;
};

export type HistoricalFixture = {
  match_id: number;
  kickoff_time: string;
  home_team: string | null;
  away_team: string | null;
  finished: boolean;
  home_score?: number | null;
  away_score?: number | null;
  prediction?: {
    markets?: {
      home_win?: number;
      draw?: number;
      away_win?: number;
    };
  } | null;
};

export type HistoricalFplPayload = {
  ok: true;
  contract_version?: string;
  gameweek: number;
  prediction_run_id?: number;
  generated_at?: string;
  historical_projection_valid?: boolean;
  snapshot_stage?: string;
  metadata_availability?: {
    historical?: boolean;
    current_metadata_not_backfilled_into_history?: boolean;
  };
  available_gameweeks?: Array<{
    gameweek: number;
    generated_at?: string | null;
    run_type?: string | null;
    excluded_from_backtest?: boolean;
    historical_projection_valid?: boolean;
  }>;
  decision?: {
    captain_player_id?: number | null;
    vice_player_id?: number | null;
    starting_xi?: HistoricalPlayer[];
    bench?: HistoricalPlayer[];
    recommendations?: Record<string, unknown> | null;
  } | null;
  fixture_results?: HistoricalFixture[];
};

export async function fetchHistoricalFpl(gameweek = 0, signal?: AbortSignal): Promise<HistoricalFplPayload> {
  const url = gameweek > 0 ? `${API_ROOT}/fpl-api?gw=${gameweek}` : `${API_ROOT}/fpl-api`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Historical FPL API returned HTTP ${response.status}`);
  const payload = await response.json() as unknown;
  if (!isHistoricalPayload(payload)) throw new Error('Historical FPL contract mismatch');
  return payload;
}

function isHistoricalPayload(value: unknown): value is HistoricalFplPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return row.ok === true && typeof row.gameweek === 'number';
}
