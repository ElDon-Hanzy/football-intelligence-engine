import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchValidated, publicGatewayHeaders } from './api';
import { analysisEndpoints } from './analysis-api';
import { BettingApiSchema, CalibrationSummarySchema, EngineDiagnosticsSchema, type BettingFixture } from './analysis-contracts';

const withGameweek = (endpoint: string, gameweek: number) => gameweek > 0 ? `${endpoint}?gw=${gameweek}` : endpoint;

const StrongestBettingCallSchema = z.object({
  type: z.string(),
  match_id: z.number().int().positive(),
  fixture: z.string(),
  selection: z.string(),
  probability: z.number().min(0).max(1),
  home_lambda: z.number().nullable(),
  away_lambda: z.number().nullable(),
}).passthrough();

const HumanInsightsMarketsSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  prediction_run_id: z.number().int().positive(),
  model_version: z.string().nullable().optional(),
  generated_at: z.string(),
  betting_recommendations: z.array(StrongestBettingCallSchema).max(4),
}).passthrough();

export type StrongestBettingCall = z.infer<typeof StrongestBettingCallSchema>;

export function useStrongestBettingCalls(gameweek: number) {
  return useQuery({
    queryKey: ['strongest-betting-calls', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(analysisEndpoints.humanInsights, gameweek), HumanInsightsMarketsSchema, signal),
  });
}

export function useMarketsData(gameweek: number) {
  return useQuery({
    queryKey: ['markets', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(analysisEndpoints.betting, gameweek), BettingApiSchema, signal),
  });
}

export function usePerformanceData(gameweek: number) {
  return useQuery({
    queryKey: ['performance', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(analysisEndpoints.calibration, gameweek), CalibrationSummarySchema, signal),
  });
}

export function useEngineData(gameweek: number) {
  return useQuery({
    queryKey: ['engine', gameweek],
    queryFn: ({ signal }) => fetchValidated(withGameweek(analysisEndpoints.engineDiagnostics, gameweek), EngineDiagnosticsSchema, signal, publicGatewayHeaders),
  });
}

export type OutcomeComparison = {
  code: 'H' | 'D' | 'A';
  label: string;
  modelProbability: number;
  marketImplied: number | null;
  rawGap: number | null;
  decimalOdds: number | null;
  bookmaker: string | null;
};

export function outcomeComparisons(fixture: BettingFixture): OutcomeComparison[] {
  const markets = fixture.prediction?.markets;
  if (!markets) return [];
  const configs = [
    { code: 'H' as const, label: fixture.home_short ?? fixture.home_team ?? 'Home', probability: markets.home_win, aliases: ['home', '1', fixture.home_team ?? ''] },
    { code: 'D' as const, label: 'Draw', probability: markets.draw, aliases: ['draw', 'x'] },
    { code: 'A' as const, label: fixture.away_short ?? fixture.away_team ?? 'Away', probability: markets.away_win, aliases: ['away', '2', fixture.away_team ?? ''] },
  ];
  return configs.map((config) => {
    const aliases = config.aliases.map((value) => value.toLowerCase()).filter(Boolean);
    const prices = fixture.bookmaker_odds.filter((row) => {
      const key = `${row.selection_key} ${row.selection_name}`.toLowerCase();
      return aliases.some((alias) => key === alias || key.includes(alias));
    }).sort((a, b) => b.decimal_odds - a.decimal_odds);
    const best = prices[0];
    const marketImplied = best?.implied_probability ?? null;
    return {
      code: config.code,
      label: config.label,
      modelProbability: config.probability,
      marketImplied,
      rawGap: marketImplied == null ? null : config.probability - marketImplied,
      decimalOdds: best?.decimal_odds ?? null,
      bookmaker: best?.bookmaker_family ?? best?.bookmaker ?? null,
    };
  });
}

export function strongestModelOutcome(fixture: BettingFixture): OutcomeComparison | null {
  return [...outcomeComparisons(fixture)].sort((a, b) => b.modelProbability - a.modelProbability)[0] ?? null;
}

export function pct(value: number | null | undefined, digits = 0): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${(value * 100).toFixed(digits)}%`;
}

export function metric(value: number | null | undefined, digits = 3): string {
  return value == null || !Number.isFinite(value) ? '—' : value.toFixed(digits);
}
