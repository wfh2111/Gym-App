import { Prisma } from '@prisma/client';
import type { PlanVersionDTO, ProgressionRule } from '@gym-app/shared';

export const planInclude = {
  nutritionTarget: true,
  recoveryProtocol: true,
  supplementSuggestions: true,
  trainingProgram: {
    include: {
      days: {
        include: { exercises: { orderBy: { order: 'asc' } } },
        orderBy: { dayIndex: 'asc' },
      },
    },
  },
} satisfies Prisma.PlanVersionInclude;

export type PlanVersionWithRelations = Prisma.PlanVersionGetPayload<{ include: typeof planInclude }>;

export function toPlanVersionDTO(plan: PlanVersionWithRelations): PlanVersionDTO {
  return {
    id: plan.id,
    versionNumber: plan.versionNumber,
    status: plan.status,
    weekStartDate: plan.weekStartDate.toISOString(),
    rationale: plan.rationale,
    generatedAt: plan.generatedAt.toISOString(),
    nutritionTarget: plan.nutritionTarget
      ? {
          calories: plan.nutritionTarget.calories,
          proteinG: plan.nutritionTarget.proteinG,
          carbsG: plan.nutritionTarget.carbsG,
          fatG: plan.nutritionTarget.fatG,
          mealsPerDay: plan.nutritionTarget.mealsPerDay,
          mealTimingNotes: plan.nutritionTarget.mealTimingNotes ?? '',
        }
      : null,
    trainingProgram: plan.trainingProgram
      ? {
          splitType: plan.trainingProgram.splitType,
          notes: plan.trainingProgram.notes ?? undefined,
          days: plan.trainingProgram.days.map((day) => ({
            id: day.id,
            dayIndex: day.dayIndex,
            label: day.label,
            focus: day.focus ?? undefined,
            isRestDay: day.isRestDay,
            exercises: day.exercises.map((ex) => ({
              order: ex.order,
              exerciseName: ex.exerciseName,
              targetSets: ex.targetSets,
              targetRepLow: ex.targetRepLow,
              targetRepHigh: ex.targetRepHigh,
              targetRIR: ex.targetRIR ?? undefined,
              restSeconds: ex.restSeconds ?? undefined,
              progressionRule: (ex.progressionRule as ProgressionRule | null) ?? undefined,
            })),
          })),
        }
      : null,
    recoveryProtocol: plan.recoveryProtocol
      ? {
          sleepTargetHours: plan.recoveryProtocol.sleepTargetHours,
          deloadCadenceWeeks: plan.recoveryProtocol.deloadCadenceWeeks,
          mobilityRoutineNotes: plan.recoveryProtocol.mobilityRoutineNotes ?? '',
        }
      : null,
    supplementSuggestions: plan.supplementSuggestions.map((s) => ({
      id: s.id,
      category: s.category,
      rationale: s.rationale,
      disclaimer: s.disclaimer,
    })),
  };
}
