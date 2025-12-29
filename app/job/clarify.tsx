import { router, useLocalSearchParams } from "expo-router";
import { HelpCircle, ArrowRight } from "lucide-react-native";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { generateText } from "@rork-ai/toolkit-sdk";
import ClarifyingQuestions, { ClarifyingQuestion } from "../../ui/components/ClarifyingQuestions";
import { BoringAI } from "../../ui/theme/boringAiTheme";

const MAX_QUESTIONS = 5;
const TARGET_QUESTIONS = 4;

export default function ClarifyScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { profile, jobPostings, hasClarificationFor } = useUserProfile();
  const [questions, setQuestions] = useState<ClarifyingQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(true);
  const [hasQuestions, setHasQuestions] = useState(false);
  const hasGeneratedRef = useRef(false);

  const job = jobPostings.find((j) => j.id === jobId);

  useEffect(() => {
    if (!job || hasGeneratedRef.current) return;

    const generateQuestionsOnce = async () => {
      hasGeneratedRef.current = true;
      setIsGenerating(true);

      try {
        const profileSummary = {
          skills: profile.skills.map((s) => s.name),
          tools: profile.tools.map((t) => t.name),
          domainExperience: profile.domainExperience,
          experience: profile.experience.map((exp) => ({
            title: exp.title,
            description: exp.description,
          })),
        };

        const aiResponse = await generateText({
          messages: [
            {
              role: "user",
              content: `You are analyzing gaps between a job posting and a candidate's profile.

Job Posting:
- Title: ${job.title}
- Required Skills: ${job.requiredSkills.join(", ")}
- Preferred Skills: ${job.preferredSkills.join(", ")}
- Domain: ${job.domain}

Candidate Profile:
${JSON.stringify(profileSummary, null, 2)}

Task: Generate clarifying questions for skills, tools, or domains in the job that are either:
1. Not clearly present in the profile
2. Mentioned but need confirmation or proficiency level

Rules:
- Only ask about items DIRECTLY relevant to the job posting
- Target 3-4 questions, maximum ${MAX_QUESTIONS}
- Prioritize the most critical gaps (required skills/tools over nice-to-haves)
- Each question should be short, specific, and yes/no answerable
- For skills and tools, we'll ask for proficiency (1-5) if they answer yes
- Assign priority (1-10, where 1 = most critical)
- Return empty array if the profile already covers everything well
- Avoid vague/generic questions like "communication" unless explicitly in required skills

Return ONLY valid JSON in this format:
{
  "questions": [
    {
      "id": "unique-id",
      "text": "Do you have experience with [skill/tool/domain]?",
      "topic": "[exact name of skill/tool/domain]",
      "category": "skill" | "tool" | "domain" | "experience",
      "topicKey": "skill:[name]" or "tool:[name]" or "domain:[name]",
      "requiresProficiency": true | false,
      "priority": 1,
      "why": "One sentence explaining why this matters for the job"
    }
  ]
}`,
            },
          ],
        });

        console.log("[generateQuestions] Raw AI response:", aiResponse?.slice(0, 200));

        let cleanedResponse = typeof aiResponse === "string" ? aiResponse.trim() : String(aiResponse || "").trim();
        
        if (cleanedResponse.startsWith("```")) {
          cleanedResponse = cleanedResponse.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
        }

        console.log("[generateQuestions] Cleaned response:", cleanedResponse.slice(0, 200));

        const parsed = JSON.parse(cleanedResponse);
        const generatedQuestions: ClarifyingQuestion[] = parsed.questions || [];

        const filteredQuestions = generatedQuestions
          .filter((q: ClarifyingQuestion) => !hasClarificationFor(q.topicKey))
          .sort((a: any, b: any) => (a.priority || 5) - (b.priority || 5))
          .slice(0, MAX_QUESTIONS);

        const finalQuestions = filteredQuestions.length > TARGET_QUESTIONS && 
          (filteredQuestions[TARGET_QUESTIONS]?.priority ?? 5) > 3
          ? filteredQuestions.slice(0, TARGET_QUESTIONS)
          : filteredQuestions;

        console.log("[generateQuestions] Generated questions:", generatedQuestions.length);
        console.log("[generateQuestions] Filtered & prioritized:", filteredQuestions.length);
        console.log("[generateQuestions] Final count:", finalQuestions.length);

        setQuestions(finalQuestions);
        setHasQuestions(finalQuestions.length > 0);
      } catch (error: any) {
        console.error("Error generating questions:", error?.message ?? error);
        setQuestions([]);
        setHasQuestions(false);
      } finally {
        setIsGenerating(false);
      }
    };

    generateQuestionsOnce();
  }, [job, profile, hasClarificationFor]);

  const handleComplete = () => {
    router.push({
      pathname: "/job/fit-score",
      params: { jobId: jobId || "" },
    });
  };

  const handleSkipAll = () => {
    router.push({
      pathname: "/job/fit-score",
      params: { jobId: jobId || "" },
    });
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
        <ActivityIndicator size="large" color={BoringAI.colors.accent} />
        <Text style={styles.loadingText}>Preparing questions...</Text>
        <Text style={styles.loadingSubtext}>
          Usually 3–4 quick confirmations
        </Text>
      </View>
    );
  }

  if (!hasQuestions) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.noQuestionsContainer}>
          <View style={styles.iconContainer}>
            <HelpCircle size={48} color={BoringAI.colors.success} />
          </View>
          <Text style={styles.noQuestionsTitle}>Ready</Text>
          <Text style={styles.noQuestionsText}>
            Your profile has enough information for this job
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
            <Text style={styles.continueButtonText}>Continue</Text>
            <ArrowRight size={20} color={BoringAI.colors.background} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Answer {questions.length} quick question{questions.length !== 1 ? 's' : ''}</Text>
        <Text style={styles.subtitle}>
          After this, we&apos;ll generate your resume.
        </Text>
      </View>
      
      <ClarifyingQuestions
        questions={questions}
        onComplete={handleComplete}
        jobId={jobId || ""}
      />

      <TouchableOpacity style={styles.skipAllButton} onPress={handleSkipAll}>
        <Text style={styles.skipAllButtonText}>Skip All</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BoringAI.colors.background,
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BoringAI.colors.background,
    padding: BoringAI.spacing.xl,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginTop: BoringAI.spacing.md,
  },
  loadingSubtext: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    marginTop: BoringAI.spacing.xs,
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: BoringAI.colors.background,
    padding: BoringAI.spacing.xl,
  },
  errorText: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
  },
  header: {
    padding: BoringAI.spacing.xl,
    paddingBottom: 0,
  },
  title: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xs,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    lineHeight: 22,
    marginBottom: BoringAI.spacing.lg,
  },
  noQuestionsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: BoringAI.spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: BoringAI.spacing.lg,
  },
  noQuestionsTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xs,
    letterSpacing: -0.2,
  },
  noQuestionsText: {
    fontSize: 16,
    color: BoringAI.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: BoringAI.spacing.xxl,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: BoringAI.spacing.sm,
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: BoringAI.spacing.xxl,
    borderRadius: BoringAI.radius.button,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  skipAllButton: {
    marginHorizontal: BoringAI.spacing.xl,
    marginTop: BoringAI.spacing.md,
    marginBottom: BoringAI.spacing.xxl,
    paddingVertical: 14,
    borderRadius: BoringAI.radius.button,
    alignItems: "center",
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
  },
  skipAllButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.textMuted,
  },
});
