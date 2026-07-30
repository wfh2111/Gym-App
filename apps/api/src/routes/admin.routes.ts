import type { FastifyInstance } from 'fastify';
import { env } from '../lib/env';
import { regenerateAllPlans } from '../jobs/planRegeneration.job';
import { syncAllConnections } from '../jobs/recoverySync.job';

/** Dev-only manual job triggers - there's no real cron infra in this environment, so these let
 *  you exercise the weekly jobs on demand instead of waiting for the scheduler. */
export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.post('/jobs/regenerate-plans', async (_request, reply) => {
    if (env.NODE_ENV === 'production') return reply.forbidden('Not available in production.');
    const result = await regenerateAllPlans();
    return reply.send(result);
  });

  app.post('/jobs/sync-recovery', async (_request, reply) => {
    if (env.NODE_ENV === 'production') return reply.forbidden('Not available in production.');
    const result = await syncAllConnections();
    return reply.send(result);
  });
}
