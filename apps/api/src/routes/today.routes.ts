import type { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/authenticate';
import { getTodayDTO } from '../services/today.service';

export async function todayRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.get('/', async (request, reply) => {
    const dto = await getTodayDTO(request.user.sub);
    return reply.send(dto);
  });
}
