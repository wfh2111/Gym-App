import type { FastifyInstance } from 'fastify';
import { LogManualRecoveryInputSchema } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { logManualRecovery, getTodayRecovery } from '../services/recovery.service';

export async function recoveryRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.post('/manual', async (request, reply) => {
    const parsed = LogManualRecoveryInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    const row = await logManualRecovery(request.user.sub, parsed.data);
    return reply.code(201).send({
      id: row.id,
      date: row.date.toISOString(),
      sleepHours: row.sleepHours,
      sleepQualityScore: row.sleepQualityScore,
      recoveryScore: row.recoveryScore,
    });
  });

  app.get('/today', async (request, reply) => {
    const rows = await getTodayRecovery(request.user.sub);
    return reply.send(
      rows.map((r) => ({
        id: r.id,
        source: r.source,
        sleepHours: r.sleepHours,
        sleepQualityScore: r.sleepQualityScore,
        hrvMs: r.hrvMs,
        restingHeartRate: r.restingHeartRate,
        recoveryScore: r.recoveryScore,
      })),
    );
  });
}
