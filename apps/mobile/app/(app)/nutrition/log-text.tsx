import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { MealType, NutritionLogDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { MealTypePicker } from '@/components/MealTypePicker';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';
import { defaultMealTypeForNow } from '@/lib/mealTime';

export default function LogTextScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [mealType, setMealType] = useState<MealType>(defaultMealTypeForNow());
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionLogDTO | null>(null);

  async function handleSubmit() {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const log = await api.post<NutritionLogDTO>('/api/nutrition/logs', {
        mealType,
        source: 'TEXT',
        text: text.trim(),
      });
      setResult(log);
      queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log that meal. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!result) return;
    await api.delete(`/api/nutrition/logs/${result.id}`);
    queryClient.invalidateQueries({ queryKey: ['nutrition-summary'] });
    router.back();
  }

  if (result) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: theme.spacing.l24 }}>
          <Text variant="heading">Logged!</Text>
          <View style={{ gap: theme.spacing.xs4 }}>
            <Text variant="bodyMedium">{result.description}</Text>
            <Text color="inkMuted">
              {result.calories} kcal · {result.proteinG}g protein · {result.carbsG}g carbs · {result.fatG}g fat
            </Text>
          </View>
          <Button label="Done" onPress={() => router.back()} />
          <Button label="Remove this log" variant="ghost" onPress={handleRemove} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24, marginTop: theme.spacing.m16 }}>
        <Text variant="display">Log a meal</Text>
        <MealTypePicker value={mealType} onChange={setMealType} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. Grilled chicken breast with rice and broccoli"
          placeholderTextColor={theme.colors.inkFaint}
          multiline
          style={{
            minHeight: 120,
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: theme.radius.md12,
            padding: theme.spacing.m16,
            color: theme.colors.ink,
            backgroundColor: theme.colors.surface,
            textAlignVertical: 'top',
          }}
        />
        {error && <Text color="danger">{error}</Text>}
        <Button label="Estimate & log" onPress={handleSubmit} loading={loading} disabled={!text.trim()} />
      </View>
    </Screen>
  );
}
