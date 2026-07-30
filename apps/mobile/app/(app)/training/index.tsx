import { useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { TodayTrainingDayDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

export default function TrainingScreen() {
  const theme = useTheme();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: today, isLoading } = useQuery({
    queryKey: ['training-today'],
    queryFn: () => api.get<TodayTrainingDayDTO | null>('/api/training/today'),
  });

  async function handleStart() {
    if (!today) return;
    setStarting(true);
    setError(null);
    try {
      if (today.activeWorkoutLogId) {
        router.push(`/training/session/${today.activeWorkoutLogId}`);
        return;
      }
      const log = await api.post<{ id: string }>('/api/training/workouts', {
        trainingDayId: today.trainingDayId,
      });
      router.push(`/training/session/${log.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not start your workout.');
    } finally {
      setStarting(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginTop: theme.spacing.m16,
          }}
        >
          <View style={{ gap: theme.spacing.xs4 }}>
            <Text variant="display">Training</Text>
            <Text color="inkMuted">{today?.label ?? 'Today'}</Text>
          </View>
          <Text color="accent" onPress={() => router.push('/training/history')}>
            History
          </Text>
        </View>

        {isLoading ? (
          <Text color="inkMuted">Loading...</Text>
        ) : !today ? (
          <EmptyState title="No plan yet" subtitle="Finish onboarding to get a training split." />
        ) : today.isRestDay ? (
          <Card style={{ alignItems: 'center', gap: theme.spacing.s8, paddingVertical: theme.spacing.xl32 }}>
            <Text variant="heading">Rest day</Text>
            <Text color="inkMuted" style={{ textAlign: 'center' }}>
              Recovery is part of the plan. Light mobility work is a good idea if you feel like moving.
            </Text>
          </Card>
        ) : (
          <>
            {today.focus && <Text color="inkMuted">{today.focus}</Text>}
            <View style={{ gap: theme.spacing.s8 }}>
              {today.exercises.map((ex) => (
                <ExercisePreviewRow key={ex.exerciseName} exercise={ex} />
              ))}
            </View>
            {error && <Text color="danger">{error}</Text>}
            <Button
              label={today.activeWorkoutLogId ? 'Resume workout' : 'Start workout'}
              onPress={handleStart}
              loading={starting}
            />
          </>
        )}
      </View>
    </Screen>
  );
}

function ExercisePreviewRow({ exercise }: { exercise: TodayTrainingDayDTO['exercises'][number] }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        padding: spacing.m16,
        borderRadius: radius.md12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        gap: 2,
      }}
    >
      <Text variant="bodyMedium">{exercise.exerciseName}</Text>
      <Text color="inkMuted">
        {exercise.targetSets} sets x {exercise.targetRepLow}-{exercise.targetRepHigh} reps
        {exercise.suggestion?.action === 'increase_weight' && exercise.suggestion.suggestedWeightKg
          ? ` · try ${exercise.suggestion.suggestedWeightKg}kg`
          : ''}
      </Text>
    </View>
  );
}
