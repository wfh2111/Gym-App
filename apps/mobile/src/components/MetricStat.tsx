import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

interface MetricStatProps {
  label: string;
  value: string;
  color?: 'ink' | 'accent' | 'success' | 'warning' | 'danger';
}

export function MetricStat({ label, value, color = 'ink' }: MetricStatProps) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', gap: spacing.xs4 }}>
      <Text variant="heading" color={color}>
        {value}
      </Text>
      <Text variant="caption" color="inkMuted">
        {label}
      </Text>
    </View>
  );
}
