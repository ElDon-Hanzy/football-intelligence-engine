import { useQuery } from '@tanstack/react-query';
import { endpoints, fetchValidated, publicGatewayHeaders } from './api';
import {
  FplApiSchema,
  ManagerPlanApiSchema,
  type FplApi,
  type FplFixtureResult,
  type ManagerPlan,
  type Player,
} from './contracts';

function withGameweek(endpoint: string, gameweek: number): string {
  return gameweek > 0 ? `${endpoint}?gw=${gameweek}` : endpoint;
}

export function useHomeData(gameweek: number) {
  const fpl = useQuery({
    queryKey: ['home', 'fpl', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fpl, gameweek), FplApiSchema, signal),
  });
  const managerPlan = useQuery({
    queryKey: ['home', 'manager-plan', gameweek],
    queryFn: ({ signal }) => fetchValidated(
      withGameweek(endpoints.managerPlan, gameweek),
      ManagerPlanApiSchema,
      signal,
      publicGatewayHeaders,
    ),
  });
  return { fpl, managerPlan };
}

export function findPlayer(data: FplApi | undefined, id: number | null | undefined): Player | undefined {
  if (id == null) return undefined;
  return data?.squad.find((player) => player.id === id);
}

export function decisionLabel(plan: ManagerPlan | null | undefined): string {
  if (!plan) return 'AWAITING PLAN';
  if (plan.transfers.length === 0) return 'HOLD / ROLL';
  return plan.transfers.length === 1 ? '1 TRANSFER' : `${plan.transfers.length} TRANSFERS`;
}

export function planNarrative(plan: ManagerPlan | null | undefined): string {
  if (!plan) return 'No authoritative manager plan is saved for this Gameweek.';
  if (plan.rationale && typeof plan.rationale === 'object') {
    const decision = (plan.rationale as Record<string, unknown>).decision;
    if (typeof decision === 'string' && decision.trim()) return decision;
  }
  return humanizeMachineText(plan.status);
}

export function planFreshness(capturedAt: string | undefined, now = Date.now()): { label: string; stale: boolean } {
  if (!capturedAt) return { label: 'Plan time unavailable', stale: true };
  const captured = new Date(capturedAt).getTime();
  if (!Number.isFinite(captured)) return { label: 'Plan time unavailable', stale: true };
  const ageHours = Math.max(0, (now - captured) / 3_600_000);
  if (ageHours >= 24) return { label: `Saved ${Math.floor(ageHours)}h ago · refresh before acting`, stale: true };
  if (ageHours >= 1) return { label: `Saved ${Math.floor(ageHours)}h ago`, stale: false };
  return { label: 'Saved less than 1h ago', stale: false };
}

export function chipLabel(value: string | null | undefined): string {
  if (!value || value.toUpperCase() === 'NONE') return 'No chip';
  return humanizeMachineText(value);
}

export function percent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

export type FixtureCall = {
  label: string;
  fixture: string;
  probability: number;
  margin: number;
  clear: boolean;
};

export function strongestFixtureCall(fixtures: FplFixtureResult[]): FixtureCall | null {
  const calls = fixtures
    .filter((fixture) => !fixture.finished && fixture.prediction?.markets)
    .map((fixture) => {
      const markets = fixture.prediction?.markets;
      if (!markets) return null;
      const outcomes = [
        { label: fixture.home_team ?? 'Home', probability: markets.home_win },
        { label: 'Draw', probability: markets.draw },
        { label: fixture.away_team ?? 'Away', probability: markets.away_win },
      ].sort((a, b) => b.probability - a.probability);
      const first = outcomes[0];
      const second = outcomes[1];
      if (!first || !second) return null;
      return {
        label: first.label,
        fixture: `${fixture.home_team ?? 'Home'} vs ${fixture.away_team ?? 'Away'}`,
        probability: first.probability,
        margin: first.probability - second.probability,
        clear: first.probability - second.probability >= 0.05,
      } satisfies FixtureCall;
    })
    .filter((call): call is FixtureCall => call != null)
    .sort((a, b) => b.margin - a.margin || b.probability - a.probability);
  return calls[0] ?? null;
}

export function humanizeMachineText(value: string): string {
  const normalized = value.toLowerCase().replaceAll('_', ' ');
  return normalized.replace(/^./, (character) => character.toUpperCase());
}
