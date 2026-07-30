import React from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';

export function Card({ style, children, ...props }: ViewProps) {
  const { colors, spacing, radius } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg20,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.l24,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}
