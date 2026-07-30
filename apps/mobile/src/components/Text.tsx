import React from 'react';
import { Text as RNText, type TextProps as RNTextProps } from 'react-native';
import { useTheme } from '@/theme/ThemeProvider';
import type { typography } from '@/theme/tokens';

type Variant = keyof typeof typography;

export interface TextProps extends RNTextProps {
  variant?: Variant;
  color?: 'ink' | 'inkMuted' | 'inkFaint' | 'accent' | 'success' | 'warning' | 'danger';
}

export function Text({ variant = 'body', color = 'ink', style, ...props }: TextProps) {
  const { colors, typography: type } = useTheme();
  return <RNText style={[type[variant], { color: colors[color] }, style]} {...props} />;
}
