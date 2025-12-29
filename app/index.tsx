import * as DocumentPicker from "expo-document-picker";
import { extractResumeText } from "../lib/resumeTextExtractor";
import { ensureLocalCacheUri } from "../lib/fileUtils";
import { router } from "expo-router";
import { FileText, Briefcase, Upload } from "lucide-react-native";
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
import { parseResumeText, showParseSuccessAlert, type ResumeData } from "../lib/resumeParser";
import { Brand } from "../constants/brand";

export default function HomeScreen() {
  const { profile, updateProfile, isProfileComplete, addResumeAsset } = useUserProfile();
  const [isOnboarding, setIsOnboarding] = useState(false);

  const hasProfile = isProfileComplete();

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

      updateProfile({
        experience: [...profile.experience, ...experience],
        skills: [...profile.skills, ...skills],
        certifications: [...profile.certifications, ...certifications],
        tools: [...profile.tools, ...tools],
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
              <FileText size={64} color={Brand.colors.accent} strokeWidth={1} />
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
                  <ActivityIndicator size="small" color={Brand.colors.surface} />
                ) : (
                  <Upload size={22} color="#0B0F14" />
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
            <FileText size={20} color={Brand.colors.textMuted} />
            <Text style={styles.profileTitle}>Profile</Text>
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

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/job/analyze")}
          >
            <Briefcase size={22} color="#0B0F14" />
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
    backgroundColor: Brand.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Brand.spacing.lg,
    paddingTop: Brand.spacing.xl,
    paddingBottom: Brand.spacing.md,
  },
  title: {
    fontSize: Brand.typography.sizes.h1,
    fontWeight: "600" as const,
    color: Brand.colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.textMuted,
    lineHeight: Brand.typography.lineHeights.body,
  },
  profileCard: {
    marginHorizontal: Brand.spacing.lg,
    marginTop: Brand.spacing.md,
    padding: 20,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.card,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    ...Brand.shadow,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Brand.spacing.sm,
    marginBottom: Brand.spacing.md,
  },
  profileTitle: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: Brand.spacing.md,
    marginBottom: Brand.spacing.md,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "600" as const,
    color: Brand.colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: Brand.typography.sizes.small,
    color: Brand.colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Brand.colors.border,
  },
  editButton: {
    backgroundColor: Brand.colors.surfaceAlt,
    paddingVertical: 12,
    borderRadius: Brand.radius.button,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: Brand.typography.sizes.body,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  actionsContainer: {
    marginHorizontal: Brand.spacing.lg,
    marginTop: Brand.spacing.xl,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Brand.colors.accent,
    padding: 20,
    borderRadius: Brand.radius.card,
    gap: Brand.spacing.md,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: "#0B0F14",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: Brand.typography.sizes.small,
    color: "#0B0F14",
    opacity: 0.85,
    lineHeight: Brand.typography.lineHeights.small,
  },
  footer: {
    marginHorizontal: Brand.spacing.lg,
    marginTop: Brand.spacing.xl,
    marginBottom: Brand.spacing.lg,
    alignItems: "center",
  },
  footerText: {
    fontSize: Brand.typography.sizes.small,
    color: Brand.colors.textFaint,
  },
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: Brand.spacing.lg,
    paddingTop: 60,
    paddingBottom: 48,
    alignItems: "center",
  },
  onboardingIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Brand.colors.accentSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Brand.spacing.xl,
  },
  onboardingTitle: {
    fontSize: 36,
    fontWeight: "600" as const,
    color: Brand.colors.text,
    textAlign: "center",
    marginBottom: 8,
  },
  onboardingSubtitle: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "500" as const,
    color: Brand.colors.textMuted,
    textAlign: "center",
    marginBottom: Brand.spacing.xl,
  },
  onboardingDescription: {
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.textMuted,
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
    backgroundColor: Brand.colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: Brand.radius.button,
    gap: Brand.spacing.sm,
  },
  onboardingPrimaryButtonText: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: "#0B0F14",
  },
  onboardingHint: {
    fontSize: Brand.typography.sizes.small,
    color: Brand.colors.textMuted,
    textAlign: "center",
    marginTop: Brand.spacing.md,
  },
});
