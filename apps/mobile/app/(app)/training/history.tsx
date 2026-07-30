import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { WorkoutLogDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/lib/api';

export default function TrainingHistoryScreen() {
  const theme = useTheme();
  const { data: workouts, isLoading } = useQuery({
    queryKey: ['training-history'],
    queryFn: () => api.get<WorkoutLogDTO[]>('/api/training/history'),
  });

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <Text variant="display">History</Text>
        {isLoading ? (
          <Text color="inkMuted">Loading...</Text>
        ) : !workouts?.length ? (
          <EmptyState title="No workouts yet" subtitle="Completed workouts will show up here." />
        ) : (
          <View style={{ gap: theme.spacing.s8 }}>
            {workouts.map((w) => (
              <WorkoutHistoryCard key={w.id} workout={w} />
            ))}
          </View>
        )}
      </View>
    </Screen>
  );
}

function WorkoutHistoryCard({ workout }: { workout: WorkoutLogDTO }) {
  const theme = useTheme();
  const exerciseNames = Array.from(new Set(workout.sets.map((s) => s.exerciseName)));
  const totalSets = workout.sets.filter((s) => !s.isWarmup).length;
  const date = new Date(workout.startedAt);

  return (
    <Card style={{ gap: theme.spacing.xs4 }}>
      <Text variant="bodyMedium">
        {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
      </Text>
      <Text color="inkMuted">
        {exerciseNames.length} exercises · {totalSets} sets
      </Text>
      {workout.notes && <Text color="inkMuted">&quot;{workout.notes}&quot;</Text>}
    </Card>
  );
}
