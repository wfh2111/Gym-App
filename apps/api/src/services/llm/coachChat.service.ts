import type Anthropic from '@anthropic-ai/sdk';
import type { Prisma } from '@prisma/client';
import { NotePlanAdjustmentRequestToolSchema, WeeklyCheckinToolSchema } from '@gym-app/shared';
import { toAnthropicTool } from '@gym-app/shared/llm/toolSchema';
import { prisma } from '../../lib/prisma';
import { env } from '../../lib/env';
import { startOfWeek } from '../../lib/date';
import { computeWeeklyAdherence } from '../adherence.service';
import { CHAT_MODEL, EXTRACTION_MODEL } from './anthropic.client';
import { callChat, callWithForcedTool } from './toolCall';
import { generatePlan } from './planGeneration.service';

export class CoachMessageLimitError extends Error {
  constructor() {
    super('Weekly coach message limit reached. Upgrade to Premium for unlimited coach chat.');
    this.name = 'CoachMessageLimitError';
  }
}

const NOTE_ADJUSTMENT_TOOL = toAnthropicTool(
  'note_plan_adjustment_request',
  'Record that the user is asking for a change to their plan. This does not change the plan immediately - real changes happen during the weekly re-assessment.',
  NotePlanAdjustmentRequestToolSchema,
);

const WEEKLY_CHECKIN_TOOL = toAnthropicTool(
  'weekly_checkin',
  "Record what's been learned this session about the user's training, nutrition, sleep, and any new constraints, merged with what's already known.",
  WeeklyCheckinToolSchema,
);

const COACH_SYSTEM_PROMPT = `You are the ongoing coach for Gym App. Answer the user's questions about their training, nutrition, recovery, and supplements directly and concisely, grounded in their current plan below. If they ask for a plan change, use the note_plan_adjustment_request tool to record it, then explain that real plan changes happen automatically each week based on their logged adherence and recovery data. Never give specific medical advice - suggest consulting a healthcare provider for medical concerns.`;

async function assertCanSendCoachMessage(userId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  if (subscription?.tier === 'PREMIUM' && subscription.status === 'ACTIVE') return;

  const weekStart = startOfWeek(new Date());
  const usage = await prisma.coachMessageUsage.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });
  if ((usage?.messageCount ?? 0) >= env.FREE_COACH_MESSAGES_PER_WEEK) {
    throw new CoachMessageLimitError();
  }
}

async function incrementCoachMessageUsage(userId: string): Promise<void> {
  const weekStart = startOfWeek(new Date());
  await prisma.coachMessageUsage.upsert({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
    update: { messageCount: { increment: 1 } },
    create: { userId, weekStartDate: weekStart, messageCount: 1 },
  });
}

async function buildCoachContext(userId: string): Promise<string> {
  const [profile, plan] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.planVersion.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { nutritionTarget: true, trainingProgram: true, recoveryProtocol: true },
    }),
  ]);

  const lines: string[] = [];
  if (profile?.goal) lines.push(`Goal: ${profile.goal}`);
  if (profile?.experienceLevel) lines.push(`Experience: ${profile.experienceLevel}`);
  if (plan?.nutritionTarget) {
    lines.push(`Current nutrition target: ${plan.nutritionTarget.calories} kcal, ${plan.nutritionTarget.proteinG}g protein.`);
  }
  if (plan?.trainingProgram) lines.push(`Current training split: ${plan.trainingProgram.splitType}.`);
  if (plan?.recoveryProtocol) {
    lines.push(
      `Sleep target: ${plan.recoveryProtocol.sleepTargetHours}h, deload every ${plan.recoveryProtocol.deloadCadenceWeeks} weeks.`,
    );
  }
  if (profile?.injuries) lines.push(`Known injuries/limitations: ${JSON.stringify(profile.injuries)}`);
  return lines.join('\n');
}

export async function getOrCreateCoachConversation(userId: string, conversationId?: string) {
  if (conversationId) {
    const existing = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (existing) return existing;
  }

  const active = await prisma.conversation.findFirst({
    where: { userId, type: 'COACH', status: 'ACTIVE' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
    orderBy: { startedAt: 'desc' },
  });
  if (active) return active;

  return prisma.conversation.create({
    data: { userId, type: 'COACH', status: 'ACTIVE' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function sendCoachMessage(userId: string, conversationId: string | undefined, text: string) {
  await assertCanSendCoachMessage(userId);

  const conversation = await getOrCreateCoachConversation(userId, conversationId);
  await prisma.coachMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: text } });

  const history = await prisma.coachMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  });
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));

  const system = `${COACH_SYSTEM_PROMPT}\n\n${await buildCoachContext(userId)}`;

  const result = await callChat({
    model: CHAT_MODEL,
    system,
    messages,
    tools: [NOTE_ADJUSTMENT_TOOL],
    maxTokens: 2048,
    effort: 'medium',
  });

  const reply = result.text || "Let me know if you'd like to go into more detail on anything.";

  await prisma.coachMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: reply,
      toolCalls: result.toolCalls as unknown as Prisma.InputJsonValue,
    },
  });

  await incrementCoachMessageUsage(userId);

  return { conversationId: conversation.id, reply };
}

function weeklyCheckinOpening(summary: string): string {
  return `Let's check in on your week. ${summary} How did training feel overall - any exercises that felt too easy or too hard?`;
}

export async function getOrCreateWeeklyCheckinConversation(userId: string) {
  const active = await prisma.conversation.findFirst({
    where: { userId, type: 'WEEKLY_CHECKIN', status: 'ACTIVE' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (active) return active;

  const lastWeekStart = startOfWeek(new Date());
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const adherence = await computeWeeklyAdherence(userId, lastWeekStart);

  const summary = `Last week you logged nutrition on ${adherence.nutritionLogDays}/7 days and completed ${adherence.workoutsCompleted}/${adherence.workoutsPlanned} planned workouts${adherence.avgRecoveryScore ? `, with an average recovery score of ${Math.round(adherence.avgRecoveryScore)}` : ''}.`;

  return prisma.conversation.create({
    data: {
      userId,
      type: 'WEEKLY_CHECKIN',
      status: 'ACTIVE',
      messages: { create: [{ role: 'ASSISTANT', content: weeklyCheckinOpening(summary) }] },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

export interface WeeklyCheckinTurnResult {
  conversationId: string;
  reply: string;
  isComplete: boolean;
  planRegenerated: boolean;
}

export async function sendWeeklyCheckinMessage(userId: string, text: string): Promise<WeeklyCheckinTurnResult> {
  const conversation = await getOrCreateWeeklyCheckinConversation(userId);
  await prisma.coachMessage.create({ data: { conversationId: conversation.id, role: 'USER', content: text } });

  const history = await prisma.coachMessage.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: 'asc' },
  });
  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));

  const system = `You are running a brief weekly check-in with the user to inform next week's plan update. Ask about training difficulty, nutrition adherence, sleep/recovery changes, and any new injuries or constraints - one topic per message, with natural follow-ups for vague answers. Always call weekly_checkin.`;

  const extracted = await callWithForcedTool({
    model: EXTRACTION_MODEL,
    system,
    messages,
    tool: WEEKLY_CHECKIN_TOOL,
    schema: WeeklyCheckinToolSchema,
    maxTokens: 2048,
    effort: 'medium',
  });

  const { isComplete, followUpQuestion, ...feedback } = extracted;
  const replyText = isComplete
    ? "Thanks - I'll use this to update your plan for next week."
    : (followUpQuestion ?? 'Could you tell me a bit more about that?');

  await prisma.coachMessage.create({
    data: { conversationId: conversation.id, role: 'ASSISTANT', content: replyText, toolCalls: extracted },
  });

  let planRegenerated = false;
  if (isComplete) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    const adherenceNote = Object.entries(feedback)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' ');

    await generatePlan(userId, { adherenceNote });
    planRegenerated = true;
  }

  return { conversationId: conversation.id, reply: replyText, isComplete, planRegenerated };
}
