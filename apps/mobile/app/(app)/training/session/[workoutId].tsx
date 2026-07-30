import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { TodayTrainingDayDTO, WorkoutLogDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { SetRow } from '@/components/SetRow';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

export default function WorkoutSessionScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: today } = useQuery({
    queryKey: ['training-today'],
    queryFn: () => api.get<TodayTrainingDayDTO | null>('/api/training/today'),
  });

  const { data: workout, refetch } = useQuery({
    queryKey: ['workout', workoutId],
    queryFn: () => api.get<WorkoutLogDTO>(`/api/training/workouts/${workoutId}`),
    enabled: !!workoutId,
  });

  async function handleLogSet(
    exerciseName: string,
    setIndex: number,
    values: { weightKg?: number; reps?: number; rpe?: number },
  ) {
    await api.post(`/api/training/workouts/${workoutId}/sets`, { exerciseName, setIndex, ...values });
    refetch();
  }

  async function handleFinish() {
    setCompleting(true);
    setError(null);
    try {
      await api.patch(`/api/training/workouts/${workoutId}`, {});
      queryClient.invalidateQueries({ queryKey: ['training-today'] });
      queryClient.invalidateQueries({ queryKey: ['training-history'] });
      router.replace('/(app)/training');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not finish the workout.');
    } finally {
      setCompleting(false);
    }
  }

  if (!today || today.isRestDay) {
    return (
      <Screen>
        <Text color="inkMuted">Loading workout...</Text>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <View style={{ gap: theme.spacing.xs4 }}>
          <Text variant="display">{today.label}</Text>
          <Text color="inkMuted">Log each set as you go.</Text>
        </View>

        {today.exercises.map((exercise) => (
          <Card key={exercise.exerciseName} style={{ gap: theme.spacing.m16 }}>
            <View style={{ gap: 2 }}>
              <Text variant="bodyMedium">{exercise.exerciseName}</Text>
              <Text color="inkMuted">
                Target: {exercise.targetRepLow}-{exercise.targetRepHigh} reps
                {exercise.suggestion?.detail ? ` · ${exercise.suggestion.detail}` : ''}
              </Text>
            </View>
            <View style={{ gap: theme.spacing.s8 }}>
              {Array.from({ length: exercise.targetSets }).map((_, i) => {
                const existing = workout?.sets.find(
                  (s) => s.exerciseName === exercise.exerciseName && s.setIndex === i,
                );
                return (
                  <SetRow
                    key={i}
                    setIndex={i}
                    targetRepLow={exercise.targetRepLow}
                    targetRepHigh={exercise.targetRepHigh}
                    suggestedWeightKg={exercise.suggestion?.suggestedWeightKg}
                    initialWeightKg={existing?.weightKg}
                    initialReps={existing?.reps}
                    initialRpe={existing?.rpe}
                    logged={!!existing}
                    onLog={(values) => handleLogSet(exercise.exerciseName, i, values)}
                  />
                );
              })}
            </View>
          </Card>
        ))}

        {error && <Text color="danger">{error}</Text>}
        <Button label="Finish workout" onPress={handleFinish} loading={completing} />
      </View>
    </Screen>
  );
}
