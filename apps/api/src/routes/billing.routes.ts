import type { FastifyInstance } from 'fastify';
import { SyncEntitlementInputSchema } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { env } from '../lib/env';
import {
  applyRevenueCatWebhookEvent,
  getEntitlement,
  isRevenueCatConfigured,
  resetMockEntitlement,
  syncEntitlementFromRevenueCat,
  syncMockEntitlement,
} from '../services/billing.service';

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/entitlement', { preHandler: authenticate }, async (request, reply) => {
    return reply.send(await getEntitlement(request.user.sub));
  });

  app.post('/sync', { preHandler: authenticate }, async (request, reply) => {
    if (isRevenueCatConfigured) {
      return reply.send(await syncEntitlementFromRevenueCat(request.user.sub));
    }

    // No RevenueCat project configured - sandbox/mock mode. The mobile app's mock purchase flow
    // posts here directly, since there's no real store receipt for the server to verify.
    if (env.NODE_ENV === 'production') return reply.forbidden('Mock billing sync is not available in production.');
    const parsed = SyncEntitlementInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');
    return reply.send(await syncMockEntitlement(request.user.sub, parsed.data));
  });

  app.post('/mock-reset', { preHandler: authenticate }, async (request, reply) => {
    if (isRevenueCatConfigured || env.NODE_ENV === 'production') return reply.forbidden('Not available.');
    return reply.send(await resetMockEntitlement(request.user.sub));
  });

  // RevenueCat's own servers call this, authenticated by the shared secret configured in the
  // RevenueCat dashboard - not a user JWT.
  app.post('/webhook', async (request, reply) => {
    if (env.REVENUECAT_WEBHOOK_SECRET && request.headers.authorization !== `Bearer ${env.REVENUECAT_WEBHOOK_SECRET}`) {
      return reply.unauthorized('Invalid webhook credentials.');
    }
    await applyRevenueCatWebhookEvent(request.body);
    return reply.code(200).send({ received: true });
  });
}
