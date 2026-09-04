import { useState } from 'react';
import type { FixtureFactsItem, FplFixtureResult, RecentTeamResultSchema } from '../../lib/contracts';
import type { HighScoreIntelligence } from '../../lib/fixture-intelligence-contracts';
import type { z } from 'zod';
import { assessCall } from '../../lib/fixtures';
import { auditExactScore, auditOutcomeCode } from '../../lib/prediction-audit';
import { PredictionAuditMark } from '../predictions/PredictionAuditMark';
import { MatchupModal } from './MatchupModal';

type EvidenceStatus = 'aligned' | 'mismatch' | 'unavailable';
type RecentResult = z.infer<typeof RecentTeamResultSchema>;

type Props = {
  fixture: FplFixtureResult;
  facts: FixtureFactsItem | undefined;
  highScore: HighScoreIntelligence | undefined;
  highScorePending?: boolean;
  evidenceStatus: EvidenceStatus;
  homeTeamCode?: number | null;
  awayTeamCode?: number | null;
};

export function FixtureCard({ fixture, facts, highScore, highScorePending = false, evidenceStatus, homeTeamCode = null, awayTeamCode = null }: Props) {
  const [modalOpen, setModalOpen] = useState(false);
  const home = fixture.home_team ?? 'Home';
  const away = fixture.away_team ?? 'Away';
  const homeShort = fixture.home_short ?? home.slice(0, 3).toUpperCase();
  const awayShort = fixture.away_short ?? away.slice(0, 3).toUpperCase();
  const prediction = fixture.prediction;
  const assessment = assessCall(prediction?.markets);
  const headlineScore = prediction?.headline_score ?? prediction?.raw_modal_score ?? null;
  const scoreActual = fixture.home_score != null && fixture.away_score != null ? `${fixture.home_score}-${fixture.away_score}` : null;
  const callDisplay = assessment.top?.code === 'H' ? `${homeShort} win` : assessment.top?.code === 'A' ? `${awayShort} win` : assessment.top?.code === 'D' ? 'Draw' : 'Unavailable';
  const modalReady = evidenceStatus === 'aligned' && facts != null;
  const directionAudit = fixture.finished ? auditOutcomeCode(assessment.top?.code, fixture.home_score, fixture.away_score) : null;
  const scoreAudit = fixture.finished ? auditExactScore(headlineScore, fixture.home_score, fixture.away_score) : null;
  const predictionLabel = assessment.state === 'no-edge'
    ? fixture.finished && assessment.top?.code ? `No clear edge · top ${callDisplay}` : 'No clear edge'
    : callDisplay;

  return <article className="fixture-card" aria-label={`Fixture ${home} vs ${away}`}>
    <header className="fixture-card-header">
      <span className="fixture-kickoff">{formatKickoff(fixture.kickoff_time)}</span>
      <span className={`fixture-status${fixture.finished ? ' is-finished' : ''}`}>{fixture.finished ? 'FT' : 'Upcoming'}</span>
    </header>

    <div className="fixture-compact-row">
      <CompactTeam name={home} shortName={homeShort} teamCode={homeTeamCode} recent={facts?.home.recent ?? []} />
      <div className="compact-prediction" aria-label="Prediction summary">
        <span className={`compact-call-state is-${assessment.state}`}>{callStateLabel(assessment.state)}</span>
        <strong>{predictionLabel}{directionAudit == null ? null : <PredictionAuditMark correct={directionAudit.correct} label="top 1X2 prediction" />}</strong>
        <small>Most likely exact score <b>{headlineScore ?? '—'}</b>{scoreAudit == null ? null : <PredictionAuditMark correct={scoreAudit.correct} label="exact-score prediction" />}</small>
        {fixture.finished ? <small className="actual-score">Actual {scoreActual ?? '—'}</small> : null}
      </div>
      <CompactTeam name={away} shortName={awayShort} teamCode={awayTeamCode} recent={facts?.away.recent ?? []} away />
    </div>

    <HighScoreBanner intelligence={highScore} pending={highScorePending} />

    <button className="fixture-modal-trigger" type="button" disabled={!modalReady} onClick={() => setModalOpen(true)}>
      <span>{modalReady ? 'Open matchup' : evidenceStatus === 'mismatch' ? 'Matchup refreshing' : 'Matchup unavailable'}</span>
      <span aria-hidden="true">→</span>
    </button>

    {modalReady && facts ? <MatchupModal open={modalOpen} onClose={() => setModalOpen(false)} fixture={fixture} facts={facts} /> : null}
  </article>;
}

function HighScoreBanner({ intelligence, pending }: { intelligence: HighScoreIntelligence | undefined; pending: boolean }) {
  if (pending && !intelligence) {
    return <div className="call-banner fixture-high-score-intelligence" aria-label="High-Score Intelligence">
      <span>High-Score Intelligence</span>
      <strong>Loading model prediction…</strong>
      <small>C0197 research overlay</small>
    </div>;
  }

  if (!intelligence || !intelligence.available) {
    return <div className="call-banner fixture-high-score-intelligence" aria-label="High-Score Intelligence">
      <span>High-Score Intelligence</span>
      <strong>Prediction unavailable</strong>
      <small>{intelligence?.available === false ? intelligence.reason : 'No frozen C0197 signal returned'} · Research only</small>
    </div>;
  }

  const structuralRank = intelligence.router.structural.rank;
  const disruptionRank = intelligence.router.disruption.rank;
  const favorite = intelligence.router.structural.favorite ?? intelligence.router.disruption.favorite;
  const prediction = intelligence.archetype === 'SHOOTOUT'
    ? 'Shootout'
    : intelligence.archetype === 'DEMOLITION'
      ? `Demolition${favorite ? ` · ${favorite}` : ''}`
      : intelligence.archetype === 'MIXED'
        ? 'Mixed high-score route'
        : 'No strong high-score signal';
  const strength = intelligence.strength.replace('_', ' ');
  const emphasis = intelligence.strength === 'VERY_HIGH' || intelligence.strength === 'HIGH'
    ? ' is-strong'
    : intelligence.strength === 'MEDIUM'
      ? ' is-lean'
      : '';
  const rankText = structuralRank != null && disruptionRank != null ? `Router #${structuralRank} / #${disruptionRank}` : 'Router rank unavailable';

  return <div className={`call-banner fixture-high-score-intelligence${emphasis}`} aria-label="High-Score Intelligence">
    <span>High-Score Intelligence</span>
    <strong>{prediction}</strong>
    <small>{strength} signal · {rankText} · Agreement {intelligence.agreement}</small>
    <small>{intelligence.note} Research only; not a probability.</small>
  </div>;
}

function CompactTeam({ name, shortName, teamCode, recent, away = false }: { name: string; shortName: string; teamCode: number | null; recent: RecentResult[]; away?: boolean }) {
  return <div className={`compact-team${away ? ' is-away' : ''}`}>
    <Crest name={name} teamCode={teamCode} />
    <strong>{shortName}</strong>
    <CompactForm teamName={name} recent={recent} />
  </div>;
}

function Crest({ name, teamCode }: { name: string; teamCode: number | null }) {
  if (teamCode == null) return <span className="club-crest-placeholder" aria-hidden="true">{name.slice(0, 1)}</span>;
  return <img className="club-crest" src={`https://resources.premierleague.com/premierleague/badges/t${teamCode}.svg`} alt={`${name} crest`} loading="lazy" />;
}

function CompactForm({ teamName, recent }: { teamName: string; recent: RecentResult[] }) {
  const results = [...recent].sort((a, b) => a.sequence_no - b.sequence_no).slice(0, 5);
  if (!results.length) return <span className="compact-form is-empty" role="img" aria-label={`${teamName} form unavailable`} />;
  return <span className="compact-form" role="img" aria-label={`${teamName} last five: ${results.map((result) => result.result).join(', ')}`}>
    {results.map((result, index) => <i key={`${result.fixture_kickoff}-${index}`} className={`compact-form-dot is-${result.result.toLowerCase()}`} aria-hidden="true" />)}
  </span>;
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
