/**
 * Zod Schemas
 * Validation schemas for data structures
 */

import { z } from 'zod';

/**
 * Experience schema
 */
export const experienceSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  company: z.string().min(1, 'Company is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().optional(),
  current: z.boolean().default(false),
  description: z.string().min(1, 'Description is required'),
  achievements: z.array(z.string()).default([]),
});

/**
 * Skill schema
 */
export const skillSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Skill name is required'),
  category: z.string().default('General'),
});

/**
 * Certification schema
 */
export const certificationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Certification name is required'),
  issuer: z.string().min(1, 'Issuer is required'),
  date: z.string().min(1, 'Date is required'),
});

/**
 * Tool schema
 */
export const toolSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Tool name is required'),
  category: z.string().default('General'),
});

/**
 * Project schema
 */
export const projectSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Project title is required'),
  description: z.string().min(1, 'Description is required'),
  technologies: z.array(z.string()).default([]),
  url: z.string().url().optional(),
});

/**
 * User profile schema
 */
export const userProfileSchema = z.object({
  experience: z.array(experienceSchema).default([]),
  skills: z.array(skillSchema).default([]),
  certifications: z.array(certificationSchema).default([]),
  tools: z.array(toolSchema).default([]),
  projects: z.array(projectSchema).default([]),
  domainExperience: z.array(z.string()).default([]),
  notes: z.array(z.string()).default([]),
  achievements: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  clarifyingAnswers: z.record(z.object({
    question: z.string(),
    answer: z.string(),
    category: z.string(),
    timestamp: z.string(),
  })).default({}),
  workStyles: z.array(z.string()).default([]),
  preferences: z.record(z.string()).default({}),
  resumeBullets: z.array(z.string()).default([]),
});

/**
 * Resume parsing schema (for AI extraction)
 */
export const resumeParseSchema = z.object({
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      current: z.boolean(),
      description: z.string(),
      achievements: z.array(z.string()),
    })
  ),
  skills: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string(),
      issuer: z.string(),
      date: z.string(),
    })
  ),
  tools: z.array(
    z.object({
      name: z.string(),
      category: z.string(),
    })
  ),
  projects: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
    })
  ),
  domainExperience: z.array(z.string()),
});

/**
 * Job posting schema
 */
export const jobPostingSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Job title is required'),
  company: z.string().min(1, 'Company is required'),
  description: z.string().min(1, 'Description is required'),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  seniority: z.string().default('mid'),
  domain: z.string().default('Technology'),
  location: z.string().optional(),
  salary: z.string().optional(),
  timestamp: z.string(),
});

/**
 * QA item schema
 */
export const qaItemSchema = z.object({
  id: z.string(),
  question: z.string().min(1, 'Question is required'),
  answer: z.string().min(1, 'Answer is required'),
  timestamp: z.string(),
  category: z.string().optional(),
  options: z.array(z.string()).optional(),
  askedInContext: z.string().optional(),
});

/**
 * Fit score schema
 */
export const fitScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  experienceAlignment: z.number().min(0).max(100),
  technicalSkillMatch: z.number().min(0).max(100),
  domainRelevance: z.number().min(0).max(100),
  stageCulturalFit: z.number().min(0).max(100),
  impactPotential: z.number().min(0).max(100),
  rationale: z.object({
    experienceAlignment: z.string(),
    technicalSkillMatch: z.string(),
    domainRelevance: z.string(),
    stageCulturalFit: z.string(),
    impactPotential: z.string(),
  }),
});

/**
 * Message schema
 */
export const messageSchema = z.object({
  id: z.string(),
  role: z.enum(['user', 'assistant', 'system']),
  parts: z.array(z.object({
    type: z.enum(['text', 'image', 'file']),
    text: z.string().optional(),
    imageUrl: z.string().optional(),
    fileUrl: z.string().optional(),
  })),
  timestamp: z.string().optional(),
});

/**
 * Upload file schema
 */
export const uploadFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  uri: z.string().min(1, 'File URI is required'),
  type: z.string().optional(),
  size: z.number().optional(),
});

/**
 * Question schema
 */
export const questionSchema = z.object({
  id: z.string(),
  text: z.string().min(1, 'Question text is required'),
  category: z.string(),
  options: z.array(z.string()).min(1, 'At least one option is required'),
  timestamp: z.string(),
});

/**
 * Validate data against schema
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to validate
 * @returns {Object} Validation result with success flag and data/errors
 */
export function validateData(schema, data) {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    return { 
      success: false, 
      errors: error.errors || [{ message: error.message }] 
    };
  }
}

/**
 * Safe parse data
 * @param {z.ZodSchema} schema - Zod schema
 * @param {any} data - Data to parse
 * @returns {Object} Parse result
 */
export function safeParse(schema, data) {
  return schema.safeParse(data);
}
