import { createRorkTool, useRorkAgent, generateObject } from "@rork-ai/toolkit-sdk";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Stack } from "expo-router";
import { Send, Upload, X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { z } from "zod";

import { useUserProfile } from "../contexts/UserProfileContext";

type QuickReply = {
  label: string;
  value: string;
};

const resumeSchema = z.object({
    experience: z.array(
      z.object({
        title: z.string(),
        company: z.string(),
        startDate: z.string(),
        endDate: z.string().optional(),
        current: z.boolean(),
        description: z.string(),
        achievements: z.array(z.string()),
      })
    ),
    skills: z.array(
      z.object({
        name: z.string(),
        category: z.string(),
      })
    ),
    certifications: z.array(
      z.object({
        name: z.string(),
        issuer: z.string(),
        date: z.string(),
      })
    ),
    tools: z.array(
      z.object({
        name: z.string(),
        category: z.string(),
      })
    ),
    projects: z.array(
      z.object({
        title: z.string(),
        description: z.string(),
        technologies: z.array(z.string()),
      })
    ),
    domainExperience: z.array(z.string()),
  });

export default function ChatScreen() {
  const { profile, updateProfile } = useUserProfile();
  const [input, setInput] = useState("");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [isParsingResume, setIsParsingResume] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const [waitingForUserInput, setWaitingForUserInput] = useState(false);

  const { messages, error, sendMessage, setMessages } = useRorkAgent({
    tools: {
      storeExperience: createRorkTool({
        description: "Store work experience details in user profile",
        zodSchema: z.object({
          title: z.string().describe("Job title"),
          company: z.string().describe("Company name"),
          startDate: z.string().describe("Start date"),
          endDate: z.string().optional().describe("End date if not current"),
          current: z.boolean().describe("Currently working here"),
          description: z.string().describe("Role description"),
          achievements: z
            .array(z.string())
            .describe("Key achievements in this role"),
        }) as any,
        execute(input: any) {
          console.log("[storeExperience] Storing experience:", input);
          try {
            updateProfile({
              experience: [
                ...profile.experience,
                {
                  id: Date.now().toString(),
                  title: input.title,
                  company: input.company,
                  startDate: input.startDate,
                  endDate: input.endDate,
                  current: input.current,
                  description: input.description,
                  achievements: input.achievements || [],
                },
              ],
            });
            return "Experience stored successfully";
          } catch (error) {
            console.error("[storeExperience] Error:", error);
            return "Failed to store experience";
          }
        },
      }),
      storeSkills: createRorkTool({
        description: "Store multiple skills in user profile",
        zodSchema: z.object({
          skills: z
            .array(
              z.object({
                name: z.string().describe("Skill name"),
                category: z.string().describe("Skill category"),
              })
            )
            .describe("List of skills to store"),
        }) as any,
        execute(input: any) {
          console.log("[storeSkills] Storing skills:", input);
          try {
            updateProfile({
              skills: [
                ...profile.skills,
                ...(input.skills || []).map((skill: any) => ({
                  id: Date.now().toString() + Math.random(),
                  name: skill.name,
                  category: skill.category || "General",
                })),
              ],
            });
            return "Skills stored successfully";
          } catch (error) {
            console.error("[storeSkills] Error:", error);
            return "Failed to store skills";
          }
        },
      }),
      storeTools: createRorkTool({
        description: "Store tools and software in user profile",
        zodSchema: z.object({
          tools: z
            .array(
              z.object({
                name: z.string().describe("Tool name"),
                category: z.string().describe("Tool category"),
              })
            )
            .describe("List of tools to store"),
        }) as any,
        execute(input: any) {
          console.log("[storeTools] Storing tools:", input);
          try {
            updateProfile({
              tools: [
                ...profile.tools,
                ...(input.tools || []).map((tool: any) => ({
                  id: Date.now().toString() + Math.random(),
                  name: tool.name,
                  category: tool.category || "General",
                })),
              ],
            });
            return "Tools stored successfully";
          } catch (error) {
            console.error("[storeTools] Error:", error);
            return "Failed to store tools";
          }
        },
      }),
      storeDomainExperience: createRorkTool({
        description:
          "Store domain experience (e.g. Healthcare, Finance, E-commerce)",
        zodSchema: z.object({
          domains: z.array(z.string()).describe("List of domain experiences"),
        }) as any,
        execute(input: any) {
          console.log("[storeDomainExperience] Storing domains:", input);
          try {
            updateProfile({
              domainExperience: [
                ...profile.domainExperience,
                ...(input.domains || []),
              ],
            });
            return "Domain experience stored successfully";
          } catch (error) {
            console.error("[storeDomainExperience] Error:", error);
            return "Failed to store domain experience";
          }
        },
      }),
      storeCertification: createRorkTool({
        description: "Store certifications",
        zodSchema: z.object({
          name: z.string().describe("Certification name"),
          issuer: z.string().describe("Issuing organization"),
          date: z.string().describe("Date obtained"),
        }) as any,
        execute(input: any) {
          console.log("[storeCertification] Storing certification:", input);
          try {
            updateProfile({
              certifications: [
                ...profile.certifications,
                {
                  id: Date.now().toString(),
                  name: input.name,
                  issuer: input.issuer || "",
                  date: input.date || "",
                },
              ],
            });
            return "Certification stored successfully";
          } catch (error) {
            console.error("[storeCertification] Error:", error);
            return "Failed to store certification";
          }
        },
      }),
      storeClarifyingAnswer: createRorkTool({
        description: "Store a clarifying answer with its category",
        zodSchema: z.object({
          question: z.string().describe("The question that was asked"),
          answer: z.string().describe("The user's answer"),
          category: z
            .string()
            .describe(
              "Category: skills, tools, domains, experience, work_style, preferences"
            ),
        }) as any,
        execute(input: any) {
          console.log("[storeClarifyingAnswer] Storing answer:", input);
          try {
            const key = `${input.category}-${Date.now()}`;
            updateProfile({
              clarifyingAnswers: {
                ...profile.clarifyingAnswers,
                [key]: {
                  question: input.question,
                  answer: input.answer,
                  category: input.category,
                  timestamp: new Date().toISOString(),
                },
              },
            });
            return "Answer stored successfully";
          } catch (error) {
            console.error("[storeClarifyingAnswer] Error:", error);
            return "Failed to store answer";
          }
        },
      }),
      calculateFitScore: createRorkTool({
        description: "Calculate fit score for a job posting",
        zodSchema: z.object({
          jobTitle: z.string().describe("Job title"),
          jobCompany: z.string().describe("Company name"),
          jobDescription: z.string().describe("Full job description"),
          requiredSkills: z.array(z.string()).describe("Required skills"),
          preferredSkills: z.array(z.string()).describe("Preferred skills"),
          responsibilities: z.array(z.string()).describe("Key responsibilities"),
          domain: z.string().describe("Industry domain"),
          seniority: z.string().describe("Seniority level"),
          experienceAlignment: z
            .number()
            .min(0)
            .max(100)
            .describe("Score 0-100"),
          technicalSkillMatch: z
            .number()
            .min(0)
            .max(100)
            .describe("Score 0-100"),
          domainRelevance: z.number().min(0).max(100).describe("Score 0-100"),
          stageCulturalFit: z.number().min(0).max(100).describe("Score 0-100"),
          impactPotential: z.number().min(0).max(100).describe("Score 0-100"),
          rationaleExperience: z
            .string()
            .describe("Rationale for experience score"),
          rationaleTechnical: z
            .string()
            .describe("Rationale for technical score"),
          rationaleDomain: z.string().describe("Rationale for domain score"),
          rationaleCulture: z.string().describe("Rationale for culture score"),
          rationaleImpact: z.string().describe("Rationale for impact score"),
        }) as any,
        execute(input: any) {
          console.log("[calculateFitScore] Calculating fit score:", input);
          try {
            const overall =
              input.experienceAlignment * 0.3 +
              input.technicalSkillMatch * 0.25 +
              input.domainRelevance * 0.2 +
              input.stageCulturalFit * 0.15 +
              input.impactPotential * 0.1;

            const result = {
              overall: Math.round(overall),
              breakdown: {
                experienceAlignment: input.experienceAlignment,
                technicalSkillMatch: input.technicalSkillMatch,
                domainRelevance: input.domainRelevance,
                stageCulturalFit: input.stageCulturalFit,
                impactPotential: input.impactPotential,
              },
              rationale: {
                experienceAlignment: input.rationaleExperience,
                technicalSkillMatch: input.rationaleTechnical,
                domainRelevance: input.rationaleDomain,
                stageCulturalFit: input.rationaleCulture,
                impactPotential: input.rationaleImpact,
              },
            };

            return JSON.stringify(result);
          } catch (error) {
            console.error("[calculateFitScore] Error:", error);
            return JSON.stringify({ error: "Failed to calculate fit score" });
          }
        },
      }),
    },
  });

  useEffect(() => {
    if (messages.length === 0) {
      const hasProfile =
        profile.experience.length > 0 || profile.skills.length > 0;

      const welcomeMsg = hasProfile
        ? "Welcome back! I've got your profile. What would you like to do?"
        : "Hi! I'm JobMatch. I'll help you analyze job postings and create tailored resumes. How would you like to start?";

      const quickReplies: QuickReply[] = hasProfile
        ? [
            { label: "Analyze a Job", value: "Analyze a job posting" },
            { label: "Update Profile", value: "Update my profile" },
            { label: "View Background", value: "Show my stored background" },
          ]
        : [
            { label: "Upload Resume", value: "I want to upload my resume" },
            { label: "Manual Entry", value: "I'll tell you about my experience manually" },
          ];

      const welcomeMessage = {
        id: "welcome-" + Date.now(),
        role: "assistant" as const,
        parts: [
          {
            type: "text" as const,
            text: welcomeMsg,
          },
        ],
        quickReplies,
      };
      setMessages([welcomeMessage]);
      setWaitingForUserInput(true);
    }
  }, [messages.length, profile.experience.length, profile.skills.length, setMessages]);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const handleSend = useCallback(async (overrideMessage?: string) => {
    const messageToSend = overrideMessage || input.trim();
    if (!messageToSend && !uploadedFile) return;

    setInput("");
    setWaitingForUserInput(false);

    const systemContext = `<system>
You are JobMatch, a conversational job-fit and resume-tailoring agent.

RULES:
1. Ask ONE short question at a time (max 8-12 words)
2. ALWAYS provide 2-5 clickable options. Format them EXACTLY like this at the END of your message:
   [Options: Option1 | Option2 | Option3]
3. NEVER ask the same question twice - check clarifyingAnswers
4. Always store answers using the tools provided
5. Keep tone friendly and simple

Current user profile:
${JSON.stringify(profile, null, 2)}

When analyzing job postings:
1. Parse the posting carefully
2. Identify gaps between posting and profile
3. Ask relevant follow-up questions (ONE at a time) with clickable options
4. Calculate fit score using the calculateFitScore tool
5. Offer to generate tailored resume with options: [Options: Yes, tailor it | Not now]

IMPORTANT: ALWAYS end questions with [Options: choice1 | choice2 | ...] format.
</system>`;

    if (uploadedFile) {
      await sendMessage({ text: `${systemContext}\n\nUser action: Uploaded resume file (${uploadedFile}). Parse and extract: experience, skills, tools, certifications, domain experience. Use the store tools, then tell user what you extracted and ask ONE simple multiple-choice question.` });
      setUploadedFile(null);
    } else {
      await sendMessage({ text: `${systemContext}\n\nUser: ${messageToSend}` });
    }
    
    setWaitingForUserInput(true);
  }, [input, uploadedFile, sendMessage, profile]);

  const handleUpload = useCallback(async () => {
    console.log("[handleUpload] Starting document upload...");
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

      console.log("[handleUpload] Document picker result:", result);

      if (result.canceled) {
        console.log("[handleUpload] Upload canceled by user");
        return;
      }

      const file = result.assets?.[0];
      if (!file || !file.uri) {
        console.error("[handleUpload] No file selected or invalid file");
        Alert.alert("Error", "No file selected. Please try again.");
        return;
      }

      console.log("[handleUpload] File selected:", file.name);
      
      setMessages((prev: any) => [
        ...prev,
        {
          id: "upload-confirm-" + Date.now(),
          role: "assistant" as const,
          parts: [
            {
              type: "text" as const,
              text: `📄 Processing ${file.name}... Please wait.`,
            },
          ],
        },
      ]);
      setIsParsingResume(true);
      setWaitingForUserInput(false);

      let content: string | null = null;
      try {
        content = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "utf8",
        });
      } catch (fsErr) {
        console.warn("[handleUpload] FileSystem.readAsStringAsync failed, attempting fetch fallback", fsErr);
        try {
          const resp = await fetch(file.uri);
          content = await resp.text();
        } catch (fetchErr) {
          console.error("[handleUpload] Fallback fetch failed:", fetchErr);
          content = null;
        }
      }

      if (!content) {
        Alert.alert("Error", "Could not read the selected file. Please try a different file.");
        setIsParsingResume(false);
        return;
      }

      console.log("[handleUpload] File read successfully, length:", content.length);

      let parsed: any;
      try {
        parsed = await generateObject({
          messages: [
            {
              role: "user",
              content: `Extract all information from this resume and structure it. Be thorough and extract:
- All work experience with titles, companies, dates, descriptions, and achievements
- All skills categorized appropriately
- All certifications with issuer and dates
- All tools and technologies used
- All projects with descriptions and technologies
- Domain experience areas

Resume text:
${content}`,
            },
          ],
          // @ts-expect-error - generateObject schema type definition issue
          schema: resumeSchema,
        });
      } catch (parseError) {
        console.error("[handleUpload] Parse error:", parseError);
        Alert.alert("Error", "Failed to parse resume. Please try again or add information manually.");
        setIsParsingResume(false);
        setWaitingForUserInput(true);
        return;
      }

      console.log("[handleUpload] Resume parsed:", parsed);

      if (!parsed) {
        console.error("[handleUpload] Parsed result is empty");
        Alert.alert("Error", "Failed to parse resume content. Please try again.");
        setIsParsingResume(false);
        setWaitingForUserInput(true);
        return;
      }

      const experience = ((parsed as any)?.experience || []).map((exp: any) => ({
        ...exp,
        id: Date.now().toString() + Math.random(),
      }));

      const skills = ((parsed as any)?.skills || []).map((skill: any) => ({
        ...skill,
        id: Date.now().toString() + Math.random(),
      }));

      const certifications = ((parsed as any)?.certifications || []).map((cert: any) => ({
        ...cert,
        id: Date.now().toString() + Math.random(),
      }));

      const tools = ((parsed as any)?.tools || []).map((tool: any) => ({
        ...tool,
        id: Date.now().toString() + Math.random(),
      }));

      const projects = ((parsed as any)?.projects || []).map((project: any) => ({
        ...project,
        id: Date.now().toString() + Math.random(),
      }));

      const domainExperience = (parsed as any)?.domainExperience || [];

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

      console.log("[handleUpload] Profile updated, sending follow-up message...");

      const updatedProfile = {
        ...profile,
        experience: [...profile.experience, ...experience],
        skills: [...profile.skills, ...skills],
        certifications: [...profile.certifications, ...certifications],
        tools: [...profile.tools, ...tools],
        projects: [...profile.projects, ...projects],
        domainExperience: [...profile.domainExperience, ...domainExperience],
      };

      const systemContext = `<system>
You are JobMatch, a conversational job-fit and resume-tailoring agent.

RULES:
1. Ask ONE short question at a time (max 8-12 words)
2. ALWAYS provide 2-5 clickable options. Format them EXACTLY like this at the END of your message:
   [Options: Option1 | Option2 | Option3]
3. NEVER ask the same question twice - check clarifyingAnswers
4. Always store answers using the tools provided
5. Keep tone friendly and simple

Current user profile:
${JSON.stringify(updatedProfile, null, 2)}

IMPORTANT: ALWAYS end questions with [Options: choice1 | choice2 | ...] format.
</system>

User uploaded resume. Successfully extracted:
- ${experience.length} experiences
- ${skills.length} skills
- ${certifications.length} certifications
- ${tools.length} tools
- ${projects.length} projects

Now confirm the upload success briefly and ask ONE simple clarifying question with options to improve the profile. Focus on the most important missing info.`;

      try {
        await sendMessage({ text: systemContext });
        console.log("[handleUpload] Follow-up message sent successfully");
      } catch (msgError) {
        console.error("[handleUpload] Error sending follow-up message:", msgError);
      } finally {
        setIsParsingResume(false);
        setWaitingForUserInput(true);
      }

      console.log("[handleUpload] Resume processing completed successfully");
    } catch (err) {
      console.error("[handleUpload] Upload error:", err);
      Alert.alert("Error", "Failed to process resume. Please try again or add information manually.");
      setIsParsingResume(false);
      setWaitingForUserInput(true);
    }
  }, [profile, sendMessage, updateProfile, setMessages]);

  const handleQuickReply = useCallback(async (value: string) => {
    console.log("[handleQuickReply] User selected quick reply:", value);
    try {
      if (value === "I want to upload my resume") {
        await handleUpload();
      } else {
        handleSend(value);
      }
    } catch (error) {
      console.error("[handleQuickReply] Error:", error);
    }
  }, [handleSend, handleUpload]);

  const extractQuickReplies = (text: string): { cleanText: string; options: QuickReply[] } => {
    const optionsMatch = text.match(/\[Options?:\s*([^\]]+)\]/i);
    if (!optionsMatch) {
      return { cleanText: text, options: [] };
    }

    const cleanText = text.replace(/\[Options?:\s*([^\]]+)\]/gi, '').trim();
    const optionsString = optionsMatch[1];
    const options = optionsString
      .split('|')
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0)
      .map(opt => ({ label: opt, value: opt }));

    return { cleanText, options };
  };



  const handleClearChat = () => {
    setMessages([]);
    const welcomeMessage = {
      id: "welcome-" + Date.now(),
      role: "assistant" as const,
      parts: [
        {
          type: "text" as const,
          text: "Chat cleared. How can I help you?",
        },
      ],
    };
    setMessages([welcomeMessage]);
  };

  const renderMessage = ({ item, index }: { item: any; index: number }) => {
    const isUser = item.role === "user";
    const isLastMessage = index === messages.length - 1;
    const showQuickReplies = !isUser && isLastMessage && waitingForUserInput;

    let quickReplies: QuickReply[] = item.quickReplies || [];
    
    if (isUser && item.parts?.length > 0) {
      const textPart = item.parts.find((p: any) => p.type === "text");
      if (textPart && textPart.text) {
        if (textPart.text.includes("<system>") || textPart.text.includes("You are JobMatch") || textPart.text.includes("Current user profile:")) {
          return null;
        }
      }
    }

    return (
      <View
        style={[
          styles.messageContainer,
          isUser
            ? styles.userMessageContainer
            : styles.assistantMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          {item.parts.map((part: any, i: number) => {
            switch (part.type) {
              case "text": {
                const { cleanText, options } = extractQuickReplies(part.text);
                if (options.length > 0 && quickReplies.length === 0) {
                  quickReplies = options;
                }
                return (
                  <Text
                    key={`${item.id}-${i}`}
                    style={[
                      styles.messageText,
                      isUser ? styles.userText : styles.assistantText,
                    ]}
                  >
                    {cleanText}
                  </Text>
                );
              }
              case "tool":
                if (part.state === "output-available") {
                  return (
                    <View key={`${item.id}-${i}`} style={styles.toolOutput}>
                      <Text style={styles.toolText}>✓ {part.toolName}</Text>
                    </View>
                  );
                }
                if (
                  part.state === "input-streaming" ||
                  part.state === "input-available"
                ) {
                  return (
                    <View key={`${item.id}-${i}`} style={styles.toolOutput}>
                      <ActivityIndicator size="small" color="#0066FF" />
                      <Text style={styles.toolText}>Processing...</Text>
                    </View>
                  );
                }
                return null;
              default:
                return null;
            }
          })}
        </View>

        {showQuickReplies && quickReplies.length > 0 && (
          <View style={styles.quickRepliesContainer}>
            {quickReplies.map((reply, idx) => (
              <TouchableOpacity
                key={`${item.id}-reply-${idx}`}
                style={styles.quickReplyButton}
                onPress={() => handleQuickReply(reply.value)}
              >
                <Text style={styles.quickReplyText}>{reply.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "JobMatch",
          headerRight: () => (
            <TouchableOpacity
              onPress={handleClearChat}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>Clear</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.container}
        keyboardVerticalOffset={100}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={({ item, index }) => renderMessage({ item, index })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesContainer}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error.message}</Text>
          </View>
        )}

        {uploadedFile && (
          <View style={styles.uploadPreview}>
            <Text style={styles.uploadText} numberOfLines={1}>
              📄 {uploadedFile}
            </Text>
            <TouchableOpacity onPress={() => setUploadedFile(null)}>
              <X size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            onPress={handleUpload} 
            style={styles.uploadButton}
            disabled={isParsingResume}
          >
            {isParsingResume ? (
              <ActivityIndicator size="small" color="#0066FF" />
            ) : (
              <Upload size={24} color="#0066FF" />
            )}
          </TouchableOpacity>

          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type your message..."
            placeholderTextColor="#999"
            multiline
            maxLength={1000}
          />

          <TouchableOpacity
            onPress={() => handleSend()}
            style={[
              styles.sendButton,
              !input.trim() &&
                !uploadedFile &&
                styles.sendButtonDisabled,
            ]}
            disabled={!input.trim() && !uploadedFile}
          >
            <Send
              size={20}
              color={input.trim() || uploadedFile ? "#FFF" : "#CCC"}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  headerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: "#0066FF",
    fontSize: 16,
    fontWeight: "600" as const,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexGrow: 1,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: "85%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
  },
  assistantMessageContainer: {
    alignSelf: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    backgroundColor: "#0066FF",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  assistantText: {
    color: "#1A1A1A",
  },
  toolOutput: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  toolText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic" as const,
  },
  errorContainer: {
    backgroundColor: "#FFE5E5",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  errorText: {
    color: "#D32F2F",
    fontSize: 14,
  },
  uploadPreview: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#E3F2FD",
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
  },
  uploadText: {
    flex: 1,
    fontSize: 14,
    color: "#1976D2",
    fontWeight: "500" as const,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    gap: 12,
  },
  uploadButton: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    maxHeight: 100,
    color: "#1A1A1A",
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0066FF",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "#E5E5E5",
  },
  quickRepliesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  quickReplyButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#0066FF",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickReplyText: {
    color: "#0066FF",
    fontSize: 15,
    fontWeight: "600" as const,
  },
});
