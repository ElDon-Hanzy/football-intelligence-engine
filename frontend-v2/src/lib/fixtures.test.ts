import { describe, expect, it } from 'vitest';
import type { FixtureFact, FixtureFactsItem, FplFixtureResult } from './contracts';
import { assessCall, evidenceMatchesPrediction, selectCardFacts } from './fixtures';

function fact(id: number, family: string, text: string, rank: number): FixtureFact {
  return {
    id,
    snapshot_run_id: 7,
    match_id: 25,
    team_id: 10,
    opponent_team_id: 8,
    fact_type: `C0166_${family}`,
    usefulness_score: 1 - id / 100,
    card_rank: rank,
    alignment: 'SUPPORTS',
    one_liner: text,
    payload: { family },
    evidence_cutoff: '2026-09-01T20:32:50+00:00',
  };
}

describe('fixture scan decision semantics', () => {
  it('uses the registered strong / lean / no-edge presentation bands', () => {
    expect(assessCall({ home_win: 0.50, draw: 0.30, away_win: 0.20 }).state).toBe('strong');
    expect(assessCall({ home_win: 0.41, draw: 0.35, away_win: 0.24 }).state).toBe('lean');
    expect(assessCall({ home_win: 0.3819, draw: 0.2433, away_win: 0.3745 }).state).toBe('no-edge');
    expect(assessCall(undefined).state).toBe('unavailable');
  });

  it('limits expanded evidence to three distinct families and texts', () => {
    const selected = selectCardFacts([
      fact(1, 'VENUE_FORM', 'Home side have won 6/10.', 1),
      fact(2, 'VENUE_FORM', 'Same family should not repeat.', 2),
      fact(3, 'STREAK', 'Away side are winless in nine.', 3),
      fact(4, 'MATCHUP_XG', 'Home chance creation is stronger.', 4),
      fact(5, 'PROCESS', 'Fourth distinct fact is outside the cap.', 5),
    ]);
    expect(selected.map((item) => item.id)).toEqual([1, 3, 4]);
  });

  it('fails evidence closed when the alignment snapshot differs', () => {
    const fixture = { match_id: 25, kickoff_time: '2026-09-04T12:00:00+00:00', home_team: 'Fulham', away_team: 'Crystal Palace', finished: false, prediction: { snapshot_id: 211, source_change_id: 'C0166', markets: { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 } } } as FplFixtureResult;
    const facts = { match_id: 25, gameweek: 3, kickoff_time: fixture.kickoff_time, home: { id: 10, name: 'Fulham', short_name: 'FUL', recent: [] }, away: { id: 8, name: 'Crystal Palace', short_name: 'CRY', recent: [] }, alignment_basis: { snapshot_id: 211, captured_at: '2026-09-01T21:03:00+00:00', source_change_id: 'C0166', top_outcome: 'H', markets: { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 } }, card_facts: [], modal_facts: [] } as FixtureFactsItem;
    expect(evidenceMatchesPrediction(fixture, facts)).toBe(true);
    const drifted = { ...facts, alignment_basis: facts.alignment_basis ? { ...facts.alignment_basis, snapshot_id: 201 } : null };
    expect(evidenceMatchesPrediction(fixture, drifted)).toBe(false);
  });
});
