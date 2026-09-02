import { z } from 'zod';
import { MarketsSchema } from './contracts';

const NullableNumber = z.number().nullable().optional();

export const MarketOddsSelectionSchema = z.object({
  bookmaker: z.string(),
  bookmaker_family: z.string().optional(),
  market_key: z.string(),
  selection_key: z.string(),
  selection_name: z.string(),
  decimal_odds: z.number().positive(),
  implied_probability: z.number().min(0).max(1),
  captured_at: z.string().optional(),
}).passthrough();

export const BettingFixtureSchema = z.object({
  match_id: z.number(),
  kickoff_time: z.string(),
  finished: z.boolean(),
  home_score: z.number().nullable().optional(),
  away_score: z.number().nullable().optional(),
  home_team: z.string().nullable().optional(),
  away_team: z.string().nullable().optional(),
  home_short: z.string().nullable().optional(),
  away_short: z.string().nullable().optional(),
  prediction: z.object({
    markets: MarketsSchema.optional(),
    top_scorelines: z.array(z.unknown()).optional(),
    captured_at: z.string().optional(),
  }).passthrough().nullable(),
  bookmaker_odds: z.array(MarketOddsSelectionSchema).default([]),
  correct_score_odds: z.array(MarketOddsSelectionSchema).default([]),
  bookmaker_count: z.number().nullable().optional(),
  bookmaker_source_count: z.number().nullable().optional(),
  market_count: z.number().nullable().optional(),
  edge_research: z.object({
    status: z.string(),
    model_effect_enabled: z.boolean(),
    observation_count: z.number().int().nonnegative(),
    robust_positive_ev_count: z.number().int().nonnegative(),
    top_robust_positive_ev: z.array(z.unknown()),
  }).passthrough().nullable().optional(),
  price_tracking: z.unknown().nullable().optional(),
  clv_research: z.object({
    status: z.string(),
    model_effect_enabled: z.boolean(),
    observation_count: z.number().int().nonnegative(),
  }).passthrough().nullable().optional(),
}).passthrough();

export const BettingApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  odds_status: z.string(),
  value_edge_available: z.boolean(),
  research_edge_available: z.boolean(),
  price_tracking_available: z.boolean(),
  clv_research_available: z.boolean(),
  warnings: z.array(z.string()).default([]),
  fixtures: z.array(BettingFixtureSchema),
}).passthrough();

const ValidationVariantSchema = z.object({
  variant_key: z.string(),
  split: z.string(),
  total_predictions: z.number().int().nonnegative().optional(),
  evaluated_fixtures: z.number().int().nonnegative().optional(),
  pending_fixtures: z.number().int().nonnegative().optional(),
  avg_brier: NullableNumber,
  avg_score_log_loss: NullableNumber,
  direction_accuracy: NullableNumber,
  exact_top_score_rate: NullableNumber,
  avg_process_mae: NullableNumber,
  avg_gap_error: NullableNumber,
}).passthrough();

const ForwardValidationSchema = z.object({
  available: z.boolean(),
  selected_ablation_key: z.string().optional(),
  coverage: z.object({
    predictions: z.number().int().nonnegative().optional(),
    evaluations: z.number().int().nonnegative().optional(),
    cohort_fixtures: z.number().int().nonnegative().optional(),
    splits: z.array(z.object({
      split: z.string(),
      gameweek: z.number().nullable().optional(),
      fixtures: z.number().int().nonnegative(),
    }).passthrough()).optional(),
  }).passthrough().optional(),
  integrity: z.record(z.string(), z.unknown()).optional(),
  variants: z.array(ValidationVariantSchema).optional(),
  latest_promotion_gate: z.unknown().nullable().optional(),
}).passthrough();

export const CalibrationSummarySchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  active_model: z.string(),
  active_generated_at: z.string().nullable().optional(),
  frozen_prediction_run_id: z.number().nullable().optional(),
  summary: z.object({
    frozen_xi_xpts: NullableNumber,
    current_xi_xpts: NullableNumber,
    benchmark_xi_xpts: NullableNumber,
    benchmark_xi_matched: z.number().int().nonnegative().nullable().optional(),
    matched_players: z.number().int().nonnegative().optional(),
    mae: NullableNumber,
    bias: NullableNumber,
  }).passthrough(),
  validation: z.object({
    forward: ForwardValidationSchema,
    retrospective: z.array(z.object({
      gameweek: z.number().int().min(1).max(38),
      evaluated_fixtures: z.number().int().nonnegative(),
      direction_accuracy: NullableNumber,
      exact_top_score_rate: NullableNumber,
      avg_brier: NullableNumber,
      avg_score_log_loss: NullableNumber,
    }).passthrough()),
  }).passthrough(),
}).passthrough();

const GovernanceSchema = z.object({
  ok: z.boolean(),
  total_rows: z.number().int().nonnegative(),
  decision_rows: z.number().int().nonnegative(),
  bad_change_ids: z.number().int().nonnegative(),
  completed_not_verified: z.number().int().nonnegative(),
  completed_without_refs: z.number().int().nonnegative(),
  decision_rows_without_refs: z.number().int().nonnegative(),
}).passthrough();

const AuditSchema = z.object({
  ok: z.boolean().optional(),
}).passthrough();

const ForwardStatusSchema = z.object({
  ok: z.boolean(),
  decision_state: z.string().optional(),
  coverage: z.unknown().optional(),
  integrity: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

export const EngineDiagnosticsSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  generated_at: z.string(),
  active_model: z.object({
    id: z.number(),
    version: z.string(),
    description: z.string().nullable().optional(),
    is_active: z.boolean(),
    created_at: z.string(),
    config: z.unknown().optional(),
  }).passthrough().nullable(),
  latest_prediction_run: z.object({
    id: z.number(),
    gameweek: z.number().int().min(1).max(38),
    generated_at: z.string(),
    run_type: z.string(),
    frozen: z.boolean(),
    excluded_from_backtest: z.boolean(),
  }).passthrough().nullable(),
  production_fixture_layer: z.object({
    fixtures: z.number().int().nonnegative(),
    latest_snapshot_id: z.number().nullable(),
    latest_captured_at: z.string().nullable(),
    change_ids: z.array(z.string()),
  }).passthrough(),
  governance: GovernanceSchema,
  decision_evidence_audit: AuditSchema,
  production_evidence_audit: AuditSchema,
  experiments: z.object({
    A0005: ForwardStatusSchema,
    W0002: ForwardStatusSchema,
  }).passthrough(),
  source_health: z.object({
    zero_cost: z.object({
      change_id: z.string(),
      sources: z.array(z.unknown()),
      integrity_violations: z.record(z.string(), z.number()).optional(),
    }).passthrough(),
    fotmob_metrics: z.object({
      change_id: z.string(),
      rows: z.number().int().nonnegative(),
      usable_rows: z.number().int().nonnegative(),
      integrity_violations: z.record(z.string(), z.number()).optional(),
    }).passthrough(),
    physical_load: z.object({
      change_id: z.string(),
      rows: z.number().int().nonnegative(),
      latest_teams: z.number().int().nonnegative(),
      integrity_violations: z.record(z.string(), z.number()).optional(),
    }).passthrough(),
  }).passthrough(),
  semantics: z.object({
    research_statuses_are_not_production_effects: z.literal(true),
    missing_is_not_zero: z.literal(true),
    immutable_historical_forecasts_preserved: z.literal(true),
  }),
}).passthrough();

export type BettingApi = z.infer<typeof BettingApiSchema>;
export type BettingFixture = z.infer<typeof BettingFixtureSchema>;
export type CalibrationSummary = z.infer<typeof CalibrationSummarySchema>;
export type EngineDiagnostics = z.infer<typeof EngineDiagnosticsSchema>;
