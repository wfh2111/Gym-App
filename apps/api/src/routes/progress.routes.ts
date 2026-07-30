import type { FastifyInstance } from 'fastify';
import { LogWeightInputSchema, type ProgressMetric } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { getTrends, logWeight } from '../services/progress.service';

const VALID_METRICS: ProgressMetric[] = ['weight', 'strength', 'recovery', 'adherence'];

export async function progressRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/trends', async (request, reply) => {
    const { metric, range } = request.query as { metric?: string; range?: string };
    if (!metric || !VALID_METRICS.includes(metric as ProgressMetric)) {
      return reply.badRequest(`metric must be one of ${VALID_METRICS.join(', ')}`);
    }
    const trends = await getTrends(request.user.sub, metric as ProgressMetric, range);
    return reply.send(trends);
  });

  app.post('/weight', async (request, reply) => {
    const parsed = LogWeightInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');
    const log = await logWeight(request.user.sub, parsed.data);
    return reply.code(201).send({ id: log.id, date: log.date.toISOString(), weightKg: log.weightKg });
  });
}
