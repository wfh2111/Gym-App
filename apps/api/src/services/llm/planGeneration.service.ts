import type { Profile as ProfileRow } from '@prisma/client';
import {
  GeneratePlanToolSchema,
  DEFAULT_PROGRESSION_INCREMENT_KG,
  estimateTDEE,
  calorieBoundsForGoal,
  proteinBoundsG,
  clamp,
} from '@gym-app/shared';
import { toAnthropicTool } from '@gym-app/shared/llm/toolSchema';
import { prisma } from '../../lib/prisma';
import { startOfWeek } from '../../lib/date';
import { EXTRACTION_MODEL } from './anthropic.client';
import { callWithForcedTool } from './toolCall';
import { planInclude, toPlanVersionDTO, type PlanVersionWithRelations } from '../plan/planQueries';

export class ProfileIncompleteError extends Error {
  constructor() {
    super('Finish onboarding before a plan can be generated.');
    this.name = 'ProfileIncompleteError';
  }
}

const GENERATE_PLAN_TOOL = toAnthropicTool(
  'generate_plan',
  "Generate the user's full weekly plan: nutrition targets, a 7-day training program, a recovery protocol, and general supplement category suggestions.",
  GeneratePlanToolSchema,
);

const SYSTEM_PROMPT = `You are the lead coach for Gym App, generating a complete weekly plan for one user from their profile. Produce all four parts together so they stay consistent with each other:

1. Nutrition target - calories and macros appropriate for their goal, body, and activity, plus brief meal-timing guidance.
2. Training program - a periodized 7-day split (exactly 7 entries, dayIndex 0-6) matching their experience level, equipment, schedule, and injury constraints. Use double-progression rep ranges. Rest days get isRestDay=true and an empty exercise list.
3. Recovery protocol - a sleep target, a deload cadence in weeks (typically 4-8), and brief mobility guidance.
4. Supplement suggestions - general categories only (protein, creatine, vitamin D, etc.), never specific brands or dosages beyond well-established norms, matched to their stated openness level. If openness is NONE, return an empty list.

Respect any injuries or limitations explicitly - route around them rather than ignoring them. Write the rationale directly to the user, warm and specific to their situation, 2-4 sentences.`;

export async function generatePlan(
  userId: string,
  opts?: { adherenceNote?: string },
): Promise<PlanVersionWithRelations> {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile || !profile.onboardingCompletedAt) {
    throw new ProfileIncompleteError();
  }

  const [previousActive, versionCount] = await Promise.all([
    prisma.planVersion.findFirst({ where: { userId, status: 'ACTIVE' } }),
    prisma.planVersion.count({ where: { userId } }),
  ]);

  const tdee = estimateTDEE({
    currentWeightKg: profile.currentWeightKg ?? undefined,
    heightCm: profile.heightCm ?? undefined,
    birthYear: profile.birthYear ?? undefined,
    sex: profile.sex ?? undefined,
    activityLevel: profile.activityLevel ?? undefined,
  });
  const calorieBounds = tdee ? calorieBoundsForGoal(tdee, profile.goal ?? undefined) : null;
  const proteinBounds = proteinBoundsG(profile.currentWeightKg ?? undefined);

  const system = [
    SYSTEM_PROMPT,
    `\nUser profile:\n${buildProfileSummaryText(profile)}`,
    calorieBounds
      ? `\nEstimated maintenance calories (TDEE): ~${tdee} kcal. Keep the calorie target within ${calorieBounds.min}-${calorieBounds.max} kcal/day for their goal.`
      : '',
    proteinBounds ? `Keep protein within ${proteinBounds.min}-${proteinBounds.max}g/day.` : '',
  ].join('\n');

  const userMessage = opts?.adherenceNote
    ? `Regenerate this week's plan based on the past week's adherence and recovery data. ${opts.adherenceNote}`
    : "Generate this user's initial plan.";

  const generated = await callWithForcedTool({
    model: EXTRACTION_MODEL,
    system,
    messages: [{ role: 'user', content: userMessage }],
    tool: GENERATE_PLAN_TOOL,
    schema: GeneratePlanToolSchema,
    maxTokens: 16000,
    effort: 'high',
  });

  if (calorieBounds) {
    generated.nutritionTarget.calories = clamp(generated.nutritionTarget.calories, calorieBounds.min, calorieBounds.max);
  }
  if (proteinBounds) {
    generated.nutritionTarget.proteinG = clamp(generated.nutritionTarget.proteinG, proteinBounds.min, proteinBounds.max);
  }

  if (previousActive) {
    await prisma.planVersion.update({ where: { id: previousActive.id }, data: { status: 'ARCHIVED' } });
  }

  const plan = await prisma.planVersion.create({
    data: {
      userId,
      versionNumber: versionCount + 1,
      status: 'ACTIVE',
      weekStartDate: startOfWeek(new Date()),
      rationale: generated.rationale,
      sourceModel: EXTRACTION_MODEL,
      nutritionTarget: { create: generated.nutritionTarget },
      recoveryProtocol: { create: generated.recoveryProtocol },
      supplementSuggestions: {
        create: generated.supplementSuggestions.map((s) => ({ category: s.category, rationale: s.rationale })),
      },
      trainingProgram: {
        create: {
          splitType: generated.trainingProgram.splitType,
          notes: generated.trainingProgram.notes,
          days: {
            create: generated.trainingProgram.days.map((day) => ({
              dayIndex: day.dayIndex,
              label: day.label,
              focus: day.focus,
              isRestDay: day.isRestDay,
              exercises: {
                create: day.exercises.map((ex) => ({
                  order: ex.order,
                  exerciseName: ex.exerciseName,
                  targetSets: ex.targetSets,
                  targetRepLow: ex.targetRepLow,
                  targetRepHigh: ex.targetRepHigh,
                  targetRIR: ex.targetRIR,
                  restSeconds: ex.restSeconds,
                  progressionRule: ex.progressionRule ?? {
                    type: 'double_progression',
                    incrementKg: DEFAULT_PROGRESSION_INCREMENT_KG,
                  },
                })),
              },
            })),
          },
        },
      },
    },
    include: planInclude,
  });

  return plan;
}

export async function getCurrentPlanDTO(userId: string) {
  const plan = await prisma.planVersion.findFirst({
    where: { userId, status: 'ACTIVE' },
    include: planInclude,
    orderBy: { versionNumber: 'desc' },
  });
  return plan ? toPlanVersionDTO(plan) : null;
}

function buildProfileSummaryText(profile: ProfileRow): string {
  const lines: string[] = [];
  if (profile.goal) lines.push(`Goal: ${profile.goal}`);
  if (profile.experienceLevel) lines.push(`Experience: ${profile.experienceLevel}`);
  if (profile.trainingHistoryNotes) lines.push(`Training history: ${profile.trainingHistoryNotes}`);
  if (profile.daysPerWeek) lines.push(`Training days/week: ${profile.daysPerWeek}`);
  if (profile.sessionDurationMinutes) lines.push(`Session length: ~${profile.sessionDurationMinutes} min`);
  if (profile.equipmentAccess) lines.push(`Equipment access: ${profile.equipmentAccess}`);
  if (profile.dietPattern) lines.push(`Diet pattern: ${profile.dietPattern}`);
  if (profile.dietaryRestrictions.length) lines.push(`Dietary restrictions: ${profile.dietaryRestrictions.join(', ')}`);
  if (profile.allergies.length) lines.push(`Allergies: ${profile.allergies.join(', ')}`);
  if (profile.currentWeightKg) lines.push(`Current weight: ${profile.currentWeightKg}kg`);
  if (profile.targetWeightKg) lines.push(`Target weight: ${profile.targetWeightKg}kg`);
  if (profile.heightCm) lines.push(`Height: ${profile.heightCm}cm`);
  if (profile.sex) lines.push(`Sex: ${profile.sex}`);
  if (profile.birthYear) lines.push(`Birth year: ${profile.birthYear}`);
  if (profile.activityLevel) lines.push(`Activity level: ${profile.activityLevel}`);
  if (profile.sleepHoursAvg) lines.push(`Average sleep: ${profile.sleepHoursAvg}h`);
  if (profile.sleepQualityNotes) lines.push(`Sleep notes: ${profile.sleepQualityNotes}`);
  if (profile.injuries) lines.push(`Injuries/limitations: ${JSON.stringify(profile.injuries)}`);
  if (profile.supplementOpenness) lines.push(`Supplement openness: ${profile.supplementOpenness}`);
  return lines.join('\n');
}
