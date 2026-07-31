import { z } from 'zod';

/**
 * Posted right after a client-side purchase completes, so the app reflects the new tier
 * immediately instead of waiting on the RevenueCat webhook. The backend only trusts this body
 * outright when it has no REVENUECAT_PROJECT_API_KEY configured (sandbox/mock mode) - once a
 * real key is set, the server independently re-verifies against RevenueCat's API instead of
 * trusting client-submitted entitlement claims.
 */
export const SyncEntitlementInputSchema = z.object({
  mock: z.literal(true),
  isAnnual: z.boolean(),
  productId: z.string().min(1),
});
export type SyncEntitlementInput = z.infer<typeof SyncEntitlementInputSchema>;
