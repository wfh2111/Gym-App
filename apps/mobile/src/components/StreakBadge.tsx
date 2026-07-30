import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { useTheme } from '@/theme/ThemeProvider';

export function StreakBadge({ days }: { days: number }) {
  const { colors, spacing, radius } = useTheme();
  if (days <= 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.s8 + 2,
        paddingVertical: 4,
        borderRadius: radius.pill,
        backgroundColor: colors.accentMuted,
        alignSelf: 'flex-start',
      }}
    >
      <Ionicons name="flame" size={14} color={colors.accent} />
      <Text variant="caption" style={{ color: colors.accent }}>
        {days} day{days === 1 ? '' : 's'}
      </Text>
    </View>
  );
}
