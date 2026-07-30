import type Anthropic from '@anthropic-ai/sdk';
import type { Profile as ProfileRow } from '@prisma/client';
import { ExtractProfileToolSchema, type Profile } from '@gym-app/shared';
import { toAnthropicTool } from '@gym-app/shared/llm/toolSchema';
import { prisma } from '../../lib/prisma';
import { EXTRACTION_MODEL } from './anthropic.client';
import { callWithForcedTool } from './toolCall';

const EXTRACT_PROFILE_TOOL = toAnthropicTool(
  'extract_profile',
  'Record the structured user profile built up so far in the onboarding conversation, merged with anything new from the latest message.',
  ExtractProfileToolSchema,
);

const SYSTEM_PROMPT = `You are the onboarding coach for Gym App, a calm, encouraging fitness coaching app. Have a natural, warm conversation that gathers everything needed to build the user's first personalized plan - this is not a form, it's a conversation.

Topics you need clear answers on, roughly in this order (skip ones already known):
1. Primary goal (fat loss, muscle gain, recomp, performance, general health)
2. Training history and experience level
3. Equipment access and weekly schedule (days/week, session length)
4. Diet pattern, restrictions, allergies
5. Sleep and recovery habits
6. Injuries or physical limitations
7. Openness to supplements (none / open to basics like protein and creatine / open to more)

Rules:
- Ask about ONE topic per message. Never stack multiple questions.
- If an answer is vague ("I sleep fine", "flexible schedule", "I've lifted before"), ask a natural, specific follow-up before treating that topic as settled.
- Keep your tone warm and conversational - like a knowledgeable friend, not a form. 1-3 sentences per turn.
- Never re-ask about a topic you already have a clear, specific answer for.
- Always call the extract_profile tool with your full understanding of the profile so far, merged with anything new from the user's latest message. Preserve fields you already knew unless the user contradicts them.`;

const OPENING_MESSAGE =
  "Hi! I'll ask a few questions so I can build a plan that actually fits your life - should take a couple minutes. Let's start simple: what's the main thing you want out of training right now? Fat loss, building muscle, general health, or performance in a specific sport?";

export async function getOrCreateOnboardingConversation(userId: string) {
  const existing = await prisma.conversation.findFirst({
    where: { userId, type: 'ONBOARDING', status: 'ACTIVE' },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (existing) return existing;

  return prisma.conversation.create({
    data: {
      userId,
      type: 'ONBOARDING',
      status: 'ACTIVE',
      messages: { create: [{ role: 'ASSISTANT', content: OPENING_MESSAGE }] },
    },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
}

function knownProfileFromRow(profile: ProfileRow | null): Partial<Profile> {
  if (!profile) return {};
  return {
    goal: profile.goal ?? undefined,
    experienceLevel: profile.experienceLevel ?? undefined,
    trainingHistoryNotes: profile.trainingHistoryNotes ?? undefined,
    daysPerWeek: profile.daysPerWeek ?? undefined,
    sessionDurationMinutes: profile.sessionDurationMinutes ?? undefined,
    equipmentAccess: profile.equipmentAccess ?? undefined,
    dietPattern: profile.dietPattern ?? undefined,
    dietaryRestrictions: profile.dietaryRestrictions,
    allergies: profile.allergies,
    heightCm: profile.heightCm ?? undefined,
    currentWeightKg: profile.currentWeightKg ?? undefined,
    targetWeightKg: profile.targetWeightKg ?? undefined,
    sex: profile.sex ?? undefined,
    birthYear: profile.birthYear ?? undefined,
    activityLevel: profile.activityLevel ?? undefined,
    sleepHoursAvg: profile.sleepHoursAvg ?? undefined,
    sleepQualityNotes: profile.sleepQualityNotes ?? undefined,
    injuries: (profile.injuries as Profile['injuries']) ?? undefined,
    supplementOpenness: profile.supplementOpenness ?? undefined,
  };
}

export interface OnboardingTurnResult {
  reply: string;
  isComplete: boolean;
  missingOrVagueTopics: string[];
}

export async function sendOnboardingMessage(userId: string, text: string): Promise<OnboardingTurnResult> {
  const conversation = await getOrCreateOnboardingConversation(userId);

  await prisma.coachMessage.create({
    data: { conversationId: conversation.id, role: 'USER', content: text },
  });

  const [profileRow, history] = await Promise.all([
    prisma.profile.findUnique({ where: { userId } }),
    prisma.coachMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const messages: Anthropic.MessageParam[] = history
    .filter((m) => m.role === 'USER' || m.role === 'ASSISTANT')
    .map((m) => ({ role: m.role === 'USER' ? 'user' : 'assistant', content: m.content }));

  const known = knownProfileFromRow(profileRow);
  const system = `${SYSTEM_PROMPT}\n\nProfile info already known (JSON - merge and preserve unless the latest message updates it):\n${JSON.stringify(known)}`;

  const extracted = await callWithForcedTool({
    model: EXTRACTION_MODEL,
    system,
    messages,
    tool: EXTRACT_PROFILE_TOOL,
    schema: ExtractProfileToolSchema,
    maxTokens: 4096,
    effort: 'medium',
  });

  const { isComplete, missingOrVagueTopics, followUpQuestion, ...profileFields } = extracted;

  await prisma.profile.upsert({
    where: { userId },
    update: {
      ...profileFields,
      rawOnboardingTranscript: history.map((m) => ({ role: m.role, content: m.content })),
      ...(isComplete ? { onboardingCompletedAt: new Date() } : {}),
    },
    create: {
      userId,
      ...profileFields,
      ...(isComplete ? { onboardingCompletedAt: new Date() } : {}),
    },
  });

  const replyText = isComplete
    ? "That's everything I need for a first plan - give me a moment to put it together."
    : (followUpQuestion ?? 'Could you tell me a bit more about that?');

  await prisma.coachMessage.create({
    data: {
      conversationId: conversation.id,
      role: 'ASSISTANT',
      content: replyText,
      toolCalls: extracted,
    },
  });

  if (isComplete) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });
  }

  return { reply: replyText, isComplete, missingOrVagueTopics };
}
