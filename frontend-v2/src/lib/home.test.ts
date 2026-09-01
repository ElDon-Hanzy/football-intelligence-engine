import { describe, expect, it } from 'vitest';
import type { FplFixtureResult, ManagerPlan } from './contracts';
import { decisionLabel, planFreshness, strongestFixtureCall } from './home';

const plan: ManagerPlan = {
  id: 3,
  gameweek: 3,
  captured_at: '2026-09-01T00:00:00+00:00',
  status: 'PROVISIONAL_HOLD',
  transfers: [],
  captain_player_id: 470,
  vice_player_id: 471,
  starting_xi: [1, 2, 3],
  bench_order: [4],
  chip: 'NONE',
  risk_level: 'MEDIUM',
};

const fixtures: FplFixtureResult[] = [
  {
    match_id: 1,
    kickoff_time: '2026-09-04T19:00:00+00:00',
    home_team: 'Ipswich Town',
    away_team: 'Liverpool',
    finished: false,
    prediction: { markets: { home_win: 0.22, draw: 0.22, away_win: 0.56 } },
  },
  {
    match_id: 2,
    kickoff_time: '2026-09-05T14:00:00+00:00',
    home_team: 'Fulham',
    away_team: 'Crystal Palace',
    finished: false,
    prediction: { markets: { home_win: 0.382, draw: 0.243, away_win: 0.375 } },
  },
];

describe('Command Center presentation rules', () => {
  it('never infers HOLD when no manager plan exists', () => {
    expect(decisionLabel(undefined)).toBe('AWAITING PLAN');
    expect(decisionLabel(plan)).toBe('HOLD / ROLL');
  });

  it('flags saved plans older than 24 hours', () => {
    expect(planFreshness(plan.captured_at, new Date('2026-09-02T02:00:00+00:00').getTime())).toEqual({
      label: 'Saved 26h ago · refresh before acting',
      stale: true,
    });
  });

  it('chooses the strongest 1X2 call by top-two separation', () => {
    expect(strongestFixtureCall(fixtures)).toMatchObject({
      label: 'Liverpool',
      fixture: 'Ipswich Town vs Liverpool',
      clear: true,
    });
  });
});
