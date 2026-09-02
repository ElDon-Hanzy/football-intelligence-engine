import type { StrongestBettingCall } from './analysis';
import type { BettingFixture } from './analysis-contracts';
import type { OutcomeCode } from './fixtures';

export type PredictionAudit = {
  correct: boolean;
  actual: string;
};

function finalScore(homeScore: number | null | undefined, awayScore: number | null | undefined): { home: number; away: number } | null {
  if (homeScore == null || awayScore == null) return null;
  return { home: homeScore, away: awayScore };
}

export function auditOutcomeCode(predicted: OutcomeCode | null | undefined, homeScore: number | null | undefined, awayScore: number | null | undefined): PredictionAudit | null {
  const score = finalScore(homeScore, awayScore);
  if (!score || !predicted) return null;
  const actual: OutcomeCode = score.home > score.away ? 'H' : score.away > score.home ? 'A' : 'D';
  return { correct: predicted === actual, actual };
}

export function auditExactScore(predicted: string | null | undefined, homeScore: number | null | undefined, awayScore: number | null | undefined): PredictionAudit | null {
  const score = finalScore(homeScore, awayScore);
  if (!score || !predicted) return null;
  const actual = `${score.home}-${score.away}`;
  return { correct: predicted.trim() === actual, actual };
}

export function auditStrongestBettingCall(call: StrongestBettingCall, fixture: BettingFixture | null | undefined): PredictionAudit | null {
  if (!fixture?.finished) return null;
  const score = finalScore(fixture.home_score, fixture.away_score);
  if (!score) return null;

  const selection = call.selection.trim().toLowerCase();
  const actualScore = `${score.home}-${score.away}`;

  if (call.type === 'Correct score') {
    return { correct: call.selection.trim() === actualScore, actual: actualScore };
  }

  if (call.type === '1X2') {
    const home = (fixture.home_team ?? '').trim().toLowerCase();
    const away = (fixture.away_team ?? '').trim().toLowerCase();
    const actual = score.home > score.away ? `${home} win` : score.away > score.home ? `${away} win` : 'draw';
    return { correct: selection === actual, actual: actual === 'draw' ? 'Draw' : actual.replace(/\b\w/g, (char) => char.toUpperCase()) };
  }

  if (call.type === 'O/U 2.5') {
    const total = score.home + score.away;
    const actual = total > 2.5 ? 'Over 2.5' : 'Under 2.5';
    return { correct: selection === actual.toLowerCase(), actual };
  }

  if (call.type === 'BTTS') {
    const actual = score.home > 0 && score.away > 0 ? 'BTTS Yes' : 'BTTS No';
    return { correct: selection === actual.toLowerCase(), actual };
  }

  return null;
}
