import type { FastifyInstance } from 'fastify';
import { LogMealInputSchema, ManualMealInputSchema } from '@gym-app/shared';
import { authenticate } from '../middleware/authenticate';
import { sendLlmError } from '../lib/llmErrors';
import {
  logMealFromText,
  logMealFromPhoto,
  logMealFromBarcode,
  logMealManual,
  listLogsForDate,
  deleteLog,
  getDaySummary,
  toNutritionLogDTO,
  BarcodeNotFoundError,
} from '../services/nutrition.service';

export async function nutritionRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', authenticate);

  app.post('/logs', async (request, reply) => {
    const parsed = LogMealInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    try {
      switch (parsed.data.source) {
        case 'TEXT': {
          const log = await logMealFromText(request.user.sub, parsed.data);
          return reply.code(201).send(toNutritionLogDTO(log));
        }
        case 'PHOTO': {
          const log = await logMealFromPhoto(request.user.sub, parsed.data);
          return reply.code(201).send(toNutritionLogDTO(log));
        }
        case 'BARCODE': {
          const log = await logMealFromBarcode(request.user.sub, parsed.data);
          return reply.code(201).send(toNutritionLogDTO(log));
        }
        default:
          return reply.badRequest('Use POST /api/nutrition/logs/manual for manual entries.');
      }
    } catch (err) {
      if (sendLlmError(err, reply)) return;
      if (err instanceof BarcodeNotFoundError) {
        return reply.code(404).send({ error: err.message });
      }
      throw err;
    }
  });

  app.post('/logs/manual', async (request, reply) => {
    const parsed = ManualMealInputSchema.safeParse(request.body);
    if (!parsed.success) return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');

    const log = await logMealManual(request.user.sub, parsed.data);
    return reply.code(201).send(toNutritionLogDTO(log));
  });

  app.get('/logs', async (request, reply) => {
    const { date } = request.query as { date?: string };
    const logs = await listLogsForDate(request.user.sub, date ? new Date(date) : new Date());
    return reply.send(logs.map(toNutritionLogDTO));
  });

  app.delete('/logs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = await deleteLog(request.user.sub, id);
    if (!deleted) return reply.notFound();
    return reply.code(204).send();
  });

  app.get('/summary', async (request, reply) => {
    const { date } = request.query as { date?: string };
    const summary = await getDaySummary(request.user.sub, date ? new Date(date) : new Date());
    return reply.send(summary);
  });
}
