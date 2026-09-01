import { describe, expect, it } from 'vitest';
import { FixtureApiSchema } from './contracts';

const validPayload = {
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

describe('production API contracts', () => {
  it('accepts a valid fixture payload', () => {
    expect(FixtureApiSchema.parse(validPayload).fixtures).toHaveLength(1);
  });

  it('rejects impossible market probabilities', () => {
    const invalid = structuredClone(validPayload);
    invalid.fixtures[0]!.prediction!.markets.home_win = 1.2;
    expect(() => FixtureApiSchema.parse(invalid)).toThrow();
  });
});
