import type { RecoveryProvider } from '@gym-app/shared';
import { whoopProvider } from './whoop.provider';
import { ouraProvider } from './oura.provider';
import { garminProvider } from './garmin.provider';

export type RestRecoveryProviderId = 'WHOOP' | 'OURA' | 'GARMIN';

export const REST_RECOVERY_PROVIDER_IDS: RestRecoveryProviderId[] = ['WHOOP', 'OURA', 'GARMIN'];

const registry: Record<RestRecoveryProviderId, RecoveryProvider> = {
  WHOOP: whoopProvider,
  OURA: ouraProvider,
  GARMIN: garminProvider,
};

export function isRestRecoveryProvider(id: string): id is RestRecoveryProviderId {
  return id === 'WHOOP' || id === 'OURA' || id === 'GARMIN';
}

export function getRecoveryProvider(providerId: RestRecoveryProviderId): RecoveryProvider {
  return registry[providerId];
}
