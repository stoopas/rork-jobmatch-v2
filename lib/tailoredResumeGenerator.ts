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
TEMPLATE MODE CONSTRAINTS (CRITICAL - MUST FOLLOW EXACTLY):
You are generating content to fit within an existing resume template that MUST stay on 1 page.

- Has summary section: ${fp.hasSummary}
- Section order: ${fp.sectionOrder.join(" → ")}
- Experience entries: EXACTLY ${fp.experience.length} (do NOT add or remove entries)

PER-ENTRY BULLET CONSTRAINTS (STRICT):
${fp.experience.map((exp, idx) => `  Entry ${idx + 1}: EXACTLY ${exp.bulletCount} bullets
    Character limits per bullet: ${exp.bulletCharBudgets.map((budget, i) => `#${i + 1}: ${budget} chars`).join(", ")}`).join('\n')}

CRITICAL RULES:
1. Each bullet MUST be under its character budget (hard limit)
2. DO NOT add more bullets than specified - ${fp.experience.reduce((sum, e) => sum + e.bulletCount, 0)} total bullets maximum
3. DO NOT add sections the template doesn't have
4. Prioritize the most relevant experiences from the profile
5. If profile has more experiences than template slots, choose the most relevant ${fp.experience.length} for this job
6. Use concise, impactful language to stay within character budgets
7. Remove filler words ("responsible for", "helped to", etc.) to save space
`;
  } else {
    prompt += `
STANDARD MODE:
- Generate a clean, ATS-friendly one-page resume
- Use 3-4 bullet points per experience entry (max 5 for most relevant)
- Keep bullets concise (80-110 characters each, max 120)
- Total resume should fit on 1 page when rendered
- Prioritize quality and impact over quantity
- Select the 2-3 most relevant experiences for this job
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
  console.log("[tailoredResumeGenerator] Bullet counts per entry:", parsed.experience?.map((e: any) => e.bullets?.length || 0) || []);
  console.log("[tailoredResumeGenerator] Skills count:", Object.keys(parsed.skills || {}).length);

  if (options.mode === "template" && options.templateFingerprint) {
    const fp = options.templateFingerprint;
    if (parsed.experience?.length > fp.experience.length) {
      console.warn(`[tailoredResumeGenerator] WARNING: Generated ${parsed.experience.length} experiences but template has ${fp.experience.length}. Trimming to fit.`);
      parsed.experience = parsed.experience.slice(0, fp.experience.length);
    }
    
    parsed.experience?.forEach((exp: any, idx: number) => {
      const templateEntry = fp.experience[idx];
      if (!templateEntry) return;
      
      if (exp.bullets.length > templateEntry.bulletCount) {
        console.warn(`[tailoredResumeGenerator] WARNING: Entry ${idx + 1} has ${exp.bullets.length} bullets but template has ${templateEntry.bulletCount}. Trimming.`);
        exp.bullets = exp.bullets.slice(0, templateEntry.bulletCount);
      }
      
      exp.bullets = exp.bullets.map((bullet: string, bulletIdx: number) => {
        const charBudget = templateEntry.bulletCharBudgets[bulletIdx];
        if (charBudget && bullet.length > charBudget) {
          console.warn(`[tailoredResumeGenerator] WARNING: Entry ${idx + 1}, bullet ${bulletIdx + 1} is ${bullet.length} chars but budget is ${charBudget}. Truncating.`);
          return bullet.slice(0, charBudget - 3) + "...";
        }
        return bullet;
      });
    });
  }

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

  if (__DEV__) {
    console.log("[tailoredResumeGenerator] Final output stats:");
    console.log("  - Mode:", options.mode);
    console.log("  - Experience entries:", result.experience.length);
    console.log("  - Total bullets:", result.experience.reduce((sum, e) => sum + e.bullets.length, 0));
    console.log("  - Skills:", (result.skills.core?.length || 0) + (result.skills.tools?.length || 0));
  }

  console.log("[tailoredResumeGenerator] Generation complete");
  return result;
}
