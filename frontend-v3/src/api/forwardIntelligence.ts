import { fetchJsonCached } from './requestCache';
import { assertRequestedGameweek } from './gameweekIntegrity';

const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';
const PUBLIC_SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtub29pd2V6enN4Y3dodGp0ZGFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczMzY0MjQsImV4cCI6MjEwMjkxMjQyNH0.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type ForwardPlayerProjection = {
  id: number;
  name: string;
  position: string;
  team: string | null;
  team_short: string | null;
  expected_points: number | null;
  expected_minutes: number | null;
  p_start: number | null;
  p_blank: number | null;
  p_10_plus: number | null;
  p_15_plus: number | null;
  p_20_plus: number | null;
};

export type ForwardFixtureModel = {
  match_id: number;
  home: string | null;
  away: string | null;
  kickoff_time: string;
  headline_score: string | null;
  headline_score_probability: number | null;
  markets: Record<string, number>;
};

export type ForwardIntelligencePayload = {
  ok: true;
  gameweek: number;
  prediction_run_id: number;
  model_version: string | null;
  generated_at: string;
  top_players: ForwardPlayerProjection[];
  fixture_models: ForwardFixtureModel[];
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
function player(value: unknown): ForwardPlayerProjection | null {
  const row = object(value); const id = number(row?.id); const name = string(row?.name); const position = string(row?.position);
  if (id == null || !name || !position) return null;
  return {
    id, name, position,
    team: string(row?.team), team_short: string(row?.team_short),
    expected_points: number(row?.expected_points), expected_minutes: number(row?.expected_minutes),
    p_start: number(row?.p_start), p_blank: number(row?.p_blank), p_10_plus: number(row?.p_10_plus), p_15_plus: number(row?.p_15_plus), p_20_plus: number(row?.p_20_plus),
  };
}
function fixture(value: unknown): ForwardFixtureModel | null {
  const row = object(value); const id = number(row?.match_id); const kickoff = string(row?.kickoff_time);
  if (id == null || !kickoff) return null;
  const marketsRaw = object(row?.markets) ?? {};
  const markets: Record<string, number> = {};
  for (const [key, raw] of Object.entries(marketsRaw)) { const parsed = number(raw); if (parsed != null) markets[key] = parsed; }
  return {
    match_id: id, home: string(row?.home), away: string(row?.away), kickoff_time: kickoff,
    headline_score: string(row?.headline_score), headline_score_probability: number(row?.headline_score_probability), markets,
  };
}

export async function fetchForwardIntelligence(gameweek = 0, signal?: AbortSignal): Promise<ForwardIntelligencePayload> {
  const suffix = gameweek > 0 ? `?gw=${gameweek}` : '';
  const raw = await fetchJsonCached(`${API_ROOT}/human-insights-api${suffix}`, {
    headers: { Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`, apikey: PUBLIC_SUPABASE_ANON_JWT },
    ttlMs: 60_000,
    signal,
  });
  const payload = object(raw);
  const gw = number(payload?.gameweek); const runId = number(payload?.prediction_run_id); const generatedAt = string(payload?.generated_at);
  if (payload?.ok !== true || gw == null || runId == null || !generatedAt) throw new Error('Forward intelligence contract mismatch');
  assertRequestedGameweek(gameweek, gw, 'Forward intelligence');
  return {
    ok: true,
    gameweek: gw,
    prediction_run_id: runId,
    model_version: string(payload.model_version),
    generated_at: generatedAt,
    top_players: Array.isArray(payload.top_players) ? payload.top_players.map(player).filter((row): row is ForwardPlayerProjection => row != null) : [],
    fixture_models: Array.isArray(payload.fixture_models) ? payload.fixture_models.map(fixture).filter((row): row is ForwardFixtureModel => row != null) : [],
  };
}
