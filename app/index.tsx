import * as DocumentPicker from "expo-document-picker";
import { extractResumeText } from "../lib/resumeTextExtractor";
import { ensureLocalCacheUri } from "../lib/fileUtils";
import { router } from "expo-router";
import { FileText, Briefcase, Upload, Settings, Plus, History } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";

import { useUserProfile } from "../contexts/UserProfileContext";
import { loadJobRuns } from "../lib/historyStore";
import { parseResumeText, showParseSuccessAlert, type ResumeData } from "../lib/resumeParser";
import { BoringAI } from "../ui/theme/boringAiTheme";

export default function HomeScreen() {
  const { profile, updateProfile, isProfileComplete, addResumeAsset, activeProfileId } = useUserProfile();
  const [isOnboarding, setIsOnboarding] = useState(false);

  const hasProfile = isProfileComplete();

  const [jobRunsCount, setJobRunsCount] = React.useState(0);

  React.useEffect(() => {
    if (activeProfileId && hasProfile) {
      loadJobRuns(activeProfileId).then((runs) => setJobRunsCount(runs.length));
    }
  }, [activeProfileId, hasProfile]);

  const { mutateAsync: parseResumeAsync, isPending: isParsingResume } = useMutation<ResumeData, Error, string>({
    mutationFn: async (resumeText: string): Promise<ResumeData> => {
      return await parseResumeText(resumeText);
    },
    onSuccess: (parsed) => {
      console.log("[onboarding] Resume parsed successfully", parsed);

      const experience = (parsed?.experience || []).map((exp: any) => ({
        ...exp,
        id: Date.now().toString() + Math.random(),
      }));

      const skills = (parsed?.skills || []).map((skill: any) => ({
        ...skill,
        id: Date.now().toString() + Math.random(),
        source: 'resume_parse' as const,
        confirmedAt: new Date().toISOString(),
      }));

      const certifications = (parsed?.certifications || []).map((cert: any) => ({
        ...cert,
        id: Date.now().toString() + Math.random(),
      }));

      const tools = (parsed?.tools || []).map((tool: any) => ({
        ...tool,
        id: Date.now().toString() + Math.random(),
        source: 'resume_parse' as const,
        confirmedAt: new Date().toISOString(),
      }));

      const projects = (parsed?.projects || []).map((project: any) => ({
        ...project,
        id: Date.now().toString() + Math.random(),
      }));

      const domainExperience = parsed?.domainExperience || [];

      const dedupeSkills = (existing: typeof skills, incoming: typeof skills) => {
        const existingNames = new Set(
          existing.map((s) => s.name.trim().toLowerCase())
        );
        return incoming.filter(
          (s) => !existingNames.has(s.name.trim().toLowerCase())
        );
      };

      const dedupeTools = (existing: typeof tools, incoming: typeof tools) => {
        const existingNames = new Set(
          existing.map((t) => t.name.trim().toLowerCase())
        );
        return incoming.filter(
          (t) => !existingNames.has(t.name.trim().toLowerCase())
        );
      };

      const dedupeCerts = (
        existing: typeof certifications,
        incoming: typeof certifications
      ) => {
        const existingKeys = new Set(
          existing.map(
            (c) => `${c.name.trim().toLowerCase()}_${c.issuer.trim().toLowerCase()}`
          )
        );
        return incoming.filter(
          (c) =>
            !existingKeys.has(
              `${c.name.trim().toLowerCase()}_${c.issuer.trim().toLowerCase()}`
            )
        );
      };

      const dedupeExperience = (
        existing: typeof experience,
        incoming: typeof experience
      ) => {
        const existingKeys = new Set(
          existing.map(
            (e) =>
              `${e.title.trim().toLowerCase()}_${e.company.trim().toLowerCase()}_${e.startDate}`
          )
        );
        return incoming.filter(
          (e) =>
            !existingKeys.has(
              `${e.title.trim().toLowerCase()}_${e.company.trim().toLowerCase()}_${e.startDate}`
            )
        );
      };

      updateProfile({
        experience: [...profile.experience, ...dedupeExperience(profile.experience, experience)],
        skills: [...profile.skills, ...dedupeSkills(profile.skills, skills)],
        certifications: [
          ...profile.certifications,
          ...dedupeCerts(profile.certifications, certifications),
        ],
        tools: [...profile.tools, ...dedupeTools(profile.tools, tools)],
        projects: [...profile.projects, ...projects],
        domainExperience: [
          ...profile.domainExperience,
          ...domainExperience,
        ],
      });

      showParseSuccessAlert(parsed, () => {
        router.push("/job/analyze");
      });

      setIsOnboarding(false);
    },
    onError: (error) => {
      console.error("[onboarding] onError:", error?.message ?? error);
      Alert.alert("Error", error?.message ? `Failed to parse resume: ${error.message}` : "Failed to parse resume. Please try again or add information manually.");
    },
  });

  const handleUploadResume = async () => {
    console.log("[onboarding] Starting resume upload...");
    setIsOnboarding(true);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });

      console.log("[onboarding] Document picker result:", result);

      if (result.canceled) {
        console.log("[onboarding] Upload canceled by user");
        setIsOnboarding(false);
        return;
      }

      const file = result.assets?.[0];
      if (!file || !file.uri) {
        console.error("[onboarding] No file selected");
        Alert.alert("Error", "No file selected. Please try again.");
        setIsOnboarding(false);
        return;
      }

      console.log("[onboarding] File selected:", file.name);

      console.log("[onboarding] Ensuring file is in local cache...");
      let workingUri;
      try {
        workingUri = await ensureLocalCacheUri(file.uri, file.name);
        console.log("[onboarding] Working URI:", workingUri);
      } catch (cacheErr: any) {
        console.error("[onboarding] Failed to cache file:", cacheErr?.message);
        Alert.alert("Error", cacheErr?.message || "Could not access file.");
        setIsOnboarding(false);
        return;
      }

      console.log("[onboarding] Extracting text from file...");
      let extracted;
      try {
        const mimeType = file.mimeType || (file as any).type;
        extracted = await extractResumeText(workingUri, file.name, mimeType);
        console.log("[onboarding] Text extracted successfully, length:", extracted.text.length);
        console.log("[onboarding] Extraction source:", extracted.source);
      } catch (extractErr: any) {
        console.error("[onboarding] Text extraction failed:", extractErr?.message);
        Alert.alert("Error", extractErr?.message || "Could not extract text from file.");
        setIsOnboarding(false);
        return;
      }

      console.log("[onboarding] Saving resume as asset...");
      const mimeType = file.mimeType || (file as any).type;
      const fileType = file.name?.endsWith(".pdf") ? "pdf" : file.name?.endsWith(".docx") ? "docx" : file.name?.endsWith(".txt") ? "txt" : "unknown";
      const resumeAsset = {
        id: Date.now().toString() + Math.random(),
        name: file.name || "resume",
        uri: file.uri,
        mimeType: mimeType,
        uploadedAt: new Date().toISOString(),
        type: fileType as "pdf" | "docx" | "txt" | "unknown",
        extractedText: extracted.text,
        docxBase64: extracted.docxBase64,
      };

      await addResumeAsset(resumeAsset);
      console.log("[onboarding] Resume asset saved with ID:", resumeAsset.id);

      try {
        await parseResumeAsync(extracted.text);
      } catch (err: any) {
        console.error("[onboarding] parseResumeAsync error:", err?.message ?? err);
        Alert.alert("Error", err?.message ? `Failed to parse resume: ${err.message}` : "Failed to parse resume. Please try again.");
      }
    } catch (error) {
      console.error("[onboarding] Upload error:", error);
      Alert.alert("Error", "Failed to upload resume. Please try again.");
    } finally {
      setIsOnboarding(false);
    }
  };

  if (!hasProfile) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.onboardingContainer}>
            <View style={styles.onboardingIconContainer}>
              <FileText size={64} color={BoringAI.colors.text} strokeWidth={1.5} />
            </View>

            <Text style={styles.onboardingTitle}>JustApply</Text>
            <Text style={styles.onboardingSubtitle}>
              Your resume, ready to apply.
            </Text>

            <Text style={styles.onboardingDescription}>
              Upload your resume once.{"\n"}
              Paste any job posting.{"\n"}
              Get a tailored document, ready to submit.
            </Text>

            <View style={styles.onboardingActionsContainer}>
              <TouchableOpacity
                style={styles.onboardingPrimaryButton}
                onPress={handleUploadResume}
                disabled={isParsingResume || isOnboarding}
              >
                {isParsingResume || isOnboarding ? (
                  <ActivityIndicator size="small" color={BoringAI.colors.background} />
                ) : (
                  <Upload size={22} color={BoringAI.colors.background} />
                )}
                <Text style={styles.onboardingPrimaryButtonText}>
                  {isParsingResume || isOnboarding ? "Processing..." : "Upload your resume"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.onboardingHint}>
                PDF, DOCX, or TXT
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>JustApply</Text>
          <Text style={styles.subtitle}>
            Your resume, ready to apply.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileHeaderLeft}>
              <FileText size={20} color={BoringAI.colors.textMuted} />
              <Text style={styles.profileTitle}>Profile</Text>
            </View>
            <TouchableOpacity
              style={styles.manageButton}
              onPress={() => router.push("/profile/manage")}
            >
              <Settings size={18} color={BoringAI.colors.textMuted} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.experience.length}</Text>
              <Text style={styles.statLabel}>Roles</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.skills.length}</Text>
              <Text style={styles.statLabel}>Skills</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.tools.length}</Text>
              <Text style={styles.statLabel}>Tools</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push("/profile/edit")}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resumeCard}>
          <View style={styles.resumeHeader}>
            <FileText size={20} color={BoringAI.colors.textMuted} />
            <Text style={styles.resumeTitle}>Resumes</Text>
          </View>
          <View style={styles.resumeStats}>
            <Text style={styles.resumeStatsText}>
              {profile.resumeAssets.length} saved resume{profile.resumeAssets.length !== 1 ? 's' : ''}
            </Text>
            {profile.resumeAssets.length > 0 && profile.resumeAssets[profile.resumeAssets.length - 1] && (
              <Text style={styles.resumeLatest}>
                Latest: {profile.resumeAssets[profile.resumeAssets.length - 1].name}
              </Text>
            )}
          </View>
          <View style={styles.resumeActions}>
            <TouchableOpacity
              style={styles.addResumeButton}
              onPress={handleUploadResume}
              disabled={isParsingResume || isOnboarding}
            >
              {isParsingResume || isOnboarding ? (
                <ActivityIndicator size="small" color={BoringAI.colors.text} />
              ) : (
                <Plus size={18} color={BoringAI.colors.text} strokeWidth={2} />
              )}
              <Text style={styles.addResumeButtonText}>
                {isParsingResume || isOnboarding ? "Processing..." : "Add another resume"}
              </Text>
            </TouchableOpacity>
            {profile.resumeAssets.length > 0 && (
              <TouchableOpacity
                style={styles.manageResumesButton}
                onPress={() => router.push("/profile/edit")}
              >
                <Text style={styles.manageResumesButtonText}>Manage</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.jobsCard}>
          <View style={styles.jobsHeader}>
            <History size={20} color={BoringAI.colors.textMuted} />
            <Text style={styles.jobsTitle}>Jobs</Text>
          </View>
          <View style={styles.jobsStats}>
            <Text style={styles.jobsStatsText}>
              {jobRunsCount} job{jobRunsCount !== 1 ? 's' : ''} with tailored resumes
            </Text>
          </View>
          <TouchableOpacity
            style={styles.viewJobsButton}
            onPress={() => router.push("/jobs")}
          >
            <Text style={styles.viewJobsButtonText}>View jobs</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/job/analyze")}
          >
            <Briefcase size={22} color={BoringAI.colors.background} />
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Add a job posting</Text>
              <Text style={styles.actionDescription}>
                Get a tailored resume in seconds
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Data stored securely on device
          </Text>
        </View>
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
  profileCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.md,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderRadius: BoringAI.radius.card,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    ...BoringAI.shadow.cardShadow,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: BoringAI.spacing.md,
  },
  profileHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: BoringAI.spacing.sm,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: BoringAI.spacing.md,
    marginBottom: BoringAI.spacing.md,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  statLabel: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: BoringAI.colors.border,
  },
  editButton: {
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.borderStrong,
    paddingVertical: 12,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  resumeCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderRadius: BoringAI.radius.card,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    ...BoringAI.shadow.cardShadow,
  },
  resumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: BoringAI.spacing.sm,
    marginBottom: BoringAI.spacing.md,
  },
  resumeTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
  },
  resumeStats: {
    marginBottom: BoringAI.spacing.md,
  },
  resumeStatsText: {
    fontSize: 16,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  resumeLatest: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  resumeActions: {
    flexDirection: "row",
    gap: BoringAI.spacing.sm,
  },
  addResumeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.borderStrong,
    paddingVertical: 12,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.xs,
  },
  addResumeButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  manageResumesButton: {
    paddingHorizontal: BoringAI.spacing.md,
    paddingVertical: 12,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    borderRadius: BoringAI.radius.button,
    justifyContent: "center",
  },
  manageResumesButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.textMuted,
  },
  actionsContainer: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BoringAI.colors.accent,
    padding: BoringAI.spacing.lg,
    borderRadius: BoringAI.radius.card,
    gap: BoringAI.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.background,
    marginBottom: BoringAI.spacing.xxs,
  },
  actionDescription: {
    fontSize: 13,
    color: BoringAI.colors.background,
    lineHeight: 18,
  },
  footer: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.xxl,
    marginBottom: BoringAI.spacing.lg,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: BoringAI.colors.textFaint,
  },
  jobsCard: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.lg,
    padding: BoringAI.spacing.lg,
    backgroundColor: BoringAI.colors.surface,
    borderRadius: BoringAI.radius.card,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    ...BoringAI.shadow.cardShadow,
  },
  jobsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: BoringAI.spacing.sm,
    marginBottom: BoringAI.spacing.md,
  },
  jobsTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
  },
  jobsStats: {
    marginBottom: BoringAI.spacing.md,
  },
  jobsStatsText: {
    fontSize: 16,
    color: BoringAI.colors.text,
  },
  viewJobsButton: {
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.borderStrong,
    paddingVertical: 12,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
  },
  viewJobsButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
  },
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: BoringAI.spacing.xl,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: "center",
  },
  onboardingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: BoringAI.spacing.xxl,
  },
  onboardingTitle: {
    fontSize: 36,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    textAlign: "center",
    marginBottom: BoringAI.spacing.xs,
  },
  onboardingSubtitle: {
    fontSize: 18,
    fontWeight: "400" as const,
    color: BoringAI.colors.textMuted,
    textAlign: "center",
    marginBottom: BoringAI.spacing.xxl,
  },
  onboardingDescription: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    lineHeight: 28,
    marginBottom: 48,
    textAlign: "center",
  },
  onboardingActionsContainer: {
    width: "100%",
    maxWidth: 400,
  },
  onboardingPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.sm,
  },
  onboardingPrimaryButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  onboardingHint: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    textAlign: "center",
    marginTop: BoringAI.spacing.md,
  },
});
