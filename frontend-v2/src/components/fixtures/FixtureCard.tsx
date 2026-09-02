import { useState } from 'react';
import type { FixtureFact, FixtureFactsItem, FplFixtureResult, RecentTeamResultSchema } from '../../lib/contracts';
import type { z } from 'zod';
import { actualOutcome, assessCall, outcomeLabel, percent, selectCardFacts } from '../../lib/fixtures';
import { FormStrip } from './FormStrip';
import { MatchupModal } from './MatchupModal';

type EvidenceStatus = 'aligned' | 'mismatch' | 'unavailable';
type RecentResult = z.infer<typeof RecentTeamResultSchema>;

type Props = {
  fixture: FplFixtureResult;
  facts: FixtureFactsItem | undefined;
  evidenceStatus: EvidenceStatus;
  homeTeamCode?: number | null;
  awayTeamCode?: number | null;
};

export function FixtureCard({ fixture, facts, evidenceStatus, homeTeamCode = null, awayTeamCode = null }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const homeShort = fixture.home_short ?? home.slice(0, 3).toUpperCase();
  const awayShort = fixture.away_short ?? away.slice(0, 3).toUpperCase();
  const prediction = fixture.prediction;
  const assessment = assessCall(prediction?.markets);
  const selectedFacts = evidenceStatus === 'aligned' && facts ? selectCardFacts(facts.card_facts) : [];
  const headlineScore = prediction?.headline_score ?? prediction?.raw_modal_score ?? null;
  const outcome = actualOutcome(fixture.home_score, fixture.away_score);
  const scoreActual = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const callText = assessment.top ? outcomeLabel(assessment.top.code, home, away) : 'Prediction unavailable';
  const callDisplay = assessment.top?.code === 'H' ? `${homeShort} win` : assessment.top?.code === 'A' ? `${awayShort} win` : assessment.top?.code === 'D' ? 'Draw' : 'Unavailable';
  const secondText = assessment.second ? outcomeLabel(assessment.second.code, home, away) : null;
  const modalReady = evidenceStatus === 'aligned' && facts != null;
  const directionAuditable = fixture.finished && outcome && (assessment.state === 'strong' || assessment.state === 'lean');
  const directionCorrect = directionAuditable ? assessment.top?.code === outcome : null;
  const scoreCorrect = fixture.finished && headlineScore && scoreActual ? scoreActual === headlineScore : null;
  const panelId = `fixture-detail-${fixture.match_id}`;

  return <article className={`fixture-card${expanded ? ' is-expanded' : ''}`} aria-label={`Fixture ${home} vs ${away}`}>
    <header className="fixture-card-header">
      <span className="fixture-kickoff">{formatKickoff(fixture.kickoff_time)}</span>
      <span className={`fixture-status${fixture.finished ? ' is-finished' : ''}`}>{fixture.finished ? 'FT' : 'Upcoming'}</span>
    </header>

    <div className="fixture-compact-row">
      <CompactTeam name={home} shortName={homeShort} teamCode={homeTeamCode} recent={facts?.home.recent ?? []} />
      <div className="compact-prediction" aria-label="Prediction summary">
        <span className={`compact-call-state is-${assessment.state}`}>{callStateLabel(assessment.state)}</span>
        <strong>{assessment.state === 'no-edge' ? 'No clear edge' : callDisplay}{directionCorrect == null ? null : <AuditMark correct={directionCorrect} label="1X2" />}</strong>
        <small>Most likely exact score <b>{headlineScore ?? '—'}</b>{scoreCorrect == null ? null : <AuditMark correct={scoreCorrect} label="exact score" />}</small>
        {fixture.finished ? <small className="actual-score">Actual {scoreActual ?? '—'}</small> : null}
      </div>
      <CompactTeam name={away} shortName={awayShort} teamCode={awayTeamCode} recent={facts?.away.recent ?? []} away />
    </div>

    <button className="fixture-expand-toggle" type="button" aria-expanded={expanded} aria-controls={panelId} onClick={() => setExpanded((value) => !value)}>
      <span>{expanded ? 'Hide details' : 'Expand fixture'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span>
    </button>

    {expanded ? <div className="fixture-expanded" id={panelId}>
      <div className="expanded-team-names">
        <TeamIdentity name={home} shortName={homeShort} teamCode={homeTeamCode} />
        <span>vs</span>
        <TeamIdentity name={away} shortName={awayShort} teamCode={awayTeamCode} away />
      </div>

      <section className={`call-banner is-${assessment.state}`} aria-label="1X2 assessment">
        <span>{callStateLabel(assessment.state)}</span>
        <strong>{assessment.state === 'no-edge' ? 'No clear edge' : callText}{directionCorrect == null ? null : <AuditMark correct={directionCorrect} label="1X2" />}</strong>
        <small>{assessment.state === 'no-edge' && assessment.top && assessment.second
          ? `${callText} ${percent(assessment.top.probability)} · ${secondText ?? 'Next'} ${percent(assessment.second.probability)}`
          : assessment.margin == null ? 'Model probabilities unavailable' : `${Math.round(assessment.margin * 100)}pp clear of the next outcome`}</small>
      </section>

      <div className="exact-score-expanded"><span>Most likely exact score</span><strong>{headlineScore ?? '—'}{scoreCorrect == null ? null : <AuditMark correct={scoreCorrect} label="exact score" />}</strong>{fixture.finished ? <small>Actual {scoreActual ?? '—'}</small> : <small>A single scoreline mode; 1X2 sums all scorelines by outcome.</small>}</div>

      {prediction?.markets ? <div className="market-strip" aria-label="1X2 probabilities"><span>H <strong>{percent(prediction.markets.home_win)}</strong></span><span>D <strong>{percent(prediction.markets.draw)}</strong></span><span>A <strong>{percent(prediction.markets.away_win)}</strong></span></div> : <div className="market-strip is-empty">1X2 probabilities unavailable</div>}

      {evidenceStatus === 'aligned' && facts ? <section className="form-section" aria-label="Last five league form">
        <div className="mini-heading">Last five league results</div>
        <FormStrip teamName={home} recent={facts.home.recent} />
        <FormStrip teamName={away} recent={facts.away.recent} />
      </section> : null}

      {selectedFacts.length ? <section className="expanded-evidence" aria-label="Decision evidence"><div className="mini-heading">Decision evidence</div><ul className="evidence-list">{selectedFacts.map((fact) => <EvidenceFact key={fact.id} fact={fact} />)}</ul></section> : evidenceStatus === 'mismatch' ? <p className="evidence-pending" role="status">Evidence is refreshing; supporting facts stay hidden until they match this forecast.</p> : null}

      <div className="matchup-action">
        <button className="matchup-open" type="button" disabled={!modalReady} onClick={() => setModalOpen(true)}>{modalReady ? 'Open matchup' : evidenceStatus === 'mismatch' ? 'Matchup refreshing' : 'Matchup unavailable'}</button>
      </div>
    </div> : null}

    {modalReady && facts ? <MatchupModal open={modalOpen} onClose={() => setModalOpen(false)} fixture={fixture} facts={facts} /> : null}
  </article>;
}

function CompactTeam({ name, shortName, teamCode, recent, away = false }: { name: string; shortName: string; teamCode: number | null; recent: RecentResult[]; away?: boolean }) {
  return <div className={`compact-team${away ? ' is-away' : ''}`}>
    <Crest name={name} teamCode={teamCode} />
    <strong>{shortName}</strong>
    <CompactForm teamName={name} recent={recent} />
  </div>;
}

function TeamIdentity({ name, shortName, teamCode, away = false }: { name: string; shortName: string; teamCode: number | null; away?: boolean }) {
  return <div className={`expanded-team${away ? ' is-away' : ''}`}><Crest name={name} teamCode={teamCode} expanded /><div><strong>{name}</strong><small>{shortName}</small></div></div>;
}

function Crest({ name, teamCode, expanded = false }: { name: string; teamCode: number | null; expanded?: boolean }) {
  if (teamCode == null) return <span className={`club-crest-placeholder${expanded ? ' is-expanded' : ''}`} aria-hidden="true">{name.slice(0, 1)}</span>;
  return <img className={`club-crest${expanded ? ' is-expanded' : ''}`} src={`https://resources.premierleague.com/premierleague/badges/t${teamCode}.svg`} alt={`${name} crest`} loading="lazy" />;
}

function CompactForm({ teamName, recent }: { teamName: string; recent: RecentResult[] }) {
  const results = [...recent].sort((a, b) => a.sequence_no - b.sequence_no).slice(0, 5);
  if (!results.length) return <span className="compact-form is-empty" role="img" aria-label={`${teamName} form unavailable`} />;
  return <span className="compact-form" role="img" aria-label={`${teamName} last five: ${results.map((result) => result.result).join(', ')}`}>
    {results.map((result, index) => <i key={`${result.fixture_kickoff}-${index}`} className={`compact-form-dot is-${result.result.toLowerCase()}`} aria-hidden="true" />)}
  </span>;
}

function AuditMark({ correct, label }: { correct: boolean; label: string }) {
  return <span className={`inline-audit-mark ${correct ? 'is-correct' : 'is-wrong'}`} aria-label={`${label} ${correct ? 'correct' : 'incorrect'}`}>{correct ? '✓' : '×'}</span>;
}

function EvidenceFact({ fact }: { fact: FixtureFact }) {
  return <li><span className={`evidence-alignment is-${fact.alignment.toLowerCase()}`}>{fact.alignment.toLowerCase()}</span><p>{fact.one_liner}</p></li>;
}

function callStateLabel(state: ReturnType<typeof assessCall>['state']): string {
  if (state === 'strong') return 'Strong';
  if (state === 'lean') return 'Lean';
  if (state === 'no-edge') return '1X2';
  return 'Unavailable';
}

function formatKickoff(value: string): string {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
