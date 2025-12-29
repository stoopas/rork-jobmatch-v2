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
import { Brand } from "../../constants/brand";

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
          <Briefcase size={40} color={Brand.colors.accent} strokeWidth={1} />
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
            placeholderTextColor={Brand.colors.textFaint}
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
              <ActivityIndicator color="#0B0F14" size="small" />
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
    backgroundColor: Brand.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Brand.spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Brand.spacing.xl,
  },
  title: {
    fontSize: Brand.typography.sizes.h2,
    fontWeight: "600" as const,
    color: Brand.colors.text,
    marginTop: Brand.spacing.md,
    marginBottom: Brand.spacing.xs,
    textAlign: "center",
  },
  subtitle: {
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.textMuted,
    textAlign: "center",
    lineHeight: Brand.typography.lineHeights.body,
  },
  inputContainer: {
    marginBottom: Brand.spacing.lg,
  },
  textArea: {
    backgroundColor: Brand.colors.surface,
    padding: 20,
    borderRadius: Brand.radius.input,
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.text,
    minHeight: 300,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: Brand.colors.border,

  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Brand.spacing.sm,
    backgroundColor: Brand.colors.accent,
    paddingVertical: 18,
    borderRadius: Brand.radius.button,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  analyzeButtonText: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: "#0B0F14",
  },
});
