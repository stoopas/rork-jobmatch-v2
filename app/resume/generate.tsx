import * as Clipboard from "expo-clipboard";
import { router, useLocalSearchParams } from "expo-router";
import { Check, Copy, FileText, Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { generateText } from "@rork-ai/toolkit-sdk";

export default function GenerateResumeScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile, jobPostings } = useUserProfile();
  const [resume, setResume] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [copied, setCopied] = useState(false);

  const job = jobPostings.find((j) => j.id === jobId);

  const generateResume = useCallback(async () => {
    if (!job) return;

    setIsGenerating(true);

    try {
      const aiResponse = await generateText({
        messages: [
          {
            role: "user",
            content: `You are an expert resume writer. Generate a tailored one-page resume for this job posting.

Candidate Profile:
${JSON.stringify(
  {
    experience: profile.experience.map((exp) => ({
      title: exp.title,
      company: exp.company,
      duration: `${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`,
      description: exp.description,
    })),
    skills: profile.skills.map((s) => s.name),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
  },
  null,
  2
)}

Job Posting:
Title: ${job.title}
Company: ${job.company}
Required Skills: ${job.requiredSkills.join(", ")}
Preferred Skills: ${job.preferredSkills.join(", ")}
Responsibilities: ${job.responsibilities.join(", ")}
Seniority: ${job.seniority}

Generate a professional, one-page resume that:
1. Highlights the most relevant experience and skills for THIS specific job
2. Uses keywords from the job posting naturally
3. Emphasizes achievements and impact
4. Maintains the candidate's authentic voice
5. Is formatted clearly with sections: Experience, Skills, Certifications
6. Keeps bullet points concise and impactful
7. Does NOT exaggerate or fabricate anything

Return ONLY the resume text, formatted with line breaks and clear section headers.`,
          },
        ],
      });

      setResume(aiResponse);
    } catch (error) {
      console.error("Error generating resume:", error);
      Alert.alert(
        "Generation Error",
        "Failed to generate resume. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [job, profile]);

  useEffect(() => {
    if (job) {
      generateResume();
    }
  }, [job, generateResume]);

  const copyToClipboard = async () => {
    await Clipboard.setStringAsync(resume);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job posting not found</Text>
      </View>
    );
  }

  if (isGenerating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Generating your resume...</Text>
        <Text style={styles.loadingSubtext}>
          Tailoring to {job.title} at {job.company}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <FileText size={20} color="#0066FF" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Tailored Resume</Text>
            <Text style={styles.headerSubtitle}>
              {job.title} at {job.company}
            </Text>
          </View>
        </View>
        <View style={styles.aiIndicator}>
          <Sparkles size={14} color="#0066FF" />
          <Text style={styles.aiText}>AI-Generated</Text>
        </View>
      </View>

      <ScrollView
        style={styles.resumeContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.resumeCard}>
          <Text style={styles.resumeText}>{resume}</Text>
        </View>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.copyButton]}
          onPress={copyToClipboard}
        >
          {copied ? (
            <>
              <Check size={20} color="#10B981" />
              <Text style={[styles.actionButtonText, { color: "#10B981" }]}>
                Copied!
              </Text>
            </>
          ) : (
            <>
              <Copy size={20} color="#0066FF" />
              <Text style={styles.actionButtonText}>Copy to Clipboard</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.primaryButton]}
          onPress={() => router.push("/")}
        >
          <Text style={styles.primaryButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#666666",
    marginTop: 8,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: "#666666",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginTop: 2,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#0066FF",
  },
  resumeContainer: {
    flex: 1,
  },
  resumeCard: {
    margin: 20,
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  resumeText: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
  },
  actions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  copyButton: {
    backgroundColor: "#F0F0F0",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
  primaryButton: {
    backgroundColor: "#0066FF",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
});
