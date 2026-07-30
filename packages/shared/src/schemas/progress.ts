import { z } from 'zod';

export const LogWeightInputSchema = z.object({
  weightKg: z.number().positive().max(400),
  date: z.string().datetime().optional(),
});
export type LogWeightInput = z.infer<typeof LogWeightInputSchema>;
