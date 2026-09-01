import { useQuery } from '@tanstack/react-query';
import { endpoints, fetchValidated } from './api';
import { FixtureFactsApiSchema, FplApiSchema, type FixtureFact, type FixtureFactsItem, type FplFixtureResult } from './contracts';

export type OutcomeCode = 'H' | 'D' | 'A';
export type CallState = 'strong' | 'lean' | 'no-edge' | 'unavailable';
export type MarketSet = { home_win: number; draw: number; away_win: number };
export type OutcomeProbability = { code: OutcomeCode; probability: number };
export type CallAssessment = {
  state: CallState;
  top: OutcomeProbability | null;
  second: OutcomeProbability | null;
  margin: number | null;
};

function withGameweek(endpoint: string, gameweek: number): string {
  return gameweek > 0 ? `${endpoint}?gw=${gameweek}` : endpoint;
}

export function useFixturesData(requestedGameweek: number) {
  const fpl = useQuery({
    queryKey: ['fixtures', 'fpl', requestedGameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fpl, requestedGameweek), FplApiSchema, signal),
  });
  const resolvedGameweek = fpl.data?.gameweek ?? requestedGameweek;
  const facts = useQuery({
    queryKey: ['fixtures', 'facts', resolvedGameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(endpoints.fixtureFacts, resolvedGameweek), FixtureFactsApiSchema, signal),
    enabled: resolvedGameweek > 0,
  });
  return { fpl, facts, resolvedGameweek };
}

export function assessCall(markets: MarketSet | null | undefined): CallAssessment {
  if (!markets) return { state: 'unavailable', top: null, second: null, margin: null };
  const outcomes: OutcomeProbability[] = [
    { code: 'H', probability: markets.home_win },
    { code: 'D', probability: markets.draw },
    { code: 'A', probability: markets.away_win },
  ];
  outcomes.sort((a, b) => b.probability - a.probability);
  const top = outcomes[0] ?? null;
  const second = outcomes[1] ?? null;
  if (!top || !second) return { state: 'unavailable', top: null, second: null, margin: null };
  const margin = top.probability - second.probability;
  const state: CallState = margin >= 0.08 ? 'strong' : margin >= 0.04 ? 'lean' : 'no-edge';
  return { state, top, second, margin };
}

export function outcomeLabel(code: OutcomeCode, home: string, away: string): string {
  if (code === 'H') return home;
  if (code === 'A') return away;
  return 'Draw';
}

export function percent(value: number | null | undefined): string {
  return value == null ? '—' : `${Math.round(value * 100)}%`;
}

export function evidenceMatchesPrediction(fixture: FplFixtureResult, facts: FixtureFactsItem | undefined): boolean {
  const predictionId = fixture.prediction?.snapshot_id;
  const basis = facts?.alignment_basis;
  if (predictionId == null || !basis || predictionId !== basis.snapshot_id) return false;
  const source = fixture.prediction?.source_change_id;
  return source == null || basis.source_change_id == null || source === basis.source_change_id;
}

function familyOf(fact: FixtureFact): string {
  const payload = fact.payload;
  if (typeof payload === 'object' && payload !== null && 'family' in payload) {
    const family = (payload as { family?: unknown }).family;
    if (typeof family === 'string' && family.trim()) return family.trim().toLowerCase();
  }
  return fact.fact_type.replace(/^C\d+_/, '').toLowerCase();
}

function normaliseFact(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export function selectCardFacts(facts: FixtureFact[], limit = 3): FixtureFact[] {
  const seenFamilies = new Set<string>();
  const seenText = new Set<string>();
  const selected: FixtureFact[] = [];
  const ordered = [...facts].sort((a, b) => (a.card_rank ?? 999) - (b.card_rank ?? 999) || b.usefulness_score - a.usefulness_score || a.id - b.id);
  for (const fact of ordered) {
    const family = familyOf(fact);
    const text = normaliseFact(fact.one_liner);
    if (seenFamilies.has(family) || seenText.has(text)) continue;
    seenFamilies.add(family);
    seenText.add(text);
    selected.push(fact);
    if (selected.length >= limit) break;
  }
  return selected;
}

export function actualOutcome(homeScore: number | null | undefined, awayScore: number | null | undefined): OutcomeCode | null {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return 'H';
  if (awayScore > homeScore) return 'A';
  return 'D';
}
