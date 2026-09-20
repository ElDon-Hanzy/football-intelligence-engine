import { useEffect, useState } from 'react';
import { alignedFacts, assessCall, actualOutcome, fetchFixtureFacts, fetchMatchIntelligence, type DecisionEvidenceItem, type DecisionTarget, type FixtureFact, type FixtureFacts, type MatchFixture, type MatchIntelligence, type OutcomeCode } from '../api/matchIntelligence';
import { V3Dialog } from './V3Dialog';

type Filter = 'ALL' | 'FUTURE' | 'LIVE' | 'FINISHED';
type FixturePhase = Exclude<Filter, 'ALL'>;
type ConsumerCall = { code: OutcomeCode; label: string; probability: number } | null;

export function MatchesIntelligencePage({ gameweek = 0 }: { gameweek?: number }) {
  const [intelligence, setIntelligence] = useState<MatchIntelligence | null>(null);
  const [factsByMatch, setFactsByMatch] = useState<Map<number, FixtureFacts>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    if (gameweek < 1) return;
    const controller = new AbortController();
    setLoading(true); setError(null); setSelected(null); setFilter('ALL'); setFactsByMatch(new Map());
    void fetchMatchIntelligence(gameweek, controller.signal).then((matchData) => {
      setIntelligence(matchData); setLoading(false);
      void fetchFixtureFacts(gameweek, controller.signal).then(setFactsByMatch).catch(() => undefined);
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false);
    });
    return () => controller.abort();
  }, [gameweek]);

  if (gameweek < 1 || loading) return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>;
  if (error || !intelligence) return <section className="v3-product-page"><div className="v3-surface v3-page-state"><span className="v3-kicker">Match intelligence</span><h1>Match predictions unavailable</h1><p>{error ?? 'The frozen fixture contract did not resolve.'}</p></div></section>;

  const phaseByMatch = new Map(intelligence.fixtures.map((fixture) => [fixture.match_id, phaseFromFixture(fixture)]));
  const counts = {
    FUTURE: intelligence.fixtures.filter((fixture) => phaseByMatch.get(fixture.match_id) === 'FUTURE').length,
    LIVE: intelligence.fixtures.filter((fixture) => phaseByMatch.get(fixture.match_id) === 'LIVE').length,
    FINISHED: intelligence.fixtures.filter((fixture) => phaseByMatch.get(fixture.match_id) === 'FINISHED').length,
  };
  const fixtures = intelligence.fixtures.filter((fixture) => filter === 'ALL' || phaseByMatch.get(fixture.match_id) === filter);
  const selectedFixture = selected == null ? null : intelligence.fixtures.find((fixture) => fixture.match_id === selected) ?? null;
  const selectedFacts = selectedFixture ? alignedFacts(selectedFixture, factsByMatch.get(selectedFixture.match_id)) : null;

  return <div className="v3-product-page v3-dense-page" data-page="matches">
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {intelligence.gameweek}</span><h1>Match center</h1></div><small>{counts.FINISHED} final · {counts.LIVE} live · {counts.FUTURE} upcoming</small></header>

    <div className="v3-filter-tabs v3-filter-tabs--compact" aria-label="Fixture state filter">{(['ALL', 'FUTURE', 'LIVE', 'FINISHED'] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? `All ${intelligence.fixtures.length}` : item === 'FUTURE' ? `Upcoming ${counts.FUTURE}` : item === 'LIVE' ? `Live ${counts.LIVE}` : `Final ${counts.FINISHED}`}</button>)}</div>

    <section className="v3-card-grid v3-card-grid--matches" aria-label="Gameweek match predictions">
      {fixtures.map((fixture) => <PredictionCard key={fixture.match_id} fixture={fixture} phase={phaseByMatch.get(fixture.match_id) ?? phaseFromFixture(fixture)} onOpen={() => setSelected(fixture.match_id)} />)}
    </section>
    {fixtures.length === 0 ? <p className="v3-inline-warning">No fixtures in this state.</p> : null}

    {selectedFixture ? <MatchupDialog fixture={selectedFixture} facts={selectedFacts?.modal_facts ?? []} evidence={selectedFacts?.decision_evidence ?? null} factsLoading={!factsByMatch.size} open onClose={() => setSelected(null)} onPrevious={() => setSelected(adjacentFixture(intelligence.fixtures, selectedFixture.match_id, -1))} onNext={() => setSelected(adjacentFixture(intelligence.fixtures, selectedFixture.match_id, 1))} /> : null}
  </div>;
}

function PredictionCard({ fixture, phase, onOpen }: { fixture: MatchFixture; phase: FixturePhase; onOpen: () => void }) {
  const assessment = assessCall(fixture.prediction);
  const call = consumerCall(fixture);
  const score = scoreCall(fixture);
  const environment = scoringEnvironment(fixture);
  const actual = actualOutcome(fixture.home_score, fixture.away_score);
  const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const directionAligned = phase === 'FINISHED' && call && actual ? call.code === actual : null;
  const scoreAligned = phase === 'FINISHED' && score.value && actualScore ? score.value === actualScore : null;
  return <article className="v3-compact-card v3-match-card" data-phase={phase}>
    <div className="v3-card-meta"><span className="v3-phase-text" data-phase={phase}>{phaseLabel(phase)}</span><time>{formatKickoff(fixture.kickoff_time)}</time></div>
    <div className="v3-match-card-teams"><strong>{fixture.home_team ?? 'Home'}</strong><b>{phase === 'FUTURE' ? 'vs' : actualScore ?? '—'}</b><strong>{fixture.away_team ?? 'Away'}</strong></div>
    <div className="v3-match-card-picks"><span><small>1X2</small><strong>{call?.label ?? '—'}</strong><b>{call ? percent(call.probability) : '—'}</b></span><span><small>Scoring environment</small><strong>{environment?.label ?? '—'}</strong><b>{environment ? percent(environment.probability) : '—'}</b></span></div>
    {assessment.state === 'no-edge' ? <small className="v3-card-note">No clear edge</small> : null}
    <div className="v3-card-footer">{phase === 'FINISHED' ? <span className="v3-audit-text" data-result={directionAligned ? 'aligned' : 'different'}>1X2 {directionAligned ? 'aligned' : 'different'} · representative score {scoreAligned ? 'aligned' : 'different'}</span> : <span className="v3-muted">Representative score {score.value ?? '—'}</span>}<button type="button" className="v3-row-action" onClick={onOpen} disabled={!fixture.prediction}>Details</button></div>
  </article>;
}

function MatchupDialog({ fixture, facts, evidence, factsLoading, open, onClose, onPrevious, onNext }: { fixture: MatchFixture; facts: FixtureFact[]; evidence: FixtureFacts['decision_evidence']; factsLoading: boolean; open: boolean; onClose: () => void; onPrevious: () => void; onNext: () => void }) {
  const home = fixture.home_team ?? 'Home'; const away = fixture.away_team ?? 'Away';
  const assessment = assessCall(fixture.prediction); const call = consumerCall(fixture); const score = scoreCall(fixture);
  const environment = scoringEnvironment(fixture);
  const support = distinctFacts(facts.filter((fact) => fact.alignment === 'SUPPORTS')); const risks = distinctFacts(facts.filter((fact) => fact.alignment === 'CONTRADICTS'));
  const actual = actualOutcome(fixture.home_score, fixture.away_score); const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const directionAligned = call && actual ? call.code === actual : null; const scoreAligned = score.value && actualScore ? score.value === actualScore : null;
  return <V3Dialog open={open} onClose={onClose} title={`${home} vs ${away}`} eyebrow="Matchup intelligence">
    <div className="v3-modal-nav"><button type="button" className="v3-row-action" onClick={onPrevious}>← Previous matchup</button><button type="button" className="v3-row-action" onClick={onNext}>Next matchup →</button></div>
    <section className="v3-modal-summary"><div><span>1X2 call</span><strong>{call?.label ?? '—'}</strong><small>{call ? percent(call.probability) : assessment.state === 'no-edge' ? 'No meaningful edge between outcomes' : 'Unavailable'}</small></div><div><span>Scoring environment</span><strong>{environment?.label ?? '—'}</strong><small>{environment ? `${percent(environment.probability)}${environment.nearTie ? ' · blended near-tie' : ''} · ${environment.expectedTotal.toFixed(2)} projected goals` : 'Unavailable'}</small></div></section>
    {fixture.finished ? <section className="v3-modal-result"><span className="v3-kicker">Final comparison</span><h3>{home} {fixture.home_score ?? '–'}–{fixture.away_score ?? '–'} {away}</h3><div className="v3-comparison-line"><span>1X2</span><strong>{call?.label ?? '—'}</strong><b>{directionAligned == null ? '—' : directionAligned ? 'Aligned' : 'Different'}</b></div><div className="v3-comparison-line"><span>Exact score</span><strong>{score.value ?? '—'}</strong><b>{scoreAligned == null ? '—' : scoreAligned ? 'Aligned' : 'Different'}</b></div></section> : null}
    <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Probability board</span><small>Pre-kickoff snapshot</small></div><div className="v3-modal-metric-grid"><Metric label={home} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.home_win) : '—'} /><Metric label="Draw" value={fixture.prediction?.markets ? percent(fixture.prediction.markets.draw) : '—'} /><Metric label={away} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.away_win) : '—'} /><Metric label="Projected goals" value={fixture.prediction?.home_lambda == null || fixture.prediction.away_lambda == null ? '—' : `${fixture.prediction.home_lambda.toFixed(2)}–${fixture.prediction.away_lambda.toFixed(2)}`} /></div></section>
    {fixture.prediction?.scoring_environment_probabilities ? <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Scoring distribution</span><small>{fixture.prediction.scoring_environment_state === 'BLENDED_NEAR_TIE' ? 'Near-tie disclosed' : 'Canonical full matrix'}</small></div><div className="v3-modal-metric-grid"><Metric label="Low" value={percent(fixture.prediction.scoring_environment_probabilities.low)} /><Metric label="Normal" value={percent(fixture.prediction.scoring_environment_probabilities.normal)} /><Metric label="High" value={percent(fixture.prediction.scoring_environment_probabilities.high)} /><Metric label="Subtype" value={humanize(fixture.prediction.dominant_subtype) ?? '—'} /></div></section> : null}
    <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Score interpretation</span><small>Different questions</small></div><div className="v3-comparison-line"><span>Representative score</span><strong>{fixture.prediction?.representative_score ?? '—'}</strong><b>{fixture.prediction?.representative_score_probability == null ? '—' : percent(fixture.prediction.representative_score_probability)}</b></div><div className="v3-comparison-line"><span>Largest individual cell</span><strong>{fixture.prediction?.raw_modal_score ?? '—'}</strong><b>{fixture.prediction?.raw_modal_probability == null ? '—' : percent(fixture.prediction.raw_modal_probability)}</b></div></section>
    <p className="v3-modal-note">Contract {fixture.prediction?.decision_contract_version ?? 'unavailable'} · snapshot {fixture.prediction?.snapshot_id ?? '—'} · captured {formatTimestamp(fixture.prediction?.captured_at)} · hash {fixture.prediction?.decision_hash?.slice(0, 12) ?? '—'}</p>
    {factsLoading ? <p className="v3-modal-note">Loading supporting evidence…</p> : evidence ? <DecisionEvidencePanel evidence={evidence} home={home} away={away} /> : <div className="v3-modal-evidence-grid"><FactGroup title="Supporting evidence" facts={support} /><FactGroup title="Counterpoints / risks" facts={risks} risk /></div>}
    {fixture.prediction?.top_scorelines?.length ? <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Representative scorelines</span><small>Individual cells, not the headline forecast</small></div><div className="v3-top-scorelines">{fixture.prediction.top_scorelines.slice(0, 5).map((row) => <span key={row.score}><strong>{row.score}</strong> {percent(row.prob)}</span>)}</div></section> : null}
  </V3Dialog>;
}

function DecisionEvidencePanel({ evidence, home, away }: { evidence: NonNullable<FixtureFacts['decision_evidence']>; home: string; away: string }) {
  const inputs = evidence.targets.flatMap((target) => target.model_inputs); const context = evidence.targets.flatMap((target) => target.observed_context); const risks = evidence.targets.flatMap((target) => target.risks);
  return <section className="v3-modal-section" data-contract={evidence.contract_version} data-evidence-hash={evidence.evidence_hash}>
    <div className="v3-modal-section-head"><span className="v3-kicker">Decision evidence</span><small>{evidence.reliability.classification} reliability · cutoff {formatTimestamp(evidence.cutoff)}</small></div>
    <p className="v3-modal-conclusion">{evidence.synthesis}</p>
    <div className="v3-modal-metric-grid"><Metric label="Result margin" value={percent(evidence.conclusion.result_margin)} /><Metric label={`${home} projected goals`} value={evidence.conclusion.home_projected_goals.toFixed(2)} /><Metric label={`${away} projected goals`} value={evidence.conclusion.away_projected_goals.toFixed(2)} /><Metric label="Evidence targets" value={`${evidence.targets.length}/5`} /></div>
    <EvidenceItems title="Actual weighted model inputs" items={inputs} />
    <EvidenceItems title="Observed context · zero model effect" items={context} />
    <section className="v3-fact-group is-risk"><h3>Targeted risks<span>{risks.length}</span></h3>{risks.length ? <ul>{risks.map((risk) => <li key={`${risk.target}-${risk.id}`}><strong>{humanize(risk.target)}</strong> · {risk.text}</li>)}</ul> : <p>No targeted contradiction surfaced.</p>}</section>
    <div className="v3-modal-evidence-grid"><section className="v3-fact-group"><h3>Reliability</h3><ul><li>{home}: {evidence.reliability.home.result_sample} results · {evidence.reliability.home.xg_sample} xG-covered · {percent(evidence.reliability.home.prior_weight)} prior weight</li><li>{away}: {evidence.reliability.away.result_sample} results · {evidence.reliability.away.xg_sample} xG-covered · {percent(evidence.reliability.away.prior_weight)} prior weight</li><li>Missing values are not treated as zero.</li></ul></section><section className="v3-fact-group"><h3>Player implications · P7 gated</h3><ul><li>{evidence.player_implications.home}</li><li>{evidence.player_implications.away}</li></ul></section></div>
    <p className="v3-modal-note">Evidence contract {evidence.contract_version} · snapshot {evidence.snapshot_id} · decision hash {evidence.decision_hash.slice(0, 12)} · evidence hash {evidence.evidence_hash.slice(0, 12)} · publication authority: no</p>
  </section>;
}

function EvidenceItems({ title, items }: { title: string; items: DecisionEvidenceItem[] }) { return <section className="v3-fact-group"><h3>{title}<span>{items.length}</span></h3>{items.length ? <ul>{items.map((item) => <li key={`${item.target}-${item.id}`}><strong>{humanize(item.target)}</strong> · {item.text} <small>sample {item.sample} · weight {item.weight.toFixed(2)} · contribution {item.signed_contribution > 0 ? '+' : ''}{item.signed_contribution.toFixed(3)}</small></li>)}</ul> : <p>None.</p>}</section>; }

function adjacentFixture(fixtures: MatchFixture[], matchId: number, delta: -1 | 1): number { const index = fixtures.findIndex((fixture) => fixture.match_id === matchId); if (index < 0) return matchId; return fixtures[(index + delta + fixtures.length) % fixtures.length]?.match_id ?? matchId; }

function consumerCall(fixture: MatchFixture): ConsumerCall {
  const prediction = fixture.prediction; const markets = prediction?.markets;
  if (!prediction || !markets || prediction.result_decision === 'NO_MEANINGFUL_EDGE' || !['H', 'D', 'A'].includes(prediction.result_decision ?? '')) return null;
  const code = prediction.result_decision as OutcomeCode;
  const probability = code === 'H' ? markets.home_win : code === 'A' ? markets.away_win : markets.draw;
  return { code, label: callLabel(code, fixture.home_team ?? 'Home', fixture.away_team ?? 'Away'), probability };
}
function scoreCall(fixture: MatchFixture) { return { value: fixture.prediction?.representative_score ?? null, probability: fixture.prediction?.representative_score_probability ?? null }; }
function scoringEnvironment(fixture: MatchFixture): { label: 'Low scoring' | 'Normal scoring' | 'High scoring'; probability: number; expectedTotal: number; nearTie: boolean } | null {
  const prediction = fixture.prediction; const distribution = prediction?.scoring_environment_probabilities;
  if (!prediction || !distribution || prediction.expected_total_goals == null) return null;
  const key = prediction.primary_environment;
  const selected = key === 'LOW_SCORING' ? { label: 'Low scoring' as const, probability: distribution.low } : key === 'NORMAL_SCORING' ? { label: 'Normal scoring' as const, probability: distribution.normal } : key === 'HIGH_SCORING' ? { label: 'High scoring' as const, probability: distribution.high } : null;
  return selected ? { ...selected, expectedTotal: prediction.expected_total_goals, nearTie: prediction.scoring_environment_state === 'BLENDED_NEAR_TIE' } : null;
}
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function FactGroup({ title, facts, risk = false }: { title: string; facts: FixtureFact[]; risk?: boolean }) { return <section className={`v3-fact-group${risk ? ' is-risk' : ''}`}><h3>{title}<span>{facts.length}</span></h3>{facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.one_liner}</li>)}</ul> : <p>No independent evidence surfaced.</p>}</section>; }
function distinctFacts(facts: FixtureFact[], limit = 5): FixtureFact[] { const seen = new Set<string>(); return [...facts].sort((a, b) => b.usefulness_score - a.usefulness_score).filter((fact) => { const key = fact.one_liner.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, limit); }
function callLabel(code: OutcomeCode, home: string, away: string): string { return code === 'H' ? `${home} win` : code === 'A' ? `${away} win` : 'DRAW'; }
function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function phaseLabel(value: FixturePhase): string { return value === 'FUTURE' ? 'Upcoming' : value === 'LIVE' ? 'Live' : 'Final'; }
function phaseFromFixture(fixture: MatchFixture): FixturePhase { if (fixture.finished) return 'FINISHED'; return Date.now() >= new Date(fixture.kickoff_time).getTime() ? 'LIVE' : 'FUTURE'; }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatTimestamp(value: string | undefined): string { return value ? new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(new Date(value)) : '—'; }
function humanize(value: string | null): string | null { return value ? value.toLowerCase().replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase()) : null; }
