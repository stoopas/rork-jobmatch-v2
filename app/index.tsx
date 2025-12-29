import * as DocumentPicker from "expo-document-picker";
import { extractResumeText } from "../lib/resumeTextExtractor";
import { router } from "expo-router";
import { FileText, Plus, Sparkles, Upload, Briefcase } from "lucide-react-native";
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

      console.log("[onboarding] Extracting text from file...");
      let extracted;
      try {
        const mimeType = file.mimeType || (file as any).type;
        extracted = await extractResumeText(file.uri, file.name, mimeType);
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
              <Sparkles size={48} color="#0066FF" strokeWidth={2} />
            </View>

            <Text style={styles.onboardingTitle}>Welcome to JobMatch</Text>
            <Text style={styles.onboardingSubtitle}>
              Your AI-powered resume tailoring assistant
            </Text>

            <Text style={styles.onboardingDescription}>
              Say goodbye to the hassle of customizing resumes for every job.{"\n\n"}
              JobMatch makes it effortless:{"\n"}
              • Set up once with your resume{"\n"}
              • Paste any job posting{"\n"}
              • Get a perfectly tailored resume{"\n\n"}
              The app learns from your answers and gets smarter over time.
            </Text>

            <View style={styles.onboardingActionsContainer}>
              <Text style={styles.onboardingActionsTitle}>Get Started</Text>

              <TouchableOpacity
                style={styles.onboardingPrimaryButton}
                onPress={handleUploadResume}
                disabled={isParsingResume || isOnboarding}
              >
                {isParsingResume || isOnboarding ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Upload size={24} color="#FFFFFF" />
                )}
                <View style={styles.onboardingButtonTextContainer}>
                  <Text style={styles.onboardingPrimaryButtonText}>
                    {isParsingResume || isOnboarding ? "Processing..." : "Upload Your Resume"}
                  </Text>
                  <Text style={styles.onboardingPrimaryButtonSubtext}>
                    PDF, DOC, DOCX, or TXT
                  </Text>
                </View>
              </TouchableOpacity>

              <View style={styles.onboardingDivider}>
                <View style={styles.onboardingDividerLine} />
                <Text style={styles.onboardingDividerText}>or</Text>
                <View style={styles.onboardingDividerLine} />
              </View>

              <TouchableOpacity
                style={styles.onboardingSecondaryButton}
                onPress={() => router.push("/profile/edit")}
                disabled={isParsingResume || isOnboarding}
              >
                <Plus size={20} color="#0066FF" />
                <Text style={styles.onboardingSecondaryButtonText}>
                  Add Information Manually
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.onboardingTertiaryButton}
                onPress={() => router.push("/chat")}
                disabled={isParsingResume || isOnboarding}
              >
                <Sparkles size={20} color="#0066FF" />
                <Text style={styles.onboardingTertiaryButtonText}>
                  Chat with AI Assistant
                </Text>
              </TouchableOpacity>
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
          <View style={styles.headerContent}>
            <Sparkles size={32} color="#0066FF" strokeWidth={2} />
            <Text style={styles.title}>JobMatch</Text>
          </View>
          <Text style={styles.subtitle}>
            Paste a job posting. Get a tailored resume.
          </Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <FileText size={24} color="#0066FF" />
            <Text style={styles.profileTitle}>Your Profile</Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{profile.experience.length}</Text>
              <Text style={styles.statLabel}>Experiences</Text>
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
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/job/analyze")}
          >
            <View style={styles.actionIconContainer}>
              <Briefcase size={24} color="#FFFFFF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Paste Job Posting</Text>
              <Text style={styles.actionDescription}>
                Get a tailored resume in seconds
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardSecondary}
            onPress={() => router.push("/chat")}
          >
            <View style={styles.actionIconContainerSecondary}>
              <Sparkles size={24} color="#0066FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitleSecondary}>Chat with AI</Text>
              <Text style={styles.actionDescriptionSecondary}>
                Improve your profile or ask questions
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your data is stored securely on your device
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 18,
    color: "#666666",
    lineHeight: 24,
    fontWeight: "500" as const,
  },
  profileCard: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#0066FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666666",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5E5",
  },
  editButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  actionsContainer: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0066FF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  actionCardSecondary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionIconContainerSecondary: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  actionTitleSecondary: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.85)",
    lineHeight: 20,
  },
  actionDescriptionSecondary: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  footer: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#999999",
  },
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  onboardingIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 24,
  },
  onboardingTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  onboardingSubtitle: {
    fontSize: 18,
    fontWeight: "500" as const,
    color: "#666666",
    textAlign: "center",
    marginBottom: 32,
  },
  onboardingDescription: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 26,
    marginBottom: 40,
  },
  onboardingActionsContainer: {
    marginTop: 8,
  },
  onboardingActionsTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 20,
  },
  onboardingPrimaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0066FF",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    gap: 16,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  onboardingButtonTextContainer: {
    flex: 1,
  },
  onboardingPrimaryButtonText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  onboardingPrimaryButtonSubtext: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  onboardingDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  onboardingDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  onboardingDividerText: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "500" as const,
  },
  onboardingSecondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#EBF3FF",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
  },
  onboardingSecondaryButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
  onboardingTertiaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#F0F0F0",
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  onboardingTertiaryButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
});
