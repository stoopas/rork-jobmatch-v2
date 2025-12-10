import { router } from "expo-router";
import { Briefcase, Sparkles } from "lucide-react-native";
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

export default function AnalyzeJobScreen() {
  const { profile, addJobPosting } = useUserProfile();
  const [jobText, setJobText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeJob = async () => {
    if (!jobText.trim()) {
      Alert.alert("Error", "Please paste a job posting first");
      return;
    }

    if (profile.experience.length === 0 && profile.skills.length === 0) {
      Alert.alert(
        "No Profile Data",
        "Please add your experience and skills first before analyzing job postings."
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
          <View style={styles.iconContainer}>
            <Briefcase size={32} color="#0066FF" />
          </View>
          <Text style={styles.title}>Analyze Job Posting</Text>
          <Text style={styles.subtitle}>
            Paste a job description below and I&apos;ll analyze how well you fit the
            role based on your profile.
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textArea}
            placeholder="Paste job posting here...&#10;&#10;Include the job title, requirements, responsibilities, and any other relevant details."
            value={jobText}
            onChangeText={setJobText}
            multiline
            placeholderTextColor="#999999"
            editable={!isAnalyzing}
          />
          <View style={styles.inputFooter}>
            <View style={styles.aiIndicator}>
              <Sparkles size={16} color="#0066FF" />
              <Text style={styles.aiText}>AI-Powered Analysis</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, isAnalyzing && styles.buttonDisabled]}
          onPress={analyzeJob}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <ActivityIndicator color="#FFFFFF" size="small" />
              <Text style={styles.analyzeButtonText}>Analyzing...</Text>
            </>
          ) : (
            <>
              <Sparkles size={20} color="#FFFFFF" />
              <Text style={styles.analyzeButtonText}>Analyze Fit</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>Tips for Best Results</Text>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Include the full job description with requirements
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              Make sure your profile is complete with experience and skills
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>
              The more details in both, the better the analysis
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  inputContainer: {
    marginBottom: 24,
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    fontSize: 16,
    color: "#1A1A1A",
    minHeight: 300,
    textAlignVertical: "top",
    borderWidth: 2,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  inputFooter: {
    marginTop: 12,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: "#0066FF",
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0066FF",
    paddingVertical: 18,
    borderRadius: 16,
    marginBottom: 24,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  analyzeButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  tipsCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingRight: 16,
  },
  tipBullet: {
    fontSize: 16,
    color: "#0066FF",
    marginRight: 8,
    fontWeight: "700" as const,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
});
