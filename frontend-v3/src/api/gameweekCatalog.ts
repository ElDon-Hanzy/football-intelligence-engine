import { fetchJsonCached } from './requestCache';

const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';
const PUBLIC_SUPABASE_ANON_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBiYXNlIiwicmVmIjoia25vb2l3ZXp6c3hjd2h0anRkYXAiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4NzMzNjQyNCwiZXhwIjoyMTAyOTEyNDI0fQ.V22pHe1g39CnFGTYUX-39Teg_EEmr3kns_Fwbdi4kiQ';

export type GameweekCatalog = {
  currentGameweek: number;
  latestIntelligenceGameweek: number;
};

let resolvedCatalog: GameweekCatalog | null = null;

export function peekGameweekCatalog(): GameweekCatalog | null {
  return resolvedCatalog;
}

export async function fetchGameweekCatalog(signal?: AbortSignal): Promise<GameweekCatalog> {
  const raw = await fetchJsonCached(`${API_ROOT}/gameweek-status-api`, {
    headers: {
      Authorization: `Bearer ${PUBLIC_SUPABASE_ANON_JWT}`,
      apikey: PUBLIC_SUPABASE_ANON_JWT,
    },
    ttlMs: 60_000,
    signal,
  });
  if (!raw || typeof raw !== 'object') throw new Error('Gameweek catalog contract mismatch');
  const payload = raw as Record<string, unknown>;
  const current = finiteGameweek(payload.live_gameweek);
  const latest = finiteGameweek(payload.latest_intelligence_gameweek) ?? current;
  if (payload.ok !== true || current == null || latest == null) throw new Error('Gameweek catalog contract mismatch');
  resolvedCatalog = { currentGameweek: current, latestIntelligenceGameweek: Math.max(current, latest) };
  return resolvedCatalog;
}

function finiteGameweek(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 38 ? parsed : null;
}
