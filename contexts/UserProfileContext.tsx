import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { UserProfile, QAItem, JobPosting, Skill, Tool, ClarifyingAnswer } from "../types/profile";

const PROFILE_KEY = "user_profile";
const QA_HISTORY_KEY = "qa_history";
const JOBS_KEY = "job_postings";

const initialProfile: UserProfile = {
  experience: [],
  skills: [],
  certifications: [],
  tools: [],
  projects: [],
  domainExperience: [],
  notes: [],
  achievements: [],
  responsibilities: [],
  clarifyingAnswers: {},
  workStyles: [],
  preferences: {},
  resumeBullets: [],
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      return stored ? JSON.parse(stored) : initialProfile;
    },
  });

  const qaQuery = useQuery({
    queryKey: ["qaHistory"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(QA_HISTORY_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const jobsQuery = useQuery({
    queryKey: ["jobPostings"],
    queryFn: async () => {
      const stored = await AsyncStorage.getItem(JOBS_KEY);
      return stored ? JSON.parse(stored) : [];
    },
  });

  const { mutate: saveProfile, isPending: isSavingProfile } = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      console.log("[saveProfile mutation] Saving profile to AsyncStorage...");
      console.log("[saveProfile mutation] Profile data:", {
        experience: newProfile.experience?.length,
        skills: newProfile.skills?.length,
        certifications: newProfile.certifications?.length,
        tools: newProfile.tools?.length,
        projects: newProfile.projects?.length,
        domainExperience: newProfile.domainExperience?.length,
      });
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      console.log("[saveProfile mutation] Profile saved to AsyncStorage");
      return newProfile;
    },
    onSuccess: (saved) => {
      console.log("[saveProfile onSuccess] Profile successfully saved", {
        experience: saved.experience?.length,
        skills: saved.skills?.length,
        certifications: saved.certifications?.length,
        tools: saved.tools?.length,
        projects: saved.projects?.length,
        domainExperience: saved.domainExperience?.length,
      });
    },
    onError: (error) => {
      console.error("[saveProfile onError] Failed to save profile:", error);
    },
  });

  const { mutate: saveQA, isPending: isSavingQA } = useMutation({
    mutationFn: async (newQA: QAItem[]) => {
      await AsyncStorage.setItem(QA_HISTORY_KEY, JSON.stringify(newQA));
      return newQA;
    },
  });

  const { mutate: saveJobs, isPending: isSavingJobs } = useMutation({
    mutationFn: async (newJobs: JobPosting[]) => {
      await AsyncStorage.setItem(JOBS_KEY, JSON.stringify(newJobs));
      return newJobs;
    },
  });

  useEffect(() => {
    if (profileQuery.data) {
      setProfile(profileQuery.data);
    }
  }, [profileQuery.data]);

  useEffect(() => {
    if (qaQuery.data) {
      setQaHistory(qaQuery.data);
    }
  }, [qaQuery.data]);

  useEffect(() => {
    if (jobsQuery.data) {
      setJobPostings(jobsQuery.data);
    }
  }, [jobsQuery.data]);

  const updateProfile = useCallback(
    (updates: Partial<UserProfile>) => {
      console.log("[UserProfileContext] updateProfile called with updates:", {
        experience: updates.experience?.length,
        skills: updates.skills?.length,
        certifications: updates.certifications?.length,
        tools: updates.tools?.length,
        projects: updates.projects?.length,
        domainExperience: updates.domainExperience?.length,
      });
      console.log("[UserProfileContext] Current profile before update:", {
        experience: profile.experience?.length,
        skills: profile.skills?.length,
        certifications: profile.certifications?.length,
        tools: profile.tools?.length,
        projects: profile.projects?.length,
        domainExperience: profile.domainExperience?.length,
      });
      const updated = { ...profile, ...updates };
      console.log("[UserProfileContext] Updated profile:", {
        experience: updated.experience?.length,
        skills: updated.skills?.length,
        certifications: updated.certifications?.length,
        tools: updated.tools?.length,
        projects: updated.projects?.length,
        domainExperience: updated.domainExperience?.length,
      });
      setProfile(updated);
      console.log("[UserProfileContext] Calling saveProfile mutation...");
      saveProfile(updated);
    },
    [profile, saveProfile]
  );

  const addQA = useCallback(
    (qa: QAItem) => {
      const updated = [...qaHistory, qa];
      setQaHistory(updated);
      saveQA(updated);
    },
    [qaHistory, saveQA]
  );

  const addJobPosting = useCallback(
    (job: JobPosting) => {
      const updated = [job, ...jobPostings];
      setJobPostings(updated);
      saveJobs(updated);
    },
    [jobPostings, saveJobs]
  );

  const clearAllData = useCallback(async () => {
    await AsyncStorage.multiRemove([PROFILE_KEY, QA_HISTORY_KEY, JOBS_KEY]);
    setProfile(initialProfile);
    setQaHistory([]);
    setJobPostings([]);
  }, []);

  const addOrUpdateSkill = useCallback(
    (skill: Omit<Skill, 'id'> & { id?: string }) => {
      const existing = profile.skills.find(
        (s) => s.name.toLowerCase() === skill.name.toLowerCase()
      );
      
      if (existing) {
        updateProfile({
          skills: profile.skills.map((s) =>
            s.id === existing.id ? { ...s, ...skill, id: s.id } : s
          ),
        });
      } else {
        updateProfile({
          skills: [
            ...profile.skills,
            {
              id: Date.now().toString() + Math.random(),
              ...skill,
              name: skill.name,
              category: skill.category || 'General',
            } as Skill,
          ],
        });
      }
    },
    [profile.skills, updateProfile]
  );

  const addOrUpdateTool = useCallback(
    (tool: Omit<Tool, 'id'> & { id?: string }) => {
      const existing = profile.tools.find(
        (t) => t.name.toLowerCase() === tool.name.toLowerCase()
      );
      
      if (existing) {
        updateProfile({
          tools: profile.tools.map((t) =>
            t.id === existing.id ? { ...t, ...tool, id: t.id } : t
          ),
        });
      } else {
        updateProfile({
          tools: [
            ...profile.tools,
            {
              id: Date.now().toString() + Math.random(),
              ...tool,
              name: tool.name,
              category: tool.category || 'General',
            } as Tool,
          ],
        });
      }
    },
    [profile.tools, updateProfile]
  );

  const recordClarifyingAnswer = useCallback(
    (topicKey: string, answer: Omit<ClarifyingAnswer, 'timestamp'>) => {
      updateProfile({
        clarifyingAnswers: {
          ...profile.clarifyingAnswers,
          [topicKey]: {
            ...answer,
            timestamp: new Date().toISOString(),
          },
        },
      });
    },
    [profile.clarifyingAnswers, updateProfile]
  );

  const hasClarificationFor = useCallback(
    (topicKey: string): boolean => {
      return !!profile.clarifyingAnswers[topicKey];
    },
    [profile.clarifyingAnswers]
  );

  const isProfileComplete = useCallback((): boolean => {
    return profile.experience.length > 0 && profile.skills.length > 0;
  }, [profile.experience.length, profile.skills.length]);

  return useMemo(
    () => ({
      profile,
      qaHistory,
      jobPostings,
      updateProfile,
      addQA,
      addJobPosting,
      clearAllData,
      addOrUpdateSkill,
      addOrUpdateTool,
      recordClarifyingAnswer,
      hasClarificationFor,
      isProfileComplete,
      isLoading:
        profileQuery.isLoading || qaQuery.isLoading || jobsQuery.isLoading,
      isSaving: isSavingProfile || isSavingQA || isSavingJobs,
    }),
    [
      profile,
      qaHistory,
      jobPostings,
      updateProfile,
      addQA,
      addJobPosting,
      clearAllData,
      addOrUpdateSkill,
      addOrUpdateTool,
      recordClarifyingAnswer,
      hasClarificationFor,
      isProfileComplete,
      profileQuery.isLoading,
      qaQuery.isLoading,
      jobsQuery.isLoading,
      isSavingProfile,
      isSavingQA,
      isSavingJobs,
    ]
  );
});
