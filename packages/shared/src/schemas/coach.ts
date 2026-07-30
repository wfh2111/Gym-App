import { z } from 'zod';

export const SendOnboardingMessageInputSchema = z.object({
  text: z.string().min(1).max(2000),
});
export type SendOnboardingMessageInput = z.infer<typeof SendOnboardingMessageInputSchema>;

export const SendCoachMessageInputSchema = z.object({
  conversationId: z.string().optional(),
  text: z.string().min(1).max(2000),
});
export type SendCoachMessageInput = z.infer<typeof SendCoachMessageInputSchema>;

/** Optional tool the coach can use mid-chat to flag that the user is asking for a plan change,
 *  without actually mutating the plan outside the weekly regeneration cycle. */
export const NotePlanAdjustmentRequestToolSchema = z.object({
  summary: z.string().describe('One-sentence summary of what the user wants changed.'),
  category: z.enum(['nutrition', 'training', 'recovery', 'supplements']),
});
export type NotePlanAdjustmentRequestToolInput = z.infer<typeof NotePlanAdjustmentRequestToolSchema>;

/** Forced tool-use schema for the weekly re-assessment conversation. Mirrors the onboarding
 *  extraction pattern: re-emit everything learned this session each turn. */
export const WeeklyCheckinToolSchema = z.object({
  trainingFeedback: z.string().optional().describe('How training felt this week - energy, difficulty, any pain.'),
  nutritionFeedback: z.string().optional().describe('How nutrition adherence felt this week.'),
  sleepUpdate: z.string().optional().describe('Any changes to sleep or recovery.'),
  newConstraints: z.string().optional().describe('Any new injuries, schedule changes, or constraints.'),
  isComplete: z
    .boolean()
    .describe("True once enough has been gathered across training, nutrition, sleep, and constraints to inform next week's plan."),
  followUpQuestion: z.string().optional().describe('The single next question to ask if not complete.'),
});
export type WeeklyCheckinToolInput = z.infer<typeof WeeklyCheckinToolSchema>;
