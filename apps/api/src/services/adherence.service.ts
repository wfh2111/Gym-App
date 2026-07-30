import { prisma } from '../lib/prisma';
import { startOfWeek } from '../lib/date';

export interface WeeklyAdherenceResult {
  weekStartDate: Date;
  nutritionLogDays: number;
  workoutsCompleted: number;
  workoutsPlanned: number;
  avgRecoveryScore: number | null;
  adherencePercent: number;
}

export async function computeWeeklyAdherence(userId: string, weekStart: Date): Promise<WeeklyAdherenceResult> {
  const start = startOfWeek(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const [nutritionLogs, workoutsCompleted, recoveryRows, plan] = await Promise.all([
    prisma.nutritionLog.findMany({
      where: { userId, loggedAt: { gte: start, lt: end } },
      select: { loggedAt: true },
    }),
    prisma.workoutLog.count({ where: { userId, completedAt: { gte: start, lt: end } } }),
    prisma.recoveryData.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: { recoveryScore: true },
    }),
    prisma.planVersion.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { trainingProgram: { include: { days: true } } },
    }),
  ]);

  const nutritionLogDays = new Set(nutritionLogs.map((l) => l.loggedAt.toISOString().slice(0, 10))).size;
  const workoutsPlanned = plan?.trainingProgram?.days.filter((d) => !d.isRestDay).length ?? 0;

  const scores = recoveryRows.map((r) => r.recoveryScore).filter((s): s is number => s !== null);
  const avgRecoveryScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

  const nutritionAdherence = nutritionLogDays / 7;
  const workoutAdherence = workoutsPlanned > 0 ? Math.min(1, workoutsCompleted / workoutsPlanned) : 1;
  const adherencePercent = Math.round(((nutritionAdherence + workoutAdherence) / 2) * 100);

  return {
    weekStartDate: start,
    nutritionLogDays,
    workoutsCompleted,
    workoutsPlanned,
    avgRecoveryScore,
    adherencePercent,
  };
}

export async function persistWeeklyAdherenceSnapshot(userId: string, weekStart: Date) {
  const result = await computeWeeklyAdherence(userId, weekStart);
  return prisma.adherenceSnapshot.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: result.weekStartDate } },
    update: result,
    create: { userId, ...result },
  });
}
