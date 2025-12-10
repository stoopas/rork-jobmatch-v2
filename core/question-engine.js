/**
 * Question Engine
 * Generates and validates clarifying questions based on user profile
 */

/**
 * Question categories
 */
export const QUESTION_CATEGORIES = {
  SKILLS: 'skills',
  TOOLS: 'tools',
  DOMAINS: 'domains',
  EXPERIENCE: 'experience',
  WORK_STYLE: 'work_style',
  PREFERENCES: 'preferences',
  CERTIFICATIONS: 'certifications',
  PROJECTS: 'projects',
};

/**
 * Get missing information from profile
 * @param {Object} profile - User profile
 * @returns {Array} Array of missing information categories
 */
export function getMissingInfo(profile) {
  const missing = [];

  if (!profile.experience || profile.experience.length === 0) {
    missing.push(QUESTION_CATEGORIES.EXPERIENCE);
  }

  if (!profile.skills || profile.skills.length === 0) {
    missing.push(QUESTION_CATEGORIES.SKILLS);
  }

  if (!profile.tools || profile.tools.length === 0) {
    missing.push(QUESTION_CATEGORIES.TOOLS);
  }

  if (!profile.domainExperience || profile.domainExperience.length === 0) {
    missing.push(QUESTION_CATEGORIES.DOMAINS);
  }

  if (!profile.certifications || profile.certifications.length === 0) {
    missing.push(QUESTION_CATEGORIES.CERTIFICATIONS);
  }

  if (!profile.projects || profile.projects.length === 0) {
    missing.push(QUESTION_CATEGORIES.PROJECTS);
  }

  if (!profile.workStyles || profile.workStyles.length === 0) {
    missing.push(QUESTION_CATEGORIES.WORK_STYLE);
  }

  return missing;
}

/**
 * Check if a question has already been asked
 * @param {Object} profile - User profile with clarifyingAnswers
 * @param {string} questionKey - Question identifier
 * @returns {boolean} True if question was already asked
 */
export function hasAskedQuestion(profile, questionKey) {
  if (!profile.clarifyingAnswers) return false;
  return Object.keys(profile.clarifyingAnswers).some(key => 
    key.includes(questionKey)
  );
}

/**
 * Generate follow-up questions based on profile gaps
 * @param {Object} profile - User profile
 * @returns {Array} Array of suggested questions
 */
export function generateFollowUpQuestions(profile) {
  const questions = [];
  const missing = getMissingInfo(profile);

  if (missing.includes(QUESTION_CATEGORIES.EXPERIENCE)) {
    questions.push({
      text: 'What is your current or most recent job title?',
      category: QUESTION_CATEGORIES.EXPERIENCE,
      options: ['Software Engineer', 'Product Manager', 'Designer', 'Data Scientist', 'Other'],
    });
  }

  if (missing.includes(QUESTION_CATEGORIES.SKILLS)) {
    questions.push({
      text: 'What are your primary technical skills?',
      category: QUESTION_CATEGORIES.SKILLS,
      options: ['JavaScript/TypeScript', 'Python', 'Java/Kotlin', 'React/React Native', 'I prefer to type'],
    });
  }

  if (missing.includes(QUESTION_CATEGORIES.DOMAINS)) {
    questions.push({
      text: 'Which industries have you worked in?',
      category: QUESTION_CATEGORIES.DOMAINS,
      options: ['Healthcare', 'Finance', 'E-commerce', 'Enterprise Software', 'Other'],
    });
  }

  if (missing.includes(QUESTION_CATEGORIES.WORK_STYLE)) {
    questions.push({
      text: 'What type of work environment do you prefer?',
      category: QUESTION_CATEGORIES.WORK_STYLE,
      options: ['Startup (fast-paced)', 'Enterprise (structured)', 'Hybrid', 'No preference'],
    });
  }

  return questions;
}

/**
 * Validate question format
 * @param {Object} question - Question object
 * @returns {boolean} True if valid
 */
export function isValidQuestion(question) {
  return (
    question &&
    typeof question.text === 'string' &&
    question.text.length > 0 &&
    Array.isArray(question.options) &&
    question.options.length > 0
  );
}

/**
 * Create a clarifying question object
 * @param {string} text - Question text
 * @param {string} category - Question category
 * @param {Array} options - Answer options
 * @returns {Object} Question object
 */
export function createQuestion(text, category, options = []) {
  return {
    id: `q-${Date.now()}-${Math.random()}`,
    text,
    category,
    options,
    timestamp: new Date().toISOString(),
  };
}
