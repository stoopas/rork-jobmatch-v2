import React from "react";
import { View, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";
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
    ...Brand.shadow,
  },
  primaryButton: {
    backgroundColor: Brand.colors.accent,
    borderRadius: Brand.radius.button,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.button,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    paddingVertical: 18,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
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
    backgroundColor: Brand.colors.border,
  },
  dotActive: {
    backgroundColor: Brand.colors.accent,
  },
});
