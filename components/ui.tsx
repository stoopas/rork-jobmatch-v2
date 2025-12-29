import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle, TextInput as RNTextInput, TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Brand } from "../constants/brand";

export function Screen({ 
  children, 
  style 
}: { 
  children: React.ReactNode; 
  style?: ViewStyle;
}) {
  return (
    <SafeAreaView style={[styles.screen, style]} edges={["top"]}>
      {children}
    </SafeAreaView>
  );
}

export function Section({ 
  children, 
  style 
}: { 
  children: React.ReactNode; 
  style?: ViewStyle;
}) {
  return <View style={[styles.section, style]}>{children}</View>;
}

export function Card({ 
  children, 
  style 
}: { 
  children: React.ReactNode; 
  style?: ViewStyle;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

export function PrimaryButton({ 
  children, 
  onPress, 
  disabled, 
  style 
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity 
      style={[styles.primaryButton, disabled && styles.buttonDisabled, style]} 
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
}

export function SecondaryButton({ 
  children, 
  onPress, 
  disabled, 
  style 
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity 
      style={[styles.secondaryButton, disabled && styles.buttonDisabled, style]} 
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
}

export function GhostButton({ 
  children, 
  onPress, 
  disabled, 
  style 
}: { 
  children: React.ReactNode; 
  onPress: () => void; 
  disabled?: boolean;
  style?: ViewStyle;
}) {
  return (
    <TouchableOpacity 
      style={[styles.ghostButton, disabled && styles.buttonDisabled, style]} 
      onPress={onPress}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
}

export function Input(props: TextInputProps & { style?: ViewStyle }) {
  return (
    <RNTextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={Brand.colors.textFaint}
    />
  );
}

export function Badge({ 
  children, 
  style 
}: { 
  children: React.ReactNode; 
  style?: ViewStyle;
}) {
  return <View style={[styles.badge, style]}>{children}</View>;
}

export function ProgressDots({ 
  current, 
  total 
}: { 
  current: number; 
  total: number;
}) {
  return (
    <View style={styles.progressDots}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Brand.colors.bg,
  },
  section: {
    paddingHorizontal: Brand.spacing.lg,
  },
  card: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.card,
    borderWidth: 1,
    borderColor: Brand.colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: Brand.colors.border,
  },
  primaryButton: {
    backgroundColor: Brand.colors.accent,
    borderRadius: Brand.radius.button,
    height: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderRadius: Brand.radius.button,
    height: 52,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButton: {
    backgroundColor: "transparent",
    borderRadius: Brand.radius.button,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  input: {
    backgroundColor: Brand.colors.surfaceAlt,
    borderRadius: Brand.radius.input,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    paddingHorizontal: Brand.spacing.md,
    paddingVertical: 14,
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.text,
  },
  badge: {
    backgroundColor: Brand.colors.accentSoft,
    paddingHorizontal: Brand.spacing.sm,
    paddingVertical: Brand.spacing.xs,
    borderRadius: Brand.radius.pill,
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    backgroundColor: "transparent",
  },
  dotActive: {
    backgroundColor: Brand.colors.accent,
    borderColor: Brand.colors.accent,
  },
});
