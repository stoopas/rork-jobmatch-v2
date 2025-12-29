import { router } from "expo-router";
import { Briefcase } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { generateText } from "@rork-ai/toolkit-sdk";
import type { JobPosting } from "../../types/profile";
import { BoringAI } from "../../ui/theme/boringAiTheme";

export default function AnalyzeJobScreen() {
  const { profile, addJobPosting, getResumeAssets } = useUserProfile();
  const [jobText, setJobText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeJob = async () => {
    if (!jobText.trim()) {
      Alert.alert("Error", "Please paste a job posting first");
      return;
    }

    const resumeAssets = getResumeAssets();
    const hasAnyData = 
      profile.experience.length > 0 || 
      profile.skills.length > 0 || 
      resumeAssets.length > 0;

    if (!hasAnyData) {
      Alert.alert(
        "Upload Resume First",
        "Please upload a resume to analyze job postings.",
        [
          { text: "OK" },
          { text: "Go to Profile", onPress: () => router.push("/profile/edit") },
        ]
      );
      return;
    }

    setIsAnalyzing(true);

    try {
      const aiResponse = await generateText({
        messages: [
          {
            role: "user",
            content: `Parse this job posting and extract the key information. Return a JSON object with: title, company, description (brief summary), requiredSkills (array of strings), preferredSkills (array of strings), responsibilities (array of key responsibilities), seniority (entry/mid/senior/lead), domain (e.g., healthcare, fintech, etc.).

Job Posting:
${jobText}

Return only valid JSON, no additional text.`,
          },
        ],
      });

      let cleanedResponse = aiResponse.trim();
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }

      const parsed = JSON.parse(cleanedResponse);

      const jobPosting: JobPosting = {
        id: Date.now().toString(),
        title: parsed.title || "Untitled Position",
        company: parsed.company || "Unknown Company",
        description: parsed.description || jobText.substring(0, 200),
        requiredSkills: parsed.requiredSkills || [],
        preferredSkills: parsed.preferredSkills || [],
        responsibilities: parsed.responsibilities || [],
        seniority: parsed.seniority || "mid",
        domain: parsed.domain || "general",
        timestamp: new Date().toISOString(),
      };

      addJobPosting(jobPosting);

      router.push({
        pathname: "/job/clarify",
        params: { jobId: jobPosting.id },
      });
    } catch (error) {
      console.error("Error analyzing job:", error);
      Alert.alert(
        "Analysis Error",
        "Failed to analyze the job posting. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Briefcase size={40} color={BoringAI.colors.text} strokeWidth={1.5} />
          <Text style={styles.title}>Add a job posting</Text>
          <Text style={styles.subtitle}>
            Paste the job description and we&apos;ll prepare your tailored resume
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="Paste job posting here..."
            value={jobText}
            onChangeText={setJobText}
            multiline
            placeholderTextColor={BoringAI.colors.textFaint}
            editable={!isAnalyzing}
          />
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
          onPress={analyzeJob}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color={BoringAI.colors.background} size="small" />
              <Text style={styles.analyzeButtonText}>Analyzing...</Text>
            </>
          ) : (
            <Text style={styles.analyzeButtonText}>Continue</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: BoringAI.spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: BoringAI.spacing.xxl,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginTop: BoringAI.spacing.md,
    marginBottom: BoringAI.spacing.xs,
    textAlign: "center",
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: BoringAI.spacing.lg,
  },
  textArea: {
    backgroundColor: BoringAI.colors.surface,
    padding: BoringAI.spacing.lg,
    borderRadius: BoringAI.radius.input,
    fontSize: 16,
    color: BoringAI.colors.text,
    minHeight: 300,
    textAlignVertical: "top",
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: BoringAI.spacing.sm,
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 18,
    borderRadius: BoringAI.radius.button,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
});
