const API_ROOT = 'https://knooiwezzsxcwhtjtdap.supabase.co/functions/v1';

export type OutcomeCode = 'H' | 'D' | 'A';
export type MatchCallState = 'strong' | 'lean' | 'no-edge' | 'unavailable';

export type MatchPrediction = {
  snapshot_id?: number;
  source_change_id?: string | null;
  captured_at?: string;
  home_lambda?: number;
  away_lambda?: number;
  markets?: { home_win: number; draw: number; away_win: number };
  headline_score?: string | null;
  headline_score_probability?: number | null;
  raw_modal_score?: string | null;
  raw_modal_probability?: number | null;
  script_family?: string | null;
  script_confidence?: number | null;
  selector?: Record<string, unknown> | null;
  top_scorelines?: Array<{ score: string; prob: number }>;
};

export type MatchFixture = {
  match_id: number;
  fpl_fixture_id?: number | null;
  kickoff_time: string;
  home_team: string | null;
  away_team: string | null;
  home_short?: string | null;
  away_short?: string | null;
  finished: boolean;
  home_score?: number | null;
  away_score?: number | null;
  prediction: MatchPrediction | null;
};

export type FixtureFact = {
  id: number;
  fact_type: string;
  usefulness_score: number;
  card_rank?: number | null;
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
    script_family: string(row.script_family),
    script_confidence: number(row.script_confidence),
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
  const modalFacts: FixtureFact[] = Array.isArray(row?.modal_facts)
    ? row!.modal_facts.map((item) => {
        const fact = object(item);
        const id = number(fact?.id);
        const alignment = string(fact?.alignment);
        const oneLiner = string(fact?.one_liner);
        if (id == null || !oneLiner || !['SUPPORTS', 'CONTRADICTS', 'NEUTRAL'].includes(alignment ?? '')) return null;
        return {
          id,
          fact_type: string(fact?.fact_type) ?? 'context',
          usefulness_score: number(fact?.usefulness_score) ?? 0,
          card_rank: number(fact?.card_rank),
          alignment: alignment as FixtureFact['alignment'],
          one_liner: oneLiner,
        };
      }).filter((item): item is FixtureFact => item != null)
    : [];
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

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { cache: 'no-store', headers: { Accept: 'application/json' }, ...(signal ? { signal } : {}) });
  if (!response.ok) throw new Error(`HTTP ${response.status} from ${url}`);
  return response.json();
}

export async function fetchMatchIntelligence(gameweek: number, signal?: AbortSignal): Promise<MatchIntelligence> {
  const fplPayload = object(await fetchJson(`${API_ROOT}/fpl-api?gw=${gameweek}`, signal));
  if (fplPayload?.ok !== true) throw new Error('FPL prediction contract unavailable');
  const fixtures = Array.isArray(fplPayload.fixture_results)
    ? fplPayload.fixture_results.map(parseFixture).filter((item): item is MatchFixture => item != null)
    : [];

  const factsByMatch = new Map<number, FixtureFacts>();
  if (fixtures.some((fixture) => fixture.prediction?.snapshot_id != null)) {
    try {
      const factsPayload = object(await fetchJson(`${API_ROOT}/fixture-facts-api?gw=${gameweek}`, signal));
      if (factsPayload?.ok === true && factsPayload.facts_available === true && Array.isArray(factsPayload.fixtures)) {
        for (const raw of factsPayload.fixtures) {
          const facts = parseFacts(raw);
          if (facts) factsByMatch.set(facts.match_id, facts);
        }
      }
    } catch {
      // Match predictions remain usable if optional explanatory facts are temporarily unavailable.
    }
  }

  return { gameweek, fixtures, factsByMatch };
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
  const top = outcomes[0];
  const second = outcomes[1];
  const margin = top.probability - second.probability;
  const state: MatchCallState = top.probability >= 0.5 && margin >= 0.08
    ? 'strong'
    : top.probability >= 0.4 && margin >= 0.04
      ? 'lean'
      : 'no-edge';
  return { state, top, second, margin };
}

export function actualOutcome(home: number | null | undefined, away: number | null | undefined): OutcomeCode | null {
  if (home == null || away == null) return null;
  return home > away ? 'H' : away > home ? 'A' : 'D';
}

export function scoreOutcome(score: string | null | undefined): OutcomeCode | null {
  if (!score || !/^\d+-\d+$/.test(score)) return null;
  const [home, away] = score.split('-').map(Number);
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
