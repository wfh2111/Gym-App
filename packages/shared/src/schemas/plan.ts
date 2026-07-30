import { z } from 'zod';
import { SupplementCategorySchema } from './enums';

export const NutritionTargetSchema = z.object({
  calories: z.number().int().positive(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
  mealsPerDay: z.number().int().min(1).max(8),
  mealTimingNotes: z.string(),
});
export type NutritionTarget = z.infer<typeof NutritionTargetSchema>;

export const ProgressionRuleSchema = z.object({
  type: z.enum(['double_progression', 'linear_load', 'rpe_autoregulated']),
  incrementKg: z.number().positive(),
  repRangeLow: z.number().int().optional(),
  repRangeHigh: z.number().int().optional(),
});
export type ProgressionRule = z.infer<typeof ProgressionRuleSchema>;

export const PrescribedExerciseSchema = z.object({
  order: z.number().int(),
  exerciseName: z.string(),
  targetSets: z.number().int().min(1).max(10),
  targetRepLow: z.number().int().min(1),
  targetRepHigh: z.number().int().min(1),
  targetRIR: z.number().int().min(0).max(5).optional(),
  restSeconds: z.number().int().min(15).max(600).optional(),
  progressionRule: ProgressionRuleSchema.optional(),
});
export type PrescribedExercise = z.infer<typeof PrescribedExerciseSchema>;

export const TrainingDaySchema = z.object({
  dayIndex: z.number().int().min(0).max(6),
  label: z.string(),
  focus: z.string().optional(),
  isRestDay: z.boolean(),
  exercises: z.array(PrescribedExerciseSchema),
});
export type TrainingDay = z.infer<typeof TrainingDaySchema>;

export const TrainingProgramSchema = z.object({
  splitType: z.string().describe('e.g. "Upper/Lower", "Push/Pull/Legs", "Full Body"'),
  notes: z.string().optional(),
  days: z.array(TrainingDaySchema).length(7).describe('Exactly 7 entries, dayIndex 0-6, rest days included with isRestDay=true and an empty exercises array.'),
});
export type TrainingProgram = z.infer<typeof TrainingProgramSchema>;

export const RecoveryProtocolSchema = z.object({
  sleepTargetHours: z.number().min(4).max(12),
  deloadCadenceWeeks: z.number().int().min(3).max(12),
  mobilityRoutineNotes: z.string(),
});
export type RecoveryProtocol = z.infer<typeof RecoveryProtocolSchema>;

export const SUPPLEMENT_DISCLAIMER =
  'General information only, not medical advice. Consult a qualified healthcare provider before starting any supplement, especially if you take medication or have a medical condition.';

export const SupplementSuggestionSchema = z.object({
  category: SupplementCategorySchema,
  rationale: z.string(),
});
export type SupplementSuggestion = z.infer<typeof SupplementSuggestionSchema>;

/**
 * Forced tool-use schema for weekly plan generation. One call produces every part of the plan
 * (nutrition, training, recovery, supplements) so the four sections stay mutually consistent -
 * e.g. training volume and nutrition targets reflect the same recovery/adherence inputs.
 */
export const GeneratePlanToolSchema = z.object({
  rationale: z
    .string()
    .describe('2-4 sentences, written to the user, on why this plan fits them right now.'),
  nutritionTarget: NutritionTargetSchema,
  trainingProgram: TrainingProgramSchema,
  recoveryProtocol: RecoveryProtocolSchema,
  supplementSuggestions: z.array(SupplementSuggestionSchema).max(6),
});
export type GeneratePlanToolInput = z.infer<typeof GeneratePlanToolSchema>;
