import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { WearableConnectionDTO, WearableProvider } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import {
  REST_PROVIDERS,
  connectRestProvider,
  disconnectProvider,
  nativeProviderForPlatform,
  syncNativeHealthData,
  syncRestProvider,
} from '@/integrations/sync.service';

type IconName = keyof typeof Ionicons.glyphMap;

const PROVIDER_META: Record<WearableProvider, { label: string; icon: IconName; description: string }> = {
  WHOOP: { label: 'Whoop', icon: 'body-outline', description: 'Recovery, strain, and sleep' },
  OURA: { label: 'Oura', icon: 'ellipse-outline', description: 'Readiness, sleep, and HRV' },
  GARMIN: { label: 'Garmin', icon: 'watch-outline', description: 'Sleep and heart rate' },
  APPLE_HEALTH: { label: 'Apple Health', icon: 'heart-outline', description: 'Sleep, HRV, and resting heart rate' },
  GOOGLE_FIT: { label: 'Google Fit', icon: 'heart-outline', description: 'Sleep and resting heart rate' },
};

export default function IntegrationsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [busyProvider, setBusyProvider] = useState<WearableProvider | null>(null);
  const [messageByProvider, setMessageByProvider] = useState<Partial<Record<WearableProvider, string>>>({});

  const { data: connections, isLoading } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => api.get<WearableConnectionDTO[]>('/api/integrations'),
  });

  const connectionFor = (provider: WearableProvider) => connections?.find((c) => c.provider === provider);

  function setMessage(provider: WearableProvider, message: string | null) {
    setMessageByProvider((prev) => ({ ...prev, [provider]: message ?? undefined }));
  }

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ['integrations'] });
  }

  async function handleConnectRest(provider: WearableProvider) {
    setBusyProvider(provider);
    setMessage(provider, null);
    try {
      const outcome = await connectRestProvider(provider);
      if (outcome === 'connected') await refresh();
    } catch (err) {
      setMessage(provider, err instanceof ApiError ? err.message : 'Could not start that connection. Try again.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleSyncRest(provider: WearableProvider) {
    setBusyProvider(provider);
    setMessage(provider, null);
    try {
      const synced = await syncRestProvider(provider);
      setMessage(provider, `Synced ${synced} day${synced === 1 ? '' : 's'} of data.`);
      await refresh();
    } catch (err) {
      setMessage(provider, err instanceof ApiError ? err.message : 'Sync failed. Try again.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleDisconnect(provider: WearableProvider) {
    setBusyProvider(provider);
    setMessage(provider, null);
    try {
      await disconnectProvider(provider);
      await refresh();
    } catch (err) {
      setMessage(provider, err instanceof ApiError ? err.message : 'Could not disconnect. Try again.');
    } finally {
      setBusyProvider(null);
    }
  }

  async function handleSyncNative(provider: WearableProvider) {
    setBusyProvider(provider);
    setMessage(provider, null);
    try {
      const synced = await syncNativeHealthData();
      setMessage(
        provider,
        synced > 0 ? `Synced ${synced} day${synced === 1 ? '' : 's'} of data.` : 'No new data was available yet.',
      );
      await refresh();
    } catch (err) {
      setMessage(provider, err instanceof Error ? err.message : 'Could not read health data. Try again.');
    } finally {
      setBusyProvider(null);
    }
  }

  const nativeProvider = nativeProviderForPlatform();

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <Text variant="display">Connected devices</Text>
        <Text color="inkMuted">
          Sync sleep and recovery data so your coach can adjust training and nutrition around how you&apos;re
          actually recovering.
        </Text>

        {isLoading ? (
          <Text color="inkMuted">Loading...</Text>
        ) : (
          <>
            {nativeProvider && (
              <View style={{ gap: theme.spacing.s8 }}>
                <Text variant="heading">On this device</Text>
                <ProviderCard
                  provider={nativeProvider}
                  connection={connectionFor(nativeProvider)}
                  busy={busyProvider === nativeProvider}
                  message={messageByProvider[nativeProvider]}
                  onConnect={() => handleSyncNative(nativeProvider)}
                  onSync={() => handleSyncNative(nativeProvider)}
                  onDisconnect={() => handleDisconnect(nativeProvider)}
                  disconnectLabel="Turn off syncing"
                />
              </View>
            )}

            <View style={{ gap: theme.spacing.s8 }}>
              <Text variant="heading">Wearables</Text>
              {REST_PROVIDERS.map((provider) => (
                <ProviderCard
                  key={provider}
                  provider={provider}
                  connection={connectionFor(provider)}
                  busy={busyProvider === provider}
                  message={messageByProvider[provider]}
                  onConnect={() => handleConnectRest(provider)}
                  onSync={() => handleSyncRest(provider)}
                  onDisconnect={() => handleDisconnect(provider)}
                />
              ))}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function ProviderCard({
  provider,
  connection,
  busy,
  message,
  onConnect,
  onSync,
  onDisconnect,
  disconnectLabel = 'Disconnect',
}: {
  provider: WearableProvider;
  connection: WearableConnectionDTO | undefined;
  busy: boolean;
  message: string | undefined;
  onConnect: () => void;
  onSync: () => void;
  onDisconnect: () => void;
  disconnectLabel?: string;
}) {
  const theme = useTheme();
  const meta = PROVIDER_META[provider];
  const isConnected = connection?.status === 'CONNECTED';

  return (
    <Card style={{ gap: theme.spacing.s8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.m16 }}>
        <Ionicons name={meta.icon} size={24} color={theme.colors.ink} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="bodyMedium">{meta.label}</Text>
          <Text color="inkMuted" variant="caption">
            {meta.description}
          </Text>
        </View>
        <StatusPill connected={isConnected} />
      </View>

      {busy ? (
        <ActivityIndicator color={theme.colors.accent} />
      ) : (
        <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
          {isConnected ? (
            <>
              <Button label="Sync now" variant="secondary" fullWidth={false} onPress={onSync} />
              <Button label={disconnectLabel} variant="ghost" fullWidth={false} onPress={onDisconnect} />
            </>
          ) : (
            <Button label="Connect" variant="secondary" fullWidth={false} onPress={onConnect} />
          )}
        </View>
      )}

      {message && (
        <Text color="inkMuted" variant="caption">
          {message}
        </Text>
      )}
    </Card>
  );
}

function StatusPill({ connected }: { connected: boolean }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        paddingHorizontal: spacing.s8,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: connected ? colors.accentMuted : colors.surfaceMuted,
      }}
    >
      <Text variant="caption" style={{ color: connected ? colors.accent : colors.inkFaint }}>
        {connected ? 'Connected' : 'Not connected'}
      </Text>
    </View>
  );
}
