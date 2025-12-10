import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { UserProfile, QAItem, JobPosting } from "../types/profile";

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
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      return newProfile;
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
      const updated = { ...profile, ...updates };
      setProfile(updated);
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

  return useMemo(
    () => ({
      profile,
      qaHistory,
      jobPostings,
      updateProfile,
      addQA,
      addJobPosting,
      clearAllData,
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
      profileQuery.isLoading,
      qaQuery.isLoading,
      jobsQuery.isLoading,
      isSavingProfile,
      isSavingQA,
      isSavingJobs,
    ]
  );
});
