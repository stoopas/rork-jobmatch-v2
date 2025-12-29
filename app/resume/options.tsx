import { router, useLocalSearchParams } from "expo-router";
import { Check, FileText } from "lucide-react-native";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserProfile } from "../../contexts/UserProfileContext";

export type ResumeRenderMode = "standard" | "template";

export interface ResumeRenderOptions {
  mode: ResumeRenderMode;
  templateResumeAssetId?: string;
  enforceOnePage: boolean;
}

export default function ResumeOptionsScreen() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const { getResumeAssets } = useUserProfile();
  
  const resumeAssets = getResumeAssets();
  const docxAssets = resumeAssets.filter((a) => a.type === "docx" && !!a.docxBase64);
  
  const sortedDocxAssets = docxAssets.sort((a, b) => 
    new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  );
  
  const defaultMode: ResumeRenderMode = sortedDocxAssets.length > 0 ? "template" : "standard";
  const defaultTemplateId = sortedDocxAssets.length > 0 ? sortedDocxAssets[0].id : undefined;
  
  const [mode, setMode] = useState<ResumeRenderMode>(defaultMode);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(defaultTemplateId);

  const handleGenerate = () => {
    const options: ResumeRenderOptions = {
      mode,
      templateResumeAssetId: mode === "template" ? selectedTemplateId : undefined,
      enforceOnePage: mode === "template",
    };

    router.push({
      pathname: "/resume/generate",
      params: {
        jobId,
        mode: options.mode,
        templateResumeAssetId: options.templateResumeAssetId || "",
        enforceOnePage: options.enforceOnePage ? "true" : "false",
      },
    });
  };



  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.header}>
            <FileText size={40} color="#0066FF" />
            <Text style={styles.title}>Resume Output</Text>
            <Text style={styles.subtitle}>
              Choose how you want your tailored resume formatted
            </Text>
          </View>

          <View style={styles.optionsContainer}>
            <TouchableOpacity
              style={[
                styles.optionCard,
                mode === "standard" && styles.optionCardSelected,
              ]}
              onPress={() => setMode("standard")}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.radio,
                    mode === "standard" && styles.radioSelected,
                  ]}
                >
                  {mode === "standard" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Standard Format</Text>
                  <Text style={styles.optionDescription}>
                    Clean, ATS-friendly layout optimized for applicant tracking systems
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.optionCard,
                mode === "template" && styles.optionCardSelected,
              ]}
              onPress={() => setMode("template")}
            >
              <View style={styles.optionHeader}>
                <View
                  style={[
                    styles.radio,
                    mode === "template" && styles.radioSelected,
                  ]}
                >
                  {mode === "template" && (
                    <View style={styles.radioDot} />
                  )}
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionTitle}>Match My Resume Format (Recommended)</Text>
                  <Text style={styles.optionDescription}>
                    Uses your actual resume&apos;s layout, fonts, and styling—stays 1 page
                  </Text>
                </View>
              </View>

              {mode === "template" && (
                <View style={styles.templatePickerContainer}>
                  {docxAssets.length === 0 ? (
                    <View style={styles.noTemplatesContainer}>
                      <Text style={styles.noTemplatesText}>
                        Upload a DOCX to match your format
                      </Text>
                      <TouchableOpacity
                        style={styles.uploadButton}
                        onPress={() => router.push("/profile/edit")}
                      >
                        <Text style={styles.uploadButtonText}>
                          Upload Resume
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {sortedDocxAssets.length === 1 ? (
                        <View style={styles.singleTemplateContainer}>
                          <Text style={styles.singleTemplateLabel}>Using:</Text>
                          <View style={styles.singleTemplateCard}>
                            <FileText size={18} color="#0066FF" />
                            <Text style={styles.singleTemplateName}>
                              {sortedDocxAssets[0].name}
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <>
                          <Text style={styles.templatePickerLabel}>
                            Choose which resume to match:
                          </Text>
                          <View style={styles.templateList}>
                            {sortedDocxAssets.map((asset) => (
                              <TouchableOpacity
                                key={asset.id}
                                style={[
                                  styles.templateListItem,
                                  selectedTemplateId === asset.id && styles.templateListItemSelected,
                                ]}
                                onPress={() => setSelectedTemplateId(asset.id)}
                              >
                                <View style={styles.templateListItemContent}>
                                  <FileText size={18} color={selectedTemplateId === asset.id ? "#0066FF" : "#666666"} />
                                  <View style={styles.templateListItemText}>
                                    <Text style={[
                                      styles.templateListItemName,
                                      selectedTemplateId === asset.id && styles.templateListItemNameSelected,
                                    ]}>
                                      {asset.name}
                                    </Text>
                                    <Text style={styles.templateListItemDate}>
                                      Uploaded {new Date(asset.uploadedAt).toLocaleDateString()}
                                    </Text>
                                  </View>
                                </View>
                                {selectedTemplateId === asset.id && (
                                  <Check size={20} color="#0066FF" />
                                )}
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      )}

                      <View style={styles.infoBox}>
                        <Text style={styles.infoText}>
                          We&apos;ll keep your format and automatically compress content to stay within 1 page.
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.generateButton,
              mode === "template" && docxAssets.length === 0 && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            disabled={mode === "template" && docxAssets.length === 0}
          >
            <Text style={styles.generateButtonText}>Generate Tailored Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  content: {
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  optionCardSelected: {
    borderColor: "#0066FF",
    backgroundColor: "#F8FBFF",
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  radioSelected: {
    borderColor: "#0066FF",
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#0066FF",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 6,
  },
  optionDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  templatePickerContainer: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  noTemplatesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noTemplatesText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  uploadButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  uploadButtonText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  templatePickerLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 10,
  },
  templateSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  templateSelectorText: {
    fontSize: 15,
    color: "#1A1A1A",
    flex: 1,
  },
  templateDropdown: {
    marginTop: 8,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    overflow: "hidden",
  },
  templateOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  templateOptionText: {
    fontSize: 15,
    color: "#1A1A1A",
    flex: 1,
  },
  infoBox: {
    marginTop: 16,
    backgroundColor: "#EBF3FF",
    padding: 14,
    borderRadius: 10,
  },
  infoText: {
    fontSize: 13,
    color: "#0066FF",
    lineHeight: 18,
  },
  generateButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: "#CCCCCC",
    shadowOpacity: 0,
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  backButton: {
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
  singleTemplateContainer: {
    paddingVertical: 12,
  },
  singleTemplateLabel: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 10,
  },
  singleTemplateCard: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#0066FF",
  },
  singleTemplateName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    flex: 1,
  },
  templateList: {
    gap: 8,
  },
  templateListItem: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    backgroundColor: "#F8F9FA",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  templateListItemSelected: {
    borderColor: "#0066FF",
    backgroundColor: "#F8FBFF",
  },
  templateListItemContent: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 10,
    flex: 1,
  },
  templateListItemText: {
    flex: 1,
  },
  templateListItemName: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  templateListItemNameSelected: {
    color: "#0066FF",
  },
  templateListItemDate: {
    fontSize: 12,
    color: "#999999",
    marginTop: 2,
  },
});
