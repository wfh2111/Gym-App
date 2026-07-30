/**
 * Design tokens for the "minimal, calm, uncluttered" tone. One accent color, one type family,
 * a 4px spacing scale. Screens should surface one focal metric at a time rather than dashboards
 * of simultaneous stats - that restraint lives in how components are composed, not just color.
 */

export interface ColorScheme {
  background: string;
  surface: string;
  surfaceMuted: string;
  ink: string;
  inkMuted: string;
  inkFaint: string;
  border: string;
  accent: string;
  accentMuted: string;
  success: string;
  warning: string;
  danger: string;
  overlay: string;
}

export const lightColors: ColorScheme = {
  background: '#FAFAF8',
  surface: '#FFFFFF',
  surfaceMuted: '#F1F0EC',
  ink: '#1C1C1E',
  inkMuted: '#6B6B70',
  inkFaint: '#A6A5A2',
  border: '#E7E5E0',
  accent: '#4A7C6F',
  accentMuted: '#E4EDEA',
  success: '#5B8C5A',
  warning: '#C08A3E',
  danger: '#B65C4A',
  overlay: 'rgba(28, 28, 30, 0.4)',
};

export const darkColors: ColorScheme = {
  background: '#121212',
  surface: '#1C1C1E',
  surfaceMuted: '#242426',
  ink: '#F2F2F2',
  inkMuted: '#A0A0A5',
  inkFaint: '#6B6B70',
  border: '#2E2E30',
  accent: '#6FA396',
  accentMuted: '#1E2B27',
  success: '#7AB579',
  warning: '#D6A055',
  danger: '#D07E6C',
  overlay: 'rgba(0, 0, 0, 0.6)',
};

export const spacing = {
  xs4: 4,
  s8: 8,
  m16: 16,
  l24: 24,
  xl32: 32,
  xxl48: 48,
  xxxl64: 64,
} as const;

export const radius = {
  sm8: 8,
  md12: 12,
  lg20: 20,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '600' as const },
  title: { fontSize: 24, lineHeight: 32, fontWeight: '600' as const },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' as const },
  bodyMedium: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
};

export const motion = {
  fast: 150,
  base: 200,
};
