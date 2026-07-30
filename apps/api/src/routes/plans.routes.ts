import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { prisma } from '../lib/prisma';
import { sendLlmError } from '../lib/llmErrors';
import { generatePlan, getCurrentPlanDTO, ProfileIncompleteError } from '../services/llm/planGeneration.service';
import { planInclude, toPlanVersionDTO } from '../services/plan/planQueries';

export async function plansRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/current', async (request, reply) => {
    const dto = await getCurrentPlanDTO(request.user.sub);
    return reply.send(dto);
  });

  app.post('/generate', async (request, reply) => {
    try {
      const plan = await generatePlan(request.user.sub);
      return reply.send(toPlanVersionDTO(plan));
    } catch (err) {
      if (sendLlmError(err, reply)) return;
      if (err instanceof ProfileIncompleteError) return reply.badRequest(err.message);
      throw err;
    }
  });

  app.get('/history', async (request, reply) => {
    const plans = await prisma.planVersion.findMany({
      where: { userId: request.user.sub },
      include: planInclude,
      orderBy: { versionNumber: 'desc' },
    });
    return reply.send(plans.map(toPlanVersionDTO));
  });

  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const plan = await prisma.planVersion.findFirst({
      where: { id, userId: request.user.sub },
      include: planInclude,
    });
    if (!plan) return reply.notFound();
    return reply.send(toPlanVersionDTO(plan));
  });
}
