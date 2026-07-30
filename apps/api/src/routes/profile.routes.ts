import type { FastifyInstance } from 'fastify';
import type { Profile as ProfileRow } from '@prisma/client';
import { ProfileSchema } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';

export async function profileRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user.sub } });
    return reply.send(profile ? toProfileDTO(profile) : null);
  });

  app.patch('/', async (request, reply) => {
    const parsed = ProfileSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');
    }

    const profile = await prisma.profile.upsert({
      where: { userId: request.user.sub },
      update: parsed.data,
      create: { userId: request.user.sub, ...parsed.data },
    });
    return reply.send(toProfileDTO(profile));
  });
}

function toProfileDTO(profile: ProfileRow) {
  return {
    ...profile,
    updatedAt: profile.updatedAt.toISOString(),
    onboardingCompletedAt: profile.onboardingCompletedAt?.toISOString() ?? null,
  };
}
