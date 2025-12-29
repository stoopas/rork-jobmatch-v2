import * as DocumentPicker from "expo-document-picker";
import { router } from "expo-router";
import { Plus, Trash2, Upload, X } from "lucide-react-native";
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
import { useMutation } from "@tanstack/react-query";
import { parseResumeText, showParseSuccessAlert, type ResumeData } from "../../lib/resumeParser";
import { normalizeText } from "../../lib/sourceOfTruth";
import { extractResumeText } from "../../lib/resumeTextExtractor";
import { ensureLocalCacheUri } from "../../lib/fileUtils";

import { useUserProfile } from "../../contexts/UserProfileContext";
import type {
  Experience,
  Skill,
  Certification,
} from "../../types/profile";



export default function EditProfileScreen() {
  const { profile, updateProfile } = useUserProfile();
  const [showAddExperience, setShowAddExperience] = useState(false);
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showAddCertification, setShowAddCertification] = useState(false);

  const [newExperience, setNewExperience] = useState({
    title: "",
    company: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
  });

  const [newSkill, setNewSkill] = useState({ name: "", category: "" });
  const [newCertification, setNewCertification] = useState({
    name: "",
    issuer: "",
    date: "",
  });

  const addExperience = () => {
    if (!newExperience.title || !newExperience.company) {
      Alert.alert("Error", "Please fill in title and company");
      return;
    }

    const experience: Experience = {
      id: Date.now().toString(),
      ...newExperience,
      achievements: [],
    };

    updateProfile({
      experience: [...profile.experience, experience],
    });

    setNewExperience({
      title: "",
      company: "",
      startDate: "",
      endDate: "",
      current: false,
      description: "",
    });
    setShowAddExperience(false);
  };

  const removeExperience = (id: string) => {
    updateProfile({
      experience: profile.experience.filter((exp) => exp.id !== id),
    });
  };

  const addSkill = () => {
    if (!newSkill.name) {
      Alert.alert("Error", "Please enter a skill name");
      return;
    }

    const skill: Skill = {
      id: Date.now().toString(),
      name: newSkill.name,
      category: newSkill.category || "General",
    };

    updateProfile({
      skills: [...profile.skills, skill],
    });

    setNewSkill({ name: "", category: "" });
    setShowAddSkill(false);
  };

  const removeSkill = (id: string) => {
    updateProfile({
      skills: profile.skills.filter((skill) => skill.id !== id),
    });
  };

  const addCertification = () => {
    if (!newCertification.name) {
      Alert.alert("Error", "Please enter certification name");
      return;
    }

    const certification: Certification = {
      id: Date.now().toString(),
      ...newCertification,
    };

    updateProfile({
      certifications: [...profile.certifications, certification],
    });

    setNewCertification({ name: "", issuer: "", date: "" });
    setShowAddCertification(false);
  };

  const removeCertification = (id: string) => {
    updateProfile({
      certifications: profile.certifications.filter((cert) => cert.id !== id),
    });
  };

  const { mutateAsync: parseResumeAsync, isPending: isParsingResume } = useMutation<ResumeData, Error, string>({
    mutationFn: async (resumeText: string): Promise<ResumeData> => {
      console.log("[mutationFn] === START MUTATION FUNCTION ===");
      console.log("[mutationFn] About to call parseResumeText...");
      const result = await parseResumeText(resumeText);
      console.log("[mutationFn] parseResumeText completed, result:", result);
      console.log("[mutationFn] === END MUTATION FUNCTION ===");
      return result;
    },
    onSuccess: async (parsed) => {
      console.log("[onSuccess] === START ONSUCCESS CALLBACK ===");
      console.log("[onSuccess] Resume parsed successfully");
      console.log("[onSuccess] parsed data:", JSON.stringify(parsed, null, 2).slice(0, 500));

      const newExperiences = (parsed?.experience || []).map((exp: any) => ({
        ...exp,
        id: Date.now().toString() + Math.random(),
      }));

      const existingExpNormalized = profile.experience.map((exp) => ({
        title: normalizeText(exp.title),
        company: normalizeText(exp.company),
      }));

      const deduplicatedExperiences = newExperiences.filter((newExp: any) => {
        const normalized = {
          title: normalizeText(newExp.title),
          company: normalizeText(newExp.company),
        };
        const isDuplicate = existingExpNormalized.some(
          (existing) =>
            existing.title === normalized.title &&
            existing.company === normalized.company
        );
        if (isDuplicate) {
          console.log(
            `[onSuccess] Skipping duplicate experience: ${newExp.title} at ${newExp.company}`
          );
        }
        return !isDuplicate;
      });

      console.log("[onSuccess] Unique experiences to add:", deduplicatedExperiences.length);

      const newSkills = (parsed?.skills || []).map((skill: any) => ({
        ...skill,
        id: Date.now().toString() + Math.random(),
        source: 'resume_parse' as const,
        confirmedAt: new Date().toISOString(),
      }));

      const existingSkillsNormalized = profile.skills.map((s) =>
        normalizeText(s.name)
      );

      const deduplicatedSkills = newSkills.filter((newSkill: any) => {
        const normalized = normalizeText(newSkill.name);
        const isDuplicate = existingSkillsNormalized.includes(normalized);
        if (isDuplicate) {
          console.log(`[onSuccess] Skipping duplicate skill: ${newSkill.name}`);
        }
        return !isDuplicate;
      });

      console.log("[onSuccess] Unique skills to add:", deduplicatedSkills.length);

      const newCertifications = (parsed?.certifications || []).map((cert: any) => ({
        ...cert,
        id: Date.now().toString() + Math.random(),
      }));

      const existingCertsNormalized = profile.certifications.map((c) =>
        normalizeText(c.name)
      );

      const deduplicatedCertifications = newCertifications.filter(
        (newCert: any) => {
          const normalized = normalizeText(newCert.name);
          const isDuplicate = existingCertsNormalized.includes(normalized);
          if (isDuplicate) {
            console.log(
              `[onSuccess] Skipping duplicate certification: ${newCert.name}`
            );
          }
          return !isDuplicate;
        }
      );

      console.log(
        "[onSuccess] Unique certifications to add:",
        deduplicatedCertifications.length
      );

      const newTools = (parsed?.tools || []).map((tool: any) => ({
        ...tool,
        id: Date.now().toString() + Math.random(),
        source: 'resume_parse' as const,
        confirmedAt: new Date().toISOString(),
      }));

      const existingToolsNormalized = profile.tools.map((t) =>
        normalizeText(t.name)
      );

      const deduplicatedTools = newTools.filter((newTool: any) => {
        const normalized = normalizeText(newTool.name);
        const isDuplicate = existingToolsNormalized.includes(normalized);
        if (isDuplicate) {
          console.log(`[onSuccess] Skipping duplicate tool: ${newTool.name}`);
        }
        return !isDuplicate;
      });

      console.log("[onSuccess] Unique tools to add:", deduplicatedTools.length);

      const newProjects = (parsed?.projects || []).map((project: any) => ({
        ...project,
        id: Date.now().toString() + Math.random(),
      }));

      const existingProjectsNormalized = profile.projects.map((p) =>
        normalizeText(p.title)
      );

      const deduplicatedProjects = newProjects.filter((newProject: any) => {
        const normalized = normalizeText(newProject.title);
        const isDuplicate = existingProjectsNormalized.includes(normalized);
        if (isDuplicate) {
          console.log(
            `[onSuccess] Skipping duplicate project: ${newProject.title}`
          );
        }
        return !isDuplicate;
      });

      console.log("[onSuccess] Unique projects to add:", deduplicatedProjects.length);

      const newDomains = parsed?.domainExperience || [];
      const existingDomainsNormalized = profile.domainExperience.map((d) =>
        normalizeText(d)
      );

      const deduplicatedDomains = newDomains.filter((newDomain: string) => {
        const normalized = normalizeText(newDomain);
        const isDuplicate = existingDomainsNormalized.includes(normalized);
        if (isDuplicate) {
          console.log(`[onSuccess] Skipping duplicate domain: ${newDomain}`);
        }
        return !isDuplicate;
      });

      console.log("[onSuccess] Unique domains to add:", deduplicatedDomains.length);

      console.log("[onSuccess] Current profile state:");
      console.log("[onSuccess] - profile.experience.length:", profile.experience.length);
      console.log("[onSuccess] - profile.skills.length:", profile.skills.length);
      console.log("[onSuccess] - profile.certifications.length:", profile.certifications.length);
      console.log("[onSuccess] - profile.tools.length:", profile.tools.length);
      console.log("[onSuccess] - profile.projects.length:", profile.projects.length);
      console.log("[onSuccess] - profile.domainExperience.length:", profile.domainExperience.length);

      const updatedProfileData = {
        experience: [...profile.experience, ...deduplicatedExperiences],
        skills: [...profile.skills, ...deduplicatedSkills],
        certifications: [...profile.certifications, ...deduplicatedCertifications],
        tools: [...profile.tools, ...deduplicatedTools],
        projects: [...profile.projects, ...deduplicatedProjects],
        domainExperience: [
          ...profile.domainExperience,
          ...deduplicatedDomains,
        ],
      };

      console.log("[onSuccess] About to call updateProfile with:");
      console.log("[onSuccess] - experience.length:", updatedProfileData.experience.length);
      console.log("[onSuccess] - skills.length:", updatedProfileData.skills.length);
      console.log("[onSuccess] - certifications.length:", updatedProfileData.certifications.length);
      console.log("[onSuccess] - tools.length:", updatedProfileData.tools.length);
      console.log("[onSuccess] - projects.length:", updatedProfileData.projects.length);

      try {
        await updateProfile(updatedProfileData);
        console.log("[onSuccess] updateProfile completed successfully");
      } catch (err) {
        console.error("[onSuccess] updateProfile failed:", err);
        Alert.alert("Error", "Failed to save parsed resume data to profile");
        return;
      }

      console.log("[onSuccess] updateProfile called, showing success alert");
      showParseSuccessAlert(parsed, () => {
        console.log("[onSuccess] User pressed 'Tailor to Job', navigating to /job/analyze");
        router.push("/job/analyze");
      });
      console.log("[onSuccess] === END ONSUCCESS CALLBACK ===");
    },
    onError: (error) => {
      console.error("[onError] === START ONERROR CALLBACK ===");
      console.error("[onError] Error:", error?.message ?? error, error?.stack ?? error);
      console.error("[onError] === END ONERROR CALLBACK ===");
      Alert.alert("Error", error?.message ? `Failed to parse resume: ${error.message}` : "Failed to parse resume. Please try again or add information manually.");
    },
  });

  const handleUploadResume = async () => {
    console.log("[handleUpload] === START UPLOAD HANDLER ===");
    console.log("[handleUpload] DocumentPicker:", typeof DocumentPicker);
    console.log("[handleUpload] FileSystem:", typeof FileSystem);
    try {
      console.log("[handleUpload] Opening document picker...");
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
        copyToCacheDirectory: true,
      });

      console.log("[handleUpload] Document picker returned");
      console.log("[handleUpload] result type:", typeof result);
      console.log("[handleUpload] result keys:", result ? Object.keys(result) : 'undefined');
      console.log("[handleUpload] result.type:", (result as any)?.type);
      console.log("[handleUpload] result.canceled:", (result as any)?.canceled);
      console.log("[handleUpload] Full result:", JSON.stringify(result, null, 2));

      // Correct cancellation check for getDocumentAsync
      if ((result as any).type === "cancel") {
        return;
      }

      // robustly extract uri (supports new and legacy shapes)
      console.log("[handleUpload] Extracting URI from result...");
      console.log("[handleUpload] result.uri:", (result as any)?.uri);
      console.log("[handleUpload] result.assets:", (result as any)?.assets);
      console.log("[handleUpload] result.assets[0]?.uri:", (result as any)?.assets?.[0]?.uri);
      
      const uri = (result as any).uri || ((result as any).assets && (result as any).assets[0]?.uri);
      console.log("[handleUpload] Extracted uri:", uri);
      
      if (!uri) {
        console.error("[handleUpload] No URI found!");
        Alert.alert("Error", "No file URI returned by document picker");
        return;
      }

      console.log("[handleUpload] Selected file uri:", uri);
      console.log("[handleUpload] URI type:", typeof uri);
      console.log("[handleUpload] URI length:", uri?.length);

      const fileAsset = (result as any).assets?.[0] || result;
      const fileName = fileAsset.name || uri.split('/').pop() || 'resume';
      const mimeType = fileAsset.mimeType || fileAsset.type;
      console.log("[handleUpload] File info:", { fileName, uri, mimeType });

      console.log("[handleUpload] Ensuring file is in local cache...");
      let workingUri;
      try {
        workingUri = await ensureLocalCacheUri(uri, fileName);
        console.log("[handleUpload] Working URI:", workingUri);
      } catch (cacheErr: any) {
        console.error("[handleUpload] Failed to cache file:", cacheErr?.message);
        Alert.alert("Error", cacheErr?.message || "Could not access file.");
        return;
      }

      console.log("[handleUpload] Extracting text from file...");
      let extracted;
      try {
        extracted = await extractResumeText(workingUri, fileName, mimeType);
        console.log("[handleUpload] Text extracted successfully, length:", extracted.text.length);
        console.log("[handleUpload] Extraction source:", extracted.source);
      } catch (extractErr: any) {
        console.error("[handleUpload] Text extraction failed:", extractErr?.message);
        Alert.alert("Error", extractErr?.message || "Could not extract text from file.");
        return;
      }

      try {
        await parseResumeAsync(extracted.text);
      } catch (err: any) {
        console.error("[handleUpload] parseResumeAsync error:", err?.message ?? err, err?.stack ?? err);
        Alert.alert("Error", err?.message ? `Failed to parse resume: ${err.message}` : "Failed to parse resume. Please try again.");
      }
    } catch (error: any) {
      console.error("[handleUpload] === CAUGHT ERROR IN HANDLER ===");
      console.error("[handleUpload] Error:", error?.message ?? error);
      Alert.alert("Error", error?.message || "Failed to upload resume. Please try again.");
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUploadResume}
            disabled={isParsingResume}
          >
            {isParsingResume ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Upload size={24} color="#FFFFFF" />
            )}
            <View style={styles.uploadTextContainer}>
              <Text style={styles.uploadButtonTitle}>
                {isParsingResume ? "Parsing Resume..." : "Upload Resume"}
              </Text>
              <Text style={styles.uploadButtonSubtitle}>
                Automatically extract your experience and skills
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or add manually</Text>
            <View style={styles.dividerLine} />
          </View>
        </View>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Experience</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddExperience(true)}
            >
              <Plus size={20} color="#0066FF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {showAddExperience && (
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <Text style={styles.addCardTitle}>Add Experience</Text>
                <TouchableOpacity onPress={() => setShowAddExperience(false)}>
                  <X size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Job Title"
                value={newExperience.title}
                onChangeText={(text) =>
                  setNewExperience({ ...newExperience, title: text })
                }
                placeholderTextColor="#999999"
              />

              <TextInput
                style={styles.input}
                placeholder="Company"
                value={newExperience.company}
                onChangeText={(text) =>
                  setNewExperience({ ...newExperience, company: text })
                }
                placeholderTextColor="#999999"
              />

              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="Start Date (YYYY-MM)"
                  value={newExperience.startDate}
                  onChangeText={(text) =>
                    setNewExperience({ ...newExperience, startDate: text })
                  }
                  placeholderTextColor="#999999"
                />
                <TextInput
                  style={[styles.input, styles.halfInput]}
                  placeholder="End Date (YYYY-MM)"
                  value={newExperience.endDate}
                  onChangeText={(text) =>
                    setNewExperience({ ...newExperience, endDate: text })
                  }
                  placeholderTextColor="#999999"
                  editable={!newExperience.current}
                />
              </View>

              <TouchableOpacity
                style={styles.checkbox}
                onPress={() =>
                  setNewExperience({
                    ...newExperience,
                    current: !newExperience.current,
                  })
                }
              >
                <View
                  style={[
                    styles.checkboxBox,
                    newExperience.current && styles.checkboxBoxChecked,
                  ]}
                >
                  {newExperience.current && (
                    <Text style={styles.checkboxCheckmark}>✓</Text>
                  )}
                </View>
                <Text style={styles.checkboxLabel}>Currently working here</Text>
              </TouchableOpacity>

              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Description (key responsibilities and achievements)"
                value={newExperience.description}
                onChangeText={(text) =>
                  setNewExperience({ ...newExperience, description: text })
                }
                multiline
                numberOfLines={4}
                placeholderTextColor="#999999"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={addExperience}
              >
                <Text style={styles.saveButtonText}>Save Experience</Text>
              </TouchableOpacity>
            </View>
          )}

          {profile.experience.map((exp) => (
            <View key={exp.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{exp.title}</Text>
                  <Text style={styles.itemSubtitle}>{exp.company}</Text>
                  <Text style={styles.itemDate}>
                    {exp.startDate} - {exp.current ? "Present" : exp.endDate}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => removeExperience(exp.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
              {exp.description ? (
                <Text style={styles.itemDescription}>{exp.description}</Text>
              ) : null}
            </View>
          ))}

          {profile.experience.length === 0 && !showAddExperience && (
            <Text style={styles.emptyText}>
              No experience added yet. Tap Add to get started.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Skills</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddSkill(true)}
            >
              <Plus size={20} color="#0066FF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {showAddSkill && (
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <Text style={styles.addCardTitle}>Add Skill</Text>
                <TouchableOpacity onPress={() => setShowAddSkill(false)}>
                  <X size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Skill Name (e.g., React Native, Python)"
                value={newSkill.name}
                onChangeText={(text) => setNewSkill({ ...newSkill, name: text })}
                placeholderTextColor="#999999"
              />

              <TextInput
                style={styles.input}
                placeholder="Category (e.g., Programming, Design)"
                value={newSkill.category}
                onChangeText={(text) =>
                  setNewSkill({ ...newSkill, category: text })
                }
                placeholderTextColor="#999999"
              />

              <TouchableOpacity style={styles.saveButton} onPress={addSkill}>
                <Text style={styles.saveButtonText}>Save Skill</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.skillsGrid}>
            {profile.skills.map((skill) => (
              <View key={skill.id} style={styles.skillChip}>
                <Text style={styles.skillName}>{skill.name}</Text>
                <TouchableOpacity onPress={() => removeSkill(skill.id)}>
                  <X size={16} color="#666666" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {profile.skills.length === 0 && !showAddSkill && (
            <Text style={styles.emptyText}>
              No skills added yet. Tap Add to get started.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Certifications</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => setShowAddCertification(true)}
            >
              <Plus size={20} color="#0066FF" />
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {showAddCertification && (
            <View style={styles.addCard}>
              <View style={styles.addCardHeader}>
                <Text style={styles.addCardTitle}>Add Certification</Text>
                <TouchableOpacity onPress={() => setShowAddCertification(false)}>
                  <X size={24} color="#666666" />
                </TouchableOpacity>
              </View>

              <TextInput
                style={styles.input}
                placeholder="Certification Name"
                value={newCertification.name}
                onChangeText={(text) =>
                  setNewCertification({ ...newCertification, name: text })
                }
                placeholderTextColor="#999999"
              />

              <TextInput
                style={styles.input}
                placeholder="Issuer"
                value={newCertification.issuer}
                onChangeText={(text) =>
                  setNewCertification({ ...newCertification, issuer: text })
                }
                placeholderTextColor="#999999"
              />

              <TextInput
                style={styles.input}
                placeholder="Date (YYYY-MM)"
                value={newCertification.date}
                onChangeText={(text) =>
                  setNewCertification({ ...newCertification, date: text })
                }
                placeholderTextColor="#999999"
              />

              <TouchableOpacity
                style={styles.saveButton}
                onPress={addCertification}
              >
                <Text style={styles.saveButtonText}>Save Certification</Text>
              </TouchableOpacity>
            </View>
          )}

          {profile.certifications.map((cert) => (
            <View key={cert.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.itemContent}>
                  <Text style={styles.itemTitle}>{cert.name}</Text>
                  {cert.issuer ? (
                    <Text style={styles.itemSubtitle}>{cert.issuer}</Text>
                  ) : null}
                  {cert.date ? (
                    <Text style={styles.itemDate}>{cert.date}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => removeCertification(cert.id)}
                  style={styles.deleteButton}
                >
                  <Trash2 size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {profile.certifications.length === 0 && !showAddCertification && (
            <Text style={styles.emptyText}>
              No certifications added yet. Tap Add to get started.
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => router.back()}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
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
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700" as const,
    color: "#1A1A1A",
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#EBF3FF",
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#0066FF",
  },
  addCard: {
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  addCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addCardTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  input: {
    backgroundColor: "#F5F5F5",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    color: "#1A1A1A",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#CCCCCC",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxChecked: {
    backgroundColor: "#0066FF",
    borderColor: "#0066FF",
  },
  checkboxCheckmark: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700" as const,
  },
  checkboxLabel: {
    fontSize: 15,
    color: "#1A1A1A",
  },
  saveButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  itemSubtitle: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 13,
    color: "#999999",
  },
  itemDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
    marginTop: 8,
  },
  deleteButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 15,
    color: "#999999",
    textAlign: "center",
    paddingVertical: 24,
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  skillName: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: "#1A1A1A",
  },
  doneButton: {
    marginHorizontal: 24,
    marginTop: 32,
    backgroundColor: "#0066FF",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
  bottomPadding: {
    height: 40,
  },
  uploadSection: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  uploadButton: {
    backgroundColor: "#0066FF",
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    shadowColor: "#0066FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  uploadTextContainer: {
    flex: 1,
  },
  uploadButtonTitle: {
    fontSize: 17,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  uploadButtonSubtitle: {
    fontSize: 13,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E5E5",
  },
  dividerText: {
    fontSize: 14,
    color: "#999999",
    fontWeight: "500" as const,
  },
});
