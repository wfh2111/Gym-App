import { z } from 'zod';
import type { Subscription } from '@prisma/client';
import type { EntitlementDTO, SyncEntitlementInput } from '@gym-app/shared';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { startOfWeek } from '../lib/date';

export const isRevenueCatConfigured = env.REVENUECAT_PROJECT_API_KEY.length > 0;

const REVENUECAT_API_BASE = 'https://api.revenuecat.com/v1';
const PREMIUM_ENTITLEMENT_ID = 'premium';

/** TRIALING and GRACE_PERIOD both mean the user should keep full access - a trial that gated
 *  features would defeat the point of offering one, and a grace period exists precisely so a
 *  billing hiccup doesn't lock someone out mid-renewal. */
export function hasPremiumAccess(subscription: Pick<Subscription, 'tier' | 'status'> | null): boolean {
  if (!subscription || subscription.tier !== 'PREMIUM') return false;
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIALING' || subscription.status === 'GRACE_PERIOD';
}

function isAnnualProduct(productId: string | null | undefined): boolean {
  return /annual|year/i.test(productId ?? '');
}

export async function getEntitlement(userId: string): Promise<EntitlementDTO> {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const weekStart = startOfWeek(new Date());
  const usage = await prisma.coachMessageUsage.findUnique({
    where: { userId_weekStartDate: { userId, weekStartDate: weekStart } },
  });

  return {
    tier: subscription?.tier ?? 'FREE',
    status: subscription?.status ?? 'NONE',
    isAnnual: subscription?.isAnnual ?? false,
    currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
    coachMessagesUsedThisWeek: usage?.messageCount ?? 0,
    coachMessagesLimitPerWeek: hasPremiumAccess(subscription) ? null : env.FREE_COACH_MESSAGES_PER_WEEK,
  };
}

/**
 * Sandbox/mock upgrade path, used only when no RevenueCat project is configured (no real store
 * receipt exists for the server to verify against). Gated to non-production in the route layer.
 */
export async function syncMockEntitlement(userId: string, input: SyncEntitlementInput): Promise<EntitlementDTO> {
  const currentPeriodEnd = new Date();
  if (input.isAnnual) currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1);
  else currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1);

  await prisma.subscription.upsert({
    where: { userId },
    update: { tier: 'PREMIUM', status: 'ACTIVE', isAnnual: input.isAnnual, productId: input.productId, currentPeriodEnd },
    create: {
      userId,
      tier: 'PREMIUM',
      status: 'ACTIVE',
      isAnnual: input.isAnnual,
      productId: input.productId,
      currentPeriodEnd,
    },
  });

  return getEntitlement(userId);
}

/** Mock-mode-only downgrade, so the free-tier experience can be re-tested without a second account. */
export async function resetMockEntitlement(userId: string): Promise<EntitlementDTO> {
  await prisma.subscription.upsert({
    where: { userId },
    update: { tier: 'FREE', status: 'NONE', isAnnual: false, productId: null, currentPeriodEnd: null },
    create: { userId, tier: 'FREE', status: 'NONE' },
  });
  return getEntitlement(userId);
}

interface RevenueCatSubscriberEntitlement {
  expires_date: string | null;
  product_identifier: string;
}

/** RevenueCat's REST API v1 subscriber shape - stable and documented, but unverified against a
 *  real project in this environment since no RevenueCat account is configured here. */
async function fetchRevenueCatSubscriber(
  userId: string,
): Promise<Record<string, RevenueCatSubscriberEntitlement> | null> {
  const res = await fetch(`${REVENUECAT_API_BASE}/subscribers/${encodeURIComponent(userId)}`, {
    headers: { Authorization: `Bearer ${env.REVENUECAT_PROJECT_API_KEY}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    subscriber?: { entitlements?: Record<string, RevenueCatSubscriberEntitlement> };
  };
  return data.subscriber?.entitlements ?? null;
}

/**
 * Client-triggered re-check against RevenueCat's own API (source of truth), used for real
 * projects instead of trusting whatever the client posts. Only ever upgrades - letting a
 * point-in-time miss downgrade someone would fight the EXPIRATION webhook, which is the actual
 * source of truth for revoking access.
 */
export async function syncEntitlementFromRevenueCat(userId: string): Promise<EntitlementDTO> {
  const entitlements = await fetchRevenueCatSubscriber(userId);
  const entitlement = entitlements?.[PREMIUM_ENTITLEMENT_ID];
  const isActive = entitlement && (!entitlement.expires_date || new Date(entitlement.expires_date) > new Date());

  if (isActive && entitlement) {
    const currentPeriodEnd = entitlement.expires_date ? new Date(entitlement.expires_date) : null;
    await prisma.subscription.upsert({
      where: { userId },
      update: {
        tier: 'PREMIUM',
        status: 'ACTIVE',
        productId: entitlement.product_identifier,
        isAnnual: isAnnualProduct(entitlement.product_identifier),
        currentPeriodEnd,
      },
      create: {
        userId,
        tier: 'PREMIUM',
        status: 'ACTIVE',
        productId: entitlement.product_identifier,
        isAnnual: isAnnualProduct(entitlement.product_identifier),
        currentPeriodEnd,
      },
    });
  }

  return getEntitlement(userId);
}

const RevenueCatWebhookEventSchema = z.object({
  event: z.object({
    type: z.string(),
    app_user_id: z.string(),
    product_id: z.string().optional(),
    period_type: z.string().optional(),
    expiration_at_ms: z.number().nullable().optional(),
  }),
});

const RENEWING_EVENT_TYPES = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
  'SUBSCRIPTION_EXTENDED',
]);

/**
 * Applies a RevenueCat webhook event to our Subscription table. Always resolves (never throws
 * on a malformed/irrelevant payload) so the route can ack with 200 and avoid RevenueCat's retry
 * backoff - the only failure mode we actually want surfaced is a bad webhook secret, checked
 * before this is called.
 */
export async function applyRevenueCatWebhookEvent(payload: unknown): Promise<void> {
  const parsed = RevenueCatWebhookEventSchema.safeParse(payload);
  if (!parsed.success) return;

  const { type, app_user_id: userId, product_id: productId, period_type: periodType, expiration_at_ms: expirationAtMs } =
    parsed.data.event;

  // app_user_id is set to our internal user id via Purchases.logIn() client-side, so this should
  // always resolve - but ignore anything that doesn't rather than 500 on a stray/test event.
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (RENEWING_EVENT_TYPES.has(type)) {
    const currentPeriodEnd = expirationAtMs ? new Date(expirationAtMs) : null;
    const status = periodType === 'TRIAL' ? 'TRIALING' : 'ACTIVE';
    await prisma.subscription.upsert({
      where: { userId },
      update: { tier: 'PREMIUM', status, productId, isAnnual: isAnnualProduct(productId), currentPeriodEnd },
      create: { userId, tier: 'PREMIUM', status, productId, isAnnual: isAnnualProduct(productId), currentPeriodEnd },
    });
    return;
  }

  if (type === 'BILLING_ISSUE') {
    await prisma.subscription.updateMany({ where: { userId }, data: { status: 'GRACE_PERIOD' } });
    return;
  }

  if (type === 'EXPIRATION') {
    await prisma.subscription.updateMany({ where: { userId }, data: { tier: 'FREE', status: 'EXPIRED' } });
    return;
  }

  // CANCELLATION means auto-renew was turned off but the user is still entitled until
  // expiration_at_ms - intentionally a no-op here; EXPIRATION is what actually revokes access.
}
