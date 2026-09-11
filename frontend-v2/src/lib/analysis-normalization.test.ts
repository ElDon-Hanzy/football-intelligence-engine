import { describe, expect, it } from 'vitest';
import { normalizeCalibrationSummary } from './analysis';
import type { CalibrationSummary } from './analysis-contracts';

function sample(matchedPlayers: number, benchmarkXi: number | null, mae: number | null): CalibrationSummary {
  return {
    ok: true,
    gameweek: 4,
    active_model: '0.1.3',
    summary: {
      frozen_xi_xpts: 50,
      current_xi_xpts: 51,
      benchmark_xi_xpts: benchmarkXi,
      benchmark_xi_matched: matchedPlayers,
      matched_players: matchedPlayers,
      mae,
      bias: mae,
    },
    validation: {
      forward: { available: true, variants: [] },
      retrospective: [],
    },
  } as CalibrationSummary;
}

describe('calibration summary normalization', () => {
  it('converts zero-match benchmark aggregates to missing instead of numeric zero', () => {
    const normalized = normalizeCalibrationSummary(sample(0, 0, null));
    expect(normalized.summary.benchmark_xi_xpts).toBeNull();
    expect(normalized.summary.benchmark_xi_matched).toBe(0);
    expect(normalized.summary.mae).toBeNull();
    expect(normalized.summary.bias).toBeNull();
  });

  it('preserves real benchmark aggregates when matched players exist', () => {
    const normalized = normalizeCalibrationSummary(sample(11, 54.3, 0.42));
    expect(normalized.summary.benchmark_xi_xpts).toBe(54.3);
    expect(normalized.summary.mae).toBe(0.42);
  });
});
