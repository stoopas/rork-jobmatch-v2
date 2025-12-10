import { router, useLocalSearchParams } from "expo-router";
import {
  Award,
  Briefcase,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { generateText } from "@rork-ai/toolkit-sdk";
import type { FitScore } from "../../types/profile";

export default function FitScoreScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile, jobPostings } = useUserProfile();
  const [fitScore, setFitScore] = useState<FitScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [scoreAnimation] = useState(new Animated.Value(0));

  const job = jobPostings.find((j) => j.id === jobId);

  const analyzeFit = useCallback(async () => {
    if (!job) return;

    setIsAnalyzing(true);

    try {
      const profileSummary = {
        experience: profile.experience.map((exp) => ({
          title: exp.title,
          company: exp.company,
          duration: `${exp.startDate} - ${exp.current ? "Present" : exp.endDate}`,
          description: exp.description,
        })),
        skills: profile.skills.map((s) => s.name),
        certifications: profile.certifications.map((c) => c.name),
      };

      const aiResponse = await generateText({
        messages: [
          {
            role: "user",
            content: `You are an expert career advisor. Analyze the fit between this candidate profile and job posting.

Candidate Profile:
${JSON.stringify(profileSummary, null, 2)}

Job Posting:
Title: ${job.title}
Company: ${job.company}
Required Skills: ${job.requiredSkills.join(", ")}
Preferred Skills: ${job.preferredSkills.join(", ")}
Responsibilities: ${job.responsibilities.join(", ")}
Seniority: ${job.seniority}
Domain: ${job.domain}

Provide a fit score analysis with:
1. Overall score (0-100)
2. Experience Alignment score (0-100)
3. Technical Skill Match score (0-100)
4. Domain Relevance score (0-100)
5. Stage/Cultural Fit score (0-100)
6. Impact Potential score (0-100)
7. Detailed rationale for each dimension (2-3 sentences each)

Return ONLY valid JSON in this exact format:
{
  "overall": number,
  "experienceAlignment": number,
  "technicalSkillMatch": number,
  "domainRelevance": number,
  "stageCulturalFit": number,
  "impactPotential": number,
  "rationale": {
    "experienceAlignment": "string",
    "technicalSkillMatch": "string",
    "domainRelevance": "string",
    "stageCulturalFit": "string",
    "impactPotential": "string"
  }
}`,
          },
        ],
      });

      console.log("[analyzeFit] Raw AI response:", aiResponse?.slice(0, 200));

      let cleanedResponse = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse || "").trim();
      
      if (cleanedResponse.startsWith("```")) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      }

      console.log("[analyzeFit] Cleaned response:", cleanedResponse.slice(0, 200));

      const parsed = JSON.parse(cleanedResponse);
      setFitScore(parsed);

      Animated.spring(scoreAnimation, {
        toValue: parsed.overall,
        useNativeDriver: true,
        tension: 20,
        friction: 7,
      }).start();
    } catch (error: any) {
      console.error("Error analyzing fit:", error?.message ?? error, error?.stack ?? error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [job, profile, scoreAnimation]);

  useEffect(() => {
    if (job) {
      analyzeFit();
    }
  }, [job, analyzeFit]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "#10B981";
    if (score >= 75) return "#3B82F6";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent Fit";
    if (score >= 75) return "Strong Fit";
    if (score >= 50) return "Partial Fit";
    return "Low Alignment";
  };

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Job posting not found</Text>
      </View>
    );
  }

  if (isAnalyzing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Analyzing your fit...</Text>
        <Text style={styles.loadingSubtext}>
          Comparing your profile with job requirements
        </Text>
      </View>
    );
  }

  if (!fitScore) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to analyze fit</Text>
        <TouchableOpacity style={styles.retryButton} onPress={analyzeFit}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobCompany}>{job.company}</Text>
        </View>
      </View>

      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Sparkles size={24} color={getScoreColor(fitScore.overall)} />
          <Text style={styles.scoreTitle}>Overall Fit Score</Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text
            style={[
              styles.scoreNumber,
              { color: getScoreColor(fitScore.overall) },
            ]}
          >
            {fitScore.overall}
          </Text>
          <Text style={styles.scoreOutOf}>/100</Text>
        </View>
        <View
          style={[
            styles.scoreBadge,
            { backgroundColor: getScoreColor(fitScore.overall) + "20" },
          ]}
        >
          <Text
            style={[
              styles.scoreBadgeText,
              { color: getScoreColor(fitScore.overall) },
            ]}
          >
            {getScoreLabel(fitScore.overall)}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detailed Breakdown</Text>

        <ScoreDimension
          icon={<Briefcase size={20} color="#0066FF" />}
          title="Experience Alignment"
          score={fitScore.experienceAlignment}
          rationale={fitScore.rationale.experienceAlignment}
        />

        <ScoreDimension
          icon={<Target size={20} color="#0066FF" />}
          title="Technical Skill Match"
          score={fitScore.technicalSkillMatch}
          rationale={fitScore.rationale.technicalSkillMatch}
        />

        <ScoreDimension
          icon={<Award size={20} color="#0066FF" />}
          title="Domain Relevance"
          score={fitScore.domainRelevance}
          rationale={fitScore.rationale.domainRelevance}
        />

        <ScoreDimension
          icon={<Users size={20} color="#0066FF" />}
          title="Stage/Cultural Fit"
          score={fitScore.stageCulturalFit}
          rationale={fitScore.rationale.stageCulturalFit}
        />

        <ScoreDimension
          icon={<TrendingUp size={20} color="#0066FF" />}
          title="Impact Potential"
          score={fitScore.impactPotential}
          rationale={fitScore.rationale.impactPotential}
        />
      </View>

      {fitScore.overall >= 50 && (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() =>
            router.push({
              pathname: "/resume/generate",
              params: { jobId: job.id },
            })
          }
        >
          <FileText size={20} color="#FFFFFF" />
          <Text style={styles.generateButtonText}>Generate Tailored Resume</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.push("/")}
      >
        <Text style={styles.backButtonText}>Back to Home</Text>
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

function ScoreDimension({
  icon,
  title,
  score,
  rationale,
}: {
  icon: React.ReactNode;
  title: string;
  score: number;
  rationale: string;
}) {
  const getBarColor = (score: number) => {
    if (score >= 75) return "#10B981";
    if (score >= 50) return "#F59E0B";
    return "#EF4444";
  };

  return (
    <View style={styles.dimensionCard}>
      <View style={styles.dimensionHeader}>
        <View style={styles.dimensionTitleContainer}>
          <View>{icon}</View>
          <Text style={styles.dimensionTitle}>{title}</Text>
        </View>
        <Text style={[styles.dimensionScore, { color: getBarColor(score) }]}>
          {score}
        </Text>
      </View>
      <View style={styles.progressBar}>
        <View
          style={[
            styles.progressFill,
            { width: `${score}%`, backgroundColor: getBarColor(score) },
          ]}
        />
      </View>
      <Text style={styles.dimensionRationale}>{rationale}</Text>
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  jobInfo: {
    alignItems: "center",
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  jobCompany: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
  },
  scoreCard: {
    marginHorizontal: 24,
    padding: 32,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  scoreTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  scoreCircle: {
    alignItems: "center",
    marginBottom: 16,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "700" as const,
    lineHeight: 72,
  },
  scoreOutOf: {
    fontSize: 20,
    color: "#999999",
    marginTop: -8,
  },
  scoreBadge: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  scoreBadgeText: {
    fontSize: 15,
    fontWeight: "600" as const,
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  dimensionCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dimensionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  dimensionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  dimensionScore: {
    fontSize: 22,
    fontWeight: "700" as const,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    marginBottom: 12,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 4,
  },
  dimensionRationale: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  generateButton: {
    marginHorizontal: 24,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0066FF",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  backButton: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  bottomPadding: {
    height: 40,
  },
});
