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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.id]);

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
        <ActivityIndicator size="large" color="#0066FF" />
        <Text style={styles.loadingText}>Preparing a few quick questions...</Text>
        <Text style={styles.loadingSubtext}>
          Usually 3–5 questions to tailor your resume
        </Text>
      </View>
    );
  }

  if (!hasQuestions) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.noQuestionsContainer}>
          <View style={styles.iconContainer}>
            <HelpCircle size={48} color="#10B981" />
          </View>
          <Text style={styles.noQuestionsTitle}>All Set!</Text>
          <Text style={styles.noQuestionsText}>
            Your profile has enough information for this job. No clarifying questions needed!
          </Text>
          <TouchableOpacity style={styles.continueButton} onPress={handleComplete}>
            <Text style={styles.continueButtonText}>Continue to Fit Score</Text>
            <ArrowRight size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Quick Questions</Text>
        <Text style={styles.subtitle}>
          Answer {questions.length} quick question{questions.length !== 1 ? 's' : ''} to tailor your resume.
        </Text>
      </View>
      
      <ClarifyingQuestions
        questions={questions}
        onComplete={handleComplete}
        jobId={jobId || ""}
      />

      <TouchableOpacity style={styles.skipAllButton} onPress={handleSkipAll}>
        <Text style={styles.skipAllButtonText}>Skip All Questions</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollContent: {
    flexGrow: 1,
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
    padding: 24,
    paddingBottom: 0,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
    marginBottom: 24,
  },
  noQuestionsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#D1FAE5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  noQuestionsTitle: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginBottom: 12,
  },
  noQuestionsText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0066FF",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  skipAllButton: {
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 32,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  skipAllButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#666666",
  },
});
