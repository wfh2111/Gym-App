import React from 'react';
import { Pressable, ActivityIndicator, type PressableProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import { Text } from './Text';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({ label, variant = 'primary', loading, fullWidth = true, disabled, ...props }: ButtonProps) {
  const { colors, spacing, radius } = useTheme();

  const backgroundColor =
    variant === 'primary' ? colors.accent : variant === 'secondary' ? colors.accentMuted : 'transparent';
  const textColor = variant === 'primary' ? '#FFFFFF' : colors.accent;

  return (
    <Pressable
      disabled={disabled || loading}
      style={({ pressed }) => ({
        backgroundColor,
        opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
        paddingVertical: spacing.m16,
        paddingHorizontal: spacing.l24,
        borderRadius: radius.md12,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      })}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text variant="bodyMedium" style={{ color: textColor }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
