import { useState } from 'react';
import type { FixtureFact, FixtureFactsItem, FplFixtureResult } from '../../lib/contracts';
import { actualOutcome, assessCall, outcomeLabel, percent, selectCardFacts } from '../../lib/fixtures';
import { FormStrip } from './FormStrip';
import { MatchupModal } from './MatchupModal';

type EvidenceStatus = 'aligned' | 'mismatch' | 'unavailable';

export function FixtureCard({ fixture, facts, evidenceStatus }: { fixture: FplFixtureResult; facts: FixtureFactsItem | undefined; evidenceStatus: EvidenceStatus }) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const prediction = fixture.prediction;
  const assessment = assessCall(prediction?.markets);
  const selectedFacts = evidenceStatus === 'aligned' && facts ? selectCardFacts(facts.card_facts) : [];
  const headlineScore = prediction?.headline_score ?? prediction?.raw_modal_score ?? null;
  const scoreProbability = prediction?.headline_score_probability ?? null;
  const outcome = actualOutcome(fixture.home_score, fixture.away_score);
  const scoreActual = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const callText = assessment.top ? outcomeLabel(assessment.top.code, home, away) : 'Prediction unavailable';
  const secondText = assessment.second ? outcomeLabel(assessment.second.code, home, away) : null;
  const modalReady = evidenceStatus === 'aligned' && facts != null;

  return <article className="fixture-card" aria-label={`Fixture ${home} vs ${away}`}>
    <header className="fixture-card-header">
      <div><span className="fixture-kickoff">{formatKickoff(fixture.kickoff_time)}</span><strong>{home} vs {away}</strong></div>
      <span className={`fixture-status${fixture.finished ? ' is-finished' : ''}`}>{fixture.finished ? 'FT' : 'Upcoming'}</span>
    </header>

    <section className={`call-banner is-${assessment.state}`} aria-label="1X2 assessment">
      <span>{callStateLabel(assessment.state)}</span>
      <strong>{assessment.state === 'no-edge' ? 'No clear edge' : callText}</strong>
      <small>{assessment.state === 'no-edge' && assessment.top && assessment.second
        ? `${callText} ${percent(assessment.top.probability)} · ${secondText ?? 'Next'} ${percent(assessment.second.probability)}`
        : assessment.margin == null ? 'Model probabilities unavailable' : `${Math.round(assessment.margin * 100)}pp clear of the next outcome`}</small>
    </section>

    <div className="fixture-score-grid">
      <div className="fixture-team"><span>Home</span><strong>{home}</strong><small>{fixture.home_short ?? ''}</small></div>
      <div className="score-call">
        <span>{fixture.finished ? 'Actual' : 'Score call'}</span>
        <strong>{fixture.finished ? scoreActual ?? '—' : headlineScore ?? '—'}</strong>
        <small>{fixture.finished ? `Forecast ${headlineScore ?? 'unresolved'}` : scoreProbability == null ? 'Probability unavailable' : `${percent(scoreProbability)} exact-score probability`}</small>
      </div>
      <div className="fixture-team is-away"><span>Away</span><strong>{away}</strong><small>{fixture.away_short ?? ''}</small></div>
    </div>

    {prediction?.markets ? <div className="market-strip" aria-label="1X2 probabilities"><span>H <strong>{percent(prediction.markets.home_win)}</strong></span><span>D <strong>{percent(prediction.markets.draw)}</strong></span><span>A <strong>{percent(prediction.markets.away_win)}</strong></span></div> : <div className="market-strip is-empty">1X2 probabilities unavailable</div>}

    {fixture.finished && outcome ? <div className="result-audit" aria-label="Forecast result audit">
      {assessment.state === 'strong' || assessment.state === 'lean' ? <span className={assessment.top?.code === outcome ? 'is-correct' : 'is-wrong'}>1X2 {assessment.top?.code === outcome ? '✓' : '×'}</span> : <span>1X2 no-edge</span>}
      <span className={headlineScore && scoreActual === headlineScore ? 'is-correct' : 'is-wrong'}>Exact {headlineScore && scoreActual === headlineScore ? '✓' : '×'}</span>
    </div> : null}

    {evidenceStatus === 'aligned' && facts ? <section className="form-section" aria-label="Last five league form">
      <div className="mini-heading">Last five league results</div>
      <FormStrip teamName={home} recent={facts.home.recent} />
      <FormStrip teamName={away} recent={facts.away.recent} />
    </section> : null}

    {selectedFacts.length ? <div className="evidence-disclosure">
      <button className="evidence-toggle" type="button" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
        <span>Decision evidence</span><strong>{expanded ? 'Hide' : `Show ${selectedFacts.length}`}</strong>
      </button>
      {expanded ? <ul className="evidence-list">{selectedFacts.map((fact) => <EvidenceFact key={fact.id} fact={fact} />)}</ul> : null}
    </div> : evidenceStatus === 'mismatch' ? <p className="evidence-pending" role="status">Evidence is refreshing; supporting facts stay hidden until they match this forecast.</p> : null}

    <div className="matchup-action">
      <button className="matchup-open" type="button" disabled={!modalReady} onClick={() => setModalOpen(true)}>{modalReady ? 'Open matchup' : evidenceStatus === 'mismatch' ? 'Matchup refreshing' : 'Matchup unavailable'}</button>
    </div>

    {modalReady && facts ? <MatchupModal open={modalOpen} onClose={() => setModalOpen(false)} fixture={fixture} facts={facts} /> : null}
  </article>;
}

function EvidenceFact({ fact }: { fact: FixtureFact }) {
  return <li><span className={`evidence-alignment is-${fact.alignment.toLowerCase()}`}>{fact.alignment.toLowerCase()}</span><p>{fact.one_liner}</p></li>;
}

function callStateLabel(state: ReturnType<typeof assessCall>['state']): string {
  if (state === 'strong') return 'Strong call';
  if (state === 'lean') return 'Lean';
  if (state === 'no-edge') return '1X2';
  return '1X2 unavailable';
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
