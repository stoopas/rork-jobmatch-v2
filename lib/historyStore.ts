import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JobRun, ResumeVersion } from "../types/history";

const JOB_RUNS_KEY = "job_runs";
const RESUME_VERSIONS_KEY = "resume_versions";

function scopedKey(baseKey: string, profileId: string): string {
  return `${baseKey}:${profileId}`;
}

export function makeId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function loadJobRuns(activeProfileId: string): Promise<JobRun[]> {
  try {
    if (!activeProfileId) return [];
    const stored = await AsyncStorage.getItem(scopedKey(JOB_RUNS_KEY, activeProfileId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[historyStore] Error loading job runs:", error);
    return [];
  }
}

export async function saveJobRuns(activeProfileId: string, runs: JobRun[]): Promise<void> {
  try {
    if (!activeProfileId) throw new Error("No active profile");
    console.log("[historyStore] Saving job runs to:", scopedKey(JOB_RUNS_KEY, activeProfileId));
    await AsyncStorage.setItem(scopedKey(JOB_RUNS_KEY, activeProfileId), JSON.stringify(runs));
  } catch (error) {
    console.error("[historyStore] Error saving job runs:", error);
    throw error;
  }
}

export async function loadResumeVersions(activeProfileId: string): Promise<ResumeVersion[]> {
  try {
    if (!activeProfileId) return [];
    const stored = await AsyncStorage.getItem(scopedKey(RESUME_VERSIONS_KEY, activeProfileId));
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("[historyStore] Error loading resume versions:", error);
    return [];
  }
}

export async function saveResumeVersions(activeProfileId: string, versions: ResumeVersion[]): Promise<void> {
  try {
    if (!activeProfileId) throw new Error("No active profile");
    console.log("[historyStore] Saving resume versions to:", scopedKey(RESUME_VERSIONS_KEY, activeProfileId));
    await AsyncStorage.setItem(scopedKey(RESUME_VERSIONS_KEY, activeProfileId), JSON.stringify(versions));
  } catch (error) {
    console.error("[historyStore] Error saving resume versions:", error);
    throw error;
  }
}

export async function upsertJobRun(
  activeProfileId: string,
  runPartial: Omit<JobRun, "id" | "createdAt" | "updatedAt"> & { id?: string; createdAt?: string }
): Promise<JobRun> {
  try {
    const runs = await loadJobRuns(activeProfileId);
    const now = new Date().toISOString();

    const existingIndex = runs.findIndex((r) => r.jobId === runPartial.jobId);

    if (existingIndex !== -1) {
      const updated: JobRun = {
        ...runs[existingIndex],
        ...runPartial,
        updatedAt: now,
      };
      runs[existingIndex] = updated;
      await saveJobRuns(activeProfileId, runs);
      console.log("[historyStore] Updated existing job run:", updated.id);
      return updated;
    } else {
      const newRun: JobRun = {
        id: runPartial.id || makeId("jr"),
        createdAt: runPartial.createdAt || now,
        updatedAt: now,
        ...runPartial,
      };
      runs.push(newRun);
      await saveJobRuns(activeProfileId, runs);
      console.log("[historyStore] Created new job run:", newRun.id);
      return newRun;
    }
  } catch (error) {
    console.error("[historyStore] Error upserting job run:", error);
    throw error;
  }
}

export async function addResumeVersion(activeProfileId: string, version: Omit<ResumeVersion, "id" | "createdAt"> & { id?: string }): Promise<ResumeVersion> {
  try {
    const versions = await loadResumeVersions(activeProfileId);
    const now = new Date().toISOString();

    const newVersion: ResumeVersion = {
      id: version.id || makeId("rv"),
      createdAt: now,
      ...version,
    };

    versions.push(newVersion);
    await saveResumeVersions(activeProfileId, versions);
    console.log("[historyStore] Added resume version:", newVersion.id);

    await touchJobRun(activeProfileId, version.jobId);

    return newVersion;
  } catch (error) {
    console.error("[historyStore] Error adding resume version:", error);
    throw error;
  }
}

async function touchJobRun(activeProfileId: string, jobId: string): Promise<void> {
  try {
    const runs = await loadJobRuns(activeProfileId);
    const run = runs.find((r) => r.jobId === jobId);
    if (run) {
      run.updatedAt = new Date().toISOString();
      await saveJobRuns(activeProfileId, runs);
    }
  } catch (error) {
    console.error("[historyStore] Error touching job run:", error);
  }
}

export async function getJobWithVersions(
  activeProfileId: string,
  jobId: string
): Promise<{ job: JobRun | null; versions: ResumeVersion[] }> {
  try {
    const runs = await loadJobRuns(activeProfileId);
    const versions = await loadResumeVersions(activeProfileId);

    const job = runs.find((r) => r.jobId === jobId) || null;
    const jobVersions = versions.filter((v) => v.jobId === jobId);

    jobVersions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { job, versions: jobVersions };
  } catch (error) {
    console.error("[historyStore] Error getting job with versions:", error);
    return { job: null, versions: [] };
  }
}

export async function getResumeVersionById(
  activeProfileId: string,
  versionId: string
): Promise<ResumeVersion | null> {
  try {
    const versions = await loadResumeVersions(activeProfileId);
    return versions.find((v) => v.id === versionId) || null;
  } catch (error) {
    console.error("[historyStore] Error getting resume version by id:", error);
    return null;
  }
}
