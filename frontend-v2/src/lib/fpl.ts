import { useQuery } from '@tanstack/react-query';
import { endpoints, fetchValidated, publicGatewayHeaders } from './api';
import { FplApiSchema, ManagerPlanApiSchema, type FplApi, type ManagerPlan, type Player } from './contracts';

function withGameweek(endpoint: string, gameweek: number): string {
  return gameweek > 0 ? `${endpoint}?gw=${gameweek}` : endpoint;
}

export function useFplWorkspaceData(gameweek: number) {
  const fpl = useQuery({
    queryKey: ['fpl-workspace', 'projection', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fpl, gameweek), FplApiSchema, signal),
  });
  const managerPlan = useQuery({
    queryKey: ['fpl-workspace', 'manager-plan', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.managerPlan, gameweek), ManagerPlanApiSchema, signal, publicGatewayHeaders),
  });
  return { fpl, managerPlan };
}

export function selectionId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const id = Number((value as { id?: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export type ResolvedSelection = { id: number; player: Player | undefined };

function projectionPlayerById(data: FplApi | undefined, id: number): Player | undefined {
  if (!data) return undefined;
  return data.squad.find((player) => player.id === id)
    ?? data.all_predictions.find((player) => player.id === id);
}

export function resolveSelections(data: FplApi | undefined, selections: unknown[] | undefined): ResolvedSelection[] {
  return (selections ?? [])
    .map(selectionId)
    .filter((id): id is number => id != null)
    .map((id) => ({ id, player: projectionPlayerById(data, id) }));
}

export function findSquadPlayer(data: FplApi | undefined, id: number | null | undefined): Player | undefined {
  if (id == null) return undefined;
  return projectionPlayerById(data, id);
}

export function rankProjectionLeaders(players: Player[], limit = 8): Player[] {
  return [...players]
    .filter((player) => player.expected_points != null)
    .sort((a, b) => Number(b.expected_points) - Number(a.expected_points)
      || Number(b.p_10_plus ?? -1) - Number(a.p_10_plus ?? -1)
      || Number(b.expected_minutes ?? -1) - Number(a.expected_minutes ?? -1)
      || a.id - b.id)
    .slice(0, limit);
}

export function projectionRelation(planCapturedAt: string | undefined, projectionGeneratedAt: string | undefined): { label: string; projectionNewer: boolean | null } {
  if (!planCapturedAt || !projectionGeneratedAt) return { label: 'Plan / projection timing unavailable', projectionNewer: null };
  const planMs = new Date(planCapturedAt).getTime();
  const projectionMs = new Date(projectionGeneratedAt).getTime();
  if (!Number.isFinite(planMs) || !Number.isFinite(projectionMs)) return { label: 'Plan / projection timing unavailable', projectionNewer: null };
  const differenceHours = Math.abs(projectionMs - planMs) / 3_600_000;
  const age = differenceHours < 1 ? '<1h' : `${Math.floor(differenceHours)}h`;
  if (projectionMs > planMs) return { label: `Latest projection is ${age} newer than the saved plan`, projectionNewer: true };
  if (planMs > projectionMs) return { label: `Saved plan is ${age} newer than the latest projection`, projectionNewer: false };
  return { label: 'Saved plan and projection were captured at the same time', projectionNewer: false };
}

export function transferDescription(value: unknown, index: number): string {
  if (typeof value !== 'object' || value === null) return `Transfer ${index + 1}`;
  const record = value as Record<string, unknown>;
  const incoming = textField(record, ['in', 'in_name', 'incoming', 'player_in']);
  const outgoing = textField(record, ['out', 'out_name', 'outgoing', 'player_out']);
  if (incoming && outgoing) return `${outgoing} → ${incoming}`;
  if (incoming) return `In: ${incoming}`;
  if (outgoing) return `Out: ${outgoing}`;
  return `Transfer ${index + 1}`;
}

export function decisionReasons(plan: ManagerPlan | null | undefined): string[] {
  if (!plan?.rationale || typeof plan.rationale !== 'object') return [];
  const rationale = plan.rationale as Record<string, unknown>;
  const reasons: string[] = [];
  const why = rationale.why_hold;
  if (Array.isArray(why)) {
    for (const item of why) if (typeof item === 'string' && item.trim()) reasons.push(item.trim());
  }
  const modelRule = rationale.model_error_rule;
  if (typeof modelRule === 'string' && modelRule.trim()) reasons.push(modelRule.trim());
  const freshXi = rationale.fresh_xi_note;
  if (typeof freshXi === 'string' && freshXi.trim()) reasons.push(freshXi.trim());
  return [...new Set(reasons)].slice(0, 4);
}

export function isDirectCurrentDistribution(player: Player | undefined): boolean {
  return player?.tail_semantics === 'direct_current_fixture_event_distribution';
}

export function formatBank(bankTenths: number | null | undefined): string {
  return bankTenths == null ? '—' : `£${(bankTenths / 10).toFixed(1)}m`;
}

export function formatPlayerPrice(player: Player): string {
  return player.price == null ? '—' : `£${player.price.toFixed(1)}m`;
}

function textField(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
