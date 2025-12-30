import { router } from "expo-router";
import { User, Plus, Trash2 } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserProfile } from "../../contexts/UserProfileContext";
import { BoringAI } from "../../ui/theme/boringAiTheme";

export default function ManageProfilesScreen() {
  const {
    activeProfileId,
    profilesIndex,
    createProfile,
    switchProfile,
    resetActiveProfile,
  } = useUserProfile();

  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleCreateProfile = () => {
    if (Platform.OS === "web") {
      const name = prompt("Enter profile name:");
      if (name) {
        setIsCreating(true);
        createProfile(name)
          .then(() => {
            router.replace("/");
          })
          .catch((error) => {
            Alert.alert("Error", "Failed to create profile");
            console.error(error);
          })
          .finally(() => {
            setIsCreating(false);
          });
      }
    } else {
      Alert.prompt(
        "New Profile",
        "Enter a name for the new profile:",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Create",
            onPress: (name?: string) => {
              if (name) {
                setIsCreating(true);
                createProfile(name)
                  .then(() => {
                    router.replace("/");
                  })
                  .catch((error) => {
                    Alert.alert("Error", "Failed to create profile");
                    console.error(error);
                  })
                  .finally(() => {
                    setIsCreating(false);
                  });
              }
            },
          },
        ],
        "plain-text"
      );
    }
  };

  const handleSwitchProfile = (profileId: string) => {
    if (profileId === activeProfileId) return;

    setIsSwitching(true);
    switchProfile(profileId)
      .then(() => {
        router.replace("/");
      })
      .catch((error) => {
        Alert.alert("Error", "Failed to switch profile");
        console.error(error);
      })
      .finally(() => {
        setIsSwitching(false);
      });
  };

  const handleResetProfile = () => {
    Alert.alert(
      "Reset Profile",
      "This will permanently delete all data in this profile (resume, skills, experience, jobs). This cannot be undone. Continue?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setIsResetting(true);
            resetActiveProfile()
              .then(() => {
                Alert.alert("Success", "Profile has been reset");
                router.replace("/");
              })
              .catch((error) => {
                Alert.alert("Error", "Failed to reset profile");
                console.error(error);
              })
              .finally(() => {
                setIsResetting(false);
              });
          },
        },
      ]
    );
  };

  const activeProfile = profilesIndex.find((p) => p.id === activeProfileId);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Profile</Text>
            {activeProfile && (
              <View style={styles.activeProfileCard}>
                <View style={styles.profileIconContainer}>
                  <User size={24} color={BoringAI.colors.accent} strokeWidth={1.5} />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{activeProfile.name}</Text>
                  <Text style={styles.profileId}>ID: {activeProfile.id.slice(0, 12)}...</Text>
                  <Text style={styles.profileDate}>
                    Created {new Date(activeProfile.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>All Profiles</Text>
            {profilesIndex.map((profile) => {
              const isActive = profile.id === activeProfileId;
              return (
                <TouchableOpacity
                  key={profile.id}
                  style={[styles.profileRow, isActive && styles.profileRowActive]}
                  onPress={() => handleSwitchProfile(profile.id)}
                  disabled={isActive || isSwitching}
                >
                  <View style={styles.profileRowIcon}>
                    <User
                      size={18}
                      color={isActive ? BoringAI.colors.accent : BoringAI.colors.textMuted}
                      strokeWidth={1.5}
                    />
                  </View>
                  <View style={styles.profileRowInfo}>
                    <Text style={[styles.profileRowName, isActive && styles.profileRowNameActive]}>
                      {profile.name}
                      {isActive && " (Current)"}
                    </Text>
                    <Text style={styles.profileRowDate}>
                      {new Date(profile.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  {isSwitching && !isActive && (
                    <ActivityIndicator size="small" color={BoringAI.colors.textMuted} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.createButton}
              onPress={handleCreateProfile}
              disabled={isCreating}
            >
              {isCreating ? (
                <ActivityIndicator size="small" color={BoringAI.colors.background} />
              ) : (
                <Plus size={20} color={BoringAI.colors.background} strokeWidth={2} />
              )}
              <Text style={styles.createButtonText}>
                {isCreating ? "Creating..." : "Create New Profile"}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.section}>
            <Text style={styles.dangerSectionTitle}>Danger Zone</Text>
            <TouchableOpacity
              style={styles.dangerButton}
              onPress={handleResetProfile}
              disabled={isResetting}
            >
              {isResetting ? (
                <ActivityIndicator size="small" color={BoringAI.colors.danger} />
              ) : (
                <Trash2 size={18} color={BoringAI.colors.danger} strokeWidth={1.5} />
              )}
              <Text style={styles.dangerButtonText}>
                {isResetting ? "Resetting..." : "Reset This Profile"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.dangerHint}>
              This will permanently delete all data in the current profile. Other profiles will not
              be affected.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BoringAI.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: BoringAI.spacing.xl,
    paddingTop: BoringAI.spacing.lg,
    paddingBottom: BoringAI.spacing.xxl,
  },
  section: {
    marginBottom: BoringAI.spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.md,
  },
  dangerSectionTitle: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.danger,
    marginBottom: BoringAI.spacing.md,
  },
  activeProfileCard: {
    flexDirection: "row",
    backgroundColor: BoringAI.colors.surface,
    borderRadius: BoringAI.radius.card,
    borderWidth: BoringAI.border.strong,
    borderColor: BoringAI.colors.accent,
    padding: BoringAI.spacing.lg,
    gap: BoringAI.spacing.md,
  },
  profileIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 18,
    fontWeight: "700" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  profileId: {
    fontSize: 11,
    color: BoringAI.colors.textFaint,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
    marginBottom: BoringAI.spacing.xxs,
  },
  profileDate: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: BoringAI.colors.surface,
    borderRadius: BoringAI.radius.card,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    padding: BoringAI.spacing.md,
    marginBottom: BoringAI.spacing.sm,
    gap: BoringAI.spacing.md,
  },
  profileRowActive: {
    borderWidth: BoringAI.border.strong,
    borderColor: BoringAI.colors.accent,
    backgroundColor: BoringAI.colors.surfaceAlt,
  },
  profileRowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BoringAI.colors.surfaceAlt,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  profileRowInfo: {
    flex: 1,
  },
  profileRowName: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.text,
    marginBottom: BoringAI.spacing.xxs,
  },
  profileRowNameActive: {
    color: BoringAI.colors.accent,
  },
  profileRowDate: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BoringAI.colors.accent,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.sm,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.background,
  },
  dangerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BoringAI.colors.surface,
    borderWidth: BoringAI.border.hairline,
    borderColor: BoringAI.colors.danger,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: BoringAI.radius.button,
    gap: BoringAI.spacing.sm,
    marginBottom: BoringAI.spacing.md,
  },
  dangerButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: BoringAI.colors.danger,
  },
  dangerHint: {
    fontSize: 13,
    color: BoringAI.colors.textMuted,
    lineHeight: 18,
  },
});
