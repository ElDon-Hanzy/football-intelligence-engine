import { z } from 'zod';

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  short_name: z.string().min(1).optional(),
}).passthrough();

export const MarketsSchema = z.object({
  home_win: z.number().min(0).max(1),
  draw: z.number().min(0).max(1),
  away_win: z.number().min(0).max(1),
}).passthrough();

export const ScorelineSchema = z.object({
  score: z.string().regex(/^\d+-\d+$/),
  prob: z.number().min(0).max(1),
});

export const FixturePredictionSchema = z.object({
  snapshot_id: z.number().int().positive().optional(),
  source_change_id: z.string().nullable().optional(),
  captured_at: z.string().optional(),
  markets: MarketsSchema.optional(),
  home_lambda: z.number().nonnegative().optional(),
  away_lambda: z.number().nonnegative().optional(),
  headline_score: z.string().regex(/^\d+-\d+$/).nullable().optional(),
  headline_score_probability: z.number().min(0).max(1).nullable().optional(),
  raw_modal_score: z.string().regex(/^\d+-\d+$/).nullable().optional(),
  top_scorelines: z.array(ScorelineSchema).optional(),
}).passthrough();

export const FixtureSchema = z.object({
  match_id: z.number(),
  kickoff_time: z.string(),
  finished: z.boolean(),
  home_team: TeamSchema,
  away_team: TeamSchema,
  prediction: FixturePredictionSchema.nullable().optional(),
}).passthrough();

export const FixtureApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38).optional(),
  fixtures: z.array(FixtureSchema),
}).passthrough();

export const PlayerSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  team: z.string().optional(),
  position: z.string().optional(),
  price_tenths: z.number().int().nonnegative().nullable().optional(),
  price: z.number().nonnegative().nullable().optional(),
  ownership_percent: z.number().min(0).max(100).nullable().optional(),
  fpl_status: z.string().nullable().optional(),
  chance_of_playing_next_round: z.number().min(0).max(100).nullable().optional(),
  news: z.string().optional(),
  player_metadata_updated_at: z.string().nullable().optional(),
  expected_points: z.number().nullable().optional(),
  expected_minutes: z.number().nullable().optional(),
  p_blank: z.number().min(0).max(1).nullable().optional(),
  p_5_plus: z.number().min(0).max(1).nullable().optional(),
  p_10_plus: z.number().min(0).max(1).nullable().optional(),
  p_15_plus: z.number().min(0).max(1).nullable().optional(),
  p_20_plus: z.number().min(0).max(1).nullable().optional(),
  q90: z.number().nonnegative().nullable().optional(),
  q95: z.number().nonnegative().nullable().optional(),
  distribution_version: z.string().nullable().optional(),
  tail_semantics: z.string().nullable().optional(),
}).passthrough();

export const FplDecisionSnapshotSchema = z.object({
  captain_player_id: z.number().nullable().optional(),
  vice_player_id: z.number().nullable().optional(),
  starting_xi: z.array(z.unknown()).optional(),
  bench: z.array(z.unknown()).optional(),
  recommendations: z.unknown().optional(),
}).passthrough();

export const FplFixtureResultSchema = z.object({
  match_id: z.number(),
  kickoff_time: z.string(),
  home_team: z.string().nullable(),
  away_team: z.string().nullable(),
  home_short: z.string().nullable().optional(),
  away_short: z.string().nullable().optional(),
  finished: z.boolean(),
  home_score: z.number().nullable().optional(),
  away_score: z.number().nullable().optional(),
  prediction: FixturePredictionSchema.nullable(),
}).passthrough();

export const FplApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38).optional(),
  prediction_run_id: z.number().int().positive().optional(),
  model_version: z.string().optional(),
  current_model_version: z.string().nullable().optional(),
  generated_at: z.string().optional(),
  run_type: z.string().optional(),
  decision: FplDecisionSnapshotSchema.nullable().optional(),
  squad: z.array(PlayerSchema).optional().default([]),
  all_predictions: z.array(PlayerSchema).optional().default([]),
  top_double_digit: z.array(PlayerSchema).optional().default([]),
  fixture_results: z.array(FplFixtureResultSchema).optional().default([]),
}).passthrough();

const FactAlignmentSchema = z.enum(['SUPPORTS', 'CONTRADICTS', 'NEUTRAL']);
const OutcomeCodeSchema = z.enum(['H', 'D', 'A']);

export const RecentTeamResultSchema = z.object({
  team_id: z.number(),
  sequence_no: z.number().int().positive(),
  opponent_team_id: z.number().nullable(),
  opponent_name: z.string().nullable().optional(),
  opponent_short: z.string().nullable().optional(),
  fixture_kickoff: z.string(),
  venue: z.string().nullable().optional(),
  goals_for: z.number().int().nonnegative(),
  goals_against: z.number().int().nonnegative(),
  result: z.enum(['W', 'D', 'L']),
}).passthrough();

export const FixtureFactSchema = z.object({
  id: z.number(),
  snapshot_run_id: z.number(),
  match_id: z.number(),
  team_id: z.number(),
  opponent_team_id: z.number(),
  fact_type: z.string().min(1),
  usefulness_score: z.number(),
  card_rank: z.number().int().positive().nullable().optional(),
  alignment: FactAlignmentSchema,
  one_liner: z.string().min(1),
  payload: z.unknown().optional(),
  evidence_cutoff: z.string(),
}).passthrough();

export const FixtureFactsTeamSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  short_name: z.string().nullable(),
  recent: z.array(RecentTeamResultSchema),
}).passthrough();

export const FixtureAlignmentBasisSchema = z.object({
  snapshot_id: z.number().int().positive(),
  captured_at: z.string(),
  source_change_id: z.string().nullable(),
  top_outcome: OutcomeCodeSchema.nullable(),
  markets: MarketsSchema,
}).passthrough();

export const FixtureFactsItemSchema = z.object({
  match_id: z.number(),
  gameweek: z.number().int().min(1).max(38),
  kickoff_time: z.string(),
  home: FixtureFactsTeamSchema,
  away: FixtureFactsTeamSchema,
  alignment_basis: FixtureAlignmentBasisSchema.nullable(),
  card_facts: z.array(FixtureFactSchema),
  modal_facts: z.array(FixtureFactSchema),
}).passthrough();

const FixtureFactsAvailableSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  facts_available: z.literal(true),
  evidence_source: z.string(),
  snapshot_run: z.object({ id: z.number(), as_of_gameweek: z.number().int().nonnegative() }).passthrough(),
  fixtures: z.array(FixtureFactsItemSchema),
}).passthrough();

const FixtureFactsUnavailableSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  facts_available: z.literal(false),
  reason: z.string().min(1),
}).passthrough();

export const FixtureFactsApiSchema = z.discriminatedUnion('facts_available', [FixtureFactsAvailableSchema, FixtureFactsUnavailableSchema]);

const ManagerPlanSelectionSchema = z.union([
  z.number(),
  z.object({ id: z.number() }).passthrough(),
]);

export const ManagerPlanSchema = z.object({
  id: z.number(),
  gameweek: z.number().int().min(1).max(38),
  captured_at: z.string(),
  status: z.string(),
  horizon: z.string().nullable().optional(),
  transfers: z.array(z.unknown()),
  captain_player_id: z.number().nullable(),
  vice_player_id: z.number().nullable(),
  starting_xi: z.array(ManagerPlanSelectionSchema),
  bench_order: z.array(ManagerPlanSelectionSchema),
  chip: z.string().nullable(),
  gw_expected_xi_points: z.union([z.string(), z.number()]).nullable().optional(),
  expected_gain_current_gw: z.union([z.string(), z.number()]).nullable().optional(),
  expected_gain_horizon: z.union([z.string(), z.number()]).nullable().optional(),
  risk_level: z.string().nullable(),
  rationale: z.unknown().nullable().optional(),
  source: z.string().nullable().optional(),
  supersedes_id: z.number().nullable().optional(),
}).passthrough();

export const ManagerStateSchema = z.object({
  id: z.number().int().positive(),
  gameweek: z.number().int().min(1).max(38),
  captured_at: z.string(),
  free_transfers: z.number().int().min(0).max(10).nullable(),
  bank_tenths: z.number().int().nonnegative().nullable(),
  acquisition_squad_cost_tenths: z.number().int().nonnegative().nullable(),
  source: z.string().min(1),
  evidence: z.unknown(),
}).passthrough();

export const ActualManagerDecisionSchema = z.object({
  id: z.number().int().positive(),
  gameweek: z.number().int().min(1).max(38),
  captured_at: z.string(),
  captain_player_id: z.number().nullable(),
  vice_player_id: z.number().nullable(),
  starting_xi: z.array(ManagerPlanSelectionSchema).nullable().optional(),
  bench_order: z.array(ManagerPlanSelectionSchema).nullable().optional(),
  chip: z.string().nullable(),
  source: z.string().min(1),
  notes: z.string().nullable().optional(),
  correction_of_id: z.number().nullable().optional(),
}).passthrough();

export const ManagerPlanApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38).nullable(),
  available_gameweeks: z.array(z.number().int().min(1).max(38)),
  plan: ManagerPlanSchema.nullable(),
  manager_state: ManagerStateSchema.nullable().optional(),
  actual_manager_decision: ActualManagerDecisionSchema.nullable().optional(),
}).passthrough();

export type Fixture = z.infer<typeof FixtureSchema>;
export type FixtureApi = z.infer<typeof FixtureApiSchema>;
export type FplApi = z.infer<typeof FplApiSchema>;
export type FplFixtureResult = z.infer<typeof FplFixtureResultSchema>;
export type FixtureFact = z.infer<typeof FixtureFactSchema>;
export type FixtureFactsApi = z.infer<typeof FixtureFactsApiSchema>;
export type FixtureFactsItem = z.infer<typeof FixtureFactsItemSchema>;
export type ManagerPlan = z.infer<typeof ManagerPlanSchema>;
export type ManagerState = z.infer<typeof ManagerStateSchema>;
export type ActualManagerDecision = z.infer<typeof ActualManagerDecisionSchema>;
export type ManagerPlanApi = z.infer<typeof ManagerPlanApiSchema>;
export type Player = z.infer<typeof PlayerSchema>;
