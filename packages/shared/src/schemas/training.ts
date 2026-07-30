import { z } from 'zod';

export const StartWorkoutInputSchema = z.object({
  trainingDayId: z.string().optional(),
  planVersionId: z.string().optional(),
});
export type StartWorkoutInput = z.infer<typeof StartWorkoutInputSchema>;

export const LogSetInputSchema = z.object({
  exerciseName: z.string().min(1),
  setIndex: z.number().int().min(0),
  weightKg: z.number().nonnegative().optional(),
  reps: z.number().int().min(0).optional(),
  rpe: z.number().min(0).max(10).optional(),
  isWarmup: z.boolean().optional(),
});
export type LogSetInput = z.infer<typeof LogSetInputSchema>;

export const CompleteWorkoutInputSchema = z.object({
  notes: z.string().optional(),
});
export type CompleteWorkoutInput = z.infer<typeof CompleteWorkoutInputSchema>;

export const ProgressionSuggestionSchema = z.object({
  exerciseName: z.string(),
  action: z.enum(['increase_weight', 'hold', 'add_rep', 'deload']),
  detail: z.string(),
  suggestedWeightKg: z.number().nonnegative().optional(),
});
export type ProgressionSuggestion = z.infer<typeof ProgressionSuggestionSchema>;
