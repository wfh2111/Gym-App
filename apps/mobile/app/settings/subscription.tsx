import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { EntitlementDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import { isMockMode } from '@/lib/purchases';

export default function SubscriptionScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: entitlement, isLoading } = useQuery({
    queryKey: ['entitlement'],
    queryFn: () => api.get<EntitlementDTO>('/api/billing/entitlement'),
  });

  const isPremium = entitlement?.tier === 'PREMIUM';

  async function handleMockReset() {
    setBusy(true);
    setError(null);
    try {
      await api.post('/api/billing/mock-reset');
      await queryClient.invalidateQueries({ queryKey: ['entitlement'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset subscription.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <Text variant="display">Subscription</Text>

        {isLoading ? (
          <Text color="inkMuted">Loading...</Text>
        ) : (
          <Card style={{ gap: theme.spacing.s8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s8 }}>
              <Ionicons name={isPremium ? 'star' : 'star-outline'} size={20} color={theme.colors.accent} />
              <Text variant="heading">{isPremium ? 'Premium' : 'Free'}</Text>
            </View>
            {isPremium ? (
              <>
                <Text color="inkMuted">
                  {entitlement?.isAnnual ? 'Billed annually' : 'Billed monthly'}
                  {entitlement?.currentPeriodEnd
                    ? ` · renews ${new Date(entitlement.currentPeriodEnd).toLocaleDateString()}`
                    : ''}
                </Text>
                <Text color="inkMuted">
                  Unlimited coach chat, weekly adaptive plans, and wearable-informed recovery adjustments.
                </Text>
              </>
            ) : (
              <Text color="inkMuted">
                {entitlement?.coachMessagesUsedThisWeek ?? 0} of {entitlement?.coachMessagesLimitPerWeek ?? '–'}{' '}
                coach messages used this week.
              </Text>
            )}
          </Card>
        )}

        {!isPremium && <Button label="Upgrade to Premium" onPress={() => router.push('/paywall')} />}

        {error && <Text color="danger">{error}</Text>}

        {isMockMode && isPremium && (
          <Button label="Reset to Free (mock mode)" variant="ghost" onPress={handleMockReset} loading={busy} />
        )}
      </View>
    </Screen>
  );
}
