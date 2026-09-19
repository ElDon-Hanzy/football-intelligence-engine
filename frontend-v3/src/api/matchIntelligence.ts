import { fetchJsonCached } from './requestCache';

const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';

export type OutcomeCode = 'H' | 'D' | 'A';
export type MatchCallState = 'strong' | 'lean' | 'no-edge' | 'unavailable';

export type MatchPrediction = {
  snapshot_id: number | undefined;
  source_change_id: string | null;
  captured_at: string | undefined;
  home_lambda: number | undefined;
  away_lambda: number | undefined;
  markets: { home_win: number; draw: number; away_win: number } | undefined;
  headline_score: string | null;
  headline_score_probability: number | null;
  raw_modal_score: string | null;
  raw_modal_probability: number | null;
  decision_contract_version: string | null;
  result_decision: OutcomeCode | 'NO_MEANINGFUL_EDGE' | null;
  direction_strength: string | null;
  outcome_edge: number | null;
  primary_environment: string | null;
  scoring_environment_probabilities: { low: number; normal: number; high: number } | null;
  scoring_environment_state: 'PRIMARY' | 'BLENDED_NEAR_TIE' | 'INSUFFICIENT_EVIDENCE' | null;
  expected_total_goals: number | null;
  dominant_subtype: string | null;
  selected_family: string | null;
  selected_family_probability: number | null;
  representative_score: string | null;
  representative_score_probability: number | null;
  chronology_and_coverage_valid: boolean;
  decision_hash: string | null;
  selector: Record<string, unknown> | null;
  top_scorelines: Array<{ score: string; prob: number }>;
};

export type MatchFixture = {
  match_id: number;
  fpl_fixture_id: number | null;
  kickoff_time: string;
  home_team: string | null;
  away_team: string | null;
  home_short: string | null;
  away_short: string | null;
  finished: boolean;
  home_score: number | null;
  away_score: number | null;
  prediction: MatchPrediction | null;
};

export type FixtureFact = {
  id: number;
  fact_type: string;
  usefulness_score: number;
  card_rank: number | null;
  alignment: 'SUPPORTS' | 'CONTRADICTS' | 'NEUTRAL';
  one_liner: string;
};

export type FixtureFacts = {
  match_id: number;
  alignment_basis: {
    snapshot_id: number;
    captured_at: string;
    source_change_id: string | null;
  } | null;
  modal_facts: FixtureFact[];
};

export type MatchIntelligence = {
  gameweek: number;
  fixtures: MatchFixture[];
  factsByMatch: Map<number, FixtureFacts>;
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

function parsePrediction(value: unknown): MatchPrediction | null {
  const row = object(value);
  if (!row) return null;
  const marketsRaw = object(row.markets);
  const homeWin = number(marketsRaw?.home_win);
  const draw = number(marketsRaw?.draw);
  const awayWin = number(marketsRaw?.away_win);
  const topScorelines = Array.isArray(row.top_scorelines)
    ? row.top_scorelines.map((item) => {
        const score = object(item);
        const label = string(score?.score);
        const prob = number(score?.prob);
        return label && prob != null ? { score: label, prob } : null;
      }).filter((item): item is { score: string; prob: number } => item != null)
    : [];
  const environmentRaw = object(row.scoring_environment_probabilities);
  const low = number(environmentRaw?.low);
  const normal = number(environmentRaw?.normal);
  const high = number(environmentRaw?.high);
  const resultDecisionRaw = string(row.result_decision);
  const resultDecision = resultDecisionRaw === 'HOME' ? 'H' : resultDecisionRaw === 'AWAY' ? 'A' : resultDecisionRaw === 'DRAW' ? 'D' : resultDecisionRaw;
  const environmentState = string(row.scoring_environment_state);
  return {
    snapshot_id: number(row.snapshot_id) ?? undefined,
    source_change_id: string(row.source_change_id),
    captured_at: string(row.captured_at) ?? undefined,
    home_lambda: number(row.home_lambda) ?? undefined,
    away_lambda: number(row.away_lambda) ?? undefined,
    markets: homeWin != null && draw != null && awayWin != null ? { home_win: homeWin, draw, away_win: awayWin } : undefined,
    headline_score: string(row.headline_score),
    headline_score_probability: number(row.headline_score_probability),
    raw_modal_score: string(row.raw_modal_score),
    raw_modal_probability: number(row.raw_modal_probability),
    decision_contract_version: string(row.decision_contract_version),
    result_decision: ['H', 'D', 'A', 'NO_MEANINGFUL_EDGE'].includes(resultDecision ?? '') ? resultDecision as MatchPrediction['result_decision'] : null,
    direction_strength: string(row.direction_strength),
    outcome_edge: number(row.outcome_edge),
    primary_environment: string(row.primary_environment),
    scoring_environment_probabilities: low != null && normal != null && high != null ? { low, normal, high } : null,
    scoring_environment_state: ['PRIMARY', 'BLENDED_NEAR_TIE', 'INSUFFICIENT_EVIDENCE'].includes(environmentState ?? '') ? environmentState as MatchPrediction['scoring_environment_state'] : null,
    expected_total_goals: number(row.expected_total_goals),
    dominant_subtype: string(row.dominant_subtype),
    selected_family: string(row.selected_family),
    selected_family_probability: number(row.selected_family_probability),
    representative_score: string(row.representative_score),
    representative_score_probability: number(row.representative_score_probability),
    chronology_and_coverage_valid: row.chronology_and_coverage_valid === true,
    decision_hash: string(row.decision_hash),
    selector: object(row.selector),
    top_scorelines: topScorelines,
  };
}

function parseFixture(value: unknown): MatchFixture | null {
  const row = object(value);
  const matchId = number(row?.match_id);
  const kickoff = string(row?.kickoff_time);
  if (matchId == null || !kickoff) return null;
  return {
    match_id: matchId,
    fpl_fixture_id: number(row?.fpl_fixture_id),
    kickoff_time: kickoff,
    home_team: string(row?.home_team),
    away_team: string(row?.away_team),
    home_short: string(row?.home_short),
    away_short: string(row?.away_short),
    finished: row?.finished === true,
    home_score: number(row?.home_score),
    away_score: number(row?.away_score),
    prediction: parsePrediction(row?.prediction),
  };
}

function parseFacts(value: unknown): FixtureFacts | null {
  const row = object(value);
  const matchId = number(row?.match_id);
  if (matchId == null) return null;
  const basisRaw = object(row?.alignment_basis);
  const snapshotId = number(basisRaw?.snapshot_id);
  const capturedAt = string(basisRaw?.captured_at);
  const rawFacts = Array.isArray(row?.modal_facts) ? row.modal_facts : [];
  const modalFacts: FixtureFact[] = [];
  for (const item of rawFacts) {
    const fact = object(item);
    const id = number(fact?.id);
    const alignment = string(fact?.alignment);
    const oneLiner = string(fact?.one_liner);
    if (id == null || !oneLiner || !['SUPPORTS', 'CONTRADICTS', 'NEUTRAL'].includes(alignment ?? '')) continue;
    modalFacts.push({
      id,
      fact_type: string(fact?.fact_type) ?? 'context',
      usefulness_score: number(fact?.usefulness_score) ?? 0,
      card_rank: number(fact?.card_rank),
      alignment: alignment as FixtureFact['alignment'],
      one_liner: oneLiner,
    });
  }
  return {
    match_id: matchId,
    alignment_basis: snapshotId != null && capturedAt ? {
      snapshot_id: snapshotId,
      captured_at: capturedAt,
      source_change_id: string(basisRaw?.source_change_id),
    } : null,
    modal_facts: modalFacts,
  };
}

export async function fetchMatchIntelligence(gameweek: number, signal?: AbortSignal): Promise<MatchIntelligence> {
  if (gameweek < 1 || gameweek > 38) throw new Error('A resolved Gameweek is required for match intelligence');
  const fplPayload = object(await fetchJsonCached(`${API_ROOT}/fpl-api?gw=${gameweek}`, { ttlMs: 30_000, signal }));
  if (fplPayload?.ok !== true || number(fplPayload.gameweek) !== gameweek) throw new Error('FPL prediction contract unavailable');
  const fixtures = Array.isArray(fplPayload.fixture_results)
    ? fplPayload.fixture_results.map(parseFixture).filter((item): item is MatchFixture => item != null)
    : [];
  return { gameweek, fixtures, factsByMatch: new Map<number, FixtureFacts>() };
}

export async function fetchFixtureFacts(gameweek: number, signal?: AbortSignal): Promise<Map<number, FixtureFacts>> {
  const factsByMatch = new Map<number, FixtureFacts>();
  if (gameweek < 1 || gameweek > 38) return factsByMatch;
  try {
    const factsPayload = object(await fetchJsonCached(`${API_ROOT}/fixture-facts-api?gw=${gameweek}`, { ttlMs: 120_000, signal }));
    if (factsPayload?.ok === true && factsPayload.facts_available === true && Array.isArray(factsPayload.fixtures)) {
      for (const raw of factsPayload.fixtures) {
        const facts = parseFacts(raw);
        if (facts) factsByMatch.set(facts.match_id, facts);
      }
    }
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') throw reason;
  }
  return factsByMatch;
}

export function assessCall(prediction: MatchPrediction | null): {
  state: MatchCallState;
  top: { code: OutcomeCode; probability: number } | null;
  second: { code: OutcomeCode; probability: number } | null;
  margin: number | null;
} {
  if (!prediction?.markets) return { state: 'unavailable', top: null, second: null, margin: null };
  const outcomes = [
    { code: 'H' as const, probability: prediction.markets.home_win },
    { code: 'D' as const, probability: prediction.markets.draw },
    { code: 'A' as const, probability: prediction.markets.away_win },
  ].sort((a, b) => b.probability - a.probability);
  const top = outcomes[0]!;
  const second = outcomes[1]!;
  const margin = top.probability - second.probability;
  const state: MatchCallState = prediction.result_decision === 'NO_MEANINGFUL_EDGE'
    ? 'no-edge'
    : prediction.direction_strength === 'STRONG'
      ? 'strong'
      : 'lean';
  return { state, top, second, margin };
}

export function actualOutcome(home: number | null | undefined, away: number | null | undefined): OutcomeCode | null {
  if (home == null || away == null) return null;
  return home > away ? 'H' : away > home ? 'A' : 'D';
}

export function scoreOutcome(score: string | null | undefined): OutcomeCode | null {
  if (!score || !/^\d+-\d+$/.test(score)) return null;
  const parts = score.split('-').map(Number);
  const home = parts[0];
  const away = parts[1];
  if (home == null || away == null) return null;
  return home > away ? 'H' : away > home ? 'A' : 'D';
}

export function alignedFacts(fixture: MatchFixture, facts: FixtureFacts | undefined): FixtureFacts | null {
  if (!facts || fixture.prediction?.snapshot_id == null || facts.alignment_basis?.snapshot_id == null) return null;
  if (fixture.prediction.snapshot_id !== facts.alignment_basis.snapshot_id) return null;
  const source = fixture.prediction.source_change_id;
  const basisSource = facts.alignment_basis.source_change_id;
  if (source && basisSource && source !== basisSource) return null;
  return facts;
}
