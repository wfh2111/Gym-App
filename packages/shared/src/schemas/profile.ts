import { z } from 'zod';
import {
  DietPatternSchema,
  EquipmentAccessSchema,
  ExperienceLevelSchema,
  GoalSchema,
  SupplementOpennessSchema,
} from './enums';

export const InjurySchema = z.object({
  bodyPart: z.string(),
  description: z.string(),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']).optional(),
});
export type Injury = z.infer<typeof InjurySchema>;

/**
 * The structured user profile. Every field is optional at the type level because it is built
 * incrementally across an onboarding conversation - completeness is tracked separately via
 * ExtractProfileToolSchema.isComplete rather than by widening required fields here.
 */
export const ProfileSchema = z.object({
  goal: GoalSchema.optional(),
  experienceLevel: ExperienceLevelSchema.optional(),
  trainingHistoryNotes: z.string().optional(),
  daysPerWeek: z.number().int().min(1).max(7).optional(),
  sessionDurationMinutes: z.number().int().min(15).max(180).optional(),
  equipmentAccess: EquipmentAccessSchema.optional(),
  dietPattern: DietPatternSchema.optional(),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  heightCm: z.number().positive().optional(),
  currentWeightKg: z.number().positive().optional(),
  targetWeightKg: z.number().positive().optional(),
  sex: z.string().optional(),
  birthYear: z.number().int().min(1900).optional(),
  activityLevel: z.string().optional(),
  sleepHoursAvg: z.number().min(0).max(24).optional(),
  sleepQualityNotes: z.string().optional(),
  injuries: z.array(InjurySchema).optional(),
  supplementOpenness: SupplementOpennessSchema.optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const ONBOARDING_TOPICS = [
  'goal',
  'training_history',
  'equipment_and_schedule',
  'diet',
  'sleep_and_recovery',
  'injuries',
  'supplement_openness',
] as const;

/**
 * Forced tool-use schema for the onboarding extraction call. The model re-emits the full
 * profile (merged with what it already knew) on every turn plus a completeness verdict, so the
 * server never has to diff partial updates itself.
 */
export const ExtractProfileToolSchema = ProfileSchema.extend({
  isComplete: z
    .boolean()
    .describe(
      'True only once there is enough information across goal, training history, equipment/schedule, diet, sleep/recovery, injuries, and supplement openness to generate a real plan. Vague answers ("I sleep fine", "flexible schedule") do not count as complete for that topic.',
    ),
  missingOrVagueTopics: z
    .array(z.enum(ONBOARDING_TOPICS))
    .describe('Topics that still need a natural follow-up question.'),
  followUpQuestion: z
    .string()
    .optional()
    .describe(
      'If not complete, the single next question to ask - conversational, warm, and specific to what is missing or vague. Ask about only one topic at a time.',
    ),
});
export type ExtractProfileToolInput = z.infer<typeof ExtractProfileToolSchema>;
