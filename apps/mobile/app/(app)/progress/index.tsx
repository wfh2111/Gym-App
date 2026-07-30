import { useState } from 'react';
import { View, TextInput } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { ProgressMetric, ProgressTrendsDTO } from '@gym-app/shared';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/Card';
import { Text } from '@/components/Text';
import { Button } from '@/components/Button';
import { SegmentedControl } from '@/components/SegmentedControl';
import { TrendChart } from '@/components/TrendChart';
import { useTheme } from '@/theme/ThemeProvider';
import { api, ApiError } from '@/lib/api';

const METRICS: { value: ProgressMetric; label: string; unit?: string }[] = [
  { value: 'weight', label: 'Weight', unit: 'kg' },
  { value: 'strength', label: 'Strength', unit: 'kg' },
  { value: 'recovery', label: 'Recovery' },
  { value: 'adherence', label: 'Adherence', unit: '%' },
];

export default function ProgressScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [metric, setMetric] = useState<ProgressMetric>('weight');
  const [weightInput, setWeightInput] = useState('');
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['progress-trend', metric],
    queryFn: () => api.get<ProgressTrendsDTO>(`/api/progress/trends?metric=${metric}&range=90d`),
  });

  const activeMeta = METRICS.find((m) => m.value === metric);

  async function handleLogWeight() {
    const value = Number(weightInput);
    if (!value) return;
    setLogging(true);
    setError(null);
    try {
      await api.post('/api/progress/weight', { weightKg: value });
      setWeightInput('');
      queryClient.invalidateQueries({ queryKey: ['progress-trend', 'weight'] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log your weight.');
    } finally {
      setLogging(false);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: theme.spacing.l24 }}>
        <Text variant="display" style={{ marginTop: theme.spacing.m16 }}>
          Progress
        </Text>

        <SegmentedControl
          options={METRICS.map(({ value, label }) => ({ value, label }))}
          value={metric}
          onChange={setMetric}
        />

        <Card>
          {isLoading ? (
            <Text color="inkMuted">Loading...</Text>
          ) : (
            <TrendChart points={data?.points ?? []} unit={activeMeta?.unit} />
          )}
        </Card>

        {metric === 'weight' && (
          <View style={{ gap: theme.spacing.s8 }}>
            <Text variant="heading">Log today&apos;s weight</Text>
            <View style={{ flexDirection: 'row', gap: theme.spacing.s8 }}>
              <TextInput
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="kg"
                placeholderTextColor={theme.colors.inkFaint}
                keyboardType="decimal-pad"
                style={{
                  flex: 1,
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radius.md12,
                  paddingHorizontal: theme.spacing.m16,
                  paddingVertical: theme.spacing.m16,
                  color: theme.colors.ink,
                  backgroundColor: theme.colors.surface,
                }}
              />
              <Button label="Log" onPress={handleLogWeight} loading={logging} fullWidth={false} disabled={!weightInput} />
            </View>
            {error && <Text color="danger">{error}</Text>}
          </View>
        )}
      </View>
    </Screen>
  );
}
