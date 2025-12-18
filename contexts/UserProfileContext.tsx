import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { UserProfile, QAItem, JobPosting, Skill, Tool, ClarifyingAnswer, ResumeAsset } from "../types/profile";

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
  resumeAssets: [],
};

export const [UserProfileProvider, useUserProfile] = createContextHook(() => {
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);

  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(PROFILE_KEY);
        return stored ? JSON.parse(stored) : initialProfile;
      } catch (error) {
        console.error("Error loading profile:", error);
        return initialProfile;
      }
    },
    staleTime: Infinity,
  });

  const qaQuery = useQuery({
    queryKey: ["qaHistory"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(QA_HISTORY_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error loading QA history:", error);
        return [];
      }
    },
    staleTime: Infinity,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobPostings"],
    queryFn: async () => {
      try {
        const stored = await AsyncStorage.getItem(JOBS_KEY);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error loading job postings:", error);
        return [];
      }
    },
    staleTime: Infinity,
  });

  const { mutateAsync: saveProfileAsync, isPending: isSavingProfile } = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      return newProfile;
    },
    onSuccess: (saved) => {
      setProfile(saved);
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
    async (updates: Partial<UserProfile>) => {
      const updated = { ...profile, ...updates };
      setProfile(updated);
      await saveProfileAsync(updated);
    },
    [profile, saveProfileAsync]
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

  const addResumeAsset = useCallback(
    async (asset: ResumeAsset) => {
      const updated = [...profile.resumeAssets, asset];
      await updateProfile({ resumeAssets: updated });
    },
    [profile.resumeAssets, updateProfile]
  );

  const removeResumeAsset = useCallback(
    async (id: string) => {
      const updated = profile.resumeAssets.filter((a) => a.id !== id);
      await updateProfile({ resumeAssets: updated });
    },
    [profile.resumeAssets, updateProfile]
  );

  const getResumeAssets = useCallback((): ResumeAsset[] => {
    return profile.resumeAssets || [];
  }, [profile.resumeAssets]);

  const updateResumeAsset = useCallback(
    async (id: string, patch: Partial<ResumeAsset>) => {
      const updated = profile.resumeAssets.map((a) =>
        a.id === id ? { ...a, ...patch } : a
      );
      await updateProfile({ resumeAssets: updated });
    },
    [profile.resumeAssets, updateProfile]
  );

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
      addResumeAsset,
      removeResumeAsset,
      getResumeAssets,
      updateResumeAsset,
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
      addResumeAsset,
      removeResumeAsset,
      getResumeAssets,
      updateResumeAsset,
      profileQuery.isLoading,
      qaQuery.isLoading,
      jobsQuery.isLoading,
      isSavingProfile,
      isSavingQA,
      isSavingJobs,
    ]
  );
});
