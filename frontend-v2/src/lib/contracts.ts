import { z } from 'zod';

export const TeamSchema = z.object({ id: z.number(), name: z.string().min(1), short_name: z.string().min(1).optional() }).passthrough();
export const MarketsSchema = z.object({ home_win: z.number().min(0).max(1), draw: z.number().min(0).max(1), away_win: z.number().min(0).max(1) }).passthrough();
export const ScorelineSchema = z.object({ score: z.string().regex(/^\d+-\d+$/), prob: z.number().min(0).max(1) });
export const FixturePredictionSchema = z.object({ markets: MarketsSchema, home_lambda: z.number().nonnegative(), away_lambda: z.number().nonnegative(), headline_score: z.string().regex(/^\d+-\d+$/).nullable().optional(), headline_score_probability: z.number().min(0).max(1).nullable().optional(), raw_modal_score: z.string().regex(/^\d+-\d+$/).nullable().optional(), top_scorelines: z.array(ScorelineSchema).default([]) }).passthrough();
export const FixtureSchema = z.object({ match_id: z.number(), kickoff_time: z.string().datetime({ offset: true }), finished: z.boolean(), home_team: TeamSchema, away_team: TeamSchema, prediction: FixturePredictionSchema.nullable() }).passthrough();
export const FixtureApiSchema = z.object({ ok: z.literal(true), gameweek: z.number().int().min(1).max(38).optional(), fixtures: z.array(FixtureSchema) }).passthrough();
export const PlayerSchema = z.object({ id: z.number(), name: z.string().min(1), team: z.string().optional(), position: z.string().optional(), expected_points: z.number().nullable().optional(), expected_minutes: z.number().nullable().optional(), p_10_plus: z.number().min(0).max(1).nullable().optional(), p_15_plus: z.number().min(0).max(1).nullable().optional() }).passthrough();
export const FplDecisionSchema = z.object({ captain_player_id: z.number().nullable().optional(), vice_player_id: z.number().nullable().optional(), transfers: z.array(z.unknown()).optional().default([]), chip: z.string().nullable().optional(), risk_level: z.string().nullable().optional(), free_transfers: z.number().int().nonnegative().nullable().optional(), status: z.string().nullable().optional() }).passthrough();
export const FplApiSchema = z.object({ ok: z.literal(true), gameweek: z.number().int().min(1).max(38).optional(), model_version: z.string().optional(), generated_at: z.string().optional(), deadline_time: z.string().optional(), decision: FplDecisionSchema.nullable().optional(), squad: z.array(PlayerSchema).optional().default([]) }).passthrough();
export type Fixture = z.infer<typeof FixtureSchema>;
export type FixtureApi = z.infer<typeof FixtureApiSchema>;
export type FplApi = z.infer<typeof FplApiSchema>;
export type Player = z.infer<typeof PlayerSchema>;
