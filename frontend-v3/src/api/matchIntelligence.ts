import { fetchJsonCached } from './requestCache';
import { assertFixtureIdsBelongToGameweek, assertRequestedGameweek } from './gameweekIntegrity';

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

export type DecisionEvidenceItem = {
  id: string;
  target: string;
  text: string;
  kind: 'MODEL_INPUT' | 'OBSERVED_CONTEXT';
  side: 'HOME' | 'AWAY' | null;
  value: unknown;
  weight: number;
  signed_contribution: number;
  sample: number;
  cutoff: string;
  source: string;
};

export type DecisionRisk = { id: string; target: string; text: string; severity: string };
export type DecisionTarget = { target: string; model_inputs: DecisionEvidenceItem[]; observed_context: DecisionEvidenceItem[]; risks: DecisionRisk[] };
export type DecisionEvidence = {
  contract_version: string;
  snapshot_id: number;
  match_id: number;
  gameweek: number;
  cutoff: string;
  decision_hash: string;
  evidence_hash: string;
  conclusion: { result_decision: string; result_margin: number; home_projected_goals: number; away_projected_goals: number };
  targets: DecisionTarget[];
  reliability: { classification: string; home: { result_sample: number; xg_sample: number; prior_weight: number }; away: { result_sample: number; xg_sample: number; prior_weight: number }; missing_is_not_zero: boolean };
  synthesis: string;
  player_implications: { scope: string; publication_authority: boolean; requires_p7_lineage: boolean; home: string; away: string };
  audit: Record<string, boolean>;
};

export type FixtureFacts = {
  match_id: number;
  alignment_basis: {
    snapshot_id: number;
    captured_at: string;
    source_change_id: string | null;
  } | null;
  modal_facts: FixtureFact[];
  decision_evidence: DecisionEvidence | null;
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
    decision_evidence: parseDecisionEvidence(row?.decision_evidence),
  };
}

function parseEvidenceItem(value: unknown): DecisionEvidenceItem | null {
  const row = object(value); const id = string(row?.id); const target = string(row?.target); const text = string(row?.text);
  const kind = string(row?.kind); const sample = number(row?.sample); const cutoff = string(row?.cutoff); const source = string(row?.source);
  const weight = number(row?.weight); const contribution = number(row?.signed_contribution); const side = string(row?.side);
  if (!id || !target || !text || !['MODEL_INPUT', 'OBSERVED_CONTEXT'].includes(kind ?? '') || sample == null || !cutoff || !source || weight == null || contribution == null) return null;
  return { id, target, text, kind: kind as DecisionEvidenceItem['kind'], side: side === 'HOME' || side === 'AWAY' ? side : null, value: row?.value, weight, signed_contribution: contribution, sample, cutoff, source };
}

function parseDecisionEvidence(value: unknown): DecisionEvidence | null {
  const row = object(value); const conclusion = object(row?.conclusion); const reliability = object(row?.reliability);
  const homeReliability = object(reliability?.home); const awayReliability = object(reliability?.away); const implications = object(row?.player_implications); const audit = object(row?.audit);
  const contractVersion = string(row?.contract_version); const snapshotId = number(row?.snapshot_id); const matchId = number(row?.match_id); const gameweek = number(row?.gameweek);
  const cutoff = string(row?.cutoff); const decisionHash = string(row?.decision_hash); const evidenceHash = string(row?.evidence_hash); const synthesis = string(row?.synthesis);
  const resultDecision = string(conclusion?.result_decision); const resultMargin = number(conclusion?.result_margin); const homeGoals = number(conclusion?.home_projected_goals); const awayGoals = number(conclusion?.away_projected_goals);
  const reliabilityClass = string(reliability?.classification); const homeResultSample = number(homeReliability?.result_sample); const homeXgSample = number(homeReliability?.xg_sample); const homePriorWeight = number(homeReliability?.prior_weight); const awayResultSample = number(awayReliability?.result_sample); const awayXgSample = number(awayReliability?.xg_sample); const awayPriorWeight = number(awayReliability?.prior_weight);
  const scope = string(implications?.scope); const homeImplication = string(implications?.home); const awayImplication = string(implications?.away);
  if (!contractVersion || snapshotId == null || matchId == null || gameweek == null || !cutoff || !decisionHash || !evidenceHash || !synthesis || !resultDecision || resultMargin == null || homeGoals == null || awayGoals == null || !reliabilityClass || homeResultSample == null || homeXgSample == null || homePriorWeight == null || awayResultSample == null || awayXgSample == null || awayPriorWeight == null || !scope || !homeImplication || !awayImplication) return null;
  const targets: DecisionTarget[] = Array.isArray(row?.targets) ? row.targets.map((raw) => {
    const target = object(raw); const name = string(target?.target); if (!name) return null;
    const inputs = Array.isArray(target?.model_inputs) ? target.model_inputs.map(parseEvidenceItem).filter((item): item is DecisionEvidenceItem => item != null) : [];
    const context = Array.isArray(target?.observed_context) ? target.observed_context.map(parseEvidenceItem).filter((item): item is DecisionEvidenceItem => item != null) : [];
    const risks: DecisionRisk[] = Array.isArray(target?.risks) ? target.risks.map((rawRisk) => { const risk = object(rawRisk); const id = string(risk?.id); const riskTarget = string(risk?.target); const text = string(risk?.text); const severity = string(risk?.severity); return id && riskTarget && text && severity ? { id, target: riskTarget, text, severity } : null; }).filter((item): item is DecisionRisk => item != null) : [];
    return { target: name, model_inputs: inputs, observed_context: context, risks };
  }).filter((item): item is DecisionTarget => item != null) : [];
  if (targets.length !== 5) return null;
  return { contract_version: contractVersion, snapshot_id: snapshotId, match_id: matchId, gameweek, cutoff, decision_hash: decisionHash, evidence_hash: evidenceHash, conclusion: { result_decision: resultDecision, result_margin: resultMargin, home_projected_goals: homeGoals, away_projected_goals: awayGoals }, targets, reliability: { classification: reliabilityClass, home: { result_sample: homeResultSample, xg_sample: homeXgSample, prior_weight: homePriorWeight }, away: { result_sample: awayResultSample, xg_sample: awayXgSample, prior_weight: awayPriorWeight }, missing_is_not_zero: reliability?.missing_is_not_zero === true }, synthesis, player_implications: { scope, publication_authority: implications?.publication_authority === true, requires_p7_lineage: implications?.requires_p7_lineage === true, home: homeImplication, away: awayImplication }, audit: Object.fromEntries(Object.entries(audit ?? {}).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean')) };
}

export async function fetchMatchIntelligence(gameweek: number, signal?: AbortSignal): Promise<MatchIntelligence> {
  if (gameweek < 1 || gameweek > 38) throw new Error('A resolved Gameweek is required for match intelligence');
  const fplPayload = object(await fetchJsonCached(`${API_ROOT}/fpl-api?gw=${gameweek}`, { ttlMs: 30_000, signal }));
  if (fplPayload?.ok !== true) throw new Error('FPL prediction contract unavailable');
  assertRequestedGameweek(gameweek, number(fplPayload.gameweek), 'Match intelligence');
  const fixtures = Array.isArray(fplPayload.fixture_results)
    ? fplPayload.fixture_results.map(parseFixture).filter((item): item is MatchFixture => item != null)
    : [];
  assertFixtureIdsBelongToGameweek(gameweek, fixtures, 'Match intelligence');
  return { gameweek, fixtures, factsByMatch: new Map<number, FixtureFacts>() };
}

export async function fetchFixtureFacts(gameweek: number, signal?: AbortSignal): Promise<Map<number, FixtureFacts>> {
  const factsByMatch = new Map<number, FixtureFacts>();
  if (gameweek < 1 || gameweek > 38) return factsByMatch;
  try {
    const factsPayload = object(await fetchJsonCached(`${API_ROOT}/fixture-facts-api?gw=${gameweek}`, { ttlMs: 120_000, signal }));
    if (factsPayload?.ok === true && factsPayload.facts_available === true && Array.isArray(factsPayload.fixtures)) {
      assertRequestedGameweek(gameweek, factsPayload.gameweek, 'Fixture facts');
      for (const raw of factsPayload.fixtures) {
        const facts = parseFacts(raw);
        if (facts && facts.decision_evidence?.gameweek === gameweek) factsByMatch.set(facts.match_id, facts);
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
  if (facts.decision_evidence && (facts.decision_evidence.match_id !== fixture.match_id || facts.decision_evidence.snapshot_id !== fixture.prediction.snapshot_id || facts.decision_evidence.decision_hash !== fixture.prediction.decision_hash)) return null;
  return facts;
}
