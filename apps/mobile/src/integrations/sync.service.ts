import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import type { WearableProvider } from '@gym-app/shared';
import { api } from '@/lib/api';
import { fetchRecentHealthKitRecovery, isHealthKitSupported } from './healthkit.provider';
import { fetchRecentGoogleFitRecovery, isGoogleFitSupported } from './googlefit.provider';

const SYNC_WINDOW_DAYS = 7;

export const REST_PROVIDERS: WearableProvider[] = ['WHOOP', 'OURA', 'GARMIN'];

type NativeProvider = 'APPLE_HEALTH' | 'GOOGLE_FIT';

/** The device's own health store, if any - at most one is ever relevant per install. */
export function nativeProviderForPlatform(): NativeProvider | null {
  if (Platform.OS === 'ios') return 'APPLE_HEALTH';
  if (Platform.OS === 'android') return 'GOOGLE_FIT';
  return null;
}

export function isNativeProviderSupported(): boolean {
  return isHealthKitSupported || isGoogleFitSupported;
}

/** Opens the wearable's OAuth consent screen in an in-app browser and waits for it to redirect
 *  back to the `gymapp://` deep link the backend callback route sends the browser to. */
export async function connectRestProvider(provider: WearableProvider): Promise<'connected' | 'cancelled'> {
  const { url } = await api.post<{ url: string }>(`/api/integrations/${provider}/connect`);
  const result = await WebBrowser.openAuthSessionAsync(url, 'gymapp://settings/integrations');
  return result.type === 'success' ? 'connected' : 'cancelled';
}

export async function disconnectProvider(provider: WearableProvider): Promise<void> {
  await api.delete(`/api/integrations/${provider}`);
}

export async function syncRestProvider(provider: WearableProvider): Promise<number> {
  const { synced } = await api.post<{ synced: number }>(`/api/integrations/${provider}/sync`);
  return synced;
}

/** Pulls recent data straight from the on-device health store and pushes it to the backend -
 *  there's no OAuth step for Apple Health / Google Fit, just an OS permission prompt. */
export async function syncNativeHealthData(): Promise<number> {
  const provider = nativeProviderForPlatform();
  if (!provider) throw new Error('No native health source is available on this platform.');

  const data =
    provider === 'APPLE_HEALTH'
      ? await fetchRecentHealthKitRecovery(SYNC_WINDOW_DAYS)
      : await fetchRecentGoogleFitRecovery(SYNC_WINDOW_DAYS);

  if (data.length === 0) return 0;

  const { synced } = await api.post<{ synced: number }>(`/api/integrations/${provider}/sync`, {
    source: provider,
    data,
  });
  return synced;
}
