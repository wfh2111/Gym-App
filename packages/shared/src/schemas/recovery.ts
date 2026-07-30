import { z } from 'zod';
import { RecoverySourceSchema } from './enums';

export const NormalizedRecoveryDatumSchema = z.object({
  date: z.string().describe('YYYY-MM-DD, day granularity'),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQualityScore: z.number().min(0).max(100).optional(),
  hrvMs: z.number().nonnegative().optional(),
  restingHeartRate: z.number().nonnegative().optional(),
  recoveryScore: z.number().min(0).max(100).optional(),
});
export type NormalizedRecoveryDatum = z.infer<typeof NormalizedRecoveryDatumSchema>;

export const LogManualRecoveryInputSchema = z.object({
  date: z.string().describe('YYYY-MM-DD'),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQualityScore: z.number().min(0).max(100).optional(),
});
export type LogManualRecoveryInput = z.infer<typeof LogManualRecoveryInputSchema>;

export const SyncRecoveryInputSchema = z.object({
  data: z.array(NormalizedRecoveryDatumSchema).min(1).max(90),
  source: RecoverySourceSchema,
});
export type SyncRecoveryInput = z.infer<typeof SyncRecoveryInputSchema>;
