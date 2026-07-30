import type { FastifyInstance } from 'fastify';
import type { RecoverySource, WearableConnection } from '@prisma/client';
import { SyncRecoveryInputSchema, type WearableConnectionDTO, type WearableProvider } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { getRecoveryProvider, isRestRecoveryProvider } from '../integrations/providers';
import { upsertRecoveryData } from '../services/recovery.service';

const NATIVE_PROVIDERS = ['APPLE_HEALTH', 'GOOGLE_FIT'] as const;
type NativeProvider = (typeof NATIVE_PROVIDERS)[number];

function isNativeProvider(id: string): id is NativeProvider {
  return (NATIVE_PROVIDERS as readonly string[]).includes(id);
}

export async function integrationsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/', { preHandler: authenticate }, async (request, reply) => {
    const connections = await prisma.wearableConnection.findMany({ where: { userId: request.user.sub } });
    return reply.send(connections.map(toDTO));
  });

  app.post('/:provider/connect', { preHandler: authenticate }, async (request, reply) => {
    const provider = (request.params as { provider: string }).provider.toUpperCase();

    if (!isRestRecoveryProvider(provider)) {
      return reply.badRequest(
        isNativeProvider(provider)
          ? `${provider} connects on-device via OS health permissions, not through this endpoint. See POST /api/integrations/${provider}/sync.`
          : `Unknown provider ${provider}.`,
      );
    }

    const recoveryProvider = getRecoveryProvider(provider);
    if (!recoveryProvider.getAuthUrl) return reply.badRequest(`${provider} does not support OAuth connect.`);

    const state = app.jwt.sign({ sub: request.user.sub }, { expiresIn: '10m' });
    const url = await recoveryProvider.getAuthUrl(state);
    return reply.send({ url });
  });

  // Not behind `authenticate`: this is a browser redirect from the wearable's own consent
  // screen, not an authenticated fetch from the app, so the user is identified by verifying the
  // signed `state` token minted in /connect above rather than an Authorization header.
  app.get('/:provider/callback', async (request, reply) => {
    const provider = (request.params as { provider: string }).provider.toUpperCase();
    if (!isRestRecoveryProvider(provider)) return reply.badRequest('Unknown provider');

    const query = request.query as Record<string, string>;
    if (!query.state) return reply.badRequest('Missing state');

    let userId: string;
    try {
      const payload = app.jwt.verify<{ sub: string }>(query.state);
      userId = payload.sub;
    } catch {
      return reply.badRequest('Invalid or expired state');
    }

    const recoveryProvider = getRecoveryProvider(provider);
    if (!recoveryProvider.exchangeCodeForToken) return reply.badRequest(`${provider} does not support OAuth connect.`);

    try {
      const tokenSet =
        provider === 'GARMIN'
          ? await recoveryProvider.exchangeCodeForToken(query.oauth_verifier ?? '', {
              oauthToken: query.oauth_token ?? '',
              oauthTokenSecret: query.secret ?? '',
            })
          : await recoveryProvider.exchangeCodeForToken(query.code ?? '');

      await prisma.wearableConnection.upsert({
        where: { userId_provider: { userId, provider: provider as WearableProvider } },
        update: {
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          tokenExpiresAt: tokenSet.expiresAt,
          status: 'CONNECTED',
        },
        create: {
          userId,
          provider: provider as WearableProvider,
          accessToken: tokenSet.accessToken,
          refreshToken: tokenSet.refreshToken,
          tokenExpiresAt: tokenSet.expiresAt,
          status: 'CONNECTED',
        },
      });

      // Redirects the in-app browser (opened via expo-web-browser) back into the app; the
      // mobile settings screen listens for this deep link to close the auth session.
      return reply.redirect(`gymapp://settings/integrations?connected=${provider}`);
    } catch (err) {
      request.log.error(err, `${provider} OAuth callback failed`);
      return reply.redirect(`gymapp://settings/integrations?error=${provider}`);
    }
  });

  app.delete('/:provider', { preHandler: authenticate }, async (request, reply) => {
    const provider = (request.params as { provider: string }).provider.toUpperCase() as WearableProvider;
    await prisma.wearableConnection.deleteMany({ where: { userId: request.user.sub, provider } });
    return reply.code(204).send();
  });

  app.post('/:provider/sync', { preHandler: authenticate }, async (request, reply) => {
    const provider = (request.params as { provider: string }).provider.toUpperCase();

    if (isNativeProvider(provider)) {
      const parsed = SyncRecoveryInputSchema.safeParse(request.body);
      if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

      const synced = await upsertRecoveryData(request.user.sub, parsed.data.source, parsed.data.data);

      await prisma.wearableConnection.upsert({
        where: { userId_provider: { userId: request.user.sub, provider: provider as WearableProvider } },
        update: { status: 'CONNECTED' },
        create: { userId: request.user.sub, provider: provider as WearableProvider, status: 'CONNECTED' },
      });

      return reply.send({ synced });
    }

    if (!isRestRecoveryProvider(provider)) return reply.badRequest('Unknown provider');

    const connection = await prisma.wearableConnection.findUnique({
      where: { userId_provider: { userId: request.user.sub, provider: provider as WearableProvider } },
    });
    if (!connection || connection.status !== 'CONNECTED' || !connection.accessToken) {
      return reply.badRequest(`${provider} is not connected.`);
    }

    const recoveryProvider = getRecoveryProvider(provider);
    const since = new Date();
    since.setDate(since.getDate() - 7);
    const data = await recoveryProvider.fetchRecoveryData({
      accessToken: connection.accessToken,
      tokenSecret: connection.refreshToken ?? undefined,
      since,
    });

    const synced = await upsertRecoveryData(request.user.sub, provider as unknown as RecoverySource, data);
    return reply.send({ synced });
  });
}

function toDTO(connection: WearableConnection): WearableConnectionDTO {
  return {
    provider: connection.provider,
    status: connection.status,
    connectedAt: connection.connectedAt.toISOString(),
  };
}
