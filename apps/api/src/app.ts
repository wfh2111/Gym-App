import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import { env } from './lib/env';
import { authRoutes } from './routes/auth.routes';
import { onboardingRoutes } from './routes/onboarding.routes';
import { profileRoutes } from './routes/profile.routes';
import { plansRoutes } from './routes/plans.routes';
import { nutritionRoutes } from './routes/nutrition.routes';
import { trainingRoutes } from './routes/training.routes';
import { coachRoutes } from './routes/coach.routes';
import { progressRoutes } from './routes/progress.routes';
import { recoveryRoutes } from './routes/recovery.routes';
import { integrationsRoutes } from './routes/integrations.routes';
import { billingRoutes } from './routes/billing.routes';
import { adminRoutes } from './routes/admin.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:
      env.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } } }
        : true,
  });

  await app.register(sensible);
  await app.register(cors, { origin: true });
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } });
  await app.register(jwt, { secret: env.JWT_SECRET });

  app.get('/health', async () => ({ status: 'ok', time: new Date().toISOString() }));

  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(onboardingRoutes, { prefix: '/api/onboarding' });
  await app.register(profileRoutes, { prefix: '/api/profile' });
  await app.register(plansRoutes, { prefix: '/api/plans' });
  await app.register(nutritionRoutes, { prefix: '/api/nutrition' });
  await app.register(trainingRoutes, { prefix: '/api/training' });
  await app.register(coachRoutes, { prefix: '/api/coach' });
  await app.register(progressRoutes, { prefix: '/api/progress' });
  await app.register(recoveryRoutes, { prefix: '/api/recovery' });
  await app.register(integrationsRoutes, { prefix: '/api/integrations' });
  await app.register(billingRoutes, { prefix: '/api/billing' });
  await app.register(adminRoutes, { prefix: '/api/admin' });

  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);
    const statusCode = error.statusCode ?? 500;
    reply.status(statusCode).send({
      error: statusCode === 500 ? 'Internal server error' : error.message,
      ...(env.NODE_ENV === 'development' && statusCode === 500 ? { detail: error.message } : {}),
    });
  });

  return app;
}
