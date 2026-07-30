import type { RecoverySource } from '@prisma/client';
import type { NormalizedRecoveryDatum, LogManualRecoveryInput } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { startOfDay } from '../lib/date';

export async function upsertRecoveryData(
  userId: string,
  source: RecoverySource,
  data: NormalizedRecoveryDatum[],
): Promise<number> {
  for (const datum of data) {
    const date = startOfDay(new Date(datum.date));
    await prisma.recoveryData.upsert({
      where: { userId_date_source: { userId, date, source } },
      update: {
        sleepHours: datum.sleepHours,
        sleepQualityScore: datum.sleepQualityScore,
        hrvMs: datum.hrvMs,
        restingHeartRate: datum.restingHeartRate,
        recoveryScore: datum.recoveryScore,
      },
      create: {
        userId,
        date,
        source,
        sleepHours: datum.sleepHours,
        sleepQualityScore: datum.sleepQualityScore,
        hrvMs: datum.hrvMs,
        restingHeartRate: datum.restingHeartRate,
        recoveryScore: datum.recoveryScore,
      },
    });
  }
  return data.length;
}

export async function logManualRecovery(userId: string, input: LogManualRecoveryInput) {
  const date = startOfDay(new Date(input.date));

  // No manual HRV/resting-heart-rate input, so approximate a recovery score from sleep alone:
  // hours scaled against an 8h target, blended with the user's own quality rating when given.
  const sleepScore = input.sleepHours !== undefined ? Math.min(100, (input.sleepHours / 8) * 100) : undefined;
  const recoveryScore =
    sleepScore !== undefined && input.sleepQualityScore !== undefined
      ? Math.round((sleepScore + input.sleepQualityScore) / 2)
      : (input.sleepQualityScore ?? (sleepScore !== undefined ? Math.round(sleepScore) : undefined));

  return prisma.recoveryData.upsert({
    where: { userId_date_source: { userId, date, source: 'MANUAL' } },
    update: { sleepHours: input.sleepHours, sleepQualityScore: input.sleepQualityScore, recoveryScore },
    create: {
      userId,
      date,
      source: 'MANUAL',
      sleepHours: input.sleepHours,
      sleepQualityScore: input.sleepQualityScore,
      recoveryScore,
    },
  });
}

export async function getTodayRecovery(userId: string) {
  const date = startOfDay(new Date());
  return prisma.recoveryData.findMany({ where: { userId, date } });
}
