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
import { Brand } from "../../constants/brand";

export default function FitScoreScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile, jobPostings } = useUserProfile();
  const [fitScore, setFitScore] = useState<FitScore | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [scoreAnimation] = useState(new Animated.Value(0));
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*\n?/, "").replace(/\s*\n?```\s*$/g, "").trim();
      }

      console.log("[analyzeFit] Cleaned response:", cleanedResponse.slice(0, 200));

      let parsed: any = null;
      try {
        parsed = JSON.parse(cleanedResponse);
      } catch {
        console.error("[analyzeFit] Initial JSON parse failed, attempting to extract JSON...");
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/m);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
            console.log("[analyzeFit] Successfully extracted and parsed JSON from response");
          } catch (extractErr) {
            console.error("[analyzeFit] Failed to parse extracted JSON:", extractErr);
            throw new Error("Could not extract valid JSON from AI response");
          }
        } else {
          console.error("[analyzeFit] No JSON found in response:", cleanedResponse);
          throw new Error("AI response does not contain valid JSON");
        }
      }
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
    if (score >= 90) return Brand.colors.success;
    if (score >= 75) return Brand.colors.accent;
    if (score >= 50) return Brand.colors.warning;
    return Brand.colors.danger;
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
        <ActivityIndicator size="large" color={Brand.colors.accent} />
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
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Detailed Breakdown</Text>
          <TouchableOpacity
            onPress={() => {
              const allExpanded = Object.keys(expandedSections).length === 5 && Object.values(expandedSections).every(v => v);
              setExpandedSections({
                experience: !allExpanded,
                technical: !allExpanded,
                domain: !allExpanded,
                cultural: !allExpanded,
                impact: !allExpanded,
              });
            }}
          >
            <Text style={styles.expandAllText}>
              {Object.values(expandedSections).every(v => v) ? "Collapse All" : "Expand All"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScoreDimension
          icon={<Briefcase size={20} color={Brand.colors.textMuted} />}
          title="Experience Alignment"
          score={fitScore.experienceAlignment}
          rationale={fitScore.rationale.experienceAlignment}
          expanded={!!expandedSections.experience}
          onToggle={() => setExpandedSections({ ...expandedSections, experience: !expandedSections.experience })}
        />

        <ScoreDimension
          icon={<Target size={20} color={Brand.colors.textMuted} />}
          title="Technical Skill Match"
          score={fitScore.technicalSkillMatch}
          rationale={fitScore.rationale.technicalSkillMatch}
          expanded={!!expandedSections.technical}
          onToggle={() => setExpandedSections({ ...expandedSections, technical: !expandedSections.technical })}
        />

        <ScoreDimension
          icon={<Award size={20} color={Brand.colors.textMuted} />}
          title="Domain Relevance"
          score={fitScore.domainRelevance}
          rationale={fitScore.rationale.domainRelevance}
          expanded={!!expandedSections.domain}
          onToggle={() => setExpandedSections({ ...expandedSections, domain: !expandedSections.domain })}
        />

        <ScoreDimension
          icon={<Users size={20} color={Brand.colors.textMuted} />}
          title="Stage/Cultural Fit"
          score={fitScore.stageCulturalFit}
          rationale={fitScore.rationale.stageCulturalFit}
          expanded={!!expandedSections.cultural}
          onToggle={() => setExpandedSections({ ...expandedSections, cultural: !expandedSections.cultural })}
        />

        <ScoreDimension
          icon={<TrendingUp size={20} color={Brand.colors.textMuted} />}
          title="Impact Potential"
          score={fitScore.impactPotential}
          rationale={fitScore.rationale.impactPotential}
          expanded={!!expandedSections.impact}
          onToggle={() => setExpandedSections({ ...expandedSections, impact: !expandedSections.impact })}
        />
      </View>

      {fitScore.overall >= 50 && (
        <TouchableOpacity
          style={styles.generateButton}
          onPress={() =>
            router.push({
              pathname: "/resume/options",
              params: { jobId: job.id },
            })
          }
        >
          <FileText size={20} color="#0B0F14" />
          <Text style={styles.generateButtonText}>Generate Resume</Text>
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
  expanded,
  onToggle,
}: {
  icon: React.ReactNode;
  title: string;
  score: number;
  rationale: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const getBarColor = (score: number) => {
    if (score >= 75) return Brand.colors.success;
    if (score >= 50) return Brand.colors.warning;
    return Brand.colors.danger;
  };

  return (
    <TouchableOpacity style={styles.dimensionCard} onPress={onToggle} activeOpacity={0.7}>
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
      {expanded && (
        <View style={styles.rationaleContainer}>
          <Text style={styles.dimensionRationale}>{rationale}</Text>
        </View>
      )}
      <View style={styles.expandIndicator}>
        <Text style={styles.expandText}>
          {expanded ? "Tap to collapse" : "Tap for details"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Brand.colors.bg,
    padding: Brand.spacing.lg,
  },
  loadingText: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: Brand.colors.text,
    marginTop: Brand.spacing.md,
  },
  loadingSubtext: {
    fontSize: Brand.typography.sizes.small,
    color: Brand.colors.textMuted,
    marginTop: Brand.spacing.xs,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Brand.colors.bg,
    padding: Brand.spacing.lg,
  },
  errorText: {
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.textMuted,
    marginBottom: Brand.spacing.md,
  },
  retryButton: {
    backgroundColor: Brand.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: Brand.spacing.lg,
    borderRadius: Brand.radius.button,
  },
  retryButtonText: {
    fontSize: Brand.typography.sizes.body,
    fontWeight: "600" as const,
    color: "#0B0F14",
  },
  header: {
    padding: Brand.spacing.lg,
    paddingBottom: Brand.spacing.md,
  },
  jobInfo: {
    alignItems: "center",
  },
  jobTitle: {
    fontSize: Brand.typography.sizes.h1,
    fontWeight: "600" as const,
    color: Brand.colors.text,
    textAlign: "center",
    marginBottom: Brand.spacing.xs,
  },
  jobCompany: {
    fontSize: Brand.typography.sizes.body,
    color: Brand.colors.textMuted,
    textAlign: "center",
  },
  scoreCard: {
    marginHorizontal: Brand.spacing.lg,
    padding: Brand.spacing.xl,
    backgroundColor: Brand.colors.surface,
    borderRadius: Brand.radius.card,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    alignItems: "center",
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Brand.spacing.sm,
    marginBottom: Brand.spacing.lg,
  },
  scoreTitle: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  scoreCircle: {
    alignItems: "center",
    marginBottom: Brand.spacing.md,
  },
  scoreNumber: {
    fontSize: 64,
    fontWeight: "600" as const,
    lineHeight: 72,
  },
  scoreOutOf: {
    fontSize: 20,
    color: Brand.colors.textFaint,
    marginTop: -8,
  },
  scoreBadge: {
    paddingVertical: Brand.spacing.sm,
    paddingHorizontal: Brand.spacing.lg,
    borderRadius: Brand.radius.pill,
  },
  scoreBadgeText: {
    fontSize: Brand.typography.sizes.body,
    fontWeight: "600" as const,
  },
  section: {
    padding: Brand.spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Brand.spacing.md,
  },
  sectionTitle: {
    fontSize: Brand.typography.sizes.h2,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  expandAllText: {
    fontSize: Brand.typography.sizes.small,
    fontWeight: "600" as const,
    color: Brand.colors.accent,
  },
  dimensionCard: {
    backgroundColor: Brand.colors.surface,
    padding: Brand.spacing.lg,
    borderRadius: Brand.radius.card,
    borderWidth: 1,
    borderColor: Brand.colors.border,
    marginBottom: Brand.spacing.md,
  },
  dimensionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Brand.spacing.sm,
  },
  dimensionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Brand.spacing.sm,
    flex: 1,
  },
  dimensionTitle: {
    fontSize: Brand.typography.sizes.body,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  dimensionScore: {
    fontSize: Brand.typography.sizes.h2,
    fontWeight: "600" as const,
  },
  progressBar: {
    height: 6,
    backgroundColor: Brand.colors.surfaceAlt,
    borderRadius: 3,
    marginBottom: Brand.spacing.sm,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  rationaleContainer: {
    marginTop: Brand.spacing.sm,
    paddingTop: Brand.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Brand.colors.border,
  },
  dimensionRationale: {
    fontSize: Brand.typography.sizes.small,
    color: Brand.colors.textMuted,
    lineHeight: Brand.typography.lineHeights.small,
  },
  expandIndicator: {
    marginTop: Brand.spacing.xs,
    alignItems: "center",
  },
  expandText: {
    fontSize: Brand.typography.sizes.micro,
    color: Brand.colors.textFaint,
    fontStyle: "italic" as const,
  },
  generateButton: {
    marginHorizontal: Brand.spacing.lg,
    marginTop: Brand.spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Brand.spacing.sm,
    backgroundColor: Brand.colors.accent,
    paddingVertical: Brand.spacing.md,
    borderRadius: Brand.radius.button,
  },
  generateButtonText: {
    fontSize: Brand.typography.sizes.h3,
    fontWeight: "600" as const,
    color: "#0B0F14",
  },
  backButton: {
    marginHorizontal: Brand.spacing.lg,
    marginTop: Brand.spacing.md,
    paddingVertical: 14,
    borderRadius: Brand.radius.button,
    alignItems: "center",
    backgroundColor: Brand.colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Brand.colors.border,
  },
  backButtonText: {
    fontSize: Brand.typography.sizes.body,
    fontWeight: "600" as const,
    color: Brand.colors.text,
  },
  bottomPadding: {
    height: 40,
  },
});
