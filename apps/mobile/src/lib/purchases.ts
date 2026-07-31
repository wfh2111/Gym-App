import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
  type PurchasesError,
  type PurchasesPackage,
} from 'react-native-purchases';
import { api } from './api';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

function platformApiKey(): string {
  if (Platform.OS === 'ios') return IOS_KEY;
  if (Platform.OS === 'android') return ANDROID_KEY;
  return '';
}

/**
 * True whenever no RevenueCat project key is configured for this platform - the default in this
 * build, since it has no real App Store/Play Store products to sell against. The paywall still
 * works end-to-end in this mode: "purchasing" calls the backend's mock sync endpoint directly
 * instead of going through StoreKit/Play Billing, so the premium experience is fully testable
 * without a real RevenueCat account.
 */
export const isMockMode = platformApiKey().length === 0;

export async function configurePurchases(userId: string): Promise<void> {
  if (isMockMode) return;
  if (__DEV__) await Purchases.setLogLevel(LOG_LEVEL.WARN);
  Purchases.configure({ apiKey: platformApiKey(), appUserID: userId });
}

export interface PricedPackage {
  identifier: string;
  isAnnual: boolean;
  priceString: string;
  pricePerMonthString: string | null;
  raw: PurchasesPackage | null;
}

export interface Offerings {
  annual: PricedPackage | null;
  monthly: PricedPackage | null;
}

const MOCK_OFFERINGS: Offerings = {
  annual: {
    identifier: 'gymapp_premium_annual',
    isAnnual: true,
    priceString: '$59.99/year',
    pricePerMonthString: '$5.00/mo',
    raw: null,
  },
  monthly: {
    identifier: 'gymapp_premium_monthly',
    isAnnual: false,
    priceString: '$7.99/month',
    pricePerMonthString: null,
    raw: null,
  },
};

function toPricedPackage(pkg: PurchasesPackage, isAnnual: boolean): PricedPackage {
  return {
    identifier: pkg.identifier,
    isAnnual,
    priceString: pkg.product.priceString,
    pricePerMonthString: pkg.product.pricePerMonthString,
    raw: pkg,
  };
}

export async function getOfferings(): Promise<Offerings> {
  if (isMockMode) return MOCK_OFFERINGS;

  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  return {
    annual: current?.annual ? toPricedPackage(current.annual, true) : null,
    monthly: current?.monthly ? toPricedPackage(current.monthly, false) : null,
  };
}

export interface PurchaseOutcome {
  status: 'purchased' | 'cancelled';
}

function isUserCancelled(err: unknown): boolean {
  const purchasesError = err as PurchasesError;
  return purchasesError?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export async function purchase(pkg: PricedPackage): Promise<PurchaseOutcome> {
  if (isMockMode || !pkg.raw) {
    await api.post('/api/billing/sync', { mock: true, isAnnual: pkg.isAnnual, productId: pkg.identifier });
    return { status: 'purchased' };
  }

  try {
    await Purchases.purchasePackage(pkg.raw);
  } catch (err) {
    if (isUserCancelled(err)) return { status: 'cancelled' };
    throw err;
  }

  // Best-effort immediate sync so the app reflects the new tier right away - the RevenueCat
  // webhook remains the source of truth if this call fails for any reason.
  await api.post('/api/billing/sync').catch(() => {});
  return { status: 'purchased' };
}

export async function restorePurchases(): Promise<void> {
  if (isMockMode) return;
  await Purchases.restorePurchases();
  await api.post('/api/billing/sync').catch(() => {});
}
