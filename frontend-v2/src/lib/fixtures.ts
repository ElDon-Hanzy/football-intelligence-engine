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
export type ModalEvidenceGroups = {
  supports: FixtureFact[];
  contradicts: FixtureFact[];
  neutral: FixtureFact[];
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

export function precisePercent(value: number | null | undefined): string {
  return value == null ? '—' : `${(value * 100).toFixed(1)}%`;
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

function distinctFromOrdered(facts: FixtureFact[], limit: number): FixtureFact[] {
  const seenFamilies = new Set<string>();
  const seenText = new Set<string>();
  const selected: FixtureFact[] = [];
  for (const fact of facts) {
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

export function selectCardFacts(facts: FixtureFact[], limit = 3): FixtureFact[] {
  const ordered = [...facts].sort((a, b) => (a.card_rank ?? 999) - (b.card_rank ?? 999) || b.usefulness_score - a.usefulness_score || a.id - b.id);
  return distinctFromOrdered(ordered, limit);
}

function selectModalGroup(facts: FixtureFact[], limit: number): FixtureFact[] {
  const ordered = [...facts].sort((a, b) => b.usefulness_score - a.usefulness_score || (a.card_rank ?? 999) - (b.card_rank ?? 999) || a.id - b.id);
  return distinctFromOrdered(ordered, limit);
}

export function groupModalFacts(facts: FixtureFact[], perGroup = 3): ModalEvidenceGroups {
  return {
    supports: selectModalGroup(facts.filter((fact) => fact.alignment === 'SUPPORTS'), perGroup),
    contradicts: selectModalGroup(facts.filter((fact) => fact.alignment === 'CONTRADICTS'), perGroup),
    neutral: selectModalGroup(facts.filter((fact) => fact.alignment === 'NEUTRAL'), perGroup),
  };
}

export function buildMatchStory(fixture: FplFixtureResult, facts: FixtureFactsItem): string {
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const assessment = assessCall(fixture.prediction?.markets);
  if (!assessment.top || !assessment.second || assessment.margin == null) return 'The current forecast does not expose enough 1X2 information to form a reliable matchup story.';

  const topLabel = outcomeLabel(assessment.top.code, home, away);
  const secondLabel = outcomeLabel(assessment.second.code, home, away);
  const marginPp = assessment.margin * 100;
  const allGroups = groupModalFacts(facts.modal_facts, 20);
  const supportCount = allGroups.supports.length;
  const counterCount = allGroups.contradicts.length;

  if (assessment.state === 'no-edge') {
    const evidence = supportCount
      ? `${supportCount} distinct signed input${supportCount === 1 ? '' : 's'} support the leading thesis`
      : 'No distinct supporting input clears the evidence gate';
    const counter = counterCount
      ? `, while ${counterCount} counter-input${counterCount === 1 ? '' : 's'} push the other way.`
      : ', but the probability gap is still too small for a categorical call.';
    return `The model is effectively split: ${topLabel} at ${precisePercent(assessment.top.probability)} is only ${marginPp.toFixed(1)}pp ahead of ${secondLabel}. ${evidence}${counter}`;
  }

  const strength = assessment.state === 'strong' ? 'clear' : 'narrow';
  const evidence = supportCount
    ? `${supportCount} distinct signed input${supportCount === 1 ? '' : 's'} support the call`
    : 'No supporting input clears the display gate';
  const counter = counterCount
    ? `, while ${counterCount} counter-input${counterCount === 1 ? '' : 's'} remain live.`
    : '.';
  return `${topLabel} is the ${strength} 1X2 thesis at ${precisePercent(assessment.top.probability)}, ${marginPp.toFixed(1)}pp ahead of ${secondLabel}. ${evidence}${counter}`;
}

export function actualOutcome(homeScore: number | null | undefined, awayScore: number | null | undefined): OutcomeCode | null {
  if (homeScore == null || awayScore == null) return null;
  if (homeScore > awayScore) return 'H';
  if (awayScore > homeScore) return 'A';
  return 'D';
}
