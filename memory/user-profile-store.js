/**
 * User Profile Store
 * Manages user profile storage and retrieval
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_USER_PROFILE, STORAGE_KEYS } from './defaults.js';
import { userProfileSchema, validateData } from './schema.js';

/**
 * Load user profile from storage
 * @returns {Promise<Object>} User profile
 */
export async function loadProfile() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    
    if (!stored) {
      return DEFAULT_USER_PROFILE;
    }

    const parsed = JSON.parse(stored);
    
    // Validate the loaded profile
    const validation = validateData(userProfileSchema, parsed);
    
    if (validation.success) {
      return validation.data;
    } else {
      console.warn('[loadProfile] Invalid profile data, returning default:', validation.errors);
      return DEFAULT_USER_PROFILE;
    }
  } catch (error) {
    console.error('[loadProfile] Error loading profile:', error);
    return DEFAULT_USER_PROFILE;
  }
}

/**
 * Save user profile to storage
 * @param {Object} profile - User profile to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveProfile(profile) {
  try {
    // Validate before saving
    const validation = validateData(userProfileSchema, profile);
    
    if (!validation.success) {
      console.error('[saveProfile] Invalid profile data:', validation.errors);
      return false;
    }

    await AsyncStorage.setItem(
      STORAGE_KEYS.PROFILE, 
      JSON.stringify(validation.data)
    );
    
    return true;
  } catch (error) {
    console.error('[saveProfile] Error saving profile:', error);
    return false;
  }
}

/**
 * Update profile with partial data
 * @param {Object} updates - Partial profile updates
 * @returns {Promise<Object>} Updated profile
 */
export async function updateProfile(updates) {
  try {
    const current = await loadProfile();
    const updated = { ...current, ...updates };
    
    const saved = await saveProfile(updated);
    
    if (saved) {
      return updated;
    } else {
      throw new Error('Failed to save updated profile');
    }
  } catch (error) {
    console.error('[updateProfile] Error updating profile:', error);
    throw error;
  }
}

/**
 * Add experience to profile
 * @param {Object} experience - Experience to add
 * @returns {Promise<Object>} Updated profile
 */
export async function addExperience(experience) {
  try {
    const profile = await loadProfile();
    const id = experience.id || `exp-${Date.now()}-${Math.random()}`;
    
    const newExperience = {
      ...experience,
      id,
    };

    profile.experience.push(newExperience);
    
    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addExperience] Error:', error);
    throw error;
  }
}

/**
 * Add skills to profile
 * @param {Array} skills - Skills to add
 * @returns {Promise<Object>} Updated profile
 */
export async function addSkills(skills) {
  try {
    const profile = await loadProfile();
    
    const newSkills = skills.map(skill => ({
      ...skill,
      id: skill.id || `skill-${Date.now()}-${Math.random()}`,
    }));

    profile.skills.push(...newSkills);
    
    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addSkills] Error:', error);
    throw error;
  }
}

/**
 * Add certification to profile
 * @param {Object} certification - Certification to add
 * @returns {Promise<Object>} Updated profile
 */
export async function addCertification(certification) {
  try {
    const profile = await loadProfile();
    const id = certification.id || `cert-${Date.now()}-${Math.random()}`;
    
    const newCertification = {
      ...certification,
      id,
    };

    profile.certifications.push(newCertification);
    
    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addCertification] Error:', error);
    throw error;
  }
}

/**
 * Add tools to profile
 * @param {Array} tools - Tools to add
 * @returns {Promise<Object>} Updated profile
 */
export async function addTools(tools) {
  try {
    const profile = await loadProfile();
    
    const newTools = tools.map(tool => ({
      ...tool,
      id: tool.id || `tool-${Date.now()}-${Math.random()}`,
    }));

    profile.tools.push(...newTools);
    
    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addTools] Error:', error);
    throw error;
  }
}

/**
 * Add project to profile
 * @param {Object} project - Project to add
 * @returns {Promise<Object>} Updated profile
 */
export async function addProject(project) {
  try {
    const profile = await loadProfile();
    const id = project.id || `project-${Date.now()}-${Math.random()}`;
    
    const newProject = {
      ...project,
      id,
    };

    profile.projects.push(newProject);
    
    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addProject] Error:', error);
    throw error;
  }
}

/**
 * Add clarifying answer to profile
 * @param {string} question - Question asked
 * @param {string} answer - User's answer
 * @param {string} category - Answer category
 * @returns {Promise<Object>} Updated profile
 */
export async function addClarifyingAnswer(question, answer, category) {
  try {
    const profile = await loadProfile();
    const key = `${category}-${Date.now()}`;
    
    profile.clarifyingAnswers[key] = {
      question,
      answer,
      category,
      timestamp: new Date().toISOString(),
    };

    await saveProfile(profile);
    return profile;
  } catch (error) {
    console.error('[addClarifyingAnswer] Error:', error);
    throw error;
  }
}

/**
 * Clear all profile data
 * @returns {Promise<boolean>} Success status
 */
export async function clearProfile() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.PROFILE);
    return true;
  } catch (error) {
    console.error('[clearProfile] Error:', error);
    return false;
  }
}

/**
 * Load QA history from storage
 * @returns {Promise<Array>} QA history
 */
export async function loadQAHistory() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.QA_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[loadQAHistory] Error:', error);
    return [];
  }
}

/**
 * Save QA history to storage
 * @param {Array} qaHistory - QA history to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveQAHistory(qaHistory) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.QA_HISTORY, 
      JSON.stringify(qaHistory)
    );
    return true;
  } catch (error) {
    console.error('[saveQAHistory] Error:', error);
    return false;
  }
}

/**
 * Add QA item to history
 * @param {Object} qaItem - QA item to add
 * @returns {Promise<Array>} Updated QA history
 */
export async function addQAItem(qaItem) {
  try {
    const history = await loadQAHistory();
    const id = qaItem.id || `qa-${Date.now()}-${Math.random()}`;
    
    const newItem = {
      ...qaItem,
      id,
      timestamp: qaItem.timestamp || new Date().toISOString(),
    };

    history.push(newItem);
    
    await saveQAHistory(history);
    return history;
  } catch (error) {
    console.error('[addQAItem] Error:', error);
    throw error;
  }
}

/**
 * Load job postings from storage
 * @returns {Promise<Array>} Job postings
 */
export async function loadJobPostings() {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.JOBS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[loadJobPostings] Error:', error);
    return [];
  }
}

/**
 * Save job postings to storage
 * @param {Array} jobs - Job postings to save
 * @returns {Promise<boolean>} Success status
 */
export async function saveJobPostings(jobs) {
  try {
    await AsyncStorage.setItem(
      STORAGE_KEYS.JOBS, 
      JSON.stringify(jobs)
    );
    return true;
  } catch (error) {
    console.error('[saveJobPostings] Error:', error);
    return false;
  }
}

/**
 * Add job posting
 * @param {Object} job - Job posting to add
 * @returns {Promise<Array>} Updated job postings
 */
export async function addJobPosting(job) {
  try {
    const jobs = await loadJobPostings();
    const id = job.id || `job-${Date.now()}-${Math.random()}`;
    
    const newJob = {
      ...job,
      id,
      timestamp: job.timestamp || new Date().toISOString(),
    };

    jobs.unshift(newJob); // Add to beginning
    
    await saveJobPostings(jobs);
    return jobs;
  } catch (error) {
    console.error('[addJobPosting] Error:', error);
    throw error;
  }
}

/**
 * Clear all data (profile, QA history, jobs)
 * @returns {Promise<boolean>} Success status
 */
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.PROFILE,
      STORAGE_KEYS.QA_HISTORY,
      STORAGE_KEYS.JOBS,
    ]);
    return true;
  } catch (error) {
    console.error('[clearAllData] Error:', error);
    return false;
  }
}

/**
 * Export all data for backup
 * @returns {Promise<Object>} All data
 */
export async function exportAllData() {
  try {
    const [profile, qaHistory, jobs] = await Promise.all([
      loadProfile(),
      loadQAHistory(),
      loadJobPostings(),
    ]);

    return {
      profile,
      qaHistory,
      jobPostings: jobs,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[exportAllData] Error:', error);
    throw error;
  }
}

/**
 * Import data from backup
 * @param {Object} data - Data to import
 * @returns {Promise<boolean>} Success status
 */
export async function importData(data) {
  try {
    if (data.profile) {
      await saveProfile(data.profile);
    }
    
    if (data.qaHistory) {
      await saveQAHistory(data.qaHistory);
    }
    
    if (data.jobPostings) {
      await saveJobPostings(data.jobPostings);
    }

    return true;
  } catch (error) {
    console.error('[importData] Error:', error);
    return false;
  }
}
