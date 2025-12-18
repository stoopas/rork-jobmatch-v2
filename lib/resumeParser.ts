import { Alert } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { parseResumeText as fallbackParseResumeText, validateParsedResume } from "../parsers/resume-parser";

const experienceItemSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  current: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
  achievements: z.array(z.string()).optional().default([]),
});

const skillItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default("General"),
});

const certificationItemSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional().default(""),
  date: z.string().optional().default(""),
});

const toolItemSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().default("General"),
});

const projectItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().default(""),
  technologies: z.array(z.string()).optional().default([]),
});

export const resumeSchema = z.object({
  experience: z.array(experienceItemSchema).optional().default([]),
  skills: z.array(skillItemSchema).optional().default([]),
  certifications: z.array(certificationItemSchema).optional().default([]),
  tools: z.array(toolItemSchema).optional().default([]),
  projects: z.array(projectItemSchema).optional().default([]),
  domainExperience: z.array(z.string()).optional().default([]),
});

export type ResumeData = z.infer<typeof resumeSchema>;

function coerceResumeData(raw: any): ResumeData {
  console.log("[coerceResumeData] Starting coercion...");
  const safeArray = (value: any) => (Array.isArray(value) ? value : []);

  const experience = safeArray(raw?.experience)
    .map((item: any) => ({
      title: String(item?.title || "").trim(),
      company: String(item?.company || "").trim(),
      startDate: String(item?.startDate || ""),
      endDate: String(item?.endDate || ""),
      current: typeof item?.current === "boolean" ? item.current : false,
      description: String(item?.description || ""),
      achievements: safeArray(item?.achievements).map((a: any) => String(a || "")),
    }))
    .filter((item: any) => item.title && item.company);
  console.log("[coerceResumeData] Coerced experience count:", experience.length);

  const skills = safeArray(raw?.skills)
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      category: String(item?.category || "General").trim(),
    }))
    .filter((item: any) => item.name);
  console.log("[coerceResumeData] Coerced skills count:", skills.length);

  const certifications = safeArray(raw?.certifications)
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      issuer: String(item?.issuer || ""),
      date: String(item?.date || ""),
    }))
    .filter((item: any) => item.name);
  console.log("[coerceResumeData] Coerced certifications count:", certifications.length);

  const tools = safeArray(raw?.tools)
    .map((item: any) => ({
      name: String(item?.name || "").trim(),
      category: String(item?.category || "General").trim(),
    }))
    .filter((item: any) => item.name);
  console.log("[coerceResumeData] Coerced tools count:", tools.length);

  const projects = safeArray(raw?.projects)
    .map((item: any) => ({
      title: String(item?.title || "").trim(),
      description: String(item?.description || ""),
      technologies: safeArray(item?.technologies).map((t: any) => String(t || "")),
    }))
    .filter((item: any) => item.title);
  console.log("[coerceResumeData] Coerced projects count:", projects.length);

  const domainExperience = safeArray(raw?.domainExperience)
    .map((d: any) => String(d || ""))
    .filter((d: string) => !!d);
  console.log("[coerceResumeData] Coerced domain experience count:", domainExperience.length);

  const candidate = {
    experience,
    skills,
    certifications,
    tools,
    projects,
    domainExperience,
  };

  console.log("[coerceResumeData] Final validation with resumeSchema.parse...");
  const final = resumeSchema.parse(candidate);
  console.log("[coerceResumeData] Coercion succeeded");
  return final;
}

export async function parseResumeText(resumeText: string): Promise<ResumeData> {
  console.log("[parseResume] === START PARSE FUNCTION ===");
  console.log("[parseResume] Parsing resume with AI via generateText...");
  console.log("[parseResume] Resume text length:", resumeText.length);

  const prompt = `You are a STRICT and THOROUGH resume parser.

Your ONLY source of truth is the resume text provided below. You MUST NOT use any external memory, prior chats, or assumptions beyond this text.

YOUR JOB:
Carefully read the resume and extract AS MUCH structured information as you reliably can, without guessing about things that are not present.

RULES ABOUT SOURCE OF TRUTH:
1. You are FORBIDDEN from using any information not explicitly present in the resume text.
2. Ignore all prior conversations, chat history, user profiles, or external memory.
3. Do NOT invent, infer, or hallucinate any jobs, companies, dates, skills, tools, projects, domains, or achievements that are not clearly supported by the resume text.

RULES ABOUT EXTRACTION QUALITY:
4. Be AGGRESSIVE in extracting real information from the resume:
   - Identify WORK EXPERIENCE sections (e.g., headings like "Experience", "Work History", "Professional Experience").
   - For each job, extract:
     - "title" (job title)
     - "company" (employer)
     - "startDate" and "endDate" (years or month+year when visible)
     - "current" (true if clearly marked as present/current; otherwise false)
     - "description" (short summary of the role)
     - "achievements" (a list of bullet points or key accomplishments for that role).
   - Identify SKILLS sections ("Skills", "Technical Skills", etc.) and extract each listed skill as a separate item.
   - Identify TOOLS/TECHNOLOGIES mentioned throughout the resume (especially in skills and experience bullets) and list them in "tools".
   - Identify PROJECTS sections (or clearly described project work) and extract project entries.
   - Identify DOMAIN EXPERIENCE (industries, verticals, or business domains such as "Fintech", "Healthcare", "E-commerce", "Airlines", etc.).

5. Do NOT return empty arrays when the resume clearly contains that type of information:
   - If the resume has job entries, "experience" MUST contain at least one object.
   - If the resume has a skills section, "skills" MUST contain entries.
   - If the resume mentions any tools or technologies by name, "tools" MUST contain entries.
   - If the resume mentions any projects or domain/industry terms, "projects" or "domainExperience" should reflect that.

6. If some fields of an item are missing (e.g., no end date, no achievements):
   - Include the item anyway, and use:
     - Empty strings "" for unknown string fields.
     - Empty arrays [] for unknown list fields.
   - OMIT fields only when they truly cannot be inferred from the resume text.

OUTPUT SCHEMA:

You MUST return a single JSON object with this shape (fields may be omitted if unknown, but when present they must follow this structure):

{
  "experience": [{
    "title": "string",
    "company": "string",
    "startDate": "string",
    "endDate": "string",
    "current": boolean,
    "description": "string",
    "achievements": ["string"]
  }],
  "skills": [{ "name": "string", "category": "string" }],
  "certifications": [{ "name": "string", "issuer": "string", "date": "string" }],
  "tools": [{ "name": "string", "category": "string" }],
  "projects": [{ "title": "string", "description": "string", "technologies": ["string"] }],
  "domainExperience": ["string"]
}

JSON REQUIREMENTS:
- The JSON must be strictly valid and directly parseable by JSON.parse in JavaScript.
- Do NOT include comments in the JSON.
- Do NOT include undefined or null values; use empty strings "" or empty arrays [] instead.
- For current positions, set "current": true and "endDate": "" (empty string).
- For past positions, set "current": false and provide a non-empty "endDate" if it appears in the text.
- Return ONLY the JSON object — no explanation, no markdown fences, no backticks, and no extra text.

RESUME TEXT (your ONLY source of truth):

<<<RESUME>>>
${resumeText}
<<<END_RESUME>>>
`;

  try {
    console.log("[parseResume] About to call generateText...");
    console.log("[parseResume] generateText type:", typeof generateText);
    console.log("[parseResume] generateText is function:", typeof generateText === 'function');

    let aiText: string = "";
    try {
      console.log("[parseResume] Calling generateText with messages array format...");
      const aiResponse = await generateText({
        messages: [{ role: "user", content: prompt }],
      });
      console.log("[parseResume] generateText call completed");
      console.log("[parseResume] aiResponse type:", typeof aiResponse);
      console.log("[parseResume] aiResponse is null/undefined:", aiResponse == null);

      if (typeof aiResponse === "string") {
        console.log("[parseResume] aiResponse is string");
        aiText = aiResponse;
      } else if (aiResponse && typeof aiResponse === "object") {
        console.log("[parseResume] aiResponse is object, keys:", Object.keys(aiResponse));
        aiText = (aiResponse as any).text || (aiResponse as any).content || JSON.stringify(aiResponse);
      } else {
        console.log("[parseResume] aiResponse is neither string nor object");
        aiText = String(aiResponse || "");
      }

      console.log("[parseResume] generateText returned, type:", typeof aiText);
      console.log("[parseResume] aiText length:", aiText?.length);
    } catch (genErr: any) {
      console.error("[parseResume] generateText threw error:", genErr?.message ?? genErr, genErr?.stack ?? genErr);
      throw new Error(`AI generation failed: ${genErr?.message ?? "Unknown error"}`);
    }

    if (!aiText || typeof aiText !== "string") {
      console.error("[parseResume] generateText returned non-string or empty:", typeof aiText, aiText);
      throw new Error("AI returned no textual content");
    }

    aiText = aiText.trim();
    console.log("[parseResume] aiText preview (first 300 chars):", aiText.slice(0, 300).replace(/\n/g, " "));

    if (aiText.startsWith("```")) {
      aiText = aiText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(aiText);
    } catch {
      const match = aiText.match(/\{[\s\S]*\}$/m);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          console.error("[parseResume] JSON.parse failed after extraction:", innerErr, "aiText:", aiText);
          throw new Error("Failed to parse JSON from AI response");
        }
      } else {
        console.error("[parseResume] JSON.parse failed and no JSON found in AI response:", aiText);
        throw new Error("AI did not return JSON");
      }
    }

    console.log("[parseResume] About to validate with zod...");
    console.log("[parseResume] Parsed object:", JSON.stringify(parsed, null, 2).slice(0, 500));
    const validated = resumeSchema.safeParse(parsed);
    if (!validated.success) {
      console.error("[parseResume] Parsed JSON failed schema validation:", validated.error);
      console.error("[parseResume] Parsed object keys:", Object.keys(parsed || {}));
      console.error("[parseResume] validation.error.issues:", JSON.stringify(validated.error.issues, null, 2));

      console.log("[parseResume] Attempting to coerce parsed data into ResumeData...");
      try {
        const coerced = coerceResumeData(parsed);
        console.log("[parseResume] Coercion succeeded with:", {
          experienceCount: coerced.experience.length,
          skillsCount: coerced.skills.length,
          toolsCount: coerced.tools.length,
          certificationsCount: coerced.certifications.length,
          projectsCount: coerced.projects.length,
        });
        console.log("[parseResume] === END PARSE FUNCTION WITH COERCED DATA ===");
        return coerced;
      } catch (coerceErr) {
        console.error("[parseResume] Coercion also failed:", coerceErr);
        throw new Error("Parsed resume does not match expected schema and coercion failed");
      }
    }

    console.log("[parseResume] === VALIDATION SUCCEEDED ===");
    console.log("[parseResume] Returning validated data with:");
    console.log("[parseResume] - experience count:", validated.data.experience.length);
    console.log("[parseResume] - skills count:", validated.data.skills.length);
    console.log("[parseResume] - certifications count:", validated.data.certifications.length);
    console.log("[parseResume] - tools count:", validated.data.tools.length);
    console.log("[parseResume] - projects count:", validated.data.projects.length);

    const data = validated.data;

    const isNonTrivialResume = resumeText.trim().length > 400;
    const nothingExtracted =
      data.experience.length === 0 &&
      data.skills.length === 0 &&
      data.tools.length === 0 &&
      data.certifications.length === 0 &&
      data.projects.length === 0 &&
      data.domainExperience.length === 0;

    if (isNonTrivialResume && nothingExtracted) {
      console.error("[parseResume] Sanity check failed: resume text is non-trivial but no data was extracted");
      console.error("[parseResume] Resume text length:", resumeText.length);
      console.error("[parseResume] Resume preview (first 500 chars):", resumeText.slice(0, 500));
      throw new Error("AI failed to extract any structured data from this resume");
    }

    console.log("[parseResume] === END PARSE FUNCTION ===");
    return data as ResumeData;
  } catch (err: any) {
    console.error("[parseResume] Error parsing resume with generateText:", err?.message ?? err, err?.stack ?? err);
    console.warn("[parseResume] AI-based parsing failed, falling back to heuristic parser...");
    
    try {
      const fallbackRaw = fallbackParseResumeText(resumeText) as any;
      if (!validateParsedResume(fallbackRaw)) {
        console.error("[parseResume] Fallback parser could not validate the resume data");
        throw new Error("Both AI and fallback parsers failed to extract resume data");
      }

      console.log("[parseResume] Fallback parser returned:", {
        experienceCount: fallbackRaw.experience?.length || 0,
        skillsCount: fallbackRaw.skills?.length || 0,
        toolsCount: fallbackRaw.tools?.length || 0,
      });

      const fallbackCandidate = {
        experience: Array.isArray(fallbackRaw.experience) ? fallbackRaw.experience : [],
        skills: Array.isArray(fallbackRaw.skills) ? fallbackRaw.skills : [],
        certifications: Array.isArray(fallbackRaw.certifications) ? fallbackRaw.certifications : [],
        tools: Array.isArray(fallbackRaw.tools) ? fallbackRaw.tools : [],
        projects: Array.isArray(fallbackRaw.projects) ? fallbackRaw.projects : [],
        domainExperience: Array.isArray(fallbackRaw.domainExperience) ? fallbackRaw.domainExperience : [],
      };

      const finalData = resumeSchema.parse(fallbackCandidate);
      console.log("[parseResume] Fallback parser succeeded with:", {
        experienceCount: finalData.experience.length,
        skillsCount: finalData.skills.length,
        toolsCount: finalData.tools.length,
        certificationsCount: finalData.certifications.length,
        projectsCount: finalData.projects.length,
      });
      console.log("[parseResume] === END PARSE FUNCTION WITH FALLBACK DATA ===");
      return finalData;
    } catch (fallbackErr: any) {
      console.error("[parseResume] Fallback parser also failed:", fallbackErr?.message ?? fallbackErr);
      throw new Error(err?.message || "Failed to parse resume");
    }
  }
}

export function showParseSuccessAlert(parsed: ResumeData, onTailorPress: () => void) {
  const experience = parsed?.experience || [];
  const skills = parsed?.skills || [];
  const certifications = parsed?.certifications || [];
  const tools = parsed?.tools || [];
  const projects = parsed?.projects || [];

  Alert.alert(
    "Resume Parsed",
    `Parsed successfully!\n\nExtracted:\n- ${experience.length} experiences\n- ${skills.length} skills\n- ${certifications.length} certifications\n- ${tools.length} tools\n- ${projects.length} projects\n\nWould you like to tailor this resume to a job posting now?`,
    [
      {
        text: "Tailor to Job",
        onPress: onTailorPress,
      },
      { text: "Not Now", style: "cancel" },
    ]
  );
}

if (typeof generateText !== "function") {
  console.warn("[parseResume] Warning: generateText is not a function. Please verify @rork-ai/toolkit-sdk exports generateText in the runtime.");
}
