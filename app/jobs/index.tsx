import { router } from "expo-router";
import { Briefcase, FileText } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { loadJobRuns, loadResumeVersions } from "../../lib/historyStore";
import { BoringAI } from "../../ui/theme/boringAiTheme";

export default function JobsListScreen() {
  const { activeProfileId } = useUserProfile();

  const { data: jobRuns = [], isLoading: isLoadingRuns } = useQuery({
    queryKey: ["jobRuns", activeProfileId],
    queryFn: () => loadJobRuns(activeProfileId),
    enabled: !!activeProfileId,
  });

  const { data: versions = [], isLoading: isLoadingVersions } = useQuery({
    queryKey: ["resumeVersions", activeProfileId],
    queryFn: () => loadResumeVersions(activeProfileId),
    enabled: !!activeProfileId,
  });

  const sortedJobs = [...jobRuns].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );

  const getVersionCount = (jobId: string) => {
    return versions.filter((v) => v.jobId === jobId).length;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  if (isLoadingRuns || isLoadingVersions) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BoringAI.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Job History</Text>
          <Text style={styles.subtitle}>
            {sortedJobs.length} job{sortedJobs.length !== 1 ? "s" : ""} with tailored resumes
          </Text>
        </View>

        {sortedJobs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Briefcase size={48} color={BoringAI.colors.textFaint} strokeWidth={1.5} />
            </View>
            <Text style={styles.emptyTitle}>No jobs yet</Text>
            <Text style={styles.emptyText}>
              Generate a tailored resume for a job posting to see it here.
            </Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => router.push("/")}
            >
              <Text style={styles.emptyButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.jobsList}>
            {sortedJobs.map((job) => {
              const versionCount = getVersionCount(job.jobId);
              return (
                <TouchableOpacity
                  key={job.id}
                  style={styles.jobCard}
                  onPress={() => router.push({ pathname: "/jobs/[jobId]" as any, params: { jobId: job.jobId } })}
                  activeOpacity={0.7}
                >
                  <View style={styles.jobCardHeader}>
                    <View style={styles.jobIconContainer}>
                      <Briefcase size={20} color={BoringAI.colors.textMuted} strokeWidth={1.5} />
                    </View>
                    <View style={styles.jobCardContent}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      {job.company && (
                        <Text style={styles.jobCompany}>{job.company}</Text>
                      )}
                      {job.location && (
                        <Text style={styles.jobLocation}>{job.location}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.jobCardFooter}>
                    <View style={styles.versionBadge}>
                      <FileText size={14} color={BoringAI.colors.textMuted} strokeWidth={1.5} />
                      <Text style={styles.versionCount}>
                        {versionCount} version{versionCount !== 1 ? "s" : ""}
                      </Text>
                    </View>
                    <Text style={styles.jobDate}>{formatDate(job.updatedAt)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
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
  header: {
    paddingHorizontal: BoringAI.spacing.xl,
    paddingTop: BoringAI.spacing.xxl,
    paddingBottom: BoringAI.spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    lineHeight: 22,
  },
  emptyContainer: {
    marginTop: 80,
    paddingHorizontal: BoringAI.spacing.xl,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: BoringAI.spacing.xl,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.sm,
  },
  emptyText: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: BoringAI.spacing.xl,
  },
  emptyButton: {
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: BoringAI.radius.button,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  jobsList: {
    paddingHorizontal: BoringAI.spacing.xl,
    paddingTop: BoringAI.spacing.md,
    paddingBottom: BoringAI.spacing.xl,
  },
  jobCard: {
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.card,
    padding: BoringAI.spacing.lg,
    marginBottom: BoringAI.spacing.md,
    ...BoringAI.shadow.cardShadow,
  },
  jobCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: BoringAI.spacing.md,
  },
  jobIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: BoringAI.spacing.sm,
  },
  jobCardContent: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  jobCompany: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    marginBottom: 2,
  },
  jobLocation: {
    fontSize: 13,
    color: BoringAI.colors.textFaint,
  },
  jobCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: BoringAI.spacing.md,
    borderTopWidth: BoringAI.border.hairline,
    borderTopColor: BoringAI.colors.border,
  },
  versionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: BoringAI.spacing.xs,
  },
  versionCount: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  jobDate: {
    fontSize: 13,
    color: BoringAI.colors.textFaint,
  },
});
