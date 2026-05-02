/**
 * Mobile design tokens. Mirrors the Tailwind tokens used on the web
 * (Deep Indigo primary, Warm Amber accent) so both surfaces feel
 * identical. Colors are HSL-derived hex values copied from
 * `tailwind.config.ts` to keep the apps visually in sync.
 */

export const palette = {
  indigo50: '#EEF1FF',
  indigo100: '#D9E0FF',
  indigo300: '#8C9CFF',
  indigo500: '#4F5FE2',
  indigo600: '#3F4DC4',
  indigo700: '#2F3CA1',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber600: '#D97706',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate700: '#334155',
  slate800: '#1F2937',
  slate900: '#0F172A',
  black: '#0A0A14',
  white: '#FFFFFF',
  red500: '#EF4444',
  emerald500: '#10B981',
};

export interface ThemeTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  success: string;
  scheme: 'light' | 'dark';
}

export const lightTheme: ThemeTokens = {
  background: palette.white,
  surface: palette.slate50,
  surfaceElevated: palette.white,
  border: palette.slate200,
  text: palette.slate900,
  textMuted: palette.slate500,
  primary: palette.indigo600,
  primaryForeground: palette.white,
  accent: palette.amber500,
  accentForeground: palette.slate900,
  destructive: palette.red500,
  success: palette.emerald500,
  scheme: 'light',
};

export const darkTheme: ThemeTokens = {
  background: palette.black,
  surface: '#11111F',
  surfaceElevated: '#1A1A2E',
  border: '#2A2A40',
  text: palette.white,
  textMuted: palette.slate400,
  primary: palette.indigo500,
  primaryForeground: palette.white,
  accent: palette.amber400,
  accentForeground: palette.black,
  destructive: palette.red500,
  success: palette.emerald500,
  scheme: 'dark',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: '600' as const, lineHeight: 28 },
  heading: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
  caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
};
