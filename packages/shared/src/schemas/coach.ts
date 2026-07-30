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
