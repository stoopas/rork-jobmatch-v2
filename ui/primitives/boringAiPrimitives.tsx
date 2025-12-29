import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacityProps,
  ScrollViewProps,
} from 'react-native';
import { BoringAI } from '../theme/boringAiTheme';

interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
}

export function Screen({ children, style, contentContainerStyle, ...props }: ScreenProps) {
  return (
    <SafeAreaView style={styles.screenSafe}>
      <ScrollView
        style={[styles.screen, style]}
        contentContainerStyle={[styles.screenContent, contentContainerStyle]}
        {...props}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

interface PageTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function PageTitle({ children, style }: PageTitleProps) {
  return <Text style={[styles.pageTitle, style]}>{children}</Text>;
}

interface SectionTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function SectionTitle({ children, style }: SectionTitleProps) {
  return <Text style={[styles.sectionTitle, style]}>{children}</Text>;
}

interface SubSectionTitleProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function SubSectionTitle({ children, style }: SubSectionTitleProps) {
  return <Text style={[styles.subSectionTitle, style]}>{children}</Text>;
}

interface TextBodyProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function TextBody({ children, style }: TextBodyProps) {
  return <Text style={[styles.textBody, style]}>{children}</Text>;
}

interface TextMutedProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function TextMuted({ children, style }: TextMutedProps) {
  return <Text style={[styles.textMuted, style]}>{children}</Text>;
}

interface TextFaintProps {
  children: React.ReactNode;
  style?: TextStyle;
}

export function TextFaint({ children, style }: TextFaintProps) {
  return <Text style={[styles.textFaint, style]}>{children}</Text>;
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

interface DividerProps {
  style?: ViewStyle;
}

export function Divider({ style }: DividerProps) {
  return <View style={[styles.divider, style]} />;
}

interface PrimaryButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

export function PrimaryButton({ children, style, ...props }: PrimaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, style]}
      activeOpacity={0.85}
      {...props}
    >
      <Text style={styles.primaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

interface SecondaryButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

export function SecondaryButton({ children, style, ...props }: SecondaryButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.secondaryButton, style]}
      activeOpacity={0.85}
      {...props}
    >
      <Text style={styles.secondaryButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

interface GhostButtonProps extends TouchableOpacityProps {
  children: React.ReactNode;
}

export function GhostButton({ children, style, ...props }: GhostButtonProps) {
  return (
    <TouchableOpacity style={[styles.ghostButton, style]} activeOpacity={0.85} {...props}>
      <Text style={styles.ghostButtonText}>{children}</Text>
    </TouchableOpacity>
  );
}

interface InputProps extends TextInputProps {
  label?: string;
}

export function Input({ label, style, ...props }: InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <TextInput
        style={[
          styles.input,
          isFocused && styles.inputFocused,
          style,
        ]}
        placeholderTextColor={BoringAI.colors.textFaint}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
    </View>
  );
}

interface PillProps {
  children: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Pill({ children, style, textStyle }: PillProps) {
  return (
    <View style={[styles.pill, style]}>
      <Text style={[styles.pillText, textStyle]}>{children}</Text>
    </View>
  );
}

interface ProgressDotsProps {
  total: number;
  current: number;
  style?: ViewStyle;
}

export function ProgressDots({ total, current, style }: ProgressDotsProps) {
  return (
    <View style={[styles.progressDots, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === current && styles.progressDotActive,
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screenSafe: {
    flex: 1,
    backgroundColor: BoringAI.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: BoringAI.colors.background,
  },
  screenContent: {
    paddingHorizontal: BoringAI.spacing.xl,
    paddingTop: BoringAI.spacing.lg,
    paddingBottom: BoringAI.spacing.lg,
  },
  pageTitle: {
    ...BoringAI.typography.h1,
  },
  sectionTitle: {
    ...BoringAI.typography.h2,
  },
  subSectionTitle: {
    ...BoringAI.typography.h3,
  },
  textBody: {
    ...BoringAI.typography.body,
  },
  textMuted: {
    ...BoringAI.typography.small,
  },
  textFaint: {
    ...BoringAI.typography.micro,
  },
  card: {
    backgroundColor: BoringAI.colors.surface,
    borderColor: BoringAI.colors.border,
    borderWidth: BoringAI.border.hairline,
    borderRadius: BoringAI.radius.card,
    padding: BoringAI.spacing.lg,
    marginBottom: BoringAI.spacing.md,
    ...BoringAI.shadow.cardShadow,
  },
  divider: {
    height: 1,
    backgroundColor: BoringAI.colors.border,
  },
  primaryButton: {
    height: 48,
    paddingHorizontal: BoringAI.spacing.md,
    backgroundColor: BoringAI.colors.accent,
    borderRadius: BoringAI.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0,
  },
  secondaryButton: {
    height: 48,
    paddingHorizontal: BoringAI.spacing.md,
    backgroundColor: BoringAI.colors.surface,
    borderColor: BoringAI.colors.borderStrong,
    borderWidth: BoringAI.border.hairline,
    borderRadius: BoringAI.radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    color: BoringAI.colors.text,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0,
  },
  ghostButton: {
    paddingVertical: BoringAI.spacing.sm,
    paddingHorizontal: BoringAI.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostButtonText: {
    color: BoringAI.colors.textMuted,
    fontWeight: '600',
    fontSize: 16,
    letterSpacing: 0,
  },
  inputLabel: {
    ...BoringAI.typography.small,
    marginBottom: BoringAI.spacing.xs,
  },
  input: {
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderColor: BoringAI.colors.border,
    borderWidth: 1,
    borderRadius: BoringAI.radius.input,
    paddingVertical: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: BoringAI.colors.text,
  },
  inputFocused: {
    borderColor: BoringAI.colors.borderStrong,
    shadowColor: BoringAI.colors.focusRing,
    shadowOpacity: 1,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    elevation: 2,
  },
  pill: {
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderColor: BoringAI.colors.border,
    borderWidth: 1,
    borderRadius: BoringAI.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: {
    ...BoringAI.typography.micro,
    color: BoringAI.colors.textMuted,
  },
  progressDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  progressDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: BoringAI.colors.border,
    backgroundColor: BoringAI.colors.background,
  },
  progressDotActive: {
    backgroundColor: BoringAI.colors.accent,
    borderColor: BoringAI.colors.accent,
  },
});
