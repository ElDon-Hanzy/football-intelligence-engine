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
  expected_points: z.number().nullable().optional(),
  expected_minutes: z.number().nullable().optional(),
  p_10_plus: z.number().min(0).max(1).nullable().optional(),
  p_15_plus: z.number().min(0).max(1).nullable().optional(),
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
  finished: z.boolean(),
  prediction: FixturePredictionSchema.nullable(),
}).passthrough();

export const FplApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38).optional(),
  model_version: z.string().optional(),
  current_model_version: z.string().nullable().optional(),
  generated_at: z.string().optional(),
  decision: FplDecisionSnapshotSchema.nullable().optional(),
  squad: z.array(PlayerSchema).optional().default([]),
  fixture_results: z.array(FplFixtureResultSchema).optional().default([]),
}).passthrough();

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

export const ManagerPlanApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38).nullable(),
  available_gameweeks: z.array(z.number().int().min(1).max(38)),
  plan: ManagerPlanSchema.nullable(),
}).passthrough();

export type Fixture = z.infer<typeof FixtureSchema>;
export type FixtureApi = z.infer<typeof FixtureApiSchema>;
export type FplApi = z.infer<typeof FplApiSchema>;
export type FplFixtureResult = z.infer<typeof FplFixtureResultSchema>;
export type ManagerPlan = z.infer<typeof ManagerPlanSchema>;
export type ManagerPlanApi = z.infer<typeof ManagerPlanApiSchema>;
export type Player = z.infer<typeof PlayerSchema>;
