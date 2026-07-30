import type { ProgressionRule, TodayTrainingDayDTO } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { dayIndexForDate } from '../lib/date';
import { computeProgressionForDay } from './progression.service';

export async function getTodayTrainingDay(userId: string, date: Date = new Date()): Promise<TodayTrainingDayDTO | null> {
  const plan = await prisma.planVersion.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: {
      trainingProgram: {
        include: { days: { include: { exercises: { orderBy: { order: 'asc' } } } } },
      },
    },
  });

  const day = plan?.trainingProgram?.days.find((d) => d.dayIndex === dayIndexForDate(date));
  if (!day) return null;

  const suggestions = await computeProgressionForDay(userId, day.exercises);

  const activeLog = await prisma.workoutLog.findFirst({
    where: { userId, trainingDayId: day.id, completedAt: null },
    orderBy: { startedAt: 'desc' },
  });

  return {
    trainingDayId: day.id,
    label: day.label,
    focus: day.focus ?? null,
    isRestDay: day.isRestDay,
    activeWorkoutLogId: activeLog?.id ?? null,
    exercises: day.exercises.map((ex) => ({
      order: ex.order,
      exerciseName: ex.exerciseName,
      targetSets: ex.targetSets,
      targetRepLow: ex.targetRepLow,
      targetRepHigh: ex.targetRepHigh,
      targetRIR: ex.targetRIR ?? undefined,
      restSeconds: ex.restSeconds ?? undefined,
      progressionRule: (ex.progressionRule as ProgressionRule | null) ?? undefined,
      suggestion: suggestions.get(ex.exerciseName),
    })),
  };
}
