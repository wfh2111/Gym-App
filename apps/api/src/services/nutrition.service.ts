import type Anthropic from '@anthropic-ai/sdk';
import type { z } from 'zod';
import type { NutritionLog } from '@prisma/client';
import {
  ExtractMealToolSchema,
  type LogMealInput,
  type ManualMealInput,
  type BarcodeProduct,
  type NutritionLogDTO,
  type NutritionSummaryDTO,
} from '@gym-app/shared';
import { toAnthropicTool } from '@gym-app/shared/llm/toolSchema';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { startOfDay } from '../lib/date';
import { EXTRACTION_MODEL } from './llm/anthropic.client';
import { callWithForcedTool } from './llm/toolCall';

const EXTRACT_MEAL_TOOL = toAnthropicTool(
  'extract_meal',
  'Estimate calories and macronutrients for the described or pictured meal.',
  ExtractMealToolSchema,
);

const MEAL_SYSTEM_PROMPT = `You are a nutrition estimation assistant. Given a text description or photo of a meal, estimate calories and macros as accurately as you can from the visible or described portions. Use typical serving sizes when portions aren't specified, and reflect your uncertainty honestly in the confidence field. Always call extract_meal.`;

export class BarcodeNotFoundError extends Error {
  constructor(public barcode: string) {
    super(`No product found for barcode ${barcode}`);
    this.name = 'BarcodeNotFoundError';
  }
}

export async function logMealFromText(userId: string, input: LogMealInput): Promise<NutritionLog> {
  const extracted = await callWithForcedTool({
    model: EXTRACTION_MODEL,
    system: MEAL_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: input.text ?? '' }],
    tool: EXTRACT_MEAL_TOOL,
    schema: ExtractMealToolSchema,
    maxTokens: 1024,
    effort: 'low',
  });
  return createLogFromExtraction(userId, input, extracted);
}

export async function logMealFromPhoto(userId: string, input: LogMealInput): Promise<NutritionLog> {
  if (!input.photoBase64) throw new Error('Missing photo data');

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: input.photoMediaType ?? 'image/jpeg',
            data: input.photoBase64,
          },
        },
        { type: 'text', text: 'Estimate the calories and macros for this meal.' },
      ],
    },
  ];

  const extracted = await callWithForcedTool({
    model: EXTRACTION_MODEL,
    system: MEAL_SYSTEM_PROMPT,
    messages,
    tool: EXTRACT_MEAL_TOOL,
    schema: ExtractMealToolSchema,
    maxTokens: 1024,
    effort: 'low',
  });
  return createLogFromExtraction(userId, input, extracted);
}

async function createLogFromExtraction(
  userId: string,
  input: LogMealInput,
  extracted: z.infer<typeof ExtractMealToolSchema>,
): Promise<NutritionLog> {
  return prisma.nutritionLog.create({
    data: {
      userId,
      mealType: input.mealType,
      source: input.source,
      description: extracted.description,
      calories: extracted.calories,
      proteinG: extracted.proteinG,
      carbsG: extracted.carbsG,
      fatG: extracted.fatG,
      confidence: extracted.confidence,
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      rawInput: input.source === 'TEXT' ? { text: input.text } : { photoMediaType: input.photoMediaType ?? null },
    },
  });
}

interface OpenFoodFactsNutriments {
  'energy-kcal_100g'?: number;
  'energy-kcal_serving'?: number;
  proteins_100g?: number;
  proteins_serving?: number;
  carbohydrates_100g?: number;
  carbohydrates_serving?: number;
  fat_100g?: number;
  fat_serving?: number;
}

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name?: string;
    serving_size?: string;
    nutriments?: OpenFoodFactsNutriments;
  };
}

export async function lookupBarcode(barcode: string): Promise<BarcodeProduct> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  let data: OpenFoodFactsResponse;
  try {
    const res = await fetch(`${env.OPENFOODFACTS_BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}.json`, {
      headers: { 'User-Agent': 'GymApp/0.1 (support@gymapp.dev)' },
      signal: controller.signal,
    });
    if (res.status === 404) throw new BarcodeNotFoundError(barcode);
    if (!res.ok) throw new Error(`Barcode lookup service returned HTTP ${res.status}`);
    data = (await res.json()) as OpenFoodFactsResponse;
  } finally {
    clearTimeout(timeout);
  }

  if (data.status !== 1 || !data.product) throw new BarcodeNotFoundError(barcode);

  const n = data.product.nutriments ?? {};
  const hasServing = typeof n['energy-kcal_serving'] === 'number';
  const calories = hasServing ? n['energy-kcal_serving'] : n['energy-kcal_100g'];
  const proteinG = hasServing ? n.proteins_serving : n.proteins_100g;
  const carbsG = hasServing ? n.carbohydrates_serving : n.carbohydrates_100g;
  const fatG = hasServing ? n.fat_serving : n.fat_100g;

  if ([calories, proteinG, carbsG, fatG].some((v) => typeof v !== 'number')) {
    throw new BarcodeNotFoundError(barcode);
  }

  return {
    barcode,
    name: data.product.product_name || 'Unknown product',
    servingDescription: hasServing ? (data.product.serving_size ?? 'per serving') : 'per 100g',
    calories: Math.round(calories as number),
    proteinG: Math.round(proteinG as number),
    carbsG: Math.round(carbsG as number),
    fatG: Math.round(fatG as number),
  };
}

export async function logMealFromBarcode(userId: string, input: LogMealInput): Promise<NutritionLog> {
  if (!input.barcode) throw new Error('Missing barcode');
  const product = await lookupBarcode(input.barcode);

  return prisma.nutritionLog.create({
    data: {
      userId,
      mealType: input.mealType,
      source: 'BARCODE',
      description: `${product.name} (${product.servingDescription})`,
      calories: product.calories,
      proteinG: product.proteinG,
      carbsG: product.carbsG,
      fatG: product.fatG,
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
      rawInput: { barcode: input.barcode },
    },
  });
}

export async function logMealManual(userId: string, input: ManualMealInput): Promise<NutritionLog> {
  return prisma.nutritionLog.create({
    data: {
      userId,
      mealType: input.mealType,
      source: 'MANUAL',
      description: input.description,
      calories: input.calories,
      proteinG: input.proteinG,
      carbsG: input.carbsG,
      fatG: input.fatG,
      loggedAt: input.loggedAt ? new Date(input.loggedAt) : new Date(),
    },
  });
}

export async function listLogsForDate(userId: string, date: Date): Promise<NutritionLog[]> {
  const start = startOfDay(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return prisma.nutritionLog.findMany({
    where: { userId, loggedAt: { gte: start, lt: end } },
    orderBy: { loggedAt: 'asc' },
  });
}

export async function deleteLog(userId: string, logId: string): Promise<boolean> {
  const log = await prisma.nutritionLog.findFirst({ where: { id: logId, userId } });
  if (!log) return false;
  await prisma.nutritionLog.delete({ where: { id: log.id } });
  return true;
}

export function toNutritionLogDTO(log: NutritionLog): NutritionLogDTO {
  return {
    id: log.id,
    loggedAt: log.loggedAt.toISOString(),
    mealType: log.mealType,
    source: log.source,
    description: log.description,
    calories: log.calories,
    proteinG: log.proteinG,
    carbsG: log.carbsG,
    fatG: log.fatG,
  };
}

export async function getDaySummary(userId: string, date: Date): Promise<NutritionSummaryDTO> {
  const [logs, plan] = await Promise.all([
    listLogsForDate(userId, date),
    prisma.planVersion.findFirst({ where: { userId, status: 'ACTIVE' }, include: { nutritionTarget: true } }),
  ]);

  const consumed = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories,
      proteinG: acc.proteinG + log.proteinG,
      carbsG: acc.carbsG + log.carbsG,
      fatG: acc.fatG + log.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );

  return {
    date: startOfDay(date).toISOString().slice(0, 10),
    target: plan?.nutritionTarget
      ? {
          calories: plan.nutritionTarget.calories,
          proteinG: plan.nutritionTarget.proteinG,
          carbsG: plan.nutritionTarget.carbsG,
          fatG: plan.nutritionTarget.fatG,
          mealsPerDay: plan.nutritionTarget.mealsPerDay,
          mealTimingNotes: plan.nutritionTarget.mealTimingNotes ?? '',
        }
      : null,
    consumed,
    logs: logs.map(toNutritionLogDTO),
  };
}
