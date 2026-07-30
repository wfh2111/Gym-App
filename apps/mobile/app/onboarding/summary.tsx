import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import { formatEnumLabel } from '@/lib/format';
import { useAuthStore } from '@/lib/authStore';

interface ProfileResponse {
  goal?: string | null;
  experienceLevel?: string | null;
  daysPerWeek?: number | null;
  sessionDurationMinutes?: number | null;
  equipmentAccess?: string | null;
  dietPattern?: string | null;
  sleepHoursAvg?: number | null;
  supplementOpenness?: string | null;
  injuries?: { bodyPart: string; description: string }[] | null;
}

export default function OnboardingSummaryScreen() {
  const theme = useTheme();
  const setUser = useAuthStore((s) => s.setUser);
  const user = useAuthStore((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get<ProfileResponse | null>('/api/profile'),
  });

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await api.post('/api/onboarding/complete');
      if (user) setUser({ ...user, onboardingCompletedAt: new Date().toISOString() });
      router.replace('/onboarding/generating');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  if (isLoading || !profile) {
    return (
      <Screen>
        <Text color="inkMuted">Loading your profile...</Text>
      </Screen>
    );
  }

  const rows: { label: string; value: string }[] = [
    { label: 'Goal', value: formatEnumLabel(profile.goal) || 'Not set' },
    { label: 'Experience', value: formatEnumLabel(profile.experienceLevel) || 'Not set' },
    {
      label: 'Schedule',
      value:
        profile.daysPerWeek && profile.sessionDurationMinutes
          ? `${profile.daysPerWeek}x/week, ~${profile.sessionDurationMinutes} min`
          : 'Not set',
    },
    { label: 'Equipment', value: formatEnumLabel(profile.equipmentAccess) || 'Not set' },
    { label: 'Diet', value: formatEnumLabel(profile.dietPattern) || 'Not set' },
    { label: 'Sleep', value: profile.sleepHoursAvg ? `~${profile.sleepHoursAvg}h/night` : 'Not set' },
    { label: 'Supplements', value: formatEnumLabel(profile.supplementOpenness) || 'Not set' },
    {
      label: 'Injuries',
      value: profile.injuries?.length ? profile.injuries.map((i) => i.bodyPart).join(', ') : 'None noted',
    },
  ];

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.xl32 }}>
        <View style={{ gap: theme.spacing.xs4 }}>
          <Text variant="display">Here&apos;s what I&apos;ve got</Text>
          <Text color="inkMuted">Quick check before I build your plan.</Text>
        </View>

        <Card style={{ gap: theme.spacing.m16 }}>
          {rows.map((row) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text color="inkMuted">{row.label}</Text>
              <Text variant="bodyMedium" style={{ flexShrink: 1, textAlign: 'right' }}>
                {row.value}
              </Text>
            </View>
          ))}
        </Card>

        {error && <Text color="danger">{error}</Text>}

        <Button label="Looks good, build my plan" onPress={handleConfirm} loading={loading} />
      </View>
    </Screen>
  );
}
