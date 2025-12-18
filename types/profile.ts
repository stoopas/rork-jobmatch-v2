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
  proficiency?: number;
  source?: 'resume_parse' | 'chat_clarification' | 'manual_entry' | 'inferred';
  confirmedAt?: string;
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
  proficiency?: number;
  source?: 'resume_parse' | 'chat_clarification' | 'manual_entry' | 'inferred';
  confirmedAt?: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeAsset {
  id: string;
  name: string;
  uri: string;
  mimeType?: string;
  uploadedAt: string;
  type: "pdf" | "docx" | "txt" | "unknown";
  extractedText?: string;
  docxBase64?: string;
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
  resumeAssets: ResumeAsset[];
}

export interface QAItem {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
  category?: string;
  options?: string[];
  askedInContext?: string;
}

export interface ClarifyingAnswer {
  question: string;
  answer: string;
  category: string;
  timestamp: string;
  topic?: string;
  proficiencyLevel?: number;
  confirmed?: boolean;
}

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
  timestamp: string;
}

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
  gaps?: {
    missingSkills: string[];
    missingTools: string[];
    missingDomains: string[];
  };
}
