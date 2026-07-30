import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, motion, radius, spacing, typography } from './tokens';
import type { ColorScheme } from './tokens';

interface ThemeValue {
  colors: ColorScheme;
  scheme: 'light' | 'dark';
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
  motion: typeof motion;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const scheme = systemScheme === 'dark' ? 'dark' : 'light';

  const value = useMemo<ThemeValue>(
    () => ({
      colors: scheme === 'dark' ? darkColors : lightColors,
      scheme,
      spacing,
      radius,
      typography,
      motion,
    }),
    [scheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
