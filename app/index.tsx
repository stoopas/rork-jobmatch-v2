import { router } from "expo-router";
import { FileText, Plus, Sparkles } from "lucide-react-native";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useUserProfile } from "../contexts/UserProfileContext";

export default function HomeScreen() {
  const { profile } = useUserProfile();

  const hasProfile = profile.experience.length > 0 || profile.skills.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Sparkles size={32} color="#0066FF" strokeWidth={2} />
            <Text style={styles.title}>JobMatch</Text>
          </View>
          <Text style={styles.subtitle}>
            AI-Powered Resume Tailoring for Your Dream Job
          </Text>
        </View>

        {!hasProfile && (
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome! Let&apos;s Get Started</Text>
            <Text style={styles.welcomeText}>
              Add your experience and skills to build your profile. I&apos;ll learn
              about you and help create tailored resumes for any job posting.
            </Text>
          </View>
        )}

        {hasProfile && (
          <View style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <FileText size={24} color="#0066FF" />
              <Text style={styles.profileTitle}>Your Profile</Text>
            </View>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.experience.length}</Text>
                <Text style={styles.statLabel}>Experiences</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{profile.skills.length}</Text>
                <Text style={styles.statLabel}>Skills</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>
                  {profile.certifications.length}
                </Text>
                <Text style={styles.statLabel}>Certifications</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push("/profile/edit")}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.actionsContainer}>
          <Text style={styles.actionsTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/chat")}
          >
            <View style={styles.actionIconContainer}>
              <Sparkles size={24} color="#0066FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Chat with JobMatch AI</Text>
              <Text style={styles.actionDescription}>
                Upload resume, analyze jobs, and get tailored advice
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push("/profile/edit")}
          >
            <View style={styles.actionIconContainer}>
              <Plus size={24} color="#0066FF" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Manual Profile Edit</Text>
              <Text style={styles.actionDescription}>
                Directly add or edit your experience and skills
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Your data is stored securely on your device
          </Text>
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
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700" as const,
    color: "#1A1A1A",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: "#666666",
    lineHeight: 22,
  },
  welcomeCard: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    backgroundColor: "#EBF3FF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D1E3FF",
  },
  welcomeTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#0066FF",
    marginBottom: 8,
  },
  welcomeText: {
    fontSize: 15,
    color: "#004CB3",
    lineHeight: 22,
  },
  profileCard: {
    marginHorizontal: 24,
    marginTop: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  profileTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: 16,
    marginBottom: 16,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: "#0066FF",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: "#666666",
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E5E5",
  },
  editButton: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  editButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#1A1A1A",
  },
  actionsContainer: {
    marginHorizontal: 24,
    marginTop: 32,
  },
  actionsTitle: {
    fontSize: 20,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#EBF3FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1A1A1A",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: "#666666",
    lineHeight: 20,
  },
  footer: {
    marginHorizontal: 24,
    marginTop: 32,
    marginBottom: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: "#999999",
  },
});
