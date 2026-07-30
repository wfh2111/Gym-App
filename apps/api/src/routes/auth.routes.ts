import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { RegisterInputSchema, LoginInputSchema, type AuthResponse } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { toAuthUser } from '../lib/toAuthUser';
import { authenticate } from '../middleware/authenticate';

const TOKEN_TTL = '30d';

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/register', async (request, reply) => {
    const parsed = RegisterInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.badRequest(parsed.error.issues[0]?.message ?? 'Invalid input');
    }
    const { email, password, timezone } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.conflict('An account with that email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash, timezone: timezone ?? 'UTC' },
      include: { profile: true },
    });
    await prisma.subscription.create({ data: { userId: user.id, tier: 'FREE', status: 'NONE' } });

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: TOKEN_TTL });
    const response: AuthResponse = { token, user: toAuthUser(user) };
    return reply.code(201).send(response);
  });

  app.post('/login', async (request, reply) => {
    const parsed = LoginInputSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.badRequest('Invalid email or password');
    }
    const { email, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { email }, include: { profile: true } });
    if (!user) {
      return reply.unauthorized('Invalid email or password');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return reply.unauthorized('Invalid email or password');
    }

    const token = app.jwt.sign({ sub: user.id }, { expiresIn: TOKEN_TTL });
    const response: AuthResponse = { token, user: toAuthUser(user) };
    return reply.send(response);
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.sub },
      include: { profile: true },
    });
    if (!user) return reply.notFound();
    return reply.send(toAuthUser(user));
  });
}
