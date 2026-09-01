import { useQuery } from '@tanstack/react-query';
import { endpoints, fetchValidated } from './api';
import { FixtureApiSchema, FplApiSchema, type FplApi, type Player } from './contracts';

function withGameweek(endpoint: string, gameweek: number): string { return gameweek > 0 ? `${endpoint}?gw=${gameweek}` : endpoint; }
export function useHomeData(gameweek: number) {
  const fpl = useQuery({ queryKey: ['home', 'fpl', gameweek], queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fpl, gameweek), FplApiSchema, signal) });
  const fixtures = useQuery({ queryKey: ['home', 'fixtures', gameweek], queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fixtures, gameweek), FixtureApiSchema, signal) });
  return { fpl, fixtures };
}
export function findPlayer(data: FplApi | undefined, id: number | null | undefined): Player | undefined { if (id == null) return undefined; return data?.squad.find((player) => player.id === id); }
export function decisionLabel(data: FplApi | undefined): string { const decision = data?.decision; if (!decision) return 'AWAITING DECISION'; if ((decision.transfers?.length ?? 0) === 0) return 'HOLD / ROLL'; return decision.transfers.length === 1 ? '1 TRANSFER' : `${decision.transfers.length} TRANSFERS`; }
export function chipLabel(value: string | null | undefined): string { if (!value || value.toUpperCase() === 'NONE') return 'No chip'; return value.replaceAll('_', ' '); }
export function percent(value: number | null | undefined): string { return value == null ? '—' : `${Math.round(value * 100)}%`; }
