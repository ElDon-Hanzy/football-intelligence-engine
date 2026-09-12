const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';
const PUBLIC_SUPABASE_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type ActualLiveStatus = 'FINAL' | 'LIVE' | 'PARTIAL' | 'PENDING';

export type ActualLivePlayer = {
  player_id: number;
  name: string;
  position: string;
  team_id: number;
  team: string | null;
  team_short: string | null;
  fixtures: Array<{
    match_id: number;
    fpl_fixture_id: number | null;
    venue: 'H' | 'A';
    opponent_team_id: number;
    opponent: string | null;
    opponent_short: string | null;
    kickoff_at: string;
    phase: 'FUTURE' | 'LIVE' | 'FINISHED';
    finished: boolean;
  }>;
};

export type ActualLivePlayerResult = {
  player_id: number;
  fixture_ids: number[];
  status: ActualLiveStatus;
  points_are_final: boolean;
  minutes: number | null;
  total_points: number | null;
  goals: number | null;
  assists: number | null;
  bonus: number | null;
  bps: number | null;
  defensive_contribution: number | null;
  xg: number | null;
  xa: number | null;
  xgi: number | null;
  xgc: number | null;
  clean_sheets: number | null;
};

type NotVerifiedActual = {
  verification_status: 'NOT_VERIFIED';
  reason: string;
};

type VerifiedActual = {
  verification_status: 'VERIFIED';
  decision_id: number;
  captured_at: string;
  source: string;
  starting_xi: number[];
  bench_order: number[];
  squad: number[];
  captain_player_id: number | null;
  vice_player_id: number | null;
  chip: string | null;
};

export type ActualLiveApi = {
  ok: true;
  contract_version: 'fpl_v3_actual_live_v01';
  gameweek: number;
  generated_at: string;
  actual: NotVerifiedActual | VerifiedActual;
  result_snapshot: {
    result_run_id: number | null;
    observed_at: string | null;
    is_final: boolean;
  } | null;
  players: ActualLivePlayer[];
  player_actuals: ActualLivePlayerResult[];
  semantics: {
    engine_recommendation_is_never_used_as_actual: true;
    provisional_live_points_are_not_final: true;
    only_full_11_plus_4_actual_is_verified?: true;
    scoring_scope: 'RAW_FPL_PLAYER_POINTS_NO_AUTO_SUBS_OR_CAPTAIN_MULTIPLIER';
  };
};

function isActualLiveApi(value: unknown): value is ActualLiveApi {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return payload.ok === true
    && payload.contract_version === 'fpl_v3_actual_live_v01'
    && typeof payload.gameweek === 'number'
    && typeof payload.actual === 'object'
    && Array.isArray(payload.players)
    && Array.isArray(payload.player_actuals);
}

export async function fetchActualLive(gameweek = 0, signal?: AbortSignal): Promise<ActualLiveApi> {
  const suffix = gameweek > 0 ? `?gw=${gameweek}` : '';
  const response = await fetch(`${API_ROOT}/fpl-v3-actual-live-api${suffix}`, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Actual-live API returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (!isActualLiveApi(payload)) throw new Error('Actual-live contract mismatch');
  return payload;
}
