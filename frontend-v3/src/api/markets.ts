const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';
const PUBLIC_SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type CoreMarketType = 'Correct score' | '1X2' | 'O/U 2.5' | 'BTTS' | string;

export type CoreMarketCall = {
  type: CoreMarketType;
  match_id: number;
  fixture: string;
  selection: string;
  probability: number;
  home_lambda: number | null;
  away_lambda: number | null;
};

export type CoreMarketsPayload = {
  ok: true;
  gameweek: number;
  prediction_run_id: number;
  model_version?: string | null;
  generated_at: string;
  betting_recommendations: CoreMarketCall[];
};

function object(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function number(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function string(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function parseCall(value: unknown): CoreMarketCall | null {
  const row = object(value);
  const type = string(row?.type);
  const matchId = number(row?.match_id);
  const fixture = string(row?.fixture);
  const selection = string(row?.selection);
  const probability = number(row?.probability);
  if (!type || matchId == null || !fixture || !selection || probability == null || probability < 0 || probability > 1) return null;
  return {
    type,
    match_id: matchId,
    fixture,
    selection,
    probability,
    home_lambda: number(row?.home_lambda),
    away_lambda: number(row?.away_lambda),
  };
}

export async function fetchCoreMarkets(gameweek: number, signal?: AbortSignal): Promise<CoreMarketsPayload> {
  const response = await fetch(`${API_ROOT}/human-insights-api?gw=${gameweek}`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    cache: 'no-store',
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) throw new Error(`Core markets returned HTTP ${response.status}`);
  const raw: unknown = await response.json();
  const payload = object(raw);
  const gw = number(payload?.gameweek);
  const runId = number(payload?.prediction_run_id);
  const generatedAt = string(payload?.generated_at);
  if (payload?.ok !== true || gw == null || runId == null || !generatedAt) throw new Error('Core markets contract mismatch');
  const calls = Array.isArray(payload.betting_recommendations)
    ? payload.betting_recommendations.map(parseCall).filter((item): item is CoreMarketCall => item != null).slice(0, 4)
    : [];
  return {
    ok: true,
    gameweek: gw,
    prediction_run_id: runId,
    model_version: string(payload.model_version),
    generated_at: generatedAt,
    betting_recommendations: calls,
  };
}
