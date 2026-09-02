import { describe, expect, it } from 'vitest';
import { auditExactScore, auditOutcomeCode, auditStrongestBettingCall } from './prediction-audit';
import type { StrongestBettingCall } from './analysis';
import type { BettingFixture } from './analysis-contracts';

const fixture: BettingFixture = {
  match_id: 1,
  kickoff_time: '2026-08-22T15:00:00Z',
  finished: true,
  home_score: 3,
  away_score: 1,
  home_team: 'Man City',
  away_team: 'Coventry City',
  prediction: null,
  bookmaker_odds: [],
  correct_score_odds: [],
};

function call(type: string, selection: string): StrongestBettingCall {
  return { type, match_id: 1, fixture: 'Man City vs Coventry City', selection, probability: .7, home_lambda: 2.5, away_lambda: 1 };
}

describe('finished prediction audit', () => {
  it('audits 1X2 and exact score predictions', () => {
    expect(auditOutcomeCode('H', 3, 1)?.correct).toBe(true);
    expect(auditOutcomeCode('D', 3, 1)?.correct).toBe(false);
    expect(auditExactScore('3-1', 3, 1)?.correct).toBe(true);
    expect(auditExactScore('2-1', 3, 1)?.correct).toBe(false);
  });

  it('settles all four Betting call types from the final score', () => {
    expect(auditStrongestBettingCall(call('Correct score', '3-1'), fixture)).toEqual({ correct: true, actual: '3-1' });
    expect(auditStrongestBettingCall(call('1X2', 'Man City win'), fixture)?.correct).toBe(true);
    expect(auditStrongestBettingCall(call('O/U 2.5', 'Over 2.5'), fixture)?.correct).toBe(true);
    expect(auditStrongestBettingCall(call('BTTS', 'BTTS Yes'), fixture)?.correct).toBe(true);
    expect(auditStrongestBettingCall(call('BTTS', 'BTTS No'), fixture)?.correct).toBe(false);
  });

  it('does not settle unfinished events', () => {
    expect(auditStrongestBettingCall(call('1X2', 'Man City win'), { ...fixture, finished: false })).toBeNull();
  });
});
