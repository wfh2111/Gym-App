import type { FastifyInstance } from 'fastify';
import { SendOnboardingMessageInputSchema, type ConversationDTO } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { sendLlmError } from '../lib/llmErrors';
import { getOrCreateOnboardingConversation, sendOnboardingMessage } from '../services/llm/onboarding.service';

export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/session', async (request, reply) => {
    const conversation = await getOrCreateOnboardingConversation(request.user.sub);
    const dto: ConversationDTO = {
      id: conversation.id,
      type: conversation.type,
      status: conversation.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
      messages: conversation.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    };
    return reply.send(dto);
  });

  app.post('/messages', async (request, reply) => {
    const parsed = SendOnboardingMessageInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest('Invalid input');

    try {
      const result = await sendOnboardingMessage(request.user.sub, parsed.data.text);
      return reply.send(result);
    } catch (err) {
      if (sendLlmError(err, reply)) return;
      throw err;
    }
  });

  app.post('/complete', async (request, reply) => {
    const profile = await prisma.profile.findUnique({ where: { userId: request.user.sub } });
    if (!profile?.onboardingCompletedAt) {
      return reply.conflict('Onboarding is not complete yet.');
    }
    return reply.send({ onboardingCompletedAt: profile.onboardingCompletedAt.toISOString() });
  });
}
