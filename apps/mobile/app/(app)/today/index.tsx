import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import type { TodayResponseDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { StreakBadge } from '@/components/StreakBadge';
import { CoachTipCard } from '@/components/CoachTipCard';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { formatEnumLabel } from '@/lib/format';

export default function TodayScreen() {
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const { data, isLoading } = useQuery({
    queryKey: ['today'],
    queryFn: () => api.get<TodayResponseDTO>('/api/today'),
  });

  const firstName = user?.email.split('@')[0];

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24 }}>
        <View style={{ gap: theme.spacing.s8, marginTop: theme.spacing.m16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="display">Hey{firstName ? `, ${firstName}` : ''}</Text>
            <Ionicons
              name="settings-outline"
              size={22}
              color={theme.colors.inkMuted}
              onPress={() => router.push('/settings')}
            />
          </View>
          {!isLoading && data && <StreakBadge days={data.streakDays} />}
        </View>

        {isLoading ? (
          <Text color="inkMuted">Loading...</Text>
        ) : (
          <>
            {data?.coachTip && <CoachTipCard tip={data.coachTip} />}

            {data?.nextMeal && (
              <Card style={{ gap: theme.spacing.xs4 }}>
                <Text color="inkMuted">Next meal</Text>
                <Text variant="heading">{formatEnumLabel(data.nextMeal.mealType)}</Text>
                <Text color="inkMuted">{data.nextMeal.caloriesRemaining} kcal left today</Text>
                <Button label="Log a meal" variant="secondary" onPress={() => router.push('/nutrition')} />
              </Card>
            )}

            {data?.training && (
              <Card style={{ gap: theme.spacing.xs4 }}>
                <Text color="inkMuted">{data.training.isRestDay ? 'Today' : 'Next workout'}</Text>
                <Text variant="heading">{data.training.isRestDay ? 'Rest day' : data.training.label}</Text>
                {!data.training.isRestDay && data.training.focus && (
                  <Text color="inkMuted">{data.training.focus}</Text>
                )}
                {!data.training.isRestDay && (
                  <Button
                    label={data.training.activeWorkoutLogId ? 'Resume workout' : 'Go to training'}
                    variant="secondary"
                    onPress={() => router.push('/training')}
                  />
                )}
              </Card>
            )}

            {!data?.nextMeal && !data?.training && (
              <Card style={{ alignItems: 'center', gap: theme.spacing.s8, paddingVertical: theme.spacing.xl32 }}>
                <Text variant="heading">No plan yet</Text>
                <Text color="inkMuted" style={{ textAlign: 'center' }}>
                  Finish onboarding to get your personalized plan.
                </Text>
              </Card>
            )}
          </>
        )}
      </View>
    </Screen>
  );
}
