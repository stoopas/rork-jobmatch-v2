import { Platform } from 'react-native';

const colors = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceAlt: '#FAFAFA',
  border: '#E5E5E5',
  borderStrong: '#111111',
  text: '#111111',
  textMuted: '#555555',
  textFaint: '#888888',
  accent: '#111111',
  success: '#166534',
  warning: '#92400E',
  danger: '#991B1B',
  focusRing: 'rgba(17,17,17,0.18)',
} as const;

const typography = {
  fontRegular: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }) as string,
  fontMono: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }) as string,
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    lineHeight: 34,
    letterSpacing: -0.2,
    color: colors.text,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    lineHeight: 28,
    letterSpacing: -0.1,
    color: colors.text,
  },
  h3: {
    fontSize: 18,
    fontWeight: '700' as const,
    lineHeight: 24,
    letterSpacing: 0.0,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 22,
    letterSpacing: 0.0,
    color: colors.text,
  },
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    letterSpacing: 0.0,
    color: colors.textMuted,
  },
  micro: {
    fontSize: 11,
    fontWeight: '400' as const,
    lineHeight: 14,
    letterSpacing: 0.2,
    color: colors.textFaint,
  },
} as const;

const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

const radius = {
  card: 12,
  input: 10,
  button: 10,
  pill: 999,
} as const;

const border = {
  hairline: 1,
  strong: 2,
} as const;

const shadow = {
  cardShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
} as const;

export const BoringAI = {
  colors,
  typography,
  spacing,
  radius,
  border,
  shadow,
} as const;
