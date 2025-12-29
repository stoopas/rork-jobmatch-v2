import { Platform } from "react-native";

const colors = {
  bg: "#FAFAF8",
  surface: "#FFFFFF",
  surfaceAlt: "#F3F4F1",
  border: "#E6E7E2",
  text: "#111827",
  textMuted: "#6B7280",
  textFaint: "#9CA3AF",
  accent: "#1F3A5F",
  accentSoft: "#E7EEF7",
  success: "#2F6F4E",
  warning: "#9A6B2F",
  danger: "#A33A3A",
} as const;

const typography = {
  fontRegular: Platform.select({ ios: "System", android: "Roboto", default: "System" }) as string,
  fontSemibold: Platform.select({ ios: "System", android: "Roboto", default: "System" }) as string,
  sizes: {
    h1: 28,
    h2: 22,
    h3: 18,
    body: 16,
    small: 13,
    micro: 11,
  },
  lineHeights: {
    h1: 34,
    h2: 28,
    h3: 24,
    body: 22,
    small: 18,
    micro: 14,
  },
} as const;

const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

const radius = {
  card: 18,
  input: 14,
  button: 14,
  pill: 999,
} as const;

const shadow = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowOffset: { width: 0, height: 6 },
  shadowRadius: 16,
  elevation: 2,
} as const;

export const Brand = {
  colors,
  typography,
  spacing,
  radius,
  shadow,
};
