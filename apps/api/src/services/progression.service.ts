import { computeDoubleProgression, DEFAULT_PROGRESSION_INCREMENT_KG, type ProgressionSuggestion } from '@gym-app/shared';
import { prisma } from '../lib/prisma';

interface ExerciseForProgression {
  exerciseName: string;
  targetRepLow: number;
  targetRepHigh: number;
  progressionRule: unknown;
}

export async function computeProgressionSuggestion(
  userId: string,
  exercise: ExerciseForProgression,
): Promise<ProgressionSuggestion> {
  const rule = exercise.progressionRule as { incrementKg?: number } | null;
  const incrementKg = rule?.incrementKg ?? DEFAULT_PROGRESSION_INCREMENT_KG;

  const lastSet = await prisma.workoutSet.findFirst({
    where: {
      exerciseName: exercise.exerciseName,
      isWarmup: false,
      completedAt: { not: null },
      workoutLog: { userId },
    },
    orderBy: { completedAt: 'desc' },
    select: { workoutLogId: true },
  });

  if (!lastSet) {
    return {
      exerciseName: exercise.exerciseName,
      action: 'hold',
      detail: 'No logged sets yet - start at the prescribed weight.',
    };
  }

  const sets = await prisma.workoutSet.findMany({
    where: { workoutLogId: lastSet.workoutLogId, exerciseName: exercise.exerciseName, isWarmup: false },
    orderBy: { setIndex: 'asc' },
  });

  return computeDoubleProgression({
    exerciseName: exercise.exerciseName,
    targetRepLow: exercise.targetRepLow,
    targetRepHigh: exercise.targetRepHigh,
    incrementKg,
    lastSessionSets: sets.map((s) => ({ weightKg: s.weightKg, reps: s.reps, rpe: s.rpe })),
  });
}

export async function computeProgressionForDay(
  userId: string,
  exercises: ExerciseForProgression[],
): Promise<Map<string, ProgressionSuggestion>> {
  const suggestions = await Promise.all(exercises.map((ex) => computeProgressionSuggestion(userId, ex)));
  return new Map(suggestions.map((s) => [s.exerciseName, s]));
}
