import { z } from 'zod';
import { MealTypeSchema, NutritionSourceSchema } from './enums';

export const LogMealInputSchema = z
  .object({
    mealType: MealTypeSchema,
    source: NutritionSourceSchema,
    text: z.string().optional(),
    photoBase64: z.string().optional(),
    photoMediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']).optional(),
    barcode: z.string().optional(),
    loggedAt: z.string().datetime().optional(),
  })
  .refine(
    (v) =>
      (v.source === 'TEXT' && !!v.text) ||
      (v.source === 'PHOTO' && !!v.photoBase64) ||
      (v.source === 'BARCODE' && !!v.barcode) ||
      v.source === 'MANUAL',
    { message: 'Missing payload for the given source' },
  );
export type LogMealInput = z.infer<typeof LogMealInputSchema>;

export const ManualMealInputSchema = z.object({
  mealType: MealTypeSchema,
  description: z.string().min(1),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
  loggedAt: z.string().datetime().optional(),
});
export type ManualMealInput = z.infer<typeof ManualMealInputSchema>;

/** LLM tool schema used to turn free text or a food photo into a macro estimate. */
export const ExtractMealToolSchema = z.object({
  description: z
    .string()
    .describe('Short human-readable summary, e.g. "Grilled chicken breast, rice, broccoli".'),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
  confidence: z.number().min(0).max(1).describe('Model confidence in the estimate, 0-1.'),
});
export type ExtractMealToolInput = z.infer<typeof ExtractMealToolSchema>;

/** Open Food Facts product lookup result, normalized to per-serving macros. */
export const BarcodeProductSchema = z.object({
  barcode: z.string(),
  name: z.string(),
  servingDescription: z.string().optional(),
  calories: z.number().int().nonnegative(),
  proteinG: z.number().int().nonnegative(),
  carbsG: z.number().int().nonnegative(),
  fatG: z.number().int().nonnegative(),
});
export type BarcodeProduct = z.infer<typeof BarcodeProductSchema>;
