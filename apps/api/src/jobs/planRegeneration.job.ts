import { prisma } from '../lib/prisma';
import { startOfWeek } from '../lib/date';
import { persistWeeklyAdherenceSnapshot } from '../services/adherence.service';
import { generatePlan } from '../services/llm/planGeneration.service';
import { syncAllConnections } from './recoverySync.job';

export interface PlanRegenerationResult {
  usersProcessed: number;
  usersFailed: number;
}

/**
 * Weekly regeneration for Premium users only - matches the monetization design (full adaptive
 * plan + wearable-informed adjustments are paid features). Free users still get their plan
 * updated, but only by going through the weekly check-in chat, not this automatic job.
 */
export async function regenerateAllPlans(): Promise<PlanRegenerationResult> {
  await syncAllConnections();

  const subscriptions = await prisma.subscription.findMany({
    where: { tier: 'PREMIUM', status: 'ACTIVE' },
    select: { userId: true },
  });

  const lastWeekStart = startOfWeek(new Date());
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  let usersProcessed = 0;
  let usersFailed = 0;

  for (const { userId } of subscriptions) {
    try {
      const adherence = await persistWeeklyAdherenceSnapshot(userId, lastWeekStart);
      const adherenceNote = `Last week: ${adherence.nutritionLogDays}/7 days of nutrition logged, ${adherence.workoutsCompleted}/${adherence.workoutsPlanned} planned workouts completed${adherence.avgRecoveryScore ? `, average recovery score ${Math.round(adherence.avgRecoveryScore)}` : ''}.`;
      await generatePlan(userId, { adherenceNote });
      usersProcessed += 1;
    } catch (err) {
      usersFailed += 1;
      console.error(`Weekly plan regeneration failed for user ${userId}:`, err);
    }
  }

  return { usersProcessed, usersFailed };
}
