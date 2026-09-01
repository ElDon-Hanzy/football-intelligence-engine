import { describe, expect, it } from 'vitest';
import type { FixtureFact, FixtureFactsItem, FplFixtureResult } from './contracts';
import { assessCall, buildMatchStory, evidenceMatchesPrediction, groupModalFacts, selectCardFacts } from './fixtures';

function fact(id: number, family: string, text: string, rank: number, alignment: FixtureFact['alignment'] = 'SUPPORTS'): FixtureFact {
  return {
    id,
    snapshot_run_id: 7,
    match_id: 25,
    team_id: alignment === 'CONTRADICTS' ? 8 : 10,
    opponent_team_id: alignment === 'CONTRADICTS' ? 10 : 8,
    fact_type: `C0166_${family}`,
    usefulness_score: 1 - id / 100,
    card_rank: rank,
    alignment,
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

  it('keeps supporting and counter evidence balanced and deduplicated in the modal', () => {
    const groups = groupModalFacts([
      fact(1, 'VENUE_FORM', 'Home venue form supports the call.', 1),
      fact(2, 'VENUE_FORM', 'Duplicate support family.', 2),
      fact(3, 'STREAK', 'Opponent streak supports the call.', 3),
      fact(4, 'MATCHUP_XG', 'Chance matchup supports the call.', 4),
      fact(5, 'PROCESS', 'Fourth support is outside the group cap.', 5),
      fact(20, 'CURRENT_PROCESS', 'Current-season process challenges the call.', 1, 'CONTRADICTS'),
      fact(21, 'CURRENT_PROCESS', 'Duplicate counter family.', 2, 'CONTRADICTS'),
      fact(22, 'RESIDUAL', 'A second distinct counter remains live.', 3, 'CONTRADICTS'),
    ]);
    expect(groups.supports.map((item) => item.id)).toEqual([1, 3, 4]);
    expect(groups.contradicts.map((item) => item.id)).toEqual([20, 22]);
  });

  it('builds a no-edge story from probabilities and evidence counts without copying evidence text', () => {
    const fixture = { match_id: 25, kickoff_time: '2026-09-04T12:00:00+00:00', home_team: 'Fulham', away_team: 'Crystal Palace', finished: false, prediction: { snapshot_id: 211, source_change_id: 'C0166', markets: { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 } } } as FplFixtureResult;
    const support = 'Fulham have won 6/10 at home.';
    const counter = 'Crystal Palace have the stronger current-season chance profile.';
    const facts = { match_id: 25, gameweek: 3, kickoff_time: fixture.kickoff_time, home: { id: 10, name: 'Fulham', short_name: 'FUL', recent: [] }, away: { id: 8, name: 'Crystal Palace', short_name: 'CRY', recent: [] }, alignment_basis: { snapshot_id: 211, captured_at: '2026-09-01T21:03:00+00:00', source_change_id: 'C0166', top_outcome: 'H', markets: { home_win: 0.3819, draw: 0.2433, away_win: 0.3745 } }, card_facts: [], modal_facts: [fact(1, 'VENUE_FORM', support, 1), fact(20, 'CURRENT_PROCESS', counter, 1, 'CONTRADICTS')] } as FixtureFactsItem;
    const story = buildMatchStory(fixture, facts);
    expect(story).toContain('effectively split');
    expect(story).toContain('0.7pp');
    expect(story).toContain('counter-input');
    expect(story).not.toContain(support);
    expect(story).not.toContain(counter);
  });
});
