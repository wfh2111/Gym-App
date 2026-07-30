import type { LogWeightInput, ProgressMetric, ProgressTrendPointDTO, ProgressTrendsDTO } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { startOfDay } from '../lib/date';

export function parseRange(range: string | undefined): Date {
  const since = new Date();
  const match = /^(\d+)([dwy])$/.exec(range ?? '90d');
  const [, amountStr, unit] = match ?? [undefined, '90', 'd'];
  const amount = Number(amountStr);

  if (unit === 'w') since.setDate(since.getDate() - amount * 7);
  else if (unit === 'y') since.setFullYear(since.getFullYear() - amount);
  else since.setDate(since.getDate() - amount);

  return since;
}

function dateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

export async function logWeight(userId: string, input: LogWeightInput) {
  const date = startOfDay(input.date ? new Date(input.date) : new Date());
  return prisma.bodyMetricLog.upsert({
    where: { userId_date: { userId, date } },
    update: { weightKg: input.weightKg },
    create: { userId, date, weightKg: input.weightKg },
  });
}

async function getWeightTrend(userId: string, since: Date): Promise<ProgressTrendPointDTO[]> {
  const logs = await prisma.bodyMetricLog.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });
  return logs.map((l) => ({ date: dateKey(l.date), value: l.weightKg }));
}

async function getStrengthTrend(userId: string, since: Date): Promise<ProgressTrendPointDTO[]> {
  const grouped = await prisma.workoutSet.groupBy({
    by: ['exerciseName'],
    where: { isWarmup: false, weightKg: { not: null }, workoutLog: { userId, completedAt: { not: null } } },
    _count: { exerciseName: true },
    orderBy: { _count: { exerciseName: 'desc' } },
    take: 1,
  });

  const exerciseName = grouped[0]?.exerciseName;
  if (!exerciseName) return [];

  const sets = await prisma.workoutSet.findMany({
    where: {
      exerciseName,
      isWarmup: false,
      weightKg: { not: null },
      workoutLog: { userId, completedAt: { gte: since, not: null } },
    },
    include: { workoutLog: { select: { completedAt: true } } },
  });

  const byDay = new Map<string, number>();
  for (const s of sets) {
    if (!s.workoutLog.completedAt || s.weightKg === null) continue;
    const key = dateKey(s.workoutLog.completedAt);
    byDay.set(key, Math.max(byDay.get(key) ?? 0, s.weightKg));
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value, label: exerciseName }));
}

async function getRecoveryTrend(userId: string, since: Date): Promise<ProgressTrendPointDTO[]> {
  const rows = await prisma.recoveryData.findMany({
    where: { userId, date: { gte: since }, recoveryScore: { not: null } },
    orderBy: { date: 'asc' },
  });

  const byDay = new Map<string, number[]>();
  for (const r of rows) {
    if (r.recoveryScore === null) continue;
    const key = dateKey(r.date);
    const existing = byDay.get(key) ?? [];
    existing.push(r.recoveryScore);
    byDay.set(key, existing);
  }

  return Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, scores]) => ({ date, value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) }));
}

async function getAdherenceTrend(userId: string, since: Date): Promise<ProgressTrendPointDTO[]> {
  const rows = await prisma.adherenceSnapshot.findMany({
    where: { userId, weekStartDate: { gte: since } },
    orderBy: { weekStartDate: 'asc' },
  });
  return rows.map((r) => ({ date: dateKey(r.weekStartDate), value: r.adherencePercent }));
}

export async function getTrends(userId: string, metric: ProgressMetric, range: string | undefined): Promise<ProgressTrendsDTO> {
  const since = parseRange(range);

  const points = await (async () => {
    switch (metric) {
      case 'weight':
        return getWeightTrend(userId, since);
      case 'strength':
        return getStrengthTrend(userId, since);
      case 'recovery':
        return getRecoveryTrend(userId, since);
      case 'adherence':
        return getAdherenceTrend(userId, since);
      default:
        return [];
    }
  })();

  return { metric, points };
}
