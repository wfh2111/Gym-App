import type { MealType, TodayResponseDTO } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { startOfDay } from '../lib/date';
import { getTodayTrainingDay } from './training.service';

const MAX_STREAK_LOOKBACK_DAYS = 90;
const MEAL_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];

function dateKey(date: Date): string {
  return startOfDay(date).toISOString().slice(0, 10);
}

async function computeStreak(userId: string): Promise<number> {
  const lookbackStart = new Date();
  lookbackStart.setDate(lookbackStart.getDate() - MAX_STREAK_LOOKBACK_DAYS);

  const [nutritionLogs, workoutLogs] = await Promise.all([
    prisma.nutritionLog.findMany({ where: { userId, loggedAt: { gte: lookbackStart } }, select: { loggedAt: true } }),
    prisma.workoutLog.findMany({
      where: { userId, completedAt: { gte: lookbackStart } },
      select: { completedAt: true },
    }),
  ]);

  const activeDays = new Set<string>();
  for (const log of nutritionLogs) activeDays.add(dateKey(log.loggedAt));
  for (const log of workoutLogs) if (log.completedAt) activeDays.add(dateKey(log.completedAt));

  let streak = 0;
  const cursor = startOfDay(new Date());
  for (let i = 0; i < MAX_STREAK_LOOKBACK_DAYS; i++) {
    const active = activeDays.has(dateKey(cursor));
    if (active) {
      streak += 1;
    } else if (i > 0) {
      // A day with no activity breaks the streak - except today (i===0), which just isn't
      // over yet, so it shouldn't zero out a streak that's still intact through yesterday.
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

async function getNextMealHint(userId: string): Promise<TodayResponseDTO['nextMeal']> {
  const [plan, todayLogs] = await Promise.all([
    prisma.planVersion.findFirst({ where: { userId, status: 'ACTIVE' }, include: { nutritionTarget: true } }),
    prisma.nutritionLog.findMany({
      where: { userId, loggedAt: { gte: startOfDay(new Date()) } },
      select: { calories: true, mealType: true },
    }),
  ]);
  if (!plan?.nutritionTarget) return null;

  const consumedCalories = todayLogs.reduce((sum, l) => sum + l.calories, 0);
  const caloriesRemaining = Math.max(0, plan.nutritionTarget.calories - consumedCalories);
  const loggedMealTypes = new Set(todayLogs.map((l) => l.mealType));
  const nextType = MEAL_ORDER.find((t) => !loggedMealTypes.has(t)) ?? 'SNACK';

  return { mealType: nextType, caloriesRemaining };
}

function buildCoachTip(params: {
  streakDays: number;
  training: Awaited<ReturnType<typeof getTodayTrainingDay>>;
  nutritionLoggedToday: boolean;
}): string {
  if (params.streakDays >= 7) {
    return `${params.streakDays}-day streak - you're building real consistency.`;
  }
  if (!params.nutritionLoggedToday) {
    return 'Log your first meal today to keep building momentum.';
  }
  if (params.training?.isRestDay) {
    return 'Rest day - light stretching or a walk helps recovery without adding fatigue.';
  }
  if (params.training && !params.training.activeWorkoutLogId && params.training.exercises.length) {
    return `${params.training.label} is on deck today.`;
  }
  return 'Consistency compounds - small steps today add up.';
}

export async function getTodayDTO(userId: string): Promise<TodayResponseDTO> {
  const [streakDays, training, nextMeal, todayNutritionCount] = await Promise.all([
    computeStreak(userId),
    getTodayTrainingDay(userId),
    getNextMealHint(userId),
    prisma.nutritionLog.count({ where: { userId, loggedAt: { gte: startOfDay(new Date()) } } }),
  ]);

  const coachTip = buildCoachTip({ streakDays, training, nutritionLoggedToday: todayNutritionCount > 0 });

  return { streakDays, nextMeal, training, coachTip };
}
