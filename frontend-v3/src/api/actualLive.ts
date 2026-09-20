import { fetchJsonCached } from './requestCache';

const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';
const PUBLIC_SUPABASE_ANON_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';
const CURRENT_ACTUAL_REUSE_MS = 10_000;

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
  played: boolean | null;
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
  yellow_cards: number | null;
  red_cards: number | null;
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
  scenario_players?: ActualLivePlayer[];
  scenario_player_actuals?: ActualLivePlayerResult[];
  semantics: {
    engine_recommendation_is_never_used_as_actual: true;
    provisional_live_points_are_not_final: true;
    only_full_11_plus_4_actual_is_verified?: true;
    scoring_scope: 'RAW_FPL_PLAYER_POINTS_FOR_ENGINE_AND_ACTUAL_SCENARIO_SCORING';
    player_scope?: 'ACTUAL_PRIMARY_PLUS_ENGINE_ACTUAL_SCENARIO_UNION' | 'VERIFIED_ACTUAL_REQUIRED_FOR_COMPARISON' | 'UNION_ENGINE_RECOMMENDATION_AND_VERIFIED_ACTUAL_SQUADS';
  };
};

type CurrentActualCache = {
  expiresAt: number;
  value: ActualLiveApi;
};

let currentActualCache: CurrentActualCache | null = null;
let currentActualPending: Promise<ActualLiveApi> | null = null;

function isActualLiveApi(value: unknown): value is ActualLiveApi {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Record<string, unknown>;
  return payload.ok === true
    && payload.contract_version === 'fpl_v3_actual_live_v01'
    && typeof payload.gameweek === 'number'
    && typeof payload.actual === 'object'
    && Array.isArray(payload.players)
    && Array.isArray(payload.player_actuals)
    && (payload.scenario_players == null || Array.isArray(payload.scenario_players))
    && (payload.scenario_player_actuals == null || Array.isArray(payload.scenario_player_actuals));
}

function comparisonHydrated(payload: ActualLiveApi): ActualLiveApi {
  if (!payload.scenario_players?.length || !payload.scenario_player_actuals?.length) return payload;
  return {
    ...payload,
    players: payload.scenario_players,
    player_actuals: payload.scenario_player_actuals,
  };
}

function cachedCurrentActual(): ActualLiveApi | null {
  if (!currentActualCache) return null;
  if (currentActualCache.expiresAt <= Date.now()) {
    currentActualCache = null;
    return null;
  }
  return currentActualCache.value;
}

function fetchCurrentActualLive(): Promise<ActualLiveApi> {
  const cached = cachedCurrentActual();
  if (cached) return Promise.resolve(cached);
  if (currentActualPending) return currentActualPending;

  const pending = fetchJsonCached(`${API_ROOT}/fpl-v3-actual-live-api`, {
    headers: {
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    ttlMs: CURRENT_ACTUAL_REUSE_MS,
    timeoutMs: 20_000,
    staleIfErrorMs: 60 * 60_000,
  }).then((payload) => {
    if (!isActualLiveApi(payload)) throw new Error('Actual-live contract mismatch');
    const hydrated = comparisonHydrated(payload);
    currentActualCache = { value: hydrated, expiresAt: Date.now() + CURRENT_ACTUAL_REUSE_MS };
    return hydrated;
  }).finally(() => {
    if (currentActualPending === pending) currentActualPending = null;
  });

  currentActualPending = pending;
  return pending;
}

export async function fetchActualLive(gameweek = 0, signal?: AbortSignal): Promise<ActualLiveApi> {
  if (gameweek <= 0) {
    const pending = fetchCurrentActualLive();
    return signal ? awaitWithAbort(pending, signal) : pending;
  }

  const cached = cachedCurrentActual();
  if (cached?.gameweek === gameweek) return cached;

  if (currentActualPending) {
    try {
      const current = signal ? await awaitWithAbort(currentActualPending, signal) : await currentActualPending;
      if (current.gameweek === gameweek) return current;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
    }
  }

  const payload = await fetchJsonCached(`${API_ROOT}/fpl-v3-actual-live-api?gw=${gameweek}`, {
    headers: {
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    ttlMs: CURRENT_ACTUAL_REUSE_MS,
    timeoutMs: 20_000,
    staleIfErrorMs: 60 * 60_000,
    signal,
  });
  if (!isActualLiveApi(payload)) throw new Error('Actual-live contract mismatch');
  if (payload.gameweek !== gameweek) {
    throw new Error(`Actual-live Gameweek mismatch: requested GW${gameweek}, received GW${payload.gameweek}`);
  }
  return comparisonHydrated(payload);
}

function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener('abort', onAbort); resolve(value); },
      (error) => { signal.removeEventListener('abort', onAbort); reject(error); },
    );
  });
}
