import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

export function CoachTipCard({ tip }: { tip: string }) {
  const { colors, spacing } = useTheme();
  return (
    <Card style={{ flexDirection: 'row', gap: spacing.m16, alignItems: 'flex-start' }}>
      <Ionicons name="sparkles" size={18} color={colors.accent} />
      <Text variant="bodyMedium" style={{ flex: 1 }}>
        {tip}
      </Text>
    </Card>
  );
}
