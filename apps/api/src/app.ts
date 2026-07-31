import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance, type FastifyError } from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import { env } from './lib/env';
import { authRoutes } from './routes/auth.routes';
import { todayRoutes } from './routes/today.routes';
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
  await app.register(todayRoutes, { prefix: '/api/today' });
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

  await registerWebApp(app);

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

/**
 * Serves the Expo Router static web export (built into apps/api/public by the Docker build - see
 * the root Dockerfile) so a single deployed service handles both the API and the web app. Only
 * activates when that directory actually exists, so local `pnpm dev` behaves exactly as before
 * without anyone needing to build the web app first.
 *
 * Expo's static export produces one real HTML file per route (e.g. training/history.html), but
 * dynamic routes still need client-side Expo Router to resolve the actual path (there's no static
 * file for /training/session/<id>). The fallback chain below tries an exact match first, then
 * falls back to the root shell and lets the client-side router take over.
 */
async function registerWebApp(app: FastifyInstance): Promise<void> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const webRoot = path.join(currentDir, '../public');
  if (!fs.existsSync(webRoot)) return;

  await app.register(fastifyStatic, { root: webRoot, wildcard: false });

  app.setNotFoundHandler((request, reply) => {
    if (request.url.startsWith('/api/')) {
      return reply.code(404).send({ statusCode: 404, error: 'Not Found', message: `Route ${request.url} not found` });
    }

    const routePath = request.url.split('?')[0] ?? '/';
    for (const candidate of [`${routePath}.html`, `${routePath}/index.html`, '/index.html']) {
      if (fs.existsSync(path.join(webRoot, candidate))) {
        return reply.sendFile(candidate);
      }
    }
    return reply.code(404).send('Not found');
  });
}
