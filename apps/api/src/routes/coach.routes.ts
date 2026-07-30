import type { FastifyInstance } from 'fastify';
import type { Conversation, CoachMessage } from '@prisma/client';
import { SendCoachMessageInputSchema, type ConversationDTO } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { sendLlmError } from '../lib/llmErrors';
import {
  sendCoachMessage,
  CoachMessageLimitError,
  getOrCreateWeeklyCheckinConversation,
  sendWeeklyCheckinMessage,
} from '../services/llm/coachChat.service';

export async function coachRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.post('/messages', async (request, reply) => {
    const parsed = SendCoachMessageInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    try {
      const result = await sendCoachMessage(request.user.sub, parsed.data.conversationId, parsed.data.text);
      return reply.send(result);
    } catch (err) {
      if (sendLlmError(err, reply)) return;
      if (err instanceof CoachMessageLimitError) return reply.code(402).send({ error: err.message });
      throw err;
    }
  });

  app.get('/conversations', async (request, reply) => {
    const conversations = await prisma.conversation.findMany({
      where: { userId: request.user.sub, type: { in: ['COACH', 'WEEKLY_CHECKIN'] } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    });
    return reply.send(
      conversations.map((c) => ({
        id: c.id,
        type: c.type,
        status: c.status === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE',
        startedAt: c.startedAt.toISOString(),
      })),
    );
  });

  app.get('/conversations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: request.user.sub },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!conversation) return reply.notFound();
    return reply.send(toConversationDTO(conversation));
  });

  app.post('/weekly-checkin/start', async (request, reply) => {
    const conversation = await getOrCreateWeeklyCheckinConversation(request.user.sub);
    return reply.send(toConversationDTO(conversation));
  });

  app.post('/weekly-checkin', async (request, reply) => {
    const parsed = SendCoachMessageInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    try {
      const result = await sendWeeklyCheckinMessage(request.user.sub, parsed.data.text);
      return reply.send(result);
    } catch (err) {
      if (sendLlmError(err, reply)) return;
      throw err;
    }
  });
}

function toConversationDTO(conversation: Conversation & { messages: CoachMessage[] }): ConversationDTO {
  return {
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
}
