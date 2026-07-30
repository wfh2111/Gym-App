import cron from 'node-cron';
import type { FastifyBaseLogger } from 'fastify';
import { env } from '../lib/env';
import { regenerateAllPlans } from './planRegeneration.job';

/** Weekly plan regeneration, gated behind ENABLE_CRON since there's no real cron infra in dev. */
export function startScheduler(logger: FastifyBaseLogger): void {
  if (!env.ENABLE_CRON) {
    logger.info('Cron scheduler disabled (ENABLE_CRON=false)');
    return;
  }

  // Every Sunday at 00:00 UTC.
  cron.schedule('0 0 * * 0', async () => {
    logger.info('Running weekly plan regeneration job');
    try {
      const result = await regenerateAllPlans();
      logger.info(result, 'Weekly plan regeneration complete');
    } catch (err) {
      logger.error(err, 'Weekly plan regeneration failed');
    }
  });

  logger.info('Cron scheduler started (weekly plan regeneration, Sundays 00:00 UTC)');
}
