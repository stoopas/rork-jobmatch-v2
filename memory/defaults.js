/**
 * Default Values and Constants
 * Central location for all default values used across the application
 */

/**
 * Default user profile structure
 */
export const DEFAULT_USER_PROFILE = {
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

/**
 * Storage keys for AsyncStorage
 */
export const STORAGE_KEYS = {
  PROFILE: 'user_profile',
  QA_HISTORY: 'qa_history',
  JOBS: 'job_postings',
  SETTINGS: 'app_settings',
};

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
 * Seniority levels
 */
export const SENIORITY_LEVELS = [
  'entry',
  'junior',
  'mid',
  'senior',
  'lead',
  'staff',
  'principal',
];

/**
 * Common skill categories
 */
export const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frameworks',
  'Cloud & DevOps',
  'Databases',
  'Tools',
  'Soft Skills',
  'General',
];

/**
 * Common domains/industries
 */
export const DOMAINS = [
  'Healthcare',
  'Finance',
  'Fintech',
  'E-commerce',
  'Enterprise Software',
  'Education',
  'Gaming',
  'Social Media',
  'AI/ML',
  'Cybersecurity',
  'IoT',
  'Blockchain',
];

/**
 * Work style preferences
 */
export const WORK_STYLES = [
  'Startup (fast-paced)',
  'Enterprise (structured)',
  'Hybrid',
  'Remote-first',
  'In-office',
  'Flexible',
];

/**
 * Common technical skills
 */
export const COMMON_SKILLS = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'C#',
  'Go',
  'Rust',
  'React',
  'React Native',
  'Angular',
  'Vue',
  'Node.js',
  'Express',
  'Django',
  'Flask',
  'Spring Boot',
  'SQL',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'AWS',
  'Azure',
  'GCP',
  'Docker',
  'Kubernetes',
  'Git',
  'REST API',
  'GraphQL',
  'Microservices',
  'Machine Learning',
  'Deep Learning',
  'Data Science',
  'Analytics',
];

/**
 * Default fit score structure
 */
export const DEFAULT_FIT_SCORE = {
  overall: 0,
  experienceAlignment: 0,
  technicalSkillMatch: 0,
  domainRelevance: 0,
  stageCulturalFit: 0,
  impactPotential: 0,
  rationale: {
    experienceAlignment: '',
    technicalSkillMatch: '',
    domainRelevance: '',
    stageCulturalFit: '',
    impactPotential: '',
  },
};

/**
 * Score weights for overall fit calculation
 */
export const SCORE_WEIGHTS = {
  experienceAlignment: 0.25,
  technicalSkillMatch: 0.30,
  domainRelevance: 0.20,
  stageCulturalFit: 0.15,
  impactPotential: 0.10,
};

/**
 * File upload configuration
 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.doc', '.docx', '.txt'],
};

/**
 * AI model configuration
 */
export const AI_CONFIG = {
  DEFAULT_MODEL: 'gpt-4',
  TEMPERATURE: 0.7,
  MAX_TOKENS: 2000,
  TIMEOUT: 30000, // 30 seconds
};

/**
 * UI Constants
 */
export const UI_CONSTANTS = {
  MAX_QUICK_REPLIES: 5,
  MESSAGE_BATCH_SIZE: 20,
  ANIMATION_DURATION: 300,
};

/**
 * Validation rules
 */
export const VALIDATION_RULES = {
  MIN_QUESTION_LENGTH: 5,
  MAX_QUESTION_LENGTH: 200,
  MIN_ANSWER_LENGTH: 1,
  MAX_ANSWER_LENGTH: 1000,
  MIN_EXPERIENCE_YEARS: 0,
  MAX_EXPERIENCE_YEARS: 50,
};

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
  PARSE_FAILED: 'Failed to parse resume. Please try again or add information manually.',
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  INVALID_FILE: 'Invalid file format. Please upload a PDF, DOC, DOCX, or TXT file.',
  FILE_TOO_LARGE: 'File is too large. Maximum size is 10MB.',
  PROFILE_SAVE_FAILED: 'Failed to save profile. Please try again.',
  AI_ERROR: 'AI service is temporarily unavailable. Please try again later.',
};

/**
 * Success messages
 */
export const SUCCESS_MESSAGES = {
  PROFILE_SAVED: 'Profile saved successfully',
  RESUME_UPLOADED: 'Resume uploaded and parsed successfully',
  JOB_ADDED: 'Job posting added successfully',
  DATA_CLEARED: 'All data cleared successfully',
};
