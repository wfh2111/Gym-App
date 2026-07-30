import 'dotenv/config';
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().default(4000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),

  ANTHROPIC_API_KEY: z.string().optional().default(''),
  ANTHROPIC_CHAT_MODEL: z.string().optional().default('claude-opus-5'),
  ANTHROPIC_EXTRACTION_MODEL: z.string().optional().default('claude-opus-5'),

  FREE_COACH_MESSAGES_PER_WEEK: z.coerce.number().int().default(10),
  ENABLE_CRON: z
    .string()
    .optional()
    .default('false')
    .transform((v) => v === 'true'),

  WHOOP_CLIENT_ID: z.string().optional().default(''),
  WHOOP_CLIENT_SECRET: z.string().optional().default(''),
  WHOOP_REDIRECT_URI: z.string().optional().default(''),

  OURA_CLIENT_ID: z.string().optional().default(''),
  OURA_CLIENT_SECRET: z.string().optional().default(''),
  OURA_REDIRECT_URI: z.string().optional().default(''),

  GARMIN_CLIENT_ID: z.string().optional().default(''),
  GARMIN_CLIENT_SECRET: z.string().optional().default(''),
  GARMIN_REDIRECT_URI: z.string().optional().default(''),

  REVENUECAT_WEBHOOK_SECRET: z.string().optional().default(''),
  REVENUECAT_PROJECT_API_KEY: z.string().optional().default(''),

  OPENFOODFACTS_BASE_URL: z.string().optional().default('https://world.openfoodfacts.org'),
});

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;

export const isLlmConfigured = env.ANTHROPIC_API_KEY.length > 0;
