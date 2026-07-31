import { useEffect, useState } from 'react';
import { View, Pressable } from 'react-native';
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
import { getOfferings, isMockMode, purchase, restorePurchases, type Offerings, type PricedPackage } from '@/lib/purchases';

const FEATURES = ['Unlimited coach chat', 'Weekly adaptive plan updates', 'Wearable-informed recovery adjustments'];

export default function PaywallScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [offerings, setOfferings] = useState<Offerings | null>(null);
  const [selected, setSelected] = useState<'annual' | 'monthly'>('annual');
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: entitlement } = useQuery({
    queryKey: ['entitlement'],
    queryFn: () => api.get<EntitlementDTO>('/api/billing/entitlement'),
  });
  const isPremium = entitlement?.tier === 'PREMIUM';

  useEffect(() => {
    getOfferings()
      .then(setOfferings)
      .catch(() => setError('Could not load plans. Check your connection and try again.'))
      .finally(() => setLoadingOfferings(false));
  }, []);

  const selectedPackage: PricedPackage | null | undefined = offerings?.[selected];

  async function handlePurchase() {
    if (!selectedPackage) return;
    setError(null);
    setPurchasing(true);
    try {
      const outcome = await purchase(selectedPackage);
      if (outcome.status === 'purchased') {
        await queryClient.invalidateQueries({ queryKey: ['entitlement'] });
        router.back();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Purchase failed. Try again.');
    } finally {
      setPurchasing(false);
    }
  }

  async function handleRestore() {
    setError(null);
    setPurchasing(true);
    try {
      await restorePurchases();
      await queryClient.invalidateQueries({ queryKey: ['entitlement'] });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not restore purchases.');
    } finally {
      setPurchasing(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
          <Ionicons name="close" size={24} color={theme.colors.inkMuted} onPress={() => router.back()} />
        </View>

        <View style={{ gap: theme.spacing.xs4 }}>
          <Text variant="display">Go Premium</Text>
          <Text color="inkMuted">Unlock the full adaptive coaching experience.</Text>
        </View>

        <View style={{ gap: theme.spacing.s8 }}>
          {FEATURES.map((feature) => (
            <View key={feature} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s8 }}>
              <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
              <Text variant="bodyMedium">{feature}</Text>
            </View>
          ))}
        </View>

        {isPremium ? (
          <Card style={{ alignItems: 'center', gap: theme.spacing.s8, paddingVertical: theme.spacing.xl32 }}>
            <Ionicons name="checkmark-circle" size={32} color={theme.colors.accent} />
            <Text variant="heading">You're on Premium</Text>
            <Text color="inkMuted" style={{ textAlign: 'center' }}>
              Manage your subscription from Settings.
            </Text>
            <Button label="Done" variant="secondary" onPress={() => router.back()} />
          </Card>
        ) : (
          <>
            {loadingOfferings ? (
              <Text color="inkMuted">Loading plans...</Text>
            ) : (
              <View style={{ gap: theme.spacing.s8 }}>
                {offerings?.annual && (
                  <PlanCard
                    label="Annual"
                    badge="Best value"
                    priceString={offerings.annual.priceString}
                    subLabel={offerings.annual.pricePerMonthString ? `${offerings.annual.pricePerMonthString} equivalent` : undefined}
                    selected={selected === 'annual'}
                    onPress={() => setSelected('annual')}
                  />
                )}
                {offerings?.monthly && (
                  <PlanCard
                    label="Monthly"
                    priceString={offerings.monthly.priceString}
                    selected={selected === 'monthly'}
                    onPress={() => setSelected('monthly')}
                  />
                )}
              </View>
            )}

            {error && <Text color="danger">{error}</Text>}

            <Button
              label={isMockMode ? 'Simulate purchase' : 'Continue'}
              onPress={handlePurchase}
              loading={purchasing}
              disabled={!selectedPackage}
            />
            <Pressable onPress={handleRestore}>
              <Text color="accent" style={{ textAlign: 'center' }}>
                Restore purchases
              </Text>
            </Pressable>

            <Text color="inkFaint" variant="caption" style={{ textAlign: 'center' }}>
              Cancel anytime. Subscription auto-renews unless cancelled at least 24 hours before the end of the
              current period.
            </Text>
          </>
        )}
      </View>
    </Screen>
  );
}

function PlanCard({
  label,
  badge,
  priceString,
  subLabel,
  selected,
  onPress,
}: {
  label: string;
  badge?: string;
  priceString: string;
  subLabel?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress}>
      <Card
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderColor: selected ? theme.colors.accent : theme.colors.border,
          borderWidth: selected ? 2 : 1,
        }}
      >
        <View style={{ gap: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.s8 }}>
            <Text variant="bodyMedium">{label}</Text>
            {badge && (
              <View
                style={{
                  paddingHorizontal: theme.spacing.s8,
                  paddingVertical: 2,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.accentMuted,
                }}
              >
                <Text variant="caption" style={{ color: theme.colors.accent }}>
                  {badge}
                </Text>
              </View>
            )}
          </View>
          {subLabel && (
            <Text color="inkMuted" variant="caption">
              {subLabel}
            </Text>
          )}
        </View>
        <Text variant="bodyMedium">{priceString}</Text>
      </Card>
    </Pressable>
  );
}
