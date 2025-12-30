import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { UserProfile, QAItem, JobPosting, Skill, Tool, ClarifyingAnswer, ResumeAsset } from "../types/profile";

const PROFILE_KEY = "user_profile";
const QA_HISTORY_KEY = "qa_history";
const JOBS_KEY = "job_postings";
const ACTIVE_PROFILE_ID_KEY = "active_profile_id";
const PROFILE_INDEX_KEY = "profile_index";

type ProfileMeta = {
  id: string;
  name: string;
  createdAt: string;
};

function generateId(): string {
  return "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 10);
}

function scopedKey(baseKey: string, profileId: string): string {
  return `${baseKey}:${profileId}`;
}

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
  const queryClient = useQueryClient();
  const [profile, setProfile] = useState<UserProfile>(initialProfile);
  const [qaHistory, setQaHistory] = useState<QAItem[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>("");
  const [profilesIndex, setProfilesIndex] = useState<ProfileMeta[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function initializeProfiles() {
      try {
        console.log("[ProfileContext] Initializing profiles...");
        let currentProfileId = await AsyncStorage.getItem(ACTIVE_PROFILE_ID_KEY);
        let index: ProfileMeta[] = [];

        const storedIndex = await AsyncStorage.getItem(PROFILE_INDEX_KEY);
        if (storedIndex) {
          index = JSON.parse(storedIndex);
        }

        if (!currentProfileId) {
          console.log("[ProfileContext] No active profile found, creating default...");
          currentProfileId = generateId();
          const defaultMeta: ProfileMeta = {
            id: currentProfileId,
            name: "My Profile",
            createdAt: new Date().toISOString(),
          };
          index = [defaultMeta];
          await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, currentProfileId);
          await AsyncStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(index));

          const oldProfile = await AsyncStorage.getItem(PROFILE_KEY);
          const oldQA = await AsyncStorage.getItem(QA_HISTORY_KEY);
          const oldJobs = await AsyncStorage.getItem(JOBS_KEY);

          if (oldProfile || oldQA || oldJobs) {
            console.log("[ProfileContext] Migrating legacy data to scoped storage...");
            if (oldProfile) {
              await AsyncStorage.setItem(scopedKey(PROFILE_KEY, currentProfileId), oldProfile);
              await AsyncStorage.removeItem(PROFILE_KEY);
            }
            if (oldQA) {
              await AsyncStorage.setItem(scopedKey(QA_HISTORY_KEY, currentProfileId), oldQA);
              await AsyncStorage.removeItem(QA_HISTORY_KEY);
            }
            if (oldJobs) {
              await AsyncStorage.setItem(scopedKey(JOBS_KEY, currentProfileId), oldJobs);
              await AsyncStorage.removeItem(JOBS_KEY);
            }
            console.log("[ProfileContext] Migration complete.");
          } else {
            await AsyncStorage.setItem(scopedKey(PROFILE_KEY, currentProfileId), JSON.stringify(initialProfile));
            await AsyncStorage.setItem(scopedKey(QA_HISTORY_KEY, currentProfileId), JSON.stringify([]));
            await AsyncStorage.setItem(scopedKey(JOBS_KEY, currentProfileId), JSON.stringify([]));
          }
        }

        console.log("[ProfileContext] Active profile ID:", currentProfileId);
        console.log("[ProfileContext] Profiles index:", index);
        setActiveProfileId(currentProfileId);
        setProfilesIndex(index);
        setIsInitialized(true);
      } catch (error) {
        console.error("[ProfileContext] Error initializing profiles:", error);
        const fallbackId = generateId();
        setActiveProfileId(fallbackId);
        setProfilesIndex([{ id: fallbackId, name: "My Profile", createdAt: new Date().toISOString() }]);
        setIsInitialized(true);
      }
    }

    initializeProfiles();
  }, []);

  const profileQuery = useQuery({
    queryKey: ["profile", activeProfileId],
    queryFn: async () => {
      if (!activeProfileId) return initialProfile;
      try {
        console.log("[ProfileContext] Loading profile for:", activeProfileId);
        const stored = await AsyncStorage.getItem(scopedKey(PROFILE_KEY, activeProfileId));
        return stored ? JSON.parse(stored) : initialProfile;
      } catch (error) {
        console.error("Error loading profile:", error);
        return initialProfile;
      }
    },
    staleTime: Infinity,
    enabled: !!activeProfileId && isInitialized,
  });

  const qaQuery = useQuery({
    queryKey: ["qaHistory", activeProfileId],
    queryFn: async () => {
      if (!activeProfileId) return [];
      try {
        const stored = await AsyncStorage.getItem(scopedKey(QA_HISTORY_KEY, activeProfileId));
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error loading QA history:", error);
        return [];
      }
    },
    staleTime: Infinity,
    enabled: !!activeProfileId && isInitialized,
  });

  const jobsQuery = useQuery({
    queryKey: ["jobPostings", activeProfileId],
    queryFn: async () => {
      if (!activeProfileId) return [];
      try {
        const stored = await AsyncStorage.getItem(scopedKey(JOBS_KEY, activeProfileId));
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        console.error("Error loading job postings:", error);
        return [];
      }
    },
    staleTime: Infinity,
    enabled: !!activeProfileId && isInitialized,
  });

  const { mutateAsync: saveProfileAsync, isPending: isSavingProfile } = useMutation({
    mutationFn: async (newProfile: UserProfile) => {
      if (!activeProfileId) throw new Error("No active profile");
      console.log("[ProfileContext] Saving profile to:", scopedKey(PROFILE_KEY, activeProfileId));
      await AsyncStorage.setItem(scopedKey(PROFILE_KEY, activeProfileId), JSON.stringify(newProfile));
      return newProfile;
    },
    onSuccess: (saved) => {
      setProfile(saved);
    },
  });

  const { mutate: saveQA, isPending: isSavingQA } = useMutation({
    mutationFn: async (newQA: QAItem[]) => {
      if (!activeProfileId) throw new Error("No active profile");
      await AsyncStorage.setItem(scopedKey(QA_HISTORY_KEY, activeProfileId), JSON.stringify(newQA));
      return newQA;
    },
  });

  const { mutate: saveJobs, isPending: isSavingJobs } = useMutation({
    mutationFn: async (newJobs: JobPosting[]) => {
      if (!activeProfileId) throw new Error("No active profile");
      await AsyncStorage.setItem(scopedKey(JOBS_KEY, activeProfileId), JSON.stringify(newJobs));
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
    if (!activeProfileId) return;
    await AsyncStorage.multiRemove([
      scopedKey(PROFILE_KEY, activeProfileId),
      scopedKey(QA_HISTORY_KEY, activeProfileId),
      scopedKey(JOBS_KEY, activeProfileId),
    ]);
    setProfile(initialProfile);
    setQaHistory([]);
    setJobPostings([]);
  }, [activeProfileId]);

  const createProfile = useCallback(async (name?: string) => {
    try {
      const newId = generateId();
      const newMeta: ProfileMeta = {
        id: newId,
        name: name || `Profile ${profilesIndex.length + 1}`,
        createdAt: new Date().toISOString(),
      };
      const updatedIndex = [...profilesIndex, newMeta];

      await AsyncStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(updatedIndex));
      await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, newId);
      await AsyncStorage.setItem(scopedKey(PROFILE_KEY, newId), JSON.stringify(initialProfile));
      await AsyncStorage.setItem(scopedKey(QA_HISTORY_KEY, newId), JSON.stringify([]));
      await AsyncStorage.setItem(scopedKey(JOBS_KEY, newId), JSON.stringify([]));

      setProfilesIndex(updatedIndex);
      setActiveProfileId(newId);
      setProfile(initialProfile);
      setQaHistory([]);
      setJobPostings([]);

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["qaHistory"] });
      queryClient.invalidateQueries({ queryKey: ["jobPostings"] });

      console.log("[ProfileContext] Created new profile:", newId);
    } catch (error) {
      console.error("[ProfileContext] Error creating profile:", error);
      throw error;
    }
  }, [profilesIndex, queryClient]);

  const switchProfile = useCallback(async (profileId: string) => {
    try {
      await AsyncStorage.setItem(ACTIVE_PROFILE_ID_KEY, profileId);
      setActiveProfileId(profileId);
      setProfile(initialProfile);
      setQaHistory([]);
      setJobPostings([]);

      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["qaHistory"] });
      queryClient.invalidateQueries({ queryKey: ["jobPostings"] });

      console.log("[ProfileContext] Switched to profile:", profileId);
    } catch (error) {
      console.error("[ProfileContext] Error switching profile:", error);
      throw error;
    }
  }, [queryClient]);

  const renameProfile = useCallback(async (profileId: string, name: string) => {
    try {
      const updatedIndex = profilesIndex.map((p) =>
        p.id === profileId ? { ...p, name } : p
      );
      await AsyncStorage.setItem(PROFILE_INDEX_KEY, JSON.stringify(updatedIndex));
      setProfilesIndex(updatedIndex);
      console.log("[ProfileContext] Renamed profile:", profileId, "to", name);
    } catch (error) {
      console.error("[ProfileContext] Error renaming profile:", error);
      throw error;
    }
  }, [profilesIndex]);

  const resetActiveProfile = useCallback(async () => {
    try {
      if (!activeProfileId) return;
      await AsyncStorage.removeItem(scopedKey(PROFILE_KEY, activeProfileId));
      await AsyncStorage.removeItem(scopedKey(QA_HISTORY_KEY, activeProfileId));
      await AsyncStorage.removeItem(scopedKey(JOBS_KEY, activeProfileId));

      await AsyncStorage.setItem(scopedKey(PROFILE_KEY, activeProfileId), JSON.stringify(initialProfile));
      await AsyncStorage.setItem(scopedKey(QA_HISTORY_KEY, activeProfileId), JSON.stringify([]));
      await AsyncStorage.setItem(scopedKey(JOBS_KEY, activeProfileId), JSON.stringify([]));

      setProfile(initialProfile);
      setQaHistory([]);
      setJobPostings([]);

      queryClient.invalidateQueries({ queryKey: ["profile", activeProfileId] });
      queryClient.invalidateQueries({ queryKey: ["qaHistory", activeProfileId] });
      queryClient.invalidateQueries({ queryKey: ["jobPostings", activeProfileId] });

      console.log("[ProfileContext] Reset profile:", activeProfileId);
    } catch (error) {
      console.error("[ProfileContext] Error resetting profile:", error);
      throw error;
    }
  }, [activeProfileId, queryClient]);

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
      activeProfileId,
      profilesIndex,
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
      createProfile,
      switchProfile,
      renameProfile,
      resetActiveProfile,
      isLoading:
        !isInitialized || profileQuery.isLoading || qaQuery.isLoading || jobsQuery.isLoading,
      isSaving: isSavingProfile || isSavingQA || isSavingJobs,
    }),
    [
      profile,
      qaHistory,
      jobPostings,
      activeProfileId,
      profilesIndex,
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
      createProfile,
      switchProfile,
      renameProfile,
      resetActiveProfile,
      isInitialized,
      profileQuery.isLoading,
      qaQuery.isLoading,
      jobsQuery.isLoading,
      isSavingProfile,
      isSavingQA,
      isSavingJobs,
    ]
  );
});
