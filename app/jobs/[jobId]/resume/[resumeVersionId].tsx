import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Check, Copy } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useUserProfile } from "../../../../contexts/UserProfileContext";
import { copyTextSafe } from "../../../../lib/clipboard";
import { getResumeVersionById } from "../../../../lib/historyStore";
import { BoringAI } from "../../../../ui/theme/boringAiTheme";

export default function ResumeViewerScreen() {
  const { jobId, resumeVersionId } = useLocalSearchParams<{
    jobId: string;
    resumeVersionId: string;
  }>();
  const { activeProfileId } = useUserProfile();
  const [copied, setCopied] = useState(false);

  const { data: version, isLoading } = useQuery({
    queryKey: ["resumeVersion", activeProfileId, resumeVersionId],
    queryFn: () => getResumeVersionById(activeProfileId, resumeVersionId || ""),
    enabled: !!activeProfileId && !!resumeVersionId,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const copyToClipboard = async () => {
    if (!version) return;
    const success = await copyTextSafe(version.resumeText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BoringAI.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!version) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Resume version not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color={BoringAI.colors.text} strokeWidth={1.5} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Resume</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.metaCard}>
          <Text style={styles.metaDate}>Generated {formatDate(version.createdAt)}</Text>
          {version.notes && (
            <>
              <Text style={styles.metaLabel}>Version Notes:</Text>
              <Text style={styles.metaNotes}>{version.notes}</Text>
            </>
          )}
        </View>

        <View style={styles.resumeCard}>
          <Text style={styles.resumeText}>{version.resumeText}</Text>
        </View>

        {Platform.OS === "web" && (
          <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
            {copied ? (
              <>
                <Check size={20} color={BoringAI.colors.success} strokeWidth={2} />
                <Text style={[styles.copyButtonText, { color: BoringAI.colors.success }]}>
                  Copied!
                </Text>
              </>
            ) : (
              <>
                <Copy size={20} color={BoringAI.colors.text} strokeWidth={1.5} />
                <Text style={styles.copyButtonText}>Copy Text</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.backToJobButton}
          onPress={() => router.push({ pathname: "/jobs/[jobId]" as any, params: { jobId } })}
        >
          <Text style={styles.backToJobButtonText}>Back to Job</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BoringAI.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: BoringAI.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    marginBottom: BoringAI.spacing.lg,
  },
  backButton: {
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BoringAI.radius.button,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: BoringAI.spacing.lg,
    paddingVertical: BoringAI.spacing.md,
    borderBottomWidth: BoringAI.border.hairline,
    borderBottomColor: BoringAI.colors.border,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  metaCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.md,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
  },
  metaDate: {
    fontSize: 11,
    color: BoringAI.colors.textFaint,
    letterSpacing: 0.2,
    marginBottom: BoringAI.spacing.xs,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  metaNotes: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    lineHeight: 18,
  },
  resumeCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.md,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    ...BoringAI.shadow.cardShadow,
  },
  resumeText: {
    fontSize: 14,
    color: BoringAI.colors.text,
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.md,
    paddingVertical: 12,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.xs,
  },
  copyButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  backToJobButton: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.md,
    paddingVertical: 12,
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.borderStrong,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
  },
  backToJobButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  bottomPadding: {
    height: 40,
  },
});
