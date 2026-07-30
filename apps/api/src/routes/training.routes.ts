import type { FastifyInstance } from 'fastify';
import type { WorkoutLog, WorkoutSet } from '@prisma/client';
import {
  StartWorkoutInputSchema,
  LogSetInputSchema,
  CompleteWorkoutInputSchema,
  type ProgressionRule,
  type TodayTrainingDayDTO,
  type WorkoutLogDTO,
  type WorkoutSetDTO,
} from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { dayIndexForDate } from '../lib/date';
import { computeProgressionForDay } from '../services/progression.service';

export async function trainingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/today', async (request, reply) => {
    const userId = request.user.sub;

    const plan = await prisma.planVersion.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        trainingProgram: {
          include: { days: { include: { exercises: { orderBy: { order: 'asc' } } } } },
        },
      },
    });

    const day = plan?.trainingProgram?.days.find((d) => d.dayIndex === dayIndexForDate(new Date()));
    if (!day) return reply.send(null);

    const suggestions = await computeProgressionForDay(userId, day.exercises);

    const activeLog = await prisma.workoutLog.findFirst({
      where: { userId, trainingDayId: day.id, completedAt: null },
      orderBy: { startedAt: 'desc' },
    });

    const dto: TodayTrainingDayDTO = {
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
    return reply.send(dto);
  });

  app.post('/workouts', async (request, reply) => {
    const parsed = StartWorkoutInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    const activePlan = await prisma.planVersion.findFirst({
      where: { userId: request.user.sub, status: 'ACTIVE' },
    });

    const log = await prisma.workoutLog.create({
      data: {
        userId: request.user.sub,
        trainingDayId: parsed.data.trainingDayId,
        planVersionId: parsed.data.planVersionId ?? activePlan?.id,
      },
      include: { sets: true },
    });
    return reply.code(201).send(toWorkoutLogDTO(log));
  });

  app.get('/workouts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const log = await prisma.workoutLog.findFirst({
      where: { id, userId: request.user.sub },
      include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setIndex: 'asc' }] } },
    });
    if (!log) return reply.notFound();
    return reply.send(toWorkoutLogDTO(log));
  });

  app.patch('/workouts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = CompleteWorkoutInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    const existing = await prisma.workoutLog.findFirst({ where: { id, userId: request.user.sub } });
    if (!existing) return reply.notFound();

    const log = await prisma.workoutLog.update({
      where: { id },
      data: { completedAt: new Date(), notes: parsed.data.notes },
      include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setIndex: 'asc' }] } },
    });
    return reply.send(toWorkoutLogDTO(log));
  });

  app.post('/workouts/:id/sets', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = LogSetInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    const workoutLog = await prisma.workoutLog.findFirst({ where: { id, userId: request.user.sub } });
    if (!workoutLog) return reply.notFound();

    const { exerciseName, setIndex, weightKg, reps, rpe, isWarmup } = parsed.data;
    const set = await prisma.workoutSet.upsert({
      where: { workoutLogId_exerciseName_setIndex: { workoutLogId: id, exerciseName, setIndex } },
      update: { weightKg, reps, rpe, isWarmup: isWarmup ?? false, completedAt: new Date() },
      create: { workoutLogId: id, exerciseName, setIndex, weightKg, reps, rpe, isWarmup: isWarmup ?? false, completedAt: new Date() },
    });
    return reply.code(201).send(toWorkoutSetDTO(set));
  });

  app.get('/history', async (request, reply) => {
    const logs = await prisma.workoutLog.findMany({
      where: { userId: request.user.sub, completedAt: { not: null } },
      include: { sets: { orderBy: [{ exerciseName: 'asc' }, { setIndex: 'asc' }] } },
      orderBy: { startedAt: 'desc' },
      take: 30,
    });
    return reply.send(logs.map(toWorkoutLogDTO));
  });
}

function toWorkoutSetDTO(set: WorkoutSet): WorkoutSetDTO {
  return {
    id: set.id,
    exerciseName: set.exerciseName,
    setIndex: set.setIndex,
    weightKg: set.weightKg,
    reps: set.reps,
    rpe: set.rpe,
    isWarmup: set.isWarmup,
  };
}

function toWorkoutLogDTO(log: WorkoutLog & { sets: WorkoutSet[] }): WorkoutLogDTO {
  return {
    id: log.id,
    startedAt: log.startedAt.toISOString(),
    completedAt: log.completedAt?.toISOString() ?? null,
    notes: log.notes,
    trainingDayId: log.trainingDayId,
    sets: log.sets.map(toWorkoutSetDTO),
  };
}
