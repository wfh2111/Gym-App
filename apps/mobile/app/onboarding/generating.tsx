import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

const MESSAGES = [
  'Reading through your profile...',
  'Setting your nutrition targets...',
  'Building your training split...',
  'Putting together a recovery plan...',
];

export default function OnboardingGeneratingScreen() {
  const theme = useTheme();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    generate();
  }, []);

  async function generate() {
    setStatus('loading');
    setError(null);
    try {
      await api.post('/api/plans/generate');
      router.replace('/(app)/today');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not build your plan. Check your connection and try again.',
      );
    }
  }

  return (
    <Screen>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.l24,
          paddingHorizontal: theme.spacing.l24,
        }}
      >
        {status === 'loading' ? (
          <>
            <ActivityIndicator size="large" color={theme.colors.accent} />
            <Text variant="heading" style={{ textAlign: 'center' }}>
              {MESSAGES[messageIndex]}
            </Text>
            <Text color="inkMuted" style={{ textAlign: 'center' }}>
              This usually takes under a minute.
            </Text>
          </>
        ) : (
          <>
            <Text variant="heading" style={{ textAlign: 'center' }}>
              Couldn&apos;t build your plan
            </Text>
            <Text color="inkMuted" style={{ textAlign: 'center' }}>
              {error}
            </Text>
            <Button label="Try again" onPress={generate} />
          </>
        )}
      </View>
    </Screen>
  );
}
