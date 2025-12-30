import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronDown, ChevronUp, FileText, Plus, X } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { getJobWithVersions } from "../../lib/historyStore";
import { BoringAI } from "../../ui/theme/boringAiTheme";

export default function JobDetailScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { activeProfileId } = useUserProfile();

  const [showNewVersionForm, setShowNewVersionForm] = useState(false);
  const [newVersionNotes, setNewVersionNotes] = useState("");
  const [postingExpanded, setPostingExpanded] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["jobWithVersions", activeProfileId, jobId],
    queryFn: () => getJobWithVersions(activeProfileId, jobId || ""),
    enabled: !!activeProfileId && !!jobId,
  });

  const job = data?.job;
  const versions = data?.versions || [];

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

  const handleGenerateNewVersion = () => {
    if (!job) return;

    const jobPostingForGeneration = {
      id: job.jobId,
      title: job.title,
      company: job.company || "",
      description: job.postingText,
      requiredSkills: [],
      preferredSkills: [],
      responsibilities: [],
      seniority: "",
      domain: "",
      location: job.location,
      timestamp: job.createdAt,
    };

    router.push({
      pathname: "/resume/options" as any,
      params: {
        jobId: job.jobId,
        jobData: JSON.stringify(jobPostingForGeneration),
        versionNotes: newVersionNotes || undefined,
      },
    });
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

  if (!job) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
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
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.jobInfoCard}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          {job.company && <Text style={styles.jobCompany}>{job.company}</Text>}
          {job.location && <Text style={styles.jobLocation}>{job.location}</Text>}
          <Text style={styles.jobDate}>Added {formatDate(job.createdAt)}</Text>
        </View>

        <TouchableOpacity
          style={styles.postingToggle}
          onPress={() => setPostingExpanded(!postingExpanded)}
          activeOpacity={0.7}
        >
          <Text style={styles.postingToggleLabel}>Job Posting</Text>
          {postingExpanded ? (
            <ChevronUp size={20} color={BoringAI.colors.textMuted} />
          ) : (
            <ChevronDown size={20} color={BoringAI.colors.textMuted} />
          )}
        </TouchableOpacity>

        {postingExpanded && (
          <View style={styles.postingCard}>
            <ScrollView style={styles.postingScroll} nestedScrollEnabled>
              <Text style={styles.postingText}>{job.postingText}</Text>
            </ScrollView>
          </View>
        )}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Resume Versions</Text>
          <Text style={styles.sectionSubtitle}>{versions.length} total</Text>
        </View>

        {versions.length === 0 ? (
          <View style={styles.emptyVersions}>
            <FileText size={32} color={BoringAI.colors.textFaint} strokeWidth={1.5} />
            <Text style={styles.emptyVersionsText}>No resume versions yet</Text>
          </View>
        ) : (
          <View style={styles.versionsList}>
            {versions.map((version, index) => (
              <TouchableOpacity
                key={version.id}
                style={styles.versionCard}
                onPress={() =>
                  router.push({
                    pathname: "/jobs/[jobId]/resume/[resumeVersionId]" as any,
                    params: { jobId: job.jobId, resumeVersionId: version.id },
                  })
                }
                activeOpacity={0.7}
              >
                <View style={styles.versionHeader}>
                  <View style={styles.versionIconContainer}>
                    <FileText size={18} color={BoringAI.colors.textMuted} strokeWidth={1.5} />
                  </View>
                  <View style={styles.versionContent}>
                    <Text style={styles.versionLabel}>Version {versions.length - index}</Text>
                    <Text style={styles.versionDate}>{formatDate(version.createdAt)}</Text>
                    {version.notes && (
                      <Text style={styles.versionNotes} numberOfLines={2}>
                        {version.notes}
                      </Text>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!showNewVersionForm ? (
          <TouchableOpacity
            style={styles.generateButton}
            onPress={() => setShowNewVersionForm(true)}
          >
            <Plus size={20} color={BoringAI.colors.background} strokeWidth={2} />
            <Text style={styles.generateButtonText}>Generate new version</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.newVersionForm}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>New Resume Version</Text>
              <TouchableOpacity
                style={styles.formCloseButton}
                onPress={() => {
                  setShowNewVersionForm(false);
                  setNewVersionNotes("");
                }}
              >
                <X size={20} color={BoringAI.colors.textMuted} strokeWidth={1.5} />
              </TouchableOpacity>
            </View>
            <Text style={styles.formLabel}>
              Notes (optional)
            </Text>
            <Text style={styles.formHint}>
              What should be different in this version?
            </Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g., Emphasize leadership experience, add recent certifications..."
              placeholderTextColor={BoringAI.colors.textFaint}
              value={newVersionNotes}
              onChangeText={setNewVersionNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.formCancelButton}
                onPress={() => {
                  setShowNewVersionForm(false);
                  setNewVersionNotes("");
                }}
              >
                <Text style={styles.formCancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.formGenerateButton}
                onPress={handleGenerateNewVersion}
              >
                <Text style={styles.formGenerateButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
  jobInfoCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    ...BoringAI.shadow.cardShadow,
  },
  jobTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xs,
    letterSpacing: -0.1,
  },
  jobCompany: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    marginBottom: BoringAI.spacing.xxs,
  },
  jobLocation: {
    fontSize: 13,
    color: BoringAI.colors.textFaint,
    marginBottom: BoringAI.spacing.sm,
  },
  jobDate: {
    fontSize: 11,
    color: BoringAI.colors.textFaint,
    letterSpacing: 0.2,
  },
  postingToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.md,
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.input,
  },
  postingToggleLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  postingCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.sm,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    maxHeight: 300,
  },
  postingScroll: {
    maxHeight: 260,
  },
  postingText: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    lineHeight: 20,
  },
  sectionHeader: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.xxl,
    marginBottom: BoringAI.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  emptyVersions: {
    marginHorizontal: BoringAI.spacing.xl,
    padding: BoringAI.spacing.xxl,
    alignItems: "center",
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
  },
  emptyVersionsText: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    marginTop: BoringAI.spacing.sm,
  },
  versionsList: {
    marginHorizontal: BoringAI.spacing.xl,
  },
  versionCard: {
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    padding: BoringAI.spacing.md,
    marginBottom: BoringAI.spacing.sm,
    ...BoringAI.shadow.cardShadow,
  },
  versionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  versionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: BoringAI.spacing.sm,
  },
  versionContent: {
    flex: 1,
  },
  versionLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
    marginBottom: 2,
  },
  versionDate: {
    fontSize: 11,
    color: BoringAI.colors.textFaint,
    letterSpacing: 0.2,
    marginBottom: BoringAI.spacing.xxs,
  },
  versionNotes: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    lineHeight: 18,
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    paddingVertical: 16,
    backgroundColor: BoringAI.colors.accent,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.xs,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  newVersionForm: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    ...BoringAI.shadow.cardShadow,
  },
  formHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: BoringAI.spacing.md,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
  },
  formCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: BoringAI.colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  formHint: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    marginBottom: BoringAI.spacing.sm,
  },
  formInput: {
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.input,
    padding: BoringAI.spacing.sm,
    fontSize: 16,
    color: BoringAI.colors.text,
    minHeight: 100,
    marginBottom: BoringAI.spacing.md,
  },
  formActions: {
    flexDirection: "row",
    gap: BoringAI.spacing.sm,
  },
  formCancelButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
  },
  formCancelButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.textMuted,
  },
  formGenerateButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: BoringAI.colors.accent,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
  },
  formGenerateButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  bottomPadding: {
    height: 40,
  },
});
