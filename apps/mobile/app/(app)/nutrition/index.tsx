import { View, Pressable } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NutritionSummaryDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { ProgressRing } from '@/components/ProgressRing';
import { EmptyState } from '@/components/EmptyState';
import { useTheme } from '@/theme/ThemeProvider';
import { api } from '@/lib/api';
import { formatEnumLabel } from '@/lib/format';

type LogEntry = NutritionSummaryDTO['logs'][number];

export default function NutritionScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();

  const { data: summary, isLoading } = useQuery({
    queryKey: ['nutrition-summary'],
    queryFn: () => api.get<NutritionSummaryDTO>('/api/nutrition/summary'),
  });

  async function handleDelete(id: string) {
    queryClient.setQueryData<NutritionSummaryDTO>(['nutrition-summary'], (prev) =>
      prev ? { ...prev, logs: prev.logs.filter((l) => l.id !== id) } : prev,
    );
    try {
      await api.delete(`/api/nutrition/logs/${id}`);
    } finally {
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    }
  }

  const target = summary?.target;
  const consumed = summary?.consumed ?? { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
  const calorieProgress = target && target.calories > 0 ? consumed.calories / target.calories : 0;

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24 }}>
        <View style={{ gap: theme.spacing.xs4, marginTop: theme.spacing.m16 }}>
          <Text variant="display">Nutrition</Text>
          <Text color="inkMuted">Today&apos;s intake</Text>
        </View>

        <Card style={{ alignItems: 'center', gap: theme.spacing.l24 }}>
          <ProgressRing
            progress={calorieProgress}
            value={`${consumed.calories}`}
            label={target ? `of ${target.calories} kcal` : 'kcal logged'}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
            <MacroStat label="Protein" value={consumed.proteinG} target={target?.proteinG} />
            <MacroStat label="Carbs" value={consumed.carbsG} target={target?.carbsG} />
            <MacroStat label="Fat" value={consumed.fatG} target={target?.fatG} />
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
          <LogMethodButton icon="create-outline" label="Text" onPress={() => router.push('/nutrition/log-text')} />
          <LogMethodButton icon="camera-outline" label="Photo" onPress={() => router.push('/nutrition/log-photo')} />
          <LogMethodButton icon="barcode-outline" label="Barcode" onPress={() => router.push('/nutrition/log-barcode')} />
        </View>

        <View style={{ gap: theme.spacing.s8 }}>
          <Text variant="heading">Logged today</Text>
          {isLoading ? (
            <Text color="inkMuted">Loading...</Text>
          ) : !summary?.logs.length ? (
            <EmptyState title="Nothing logged yet" subtitle="Use one of the options above to log your first meal." />
          ) : (
            <View style={{ gap: theme.spacing.s8 }}>
              {summary.logs.map((log) => (
                <MealRow key={log.id} log={log} onDelete={() => handleDelete(log.id)} />
              ))}
            </View>
          )}
        </View>
      </View>
    </Screen>
  );
}

function MacroStat({ label, value, target }: { label: string; value: number; target?: number }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <Text variant="bodyMedium">
        {value}g{target ? ` / ${target}g` : ''}
      </Text>
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
    </View>
  );
}

function LogMethodButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors, spacing, radius } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        alignItems: 'center',
        gap: spacing.xs4,
        paddingVertical: spacing.m16,
        borderRadius: radius.md12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <Ionicons name={icon} size={22} color={colors.accent} />
      <Text variant="caption">{label}</Text>
    </Pressable>
  );
}

function MealRow({ log, onDelete }: { log: LogEntry; onDelete: () => void }) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.m16,
        borderRadius: radius.md12,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="caption" color="inkMuted">
          {formatEnumLabel(log.mealType)}
        </Text>
        <Text variant="bodyMedium">{log.description}</Text>
        <Text color="inkMuted">
          {log.calories} kcal · {log.proteinG}g P · {log.carbsG}g C · {log.fatG}g F
        </Text>
      </View>
      <Pressable onPress={onDelete} hitSlop={12}>
        <Ionicons name="trash-outline" size={18} color={colors.inkFaint} />
      </Pressable>
    </View>
  );
}
