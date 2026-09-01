import { describe, expect, it } from 'vitest';
import { FixtureApiSchema, FplApiSchema, ManagerPlanApiSchema } from './contracts';

const validFixturePayload = {
  ok: true,
  fixtures: [
    {
      match_id: 25,
      kickoff_time: '2026-09-05T14:00:00+00:00',
      finished: false,
      home_team: { id: 10, name: 'Fulham', short_name: 'FUL' },
      away_team: { id: 8, name: 'Crystal Palace', short_name: 'CRY' },
      prediction: {
        markets: { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 },
        home_lambda: 1.505134,
        away_lambda: 1.488329,
        headline_score: '1-1',
        headline_score_probability: 0.112261,
        raw_modal_score: '1-1',
        top_scorelines: [{ score: '1-1', prob: 0.112261 }],
      },
    },
  ],
};

const managerPlanPayload = {
  ok: true,
  gameweek: 3,
  available_gameweeks: [3],
  plan: {
    id: 3,
    gameweek: 3,
    captured_at: '2026-08-31T22:43:34.107861+00:00',
    status: 'PROVISIONAL_HOLD',
    transfers: [],
    captain_player_id: 470,
    vice_player_id: 471,
    starting_xi: [112, 11, 426, 514, 29, 161, 470, 436, 471, 170, 417],
    bench_order: [60, 461, 188, 290],
    chip: 'NONE',
    risk_level: 'MEDIUM',
  },
};

const fplPayload = {
  ok: true,
  gameweek: 3,
  squad: [{ id: 470, name: 'B.Fernandes', expected_points: 6.58 }],
  fixture_results: [{
    match_id: 1,
    kickoff_time: '2026-09-04T19:00:00+00:00',
    home_team: 'Ipswich Town',
    away_team: 'Liverpool',
    finished: false,
    prediction: { markets: { home_win: 0.22, draw: 0.22, away_win: 0.56 } },
  }],
};

describe('production API contracts', () => {
  it('accepts the fixture-intelligence shape with or without prediction decoration', () => {
    expect(FixtureApiSchema.parse(validFixturePayload).fixtures).toHaveLength(1);
    const researchOnly = structuredClone(validFixturePayload);
    delete researchOnly.fixtures[0]!.prediction;
    expect(FixtureApiSchema.parse(researchOnly).fixtures).toHaveLength(1);
  });

  it('rejects impossible market probabilities', () => {
    const invalid = structuredClone(validFixturePayload);
    invalid.fixtures[0]!.prediction!.markets.home_win = 1.2;
    expect(() => FixtureApiSchema.parse(invalid)).toThrow();
  });

  it('accepts FPL fixture results used by the Command Center', () => {
    expect(FplApiSchema.parse(fplPayload).fixture_results).toHaveLength(1);
  });

  it('accepts stored manager-plan truth without inventing missing fields', () => {
    const parsed = ManagerPlanApiSchema.parse(managerPlanPayload);
    expect(parsed.plan?.transfers).toEqual([]);
    expect(parsed.plan?.captain_player_id).toBe(470);
  });
});
