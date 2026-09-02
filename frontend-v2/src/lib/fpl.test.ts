import { describe, expect, it } from 'vitest';
import type { FplApi, Player } from './contracts';
import { isDirectCurrentDistribution, projectionRelation, rankProjectionLeaders, resolveSelections } from './fpl';

const player = (id: number, expectedPoints: number, p10: number, minutes: number): Player => ({
  id,
  name: `Player ${id}`,
  expected_points: expectedPoints,
  expected_minutes: minutes,
  p_10_plus: p10,
  p_15_plus: p10 / 3,
  q90: 12,
  q95: 15,
  tail_semantics: 'direct_current_fixture_event_distribution',
});

describe('FPL decision workspace helpers', () => {
  it('resolves numeric and object saved selections without dropping unknown player ids', () => {
    const data = { ok: true, squad: [player(1, 6, 0.2, 80)], fixture_results: [], all_predictions: [], top_double_digit: [] } as FplApi;
    const resolved = resolveSelections(data, [1, { id: 2 }]);
    expect(resolved).toHaveLength(2);
    expect(resolved[0]?.player?.id).toBe(1);
    expect(resolved[1]).toEqual({ id: 2, player: undefined });
  });

  it('ranks full-pool projections by xPts with tail/minutes tie-breakers', () => {
    const ranked = rankProjectionLeaders([
      player(1, 7, 0.22, 80),
      player(2, 7, 0.25, 75),
      player(3, 6.9, 0.30, 90),
    ]);
    expect(ranked.map((item) => item.id)).toEqual([2, 1, 3]);
  });

  it('states when a projection run is newer than the saved manager plan', () => {
    const relation = projectionRelation('2026-08-31T22:43:00Z', '2026-09-01T20:05:00Z');
    expect(relation.projectionNewer).toBe(true);
    expect(relation.label).toContain('21h newer');
  });

  it('only accepts genuine direct current-fixture distribution semantics', () => {
    expect(isDirectCurrentDistribution(player(1, 7, 0.2, 80))).toBe(true);
    expect(isDirectCurrentDistribution({ ...player(2, 7, 0.2, 80), tail_semantics: 'legacy_shifted_tail' })).toBe(false);
  });
});
