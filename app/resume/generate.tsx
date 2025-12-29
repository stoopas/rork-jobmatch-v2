import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { router, useLocalSearchParams } from "expo-router";
import { Check, ChevronDown, ChevronUp, Copy, Download, FileText, Sparkles } from "lucide-react-native";
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
import { copyTextSafe } from "../../lib/clipboard";
import { generateTailoredResumeJson, type TemplateFingerprint } from "../../lib/tailoredResumeGenerator";

export default function GenerateResumeScreen() {
  const { jobId, mode, templateResumeAssetId, enforceOnePage } = useLocalSearchParams<{
    jobId: string;
    mode?: string;
    templateResumeAssetId?: string;
    enforceOnePage?: string;
  }>();

  const { profile, jobPostings, getResumeAssets } = useUserProfile();
  const [resumeText, setResumeText] = useState("");
  const [isGenerating, setIsGenerating] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const job = jobPostings.find((j) => j.id === jobId);
  const renderMode = (mode || "standard") as "standard" | "template";

  const generateResume = useCallback(async () => {
    if (!job) return;

    setIsGenerating(true);

    try {
      console.log("[generateResume] Starting generation");
      console.log("[generateResume] Mode:", renderMode);
      console.log("[generateResume] Job:", job.title, "at", job.company);

      const resumeAssets = getResumeAssets();
      const sourceResumeAsset = resumeAssets.find((a) => a.extractedText);
      const extractedResumeText = sourceResumeAsset?.extractedText || "";

      let fingerprint: TemplateFingerprint | undefined;
      if (renderMode === "template" && templateResumeAssetId) {
        const templateAsset = resumeAssets.find((a) => a.id === templateResumeAssetId);
        if (templateAsset?.docxBase64) {
          console.log("[generateResume] Fetching template fingerprint...");
          const extractorUrl = process.env.EXPO_PUBLIC_RESUME_EXTRACTOR_URL;
          if (extractorUrl) {
            const response = await fetch(`${extractorUrl}/resume/fingerprint-template`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templateDocxBase64: templateAsset.docxBase64 }),
            });

            if (response.ok) {
              fingerprint = await response.json();
              console.log("[generateResume] Fingerprint received:", fingerprint);
            } else {
              console.warn("[generateResume] Failed to fingerprint template, using standard mode");
            }
          }
        }
      }

      console.log("[generateResume] Generating tailored resume JSON...");
      const resumeJson = await generateTailoredResumeJson(
        profile,
        job,
        extractedResumeText,
        {
          mode: renderMode,
          templateFingerprint: fingerprint,
          enforceOnePage: enforceOnePage === "true",
        }
      );

      console.log("[generateResume] Resume JSON generated");

      const textSummary = `${resumeJson.header.name}
${resumeJson.header.email || ""}

${resumeJson.summary || ""}

EXPERIENCE
${resumeJson.experience
  .map(
    (exp) =>
      `${exp.title} | ${exp.company}
${exp.dates || ""}
${exp.bullets.map((b) => `• ${b}`).join("\n")}`
  )
  .join("\n\n")}

SKILLS
Core: ${resumeJson.skills.core?.join(", ") || ""}
Tools: ${resumeJson.skills.tools?.join(", ") || ""}
Domains: ${resumeJson.skills.domains?.join(", ") || ""}

${
  resumeJson.education
    ? `EDUCATION\n${resumeJson.education
        .map((edu) => `${edu.school} | ${edu.degree || ""}\n${edu.dates || ""}`)
        .join("\n\n")}`
    : ""
}

${
  resumeJson.certifications
    ? `CERTIFICATIONS\n${resumeJson.certifications.map((c) => `• ${c}`).join("\n")}`
    : ""
}`;

      setResumeText(textSummary);
    } catch (error: any) {
      console.error("[generateResume] Error:", error);
      Alert.alert("Generation Error", error.message || "Failed to generate resume. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }, [job, profile, renderMode, templateResumeAssetId, enforceOnePage, getResumeAssets]);

  useEffect(() => {
    if (job) {
      generateResume();
    }
  }, [job, generateResume]);

  const copyToClipboard = async () => {
    const success = await copyTextSafe(resumeText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadDocx = async () => {
    if (!job) return;

    setIsDownloading(true);
    try {
      console.log("[downloadDocx] Starting DOCX generation...");

      const resumeAssets = getResumeAssets();
      const sourceResumeAsset = resumeAssets.find((a) => a.extractedText);
      const extractedResumeText = sourceResumeAsset?.extractedText || "";

      let fingerprint: TemplateFingerprint | undefined;
      let templateDocxBase64: string | undefined;

      if (renderMode === "template" && templateResumeAssetId) {
        const templateAsset = resumeAssets.find((a) => a.id === templateResumeAssetId);
        if (templateAsset?.docxBase64) {
          templateDocxBase64 = templateAsset.docxBase64;
          console.log("[downloadDocx] Fetching template fingerprint...");
          const extractorUrl = process.env.EXPO_PUBLIC_RESUME_EXTRACTOR_URL;
          if (extractorUrl) {
            const response = await fetch(`${extractorUrl}/resume/fingerprint-template`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ templateDocxBase64 }),
            });

            if (response.ok) {
              fingerprint = await response.json();
            }
          }
        }
      }

      const resumeJson = await generateTailoredResumeJson(profile, job, extractedResumeText, {
        mode: renderMode,
        templateFingerprint: fingerprint,
        enforceOnePage: enforceOnePage === "true",
      });

      console.log("[downloadDocx] Calling server to render DOCX...");
      const extractorUrl = process.env.EXPO_PUBLIC_RESUME_EXTRACTOR_URL;
      if (!extractorUrl) {
        throw new Error("DOCX generation requires server URL. Please set EXPO_PUBLIC_RESUME_EXTRACTOR_URL.");
      }

      const response = await fetch(`${extractorUrl}/resume/render-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeJson,
          options: { mode: renderMode, enforceOnePage: enforceOnePage === "true" },
          templateDocxBase64,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned error: ${response.status}`);
      }

      const blob = await response.blob();
      console.log("[downloadDocx] DOCX received, size:", blob.size);

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const fileName = `tailored-resume-${job.company.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.docx`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });

        console.log("[downloadDocx] File saved to:", fileUri);

        if (Platform.OS === "web") {
          const link = document.createElement("a");
          link.href = fileUri;
          link.download = fileName;
          link.click();
          Alert.alert("Success", "Resume downloaded!");
        } else {
          const isAvailable = await Sharing.isAvailableAsync();
          if (isAvailable) {
            await Sharing.shareAsync(fileUri, {
              mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
              dialogTitle: "Save Resume",
              UTI: "com.microsoft.word.doc",
            });
          } else {
            Alert.alert("Success", `Resume saved to:\n${fileUri}`);
          }
        }
      };
      reader.readAsDataURL(blob);
    } catch (error: any) {
      console.error("[downloadDocx] Error:", error);
      Alert.alert("Download Error", error.message || "Failed to download DOCX. Please try again.");
    } finally {
      setIsDownloading(false);
    }
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
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
        <View style={styles.badgeContainer}>
          <View style={styles.aiIndicator}>
            <Sparkles size={14} color="#0066FF" />
            <Text style={styles.aiText}>AI-Generated</Text>
          </View>
          {renderMode === "template" && (
            <View style={styles.modeBadge}>
              <Text style={styles.modeText}>Template Mode</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.actionsTop}>
        <TouchableOpacity
          style={[styles.downloadButtonPrimary, isDownloading && styles.buttonDisabled]}
          onPress={downloadDocx}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.downloadButtonPrimaryText}>Generating...</Text>
            </>
          ) : (
            <>
              <Download size={22} color="#FFFFFF" />
              <Text style={styles.downloadButtonPrimaryText}>Download .docx</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.downloadHint}>Ready to submit with your application</Text>
      </View>

      <TouchableOpacity
        style={styles.previewToggle}
        onPress={() => setPreviewExpanded(!previewExpanded)}
        activeOpacity={0.7}
      >
        <Text style={styles.previewToggleLabel}>Text Preview</Text>
        {previewExpanded ? (
          <ChevronUp size={20} color="#666666" />
        ) : (
          <ChevronDown size={20} color="#666666" />
        )}
      </TouchableOpacity>

      {previewExpanded && (
        <View style={styles.resumeCard}>
          <Text style={styles.resumeText}>{resumeText}</Text>
          {Platform.OS === "web" && (
            <TouchableOpacity
              style={styles.copyButtonInline}
              onPress={copyToClipboard}
            >
              {copied ? (
                <>
                  <Check size={18} color="#10B981" />
                  <Text style={[styles.copyButtonInlineText, { color: "#10B981" }]}>Copied!</Text>
                </>
              ) : (
                <>
                  <Copy size={18} color="#0066FF" />
                  <Text style={styles.copyButtonInlineText}>Copy Text</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.actionsBottom}>
        <TouchableOpacity style={styles.doneButton} onPress={() => router.push("/")}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EBF3FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#0066FF",
  },
  modeBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modeText: {
    fontSize: 12,
    fontWeight: "500" as const,
    color: "#F57C00",
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
    paddingHorizontal: 20,
    paddingTop: 12,
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
  downloadButton: {
    backgroundColor: "#0066FF",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  downloadButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  copyButton: {
    backgroundColor: "#F0F0F0",
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
  doneButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#F0F0F0",
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  actionsTop: {
    padding: 20,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  downloadButtonPrimary: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 10,
    backgroundColor: "#0066FF",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  downloadButtonPrimaryText: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
  },
  downloadHint: {
    fontSize: 13,
    color: "#666666",
    textAlign: "center" as const,
    marginTop: 8,
  },
  previewToggle: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginHorizontal: 20,
    marginTop: 12,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  previewToggleLabel: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  copyButtonInline: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    alignSelf: "center" as const,
  },
  copyButtonInlineText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
  actionsBottom: {
    marginHorizontal: 20,
    marginTop: 12,
  },
  bottomPadding: {
    height: 40,
  },
});
