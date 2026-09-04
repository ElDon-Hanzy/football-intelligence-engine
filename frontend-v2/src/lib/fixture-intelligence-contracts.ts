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

const HighScoreAvailableSchema = z.object({
  available: z.literal(true),
  source_change_id: z.literal('C0197'),
  frozen_at: z.string().nullable(),
  prediction_semantics: z.literal('research_high_score_archetype_not_probability'),
  archetype: HighScoreArchetypeSchema,
  strength: HighScoreStrengthSchema,
  agreement: HighScoreAgreementSchema,
  note: z.string().min(1),
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
  research_only: z.literal(true),
  model_effect_enabled: z.literal(false),
}).passthrough();

const HighScoreUnavailableSchema = z.object({
  available: z.literal(false),
  reason: z.string().min(1),
  research_only: z.literal(true),
  model_effect_enabled: z.literal(false),
}).passthrough();

export const HighScoreIntelligenceSchema = z.discriminatedUnion('available', [HighScoreAvailableSchema, HighScoreUnavailableSchema]);

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
