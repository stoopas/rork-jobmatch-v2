import { generateText } from "@rork-ai/toolkit-sdk";
import type { UserProfile, JobPosting } from "../types/profile";

export interface TailoredResumeJson {
  header: {
    name: string;
    location?: string;
    phone?: string;
    email?: string;
    links?: string[];
  };
  summary?: string;
  experience: {
    company: string;
    title: string;
    dates?: string;
    bullets: string[];
  }[];
  skills: {
    core?: string[];
    tools?: string[];
    domains?: string[];
  };
  education?: {
    school: string;
    degree?: string;
    dates?: string;
  }[];
  certifications?: string[];
}

export interface TemplateFingerprint {
  hasSummary: boolean;
  sectionOrder: string[];
  experience: {
    company?: string;
    title?: string;
    bulletCount: number;
    bulletCharBudgets: number[];
  }[];
  totalCharBudget: number;
}

export interface GenerateResumeOptions {
  mode: "standard" | "template";
  templateFingerprint?: TemplateFingerprint;
  enforceOnePage: boolean;
}

export async function generateTailoredResumeJson(
  profile: UserProfile,
  job: JobPosting,
  extractedResumeText: string,
  options: GenerateResumeOptions
): Promise<TailoredResumeJson> {
  console.log("[tailoredResumeGenerator] Starting generation");
  console.log("[tailoredResumeGenerator] Mode:", options.mode);
  console.log("[tailoredResumeGenerator] Enforce one page:", options.enforceOnePage);

  const profileSummary = {
    experience: profile.experience.map((exp) => ({
      title: exp.title,
      company: exp.company,
      startDate: exp.startDate,
      endDate: exp.endDate,
      current: exp.current,
      description: exp.description,
      achievements: exp.achievements,
    })),
    skills: profile.skills.map((s) => s.name),
    tools: profile.tools.map((t) => t.name),
    certifications: profile.certifications.map((c) => ({
      name: c.name,
      issuer: c.issuer,
      date: c.date,
    })),
    domainExperience: profile.domainExperience,
  };

  const jobRequirements = {
    title: job.title,
    company: job.company,
    requiredSkills: job.requiredSkills,
    preferredSkills: job.preferredSkills,
    responsibilities: job.responsibilities,
    seniority: job.seniority,
    domain: job.domain,
  };

  let prompt = `You are an expert resume writer. Generate a tailored resume in JSON format for this job posting.

CRITICAL SOURCE-OF-TRUTH RULE:
- Your ONLY sources are:
  1. The candidate profile below (verified from resume + user answers)
  2. The job posting requirements
- You MUST NOT invent or add ANY experiences, companies, roles, or skills that are not in the candidate profile.
- Only rearrange, highlight, and tailor existing content to match the job.

Candidate Profile:
${JSON.stringify(profileSummary, null, 2)}

Job Posting:
${JSON.stringify(jobRequirements, null, 2)}

Clarifying Answers:
${Object.entries(profile.clarifyingAnswers).map(([key, answer]) => `${key}: ${answer.answer}`).join('\n')}

Source Resume Text (for reference on phrasing):
${extractedResumeText.slice(0, 2000)}

`;

  if (options.mode === "template" && options.templateFingerprint) {
    const fp = options.templateFingerprint;
    prompt += `
TEMPLATE MODE CONSTRAINTS:
You must generate content that fits within the template structure:
- Has summary section: ${fp.hasSummary}
- Section order: ${fp.sectionOrder.join(", ")}
- Experience entries: ${fp.experience.length} (match this count if possible)
- Per-entry bullet constraints:
${fp.experience.map((exp, idx) => `  Entry ${idx + 1}: ${exp.bulletCount} bullets, character budgets: ${exp.bulletCharBudgets.join(", ")}`).join('\n')}
- Total character budget: ~${fp.totalCharBudget}

IMPORTANT:
- Keep each bullet under its character budget
- Do NOT add more bullets than the template has
- Do NOT add sections the template doesn't have
- Prioritize the most relevant experiences and skills to fit the template
`;
  } else {
    prompt += `
STANDARD MODE:
- Generate a clean, ATS-friendly one-page resume
- Use 3-5 bullet points per experience entry
- Keep bullets concise (under 120 characters each)
- Prioritize relevance to the job posting
- Include only the most impactful and relevant content
`;
  }

  prompt += `
OUTPUT FORMAT:
Return ONLY valid JSON (no markdown, no backticks) with this exact structure:

{
  "header": {
    "name": "Candidate Name",
    "location": "City, State",
    "phone": "phone number",
    "email": "email",
    "links": ["LinkedIn", "Portfolio", etc.]
  },
  "summary": "Optional brief summary (2-3 sentences) if template includes it",
  "experience": [
    {
      "company": "Company Name",
      "title": "Job Title",
      "dates": "Start - End",
      "bullets": ["achievement 1", "achievement 2", ...]
    }
  ],
  "skills": {
    "core": ["skill1", "skill2", ...],
    "tools": ["tool1", "tool2", ...],
    "domains": ["domain1", "domain2", ...]
  },
  "education": [
    {
      "school": "University Name",
      "degree": "Degree Name",
      "dates": "Graduation Date"
    }
  ],
  "certifications": ["cert1", "cert2", ...]
}

RULES:
1. Use ONLY experiences from the candidate profile
2. Extract header info from the resume text if available
3. Tailor bullet points to highlight relevance to the job
4. Keep content concise and impactful
5. Prioritize quality over quantity
6. Do NOT invent experiences, companies, or roles
`;

  console.log("[tailoredResumeGenerator] Calling AI...");
  const aiResponse = await generateText({
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  console.log("[tailoredResumeGenerator] AI response received");
  let aiText = typeof aiResponse === "string" ? aiResponse : (aiResponse as any)?.text || "";
  aiText = aiText.trim();

  console.log("[tailoredResumeGenerator] Raw response (first 500 chars):", aiText.slice(0, 500));

  if (aiText.startsWith("```")) {
    console.log("[tailoredResumeGenerator] Stripping markdown fences...");
    aiText = aiText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(aiText);
    console.log("[tailoredResumeGenerator] JSON.parse succeeded");
  } catch {
    console.error("[tailoredResumeGenerator] JSON.parse failed, attempting to extract...");
    const match = aiText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
      console.log("[tailoredResumeGenerator] Extracted and parsed JSON");
    } else {
      throw new Error("Could not parse AI response as JSON");
    }
  }

  console.log("[tailoredResumeGenerator] Generated resume preview:");
  console.log("[tailoredResumeGenerator] Experience count:", parsed.experience?.length || 0);
  console.log("[tailoredResumeGenerator] Skills count:", Object.keys(parsed.skills || {}).length);

  const result: TailoredResumeJson = {
    header: parsed.header || {
      name: "Candidate",
      email: "",
    },
    summary: parsed.summary,
    experience: Array.isArray(parsed.experience) ? parsed.experience : [],
    skills: parsed.skills || {},
    education: Array.isArray(parsed.education) ? parsed.education : undefined,
    certifications: Array.isArray(parsed.certifications) ? parsed.certifications : undefined,
  };

  if (result.experience.some((exp) => !profileSummary.experience.some((pExp) => 
    pExp.company.toLowerCase() === exp.company.toLowerCase()
  ))) {
    console.warn("[tailoredResumeGenerator] WARNING: Generated experience contains companies not in profile");
  }

  console.log("[tailoredResumeGenerator] Generation complete");
  return result;
}
