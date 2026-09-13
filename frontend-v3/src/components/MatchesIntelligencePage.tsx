import { useEffect, useState } from 'react';
import { alignedFacts, assessCall, actualOutcome, fetchMatchIntelligence, type FixtureFact, type MatchFixture, type MatchIntelligence, type OutcomeCode } from '../api/matchIntelligence';
import { fetchFplWorkspace, type FplWorkspaceApi, type WorkspaceFixturePhase } from '../api/fplWorkspace';
import { V3Dialog } from './V3Dialog';

type Filter = 'ALL' | 'FUTURE' | 'LIVE' | 'FINISHED';
type ConsumerCall = { code: OutcomeCode; label: string; probability: number } | null;

export function MatchesIntelligencePage() {
  const [workspace, setWorkspace] = useState<FplWorkspaceApi | null>(null);
  const [intelligence, setIntelligence] = useState<MatchIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetchFplWorkspace(0, controller.signal).then(async (current) => {
      const matchData = await fetchMatchIntelligence(current.gameweek, controller.signal);
      setWorkspace(current); setIntelligence(matchData); setLoading(false);
    }).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === 'AbortError') return;
      setError(reason instanceof Error ? reason.message : String(reason)); setLoading(false);
    });
    return () => controller.abort();
  }, []);

  if (loading) return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>;
  if (error || !workspace || !intelligence) return <section className="v3-product-page"><div className="v3-surface v3-page-state"><span className="v3-kicker">Match intelligence</span><h1>Match predictions unavailable</h1><p>{error ?? 'The frozen fixture contract did not resolve.'}</p></div></section>;

  const phaseByMatch = new Map(workspace.realized.fixtures.map((fixture) => [fixture.match_id, fixture.phase]));
  const counts = { FUTURE: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'FUTURE').length, LIVE: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'LIVE').length, FINISHED: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'FINISHED').length };
  const fixtures = intelligence.fixtures.filter((fixture) => filter === 'ALL' || (phaseByMatch.get(fixture.match_id) ?? phaseFromFixture(fixture)) === filter);
  const selectedFixture = selected == null ? null : intelligence.fixtures.find((fixture) => fixture.match_id === selected) ?? null;
  const selectedFacts = selectedFixture ? alignedFacts(selectedFixture, intelligence.factsByMatch.get(selectedFixture.match_id)) : null;

  return <div className="v3-product-page v3-dense-page" data-page="matches">
    <header className="v3-compact-header"><div><span className="v3-kicker">Gameweek {workspace.gameweek}</span><h1>Match center</h1></div><small>{counts.FINISHED} final · {counts.LIVE} live · {counts.FUTURE} upcoming</small></header>

    <div className="v3-filter-tabs v3-filter-tabs--compact" aria-label="Fixture state filter">{(['ALL', 'FUTURE', 'LIVE', 'FINISHED'] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? `All ${intelligence.fixtures.length}` : item === 'FUTURE' ? `Upcoming ${counts.FUTURE}` : item === 'LIVE' ? `Live ${counts.LIVE}` : `Final ${counts.FINISHED}`}</button>)}</div>

    <section className="v3-card-grid v3-card-grid--matches" aria-label="Gameweek match predictions">
      {fixtures.map((fixture) => <PredictionCard key={fixture.match_id} fixture={fixture} phase={phaseByMatch.get(fixture.match_id) ?? phaseFromFixture(fixture)} onOpen={() => setSelected(fixture.match_id)} />)}
    </section>
    {fixtures.length === 0 ? <p className="v3-inline-warning">No fixtures in this state.</p> : null}

    {selectedFixture ? <MatchupDialog fixture={selectedFixture} facts={selectedFacts?.modal_facts ?? []} open onClose={() => setSelected(null)} /> : null}
  </div>;
}

function PredictionCard({ fixture, phase, onOpen }: { fixture: MatchFixture; phase: WorkspaceFixturePhase; onOpen: () => void }) {
  const assessment = assessCall(fixture.prediction);
  const call = consumerCall(fixture);
  const score = scoreCall(fixture);
  const actual = actualOutcome(fixture.home_score, fixture.away_score);
  const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const directionAligned = phase === 'FINISHED' && call && actual ? call.code === actual : null;
  const scoreAligned = phase === 'FINISHED' && score.value && actualScore ? score.value === actualScore : null;
  return <article className="v3-compact-card v3-match-card" data-phase={phase}>
    <div className="v3-card-meta"><span className="v3-phase-text" data-phase={phase}>{phaseLabel(phase)}</span><time>{formatKickoff(fixture.kickoff_time)}</time></div>
    <div className="v3-match-card-teams"><strong>{fixture.home_team ?? 'Home'}</strong><b>{phase === 'FUTURE' ? 'vs' : actualScore ?? '—'}</b><strong>{fixture.away_team ?? 'Away'}</strong></div>
    <div className="v3-match-card-picks"><span><small>1X2</small><strong>{call?.label ?? '—'}</strong><b>{call ? percent(call.probability) : '—'}</b></span><span><small>Correct score</small><strong>{score.value ?? '—'}</strong><b>{score.probability == null ? '—' : percent(score.probability)}</b></span></div>
    {assessment.state === 'no-edge' ? <small className="v3-card-note">Parity/no-edge → DRAW</small> : null}
    <div className="v3-card-footer">{phase === 'FINISHED' ? <span className="v3-audit-text" data-result={directionAligned ? 'aligned' : 'different'}>1X2 {directionAligned ? 'aligned' : 'different'} · score {scoreAligned ? 'aligned' : 'different'}</span> : <span className="v3-muted">Pending</span>}<button type="button" className="v3-row-action" onClick={onOpen} disabled={!fixture.prediction}>Details</button></div>
  </article>;
}

function MatchupDialog({ fixture, facts, open, onClose }: { fixture: MatchFixture; facts: FixtureFact[]; open: boolean; onClose: () => void }) {
  const home = fixture.home_team ?? 'Home'; const away = fixture.away_team ?? 'Away';
  const assessment = assessCall(fixture.prediction); const call = consumerCall(fixture); const score = scoreCall(fixture);
  const support = distinctFacts(facts.filter((fact) => fact.alignment === 'SUPPORTS')); const risks = distinctFacts(facts.filter((fact) => fact.alignment === 'CONTRADICTS'));
  const actual = actualOutcome(fixture.home_score, fixture.away_score); const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const directionAligned = call && actual ? call.code === actual : null; const scoreAligned = score.value && actualScore ? score.value === actualScore : null;
  return <V3Dialog open={open} onClose={onClose} title={`${home} vs ${away}`} eyebrow="Matchup intelligence">
    <section className="v3-modal-summary"><div><span>1X2 call</span><strong>{call?.label ?? '—'}</strong><small>{call ? `${percent(call.probability)}${assessment.state === 'no-edge' ? ' · parity/no-edge presented as DRAW' : ''}` : 'Unavailable'}</small></div><div><span>Correct score</span><strong>{score.value ?? '—'}</strong><small>{score.probability == null ? 'Unavailable' : percent(score.probability)}</small></div></section>
    {fixture.finished ? <section className="v3-modal-result"><span className="v3-kicker">Final comparison</span><h3>{home} {fixture.home_score ?? '–'}–{fixture.away_score ?? '–'} {away}</h3><div className="v3-comparison-line"><span>1X2</span><strong>{call?.label ?? '—'}</strong><b>{directionAligned == null ? '—' : directionAligned ? 'Aligned' : 'Different'}</b></div><div className="v3-comparison-line"><span>Exact score</span><strong>{score.value ?? '—'}</strong><b>{scoreAligned == null ? '—' : scoreAligned ? 'Aligned' : 'Different'}</b></div></section> : null}
    <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Frozen probability board</span><small>Pre-kickoff</small></div><div className="v3-modal-metric-grid"><Metric label={home} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.home_win) : '—'} /><Metric label="Draw" value={fixture.prediction?.markets ? percent(fixture.prediction.markets.draw) : '—'} /><Metric label={away} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.away_win) : '—'} /><Metric label="xG" value={fixture.prediction?.home_lambda == null || fixture.prediction.away_lambda == null ? '—' : `${fixture.prediction.home_lambda.toFixed(2)}–${fixture.prediction.away_lambda.toFixed(2)}`} /></div></section>
    <div className="v3-modal-evidence-grid"><FactGroup title="Supporting evidence" facts={support} /><FactGroup title="Counterpoints / risks" facts={risks} risk /></div>
    {fixture.prediction?.top_scorelines?.length ? <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Top scorelines</span></div><div className="v3-top-scorelines">{fixture.prediction.top_scorelines.slice(0, 5).map((row) => <span key={row.score}><strong>{row.score}</strong> {percent(row.prob)}</span>)}</div></section> : null}
  </V3Dialog>;
}

function consumerCall(fixture: MatchFixture): ConsumerCall {
  const assessment = assessCall(fixture.prediction); const markets = fixture.prediction?.markets;
  if (!assessment.top || !markets) return null;
  if (assessment.state === 'no-edge') return { code: 'D', label: 'DRAW', probability: markets.draw };
  return { code: assessment.top.code, label: callLabel(assessment.top.code, fixture.home_team ?? 'Home', fixture.away_team ?? 'Away'), probability: assessment.top.probability };
}
function scoreCall(fixture: MatchFixture) { return { value: fixture.prediction?.headline_score ?? fixture.prediction?.raw_modal_score ?? fixture.prediction?.top_scorelines?.[0]?.score ?? null, probability: fixture.prediction?.headline_score_probability ?? fixture.prediction?.raw_modal_probability ?? fixture.prediction?.top_scorelines?.[0]?.prob ?? null }; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function FactGroup({ title, facts, risk = false }: { title: string; facts: FixtureFact[]; risk?: boolean }) { return <section className={`v3-fact-group${risk ? ' is-risk' : ''}`}><h3>{title}<span>{facts.length}</span></h3>{facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.one_liner}</li>)}</ul> : <p>No independent evidence surfaced.</p>}</section>; }
function distinctFacts(facts: FixtureFact[], limit = 5): FixtureFact[] { const seen = new Set<string>(); return [...facts].sort((a, b) => b.usefulness_score - a.usefulness_score).filter((fact) => { const key = fact.one_liner.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, limit); }
function callLabel(code: OutcomeCode, home: string, away: string): string { return code === 'H' ? `${home} win` : code === 'A' ? `${away} win` : 'DRAW'; }
function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function phaseLabel(value: WorkspaceFixturePhase): string { return value === 'FUTURE' ? 'Upcoming' : value === 'LIVE' ? 'Live' : 'Final'; }
function phaseFromFixture(fixture: MatchFixture): WorkspaceFixturePhase { if (fixture.finished) return 'FINISHED'; return Date.now() >= new Date(fixture.kickoff_time).getTime() ? 'LIVE' : 'FUTURE'; }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
