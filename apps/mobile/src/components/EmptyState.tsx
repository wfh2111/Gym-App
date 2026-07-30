import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  const { spacing } = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: spacing.xl32, gap: spacing.xs4 }}>
      <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      {subtitle && (
        <Text color="inkMuted" style={{ textAlign: 'center' }}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}
