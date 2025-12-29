/**
 * TypeScript Type Definitions
 * Central type definitions for the JobMatch application
 */

// User Profile Types
export interface Experience {
  id: string;
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  achievements: string[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Tool {
  id: string;
  name: string;
  category: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ClarifyingAnswer {
  question: string;
  answer: string;
  category: string;
  timestamp: string;
}

export interface UserProfile {
  experience: Experience[];
  skills: Skill[];
  certifications: Certification[];
  tools: Tool[];
  projects: Project[];
  domainExperience: string[];
  notes: string[];
  achievements: string[];
  responsibilities: string[];
  clarifyingAnswers: Record<string, ClarifyingAnswer>;
  workStyles: string[];
  preferences: Record<string, string>;
  resumeBullets: string[];
}

// Job Posting Types
export interface JobPosting {
  id: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  seniority: string;
  domain: string;
  location?: string;
  salary?: string;
  timestamp: string;
}

// QA Types
export interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  category?: string;
  options?: string[];
  askedInContext?: string;
}

// Fit Score Types
export interface FitScore {
  overall: number;
  experienceAlignment: number;
  technicalSkillMatch: number;
  domainRelevance: number;
  stageCulturalFit: number;
  impactPotential: number;
  rationale: {
    experienceAlignment: string;
    technicalSkillMatch: string;
    domainRelevance: string;
    stageCulturalFit: string;
    impactPotential: string;
  };
}

// Message Types
export interface MessagePart {
  type: 'text' | 'image' | 'file';
  text?: string;
  imageUrl?: string;
  fileUrl?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  parts: MessagePart[];
  timestamp?: string;
}

// Upload Types
export interface UploadFile {
  name: string;
  uri: string;
  type?: string;
  size?: number;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

// Question Types
export interface Question {
  id: string;
  text: string;
  category: string;
  options: string[];
  timestamp: string;
}

export interface QuickReply {
  label: string;
  value: string;
}

// Parser Types
export interface ParsedResume {
  experience: Omit<Experience, 'id'>[];
  skills: Omit<Skill, 'id'>[];
  certifications: Omit<Certification, 'id'>[];
  tools: Omit<Tool, 'id'>[];
  projects: Omit<Project, 'id'>[];
  domainExperience: string[];
}

export interface ParsedJobPosting {
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  seniority: string;
  domain: string;
  location?: string;
  salary?: string;
}

// API Types
export interface AIGenerateOptions {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIGenerateObjectOptions<T> extends AIGenerateOptions {
  schema: any; // Zod schema
}

export interface RorkToolDefinition<T = any> {
  description: string;
  schema: any; // Zod schema
  execute: (input: T) => Promise<any>;
}

export interface RorkAgentOptions {
  tools: Record<string, RorkToolDefinition>;
  systemPrompt?: string;
}

export interface RorkAgentInterface {
  messages: Message[];
  error: Error | null;
  isLoading: boolean;
  sendMessage: (message: { text: string }) => Promise<void>;
  setMessages: (updater: (prev: Message[]) => Message[]) => void;
}

// Storage Types
export interface StorageKeys {
  PROFILE: string;
  QA_HISTORY: string;
  JOBS: string;
  SETTINGS: string;
}

export interface ValidationResult {
  success: boolean;
  data?: any;
  errors?: Array<{ message: string }>;
}

// Configuration Types
export interface UploadConfig {
  MAX_FILE_SIZE: number;
  ALLOWED_TYPES: string[];
  ALLOWED_EXTENSIONS: string[];
}

export interface AIConfig {
  DEFAULT_MODEL: string;
  TEMPERATURE: number;
  MAX_TOKENS: number;
  TIMEOUT: number;
}

export interface ScoreWeights {
  experienceAlignment: number;
  technicalSkillMatch: number;
  domainRelevance: number;
  stageCulturalFit: number;
  impactPotential: number;
}

// Context Types
export interface UserProfileContextValue {
  profile: UserProfile;
  qaHistory: QAItem[];
  jobPostings: JobPosting[];
  updateProfile: (updates: Partial<UserProfile>) => void;
  addQA: (qa: QAItem) => void;
  addJobPosting: (job: JobPosting) => void;
  clearAllData: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
}

// Utility Types
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

// Export all types
export type {
  Experience,
  Skill,
  Certification,
  Tool,
  Project,
  ClarifyingAnswer,
  UserProfile,
  JobPosting,
  QAItem,
  FitScore,
  MessagePart,
  Message,
  UploadFile,
  UploadProgress,
  Question,
  QuickReply,
  ParsedResume,
  ParsedJobPosting,
  AIGenerateOptions,
  AIGenerateObjectOptions,
  RorkToolDefinition,
  RorkAgentOptions,
  RorkAgentInterface,
  StorageKeys,
  ValidationResult,
  UploadConfig,
  AIConfig,
  ScoreWeights,
  UserProfileContextValue,
};
