import { z } from 'zod';

export const TeamSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  short_name: z.string().min(2),
});

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
  markets: MarketsSchema,
  home_lambda: z.number().nonnegative(),
  away_lambda: z.number().nonnegative(),
  headline_score: z.string().regex(/^\d+-\d+$/).nullable().optional(),
  headline_score_probability: z.number().min(0).max(1).nullable().optional(),
  raw_modal_score: z.string().regex(/^\d+-\d+$/).nullable().optional(),
  top_scorelines: z.array(ScorelineSchema).default([]),
});

export const FixtureSchema = z.object({
  match_id: z.number(),
  kickoff_time: z.string().datetime({ offset: true }),
  finished: z.boolean(),
  home_team: TeamSchema,
  away_team: TeamSchema,
  prediction: FixturePredictionSchema.nullable(),
}).passthrough();

export const FixtureApiSchema = z.object({
  ok: z.literal(true),
  fixtures: z.array(FixtureSchema),
}).passthrough();

export type Fixture = z.infer<typeof FixtureSchema>;
export type FixtureApi = z.infer<typeof FixtureApiSchema>;
