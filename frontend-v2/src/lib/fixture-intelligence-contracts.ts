import { z } from 'zod';

const HighScoreRouteSchema = z.enum(['SHOOTOUT', 'DEMOLITION']);
const HighScoreArchetypeSchema = z.enum(['SHOOTOUT', 'DEMOLITION', 'MIXED', 'NO_STRONG_SIGNAL']);
const HighScoreStrengthSchema = z.enum(['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW']);
const HighScoreAgreementSchema = z.enum(['HIGH', 'MEDIUM', 'LOW']);

const HighScoreVariantSchema = z.object({
  variant_key: z.string().min(1),
  route: HighScoreRouteSchema.nullable(),
  score: z.number().nullable(),
  rank: z.number().int().positive().nullable(),
  favorite: z.string().nullable(),
  favorite_probability: z.number().min(0).max(1).nullable(),
}).passthrough();

const HighScoreCommonSchema = z.object({
  available: z.literal(true),
  source_change_id: z.literal('C0197'),
  frozen_at: z.string().nullable(),
  archetype: HighScoreArchetypeSchema,
  strength: HighScoreStrengthSchema,
  agreement: HighScoreAgreementSchema,
  note: z.string().min(1),
  research_only: z.literal(true),
  model_effect_enabled: z.literal(false),
});

const HighScoreRouterSchema = HighScoreCommonSchema.extend({
  mode: z.literal('ARCHETYPE_ROUTER').default('ARCHETYPE_ROUTER'),
  prediction_semantics: z.literal('research_high_score_archetype_not_probability'),
  router: z.object({
    structural: HighScoreVariantSchema,
    disruption: HighScoreVariantSchema,
  }).passthrough(),
  supporting_models: z.object({
    adaptive_history_rank: z.number().nullable(),
    tactical_clash_rank: z.number().nullable(),
    tactical_clash_confidence: z.number().nullable(),
    attack_unit_rank: z.number().nullable(),
    median_support_rank: z.number().nullable(),
  }).passthrough(),
}).passthrough();

const HighScoreForwardSchema = HighScoreCommonSchema.extend({
  mode: z.literal('SHOOTOUT_FORWARD'),
  prediction_semantics: z.literal('research_shootout_forward_score_not_probability'),
  archetype: z.enum(['SHOOTOUT', 'NO_STRONG_SIGNAL']),
  forward: z.object({
    run_key: z.string().min(1),
    score: z.number().nullable(),
    rank: z.number().int().positive().nullable(),
    confidence: z.enum(['HIGH', 'MEDIUM', 'LOW']),
    base_history_coverage: z.number().min(0).max(1).nullable(),
    breadth_history_coverage: z.number().min(0).max(1).nullable(),
    minimum_history_coverage: z.number().min(0).max(1).nullable(),
  }).passthrough(),
}).passthrough();

const HighScoreUnavailableSchema = z.object({
  available: z.literal(false),
  reason: z.string().min(1),
  research_only: z.literal(true),
  model_effect_enabled: z.literal(false),
}).passthrough();

export const HighScoreIntelligenceSchema = z.union([HighScoreRouterSchema, HighScoreForwardSchema, HighScoreUnavailableSchema]);

export const FixtureIntelligenceItemSchema = z.object({
  match_id: z.number(),
  gameweek: z.number().int().min(1).max(38),
  kickoff_time: z.string(),
  high_score_intelligence: HighScoreIntelligenceSchema,
}).passthrough();

export const FixtureIntelligenceApiSchema = z.object({
  ok: z.literal(true),
  gameweek: z.number().int().min(1).max(38),
  available_gameweeks: z.array(z.number().int().min(1).max(38)),
  research_only: z.literal(true),
  model_effect_enabled: z.literal(false),
  contract_version: z.string().min(1),
  fixtures: z.array(FixtureIntelligenceItemSchema),
}).passthrough();

export type HighScoreIntelligence = z.infer<typeof HighScoreIntelligenceSchema>;
export type FixtureIntelligenceApi = z.infer<typeof FixtureIntelligenceApiSchema>;
export type FixtureIntelligenceItem = z.infer<typeof FixtureIntelligenceItemSchema>;
