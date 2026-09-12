import { useEffect, useState } from 'react';
import { alignedFacts, assessCall, actualOutcome, fetchMatchIntelligence, type FixtureFact, type MatchFixture, type MatchIntelligence, type OutcomeCode } from '../api/matchIntelligence';
import { fetchFplWorkspace, type FplWorkspaceApi, type WorkspaceFixturePhase } from '../api/fplWorkspace';
import { V3Dialog } from './V3Dialog';

type Filter = 'ALL' | 'FUTURE' | 'LIVE' | 'FINISHED';

export function MatchesIntelligencePage() {
  const [workspace, setWorkspace] = useState<FplWorkspaceApi | null>(null);
  const [intelligence, setIntelligence] = useState<MatchIntelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [selected, setSelected] = useState<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void fetchFplWorkspace(0, controller.signal)
      .then(async (current) => {
        const matchData = await fetchMatchIntelligence(current.gameweek, controller.signal);
        setWorkspace(current);
        setIntelligence(matchData);
        setLoading(false);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === 'AbortError') return;
        setError(reason instanceof Error ? reason.message : String(reason));
        setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) return <section className="v3-product-page" aria-busy="true"><div className="v3-surface v3-skeleton-panel" /></section>;
  if (error || !workspace || !intelligence) return <section className="v3-product-page"><div className="v3-surface v3-workspace-error"><span className="v3-kicker">Match intelligence</span><h1>Match predictions are unavailable.</h1><p>{error ?? 'The prediction contract did not resolve.'}</p></div></section>;

  const phaseByMatch = new Map(workspace.realized.fixtures.map((fixture) => [fixture.match_id, fixture.phase]));
  const counts = {
    FUTURE: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'FUTURE').length,
    LIVE: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'LIVE').length,
    FINISHED: workspace.realized.fixtures.filter((fixture) => fixture.phase === 'FINISHED').length,
  };
  const fixtures = intelligence.fixtures.filter((fixture) => filter === 'ALL' || (phaseByMatch.get(fixture.match_id) ?? phaseFromFixture(fixture)) === filter);
  const selectedFixture = selected == null ? null : intelligence.fixtures.find((fixture) => fixture.match_id === selected) ?? null;
  const selectedFacts = selectedFixture ? alignedFacts(selectedFixture, intelligence.factsByMatch.get(selectedFixture.match_id)) : null;

  return (
    <div className="v3-product-page" data-page="matches">
      <section className="v3-product-hero">
        <div><span className="v3-kicker">Gameweek {workspace.gameweek} · Match center</span><h1 className="v3-display">Every fixture in its real state.</h1><p>Each card combines the frozen pre-match 1X2 call, exact-score call and the realized result. Finished matches are audited against what the engine actually predicted before kickoff.</p></div>
        <span className="v3-status" data-tone={counts.LIVE > 0 ? 'positive' : 'neutral'}>{counts.FINISHED} finished · {counts.LIVE} live · {counts.FUTURE} upcoming</span>
      </section>

      <div className="v3-filter-tabs" aria-label="Fixture state filter">
        {(['ALL', 'FUTURE', 'LIVE', 'FINISHED'] as const).map((item) => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'is-active' : ''} onClick={() => setFilter(item)}>{item === 'ALL' ? `All ${intelligence.fixtures.length}` : item === 'FUTURE' ? `Upcoming ${counts.FUTURE}` : item === 'LIVE' ? `Live ${counts.LIVE}` : `Finished ${counts.FINISHED}`}</button>)}
      </div>

      <section className="v3-match-grid" aria-label="Gameweek fixtures">
        {fixtures.map((fixture) => <PredictionCard key={fixture.match_id} fixture={fixture} phase={phaseByMatch.get(fixture.match_id) ?? phaseFromFixture(fixture)} onOpen={() => setSelected(fixture.match_id)} />)}
      </section>

      {fixtures.length === 0 ? <section className="v3-surface v3-empty-state"><strong>No fixtures in this state.</strong><span>Missing fixtures are never treated as zero-probability matches.</span></section> : null}

      {selectedFixture ? <MatchupDialog fixture={selectedFixture} facts={selectedFacts?.modal_facts ?? []} open onClose={() => setSelected(null)} /> : null}
    </div>
  );
}

function PredictionCard({ fixture, phase, onOpen }: { fixture: MatchFixture; phase: WorkspaceFixturePhase; onOpen: () => void }) {
  const assessment = assessCall(fixture.prediction);
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const call = assessment.top ? callLabel(assessment.top.code, home, away) : 'Unavailable';
  const score = fixture.prediction?.headline_score ?? fixture.prediction?.raw_modal_score ?? fixture.prediction?.top_scorelines?.[0]?.score ?? null;
  const scoreProb = fixture.prediction?.headline_score_probability ?? fixture.prediction?.raw_modal_probability ?? fixture.prediction?.top_scorelines?.[0]?.prob ?? null;
  const realized = actualOutcome(fixture.home_score, fixture.away_score);
  const directionCorrect = phase === 'FINISHED' && assessment.top && realized ? assessment.top.code === realized : null;
  const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const scoreCorrect = phase === 'FINISHED' && score && actualScore ? score === actualScore : null;

  return <article className="v3-surface v3-match-card v3-prediction-card" data-phase={phase}>
    <div className="v3-match-card-top"><span className="v3-phase-pill" data-phase={phase}>{phaseLabel(phase)}</span><time>{formatKickoff(fixture.kickoff_time)}</time></div>
    <div className="v3-scoreline"><span>{home}</span><strong>{phase === 'FUTURE' ? 'vs' : `${fixture.home_score ?? '–'} : ${fixture.away_score ?? '–'}`}</strong><span>{away}</span></div>
    <div className="v3-match-prediction-grid">
      <div><span>1X2 call</span><strong>{assessment.state === 'no-edge' ? `No clear edge · ${call}` : call}</strong><small>{assessment.top ? `${percent(assessment.top.probability)} · ${callState(assessment.state)}` : 'Probability unavailable'}</small></div>
      <div><span>Correct score</span><strong>{score ?? '—'}</strong><small>{scoreProb == null ? 'Probability unavailable' : `${percent(scoreProb)} modal probability`}</small></div>
    </div>
    {phase === 'FINISHED' ? <div className="v3-result-audit" aria-label="Prediction result audit"><Audit label="1X2" correct={directionCorrect} /><Audit label="Exact score" correct={scoreCorrect} /><span>Actual {actualScore ?? '—'}</span></div> : <p className="v3-frozen-note">{phase === 'LIVE' ? 'Match is live. Probabilities above remain frozen pre-match evidence.' : 'Frozen pre-match forecast.'}</p>}
    <button type="button" className="v3-matchup-trigger" onClick={onOpen} disabled={!fixture.prediction}>{fixture.prediction ? 'Open matchup intelligence' : 'Prediction unavailable'} <span aria-hidden="true">→</span></button>
  </article>;
}

function MatchupDialog({ fixture, facts, open, onClose }: { fixture: MatchFixture; facts: FixtureFact[]; open: boolean; onClose: () => void }) {
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const assessment = assessCall(fixture.prediction);
  const call = assessment.top ? callLabel(assessment.top.code, home, away) : 'Unavailable';
  const score = fixture.prediction?.headline_score ?? fixture.prediction?.raw_modal_score ?? fixture.prediction?.top_scorelines?.[0]?.score ?? null;
  const scoreProb = fixture.prediction?.headline_score_probability ?? fixture.prediction?.raw_modal_probability ?? fixture.prediction?.top_scorelines?.[0]?.prob ?? null;
  const support = distinctFacts(facts.filter((fact) => fact.alignment === 'SUPPORTS'));
  const risks = distinctFacts(facts.filter((fact) => fact.alignment === 'CONTRADICTS'));
  const neutral = distinctFacts(facts.filter((fact) => fact.alignment === 'NEUTRAL'), 3);
  const actual = actualOutcome(fixture.home_score, fixture.away_score);
  const actualScore = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;

  return <V3Dialog open={open} onClose={onClose} title={`${home} vs ${away}`} eyebrow="Matchup intelligence">
    <section className="v3-modal-summary">
      <div><span>1X2 thesis</span><strong>{assessment.state === 'no-edge' ? 'No clear edge' : call}</strong><small>{assessment.top ? `${percent(assessment.top.probability)} leading probability${assessment.margin == null ? '' : ` · ${(assessment.margin * 100).toFixed(1)}pp edge`}` : 'Probability unavailable'}</small></div>
      <div><span>Score call</span><strong>{score ?? '—'}</strong><small>{scoreProb == null ? 'Probability unavailable' : `${percent(scoreProb)} exact-score probability`}</small></div>
    </section>

    {fixture.finished ? <section className="v3-modal-result"><span className="v3-kicker">Result confirmation</span><h3>{home} {fixture.home_score ?? '–'}–{fixture.away_score ?? '–'} {away}</h3><div className="v3-result-audit"><Audit label="Top 1X2 cell" correct={assessment.top && actual ? assessment.top.code === actual : null} /><Audit label="Exact score" correct={score && actualScore ? score === actualScore : null} /></div></section> : null}

    <section className="v3-modal-section"><div className="v3-modal-section-head"><span className="v3-kicker">Probability board</span><small>Frozen before kickoff</small></div><div className="v3-modal-metric-grid"><Metric label={home} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.home_win) : '—'} /><Metric label="Draw" value={fixture.prediction?.markets ? percent(fixture.prediction.markets.draw) : '—'} /><Metric label={away} value={fixture.prediction?.markets ? percent(fixture.prediction.markets.away_win) : '—'} /><Metric label="Expected goals" value={fixture.prediction?.home_lambda == null || fixture.prediction.away_lambda == null ? '—' : `${fixture.prediction.home_lambda.toFixed(2)} – ${fixture.prediction.away_lambda.toFixed(2)}`} /></div></section>

    <section className="v3-match-story"><span className="v3-kicker">Match story</span><p>{matchStory(fixture, assessment.state, call, support.length, risks.length)}</p></section>

    <div className="v3-modal-evidence-grid"><FactGroup title={assessment.state === 'no-edge' ? `Case for ${call}` : `Why ${call} leads`} facts={support} /><FactGroup title="Counterpoints / risks" facts={risks} risk /></div>
    {neutral.length ? <FactGroup title="Additional context" facts={neutral} /> : null}

    <details className="v3-technical-disclosure"><summary>Technical details</summary><div className="v3-modal-metric-grid"><Metric label="Snapshot" value={fixture.prediction?.snapshot_id == null ? '—' : `#${fixture.prediction.snapshot_id}`} /><Metric label="Source" value={fixture.prediction?.source_change_id ?? '—'} /><Metric label="Captured" value={fixture.prediction?.captured_at ? formatTimestamp(fixture.prediction.captured_at) : '—'} /><Metric label="Script" value={fixture.prediction?.script_family ?? '—'} /></div>{fixture.prediction?.top_scorelines?.length ? <div className="v3-top-scorelines">{fixture.prediction.top_scorelines.slice(0, 5).map((row) => <span key={row.score}><strong>{row.score}</strong> {percent(row.prob)}</span>)}</div> : null}</details>
  </V3Dialog>;
}

function Audit({ label, correct }: { label: string; correct: boolean | null }) { return <span className="v3-audit-mark" data-result={correct == null ? 'unknown' : correct ? 'correct' : 'wrong'}>{label}: {correct == null ? '—' : correct ? '✓ Correct' : '✕ Miss'}</span>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span>{label}</span><strong>{value}</strong></div>; }
function FactGroup({ title, facts, risk = false }: { title: string; facts: FixtureFact[]; risk?: boolean }) { return <section className={`v3-fact-group${risk ? ' is-risk' : ''}`}><h3>{title}<span>{facts.length}</span></h3>{facts.length ? <ul>{facts.map((fact) => <li key={fact.id}>{fact.one_liner}</li>)}</ul> : <p>No independent evidence family surfaced in this group.</p>}</section>; }
function distinctFacts(facts: FixtureFact[], limit = 5): FixtureFact[] { const seen = new Set<string>(); return [...facts].sort((a, b) => b.usefulness_score - a.usefulness_score).filter((fact) => { const key = fact.one_liner.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, limit); }
function callLabel(code: OutcomeCode, home: string, away: string): string { return code === 'H' ? `${home} win` : code === 'A' ? `${away} win` : 'Draw'; }
function callState(value: string): string { return value === 'strong' ? 'Strong edge' : value === 'lean' ? 'Lean' : value === 'no-edge' ? 'Top cell only' : 'Unavailable'; }
function percent(value: number): string { return `${(value * 100).toFixed(1)}%`; }
function phaseLabel(value: WorkspaceFixturePhase): string { return value === 'FUTURE' ? 'Upcoming' : value === 'LIVE' ? 'Live' : 'Finished'; }
function phaseFromFixture(fixture: MatchFixture): WorkspaceFixturePhase { if (fixture.finished) return 'FINISHED'; return Date.now() >= new Date(fixture.kickoff_time).getTime() ? 'LIVE' : 'FUTURE'; }
function formatKickoff(value: string): string { return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function formatTimestamp(value: string): string { return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)); }
function matchStory(fixture: MatchFixture, state: string, call: string, support: number, risks: number): string { const assessment = assessCall(fixture.prediction); if (!assessment.top || !assessment.second || assessment.margin == null) return 'The frozen forecast does not expose enough 1X2 information to form a reliable matchup story.'; const runner = callLabel(assessment.second.code, fixture.home_team ?? 'Home', fixture.away_team ?? 'Away'); if (state === 'no-edge') return `${call} has the largest single 1X2 cell at ${percent(assessment.top.probability)}, but is only ${(assessment.margin * 100).toFixed(1)}pp ahead of ${runner}. ${support} supporting and ${risks} counter evidence families survive the chronology-safe filters, so this remains a genuine no-clear-edge fixture.`; return `${call} leads at ${percent(assessment.top.probability)}, ${(assessment.margin * 100).toFixed(1)}pp ahead of ${runner}. ${support} independent evidence ${support === 1 ? 'family supports' : 'families support'} the thesis, with ${risks} credible counterpoint${risks === 1 ? '' : 's'} still live.`; }
