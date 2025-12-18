import { Alert } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";
import { z } from "zod";
import { verifyAndCleanResumeExtraction } from "./sourceOfTruth";
import { validateResumeTextBeforeParsing } from "./resumeTextExtractor";

const experienceItemSchema = z.object({
  title: z.string().min(1, "Experience title is required"),
  company: z.string().min(1, "Company name is required"),
  startDate: z.string().optional().default(""),
  endDate: z.string().optional().default(""),
  current: z.boolean().optional().default(false),
  description: z.string().optional().default(""),
  achievements: z.array(z.string()).optional().default([]),
});

const skillItemSchema = z.object({
  name: z.string().min(1, "Skill name is required"),
  category: z.string().optional().default("General"),
});

const certificationItemSchema = z.object({
  name: z.string().min(1, "Certification name is required"),
  issuer: z.string().optional().default(""),
  date: z.string().optional().default(""),
});

const toolItemSchema = z.object({
  name: z.string().min(1, "Tool name is required"),
  category: z.string().optional().default("General"),
});

const projectItemSchema = z.object({
  title: z.string().min(1, "Project title is required"),
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

export async function parseResumeText(
  input: string
): Promise<ResumeData> {
  console.log("[parseResume] === START PARSE FUNCTION ===");
  console.log("[parseResume] Input text length:", input.length);
  console.log("[parseResume] First 300 chars:", input.slice(0, 300));

  validateResumeTextBeforeParsing(input);
  
  console.log("[parseResume] Pre-parse validation passed");

  const systemPrompt = `You are a STRICT and THOROUGH resume parser.

SOURCE OF TRUTH:
- Your ONLY source of truth is the resume text between <<<RESUME>>> and <<<END_RESUME>>>.
- You are FORBIDDEN from using any external memory, prior chats, user profiles, or assumptions.

CRITICAL METADATA RULE:
- You MUST ignore document metadata (file names, PDF info fields, document properties).
- Only parse content that would be visible on the page to a human reader.
- If you see PDF structure, object markers, or file metadata, DO NOT extract it.

HALLUCINATION RULE:
- Do NOT invent or infer any job, company, title, date, skill, tool, certification, project, domain, or achievement that is not explicitly in the visible resume text.

THOROUGHNESS RULE:
- Extract as much as you can from what is actually written in the visible content.
- If the resume clearly contains work history, you MUST return at least 1 experience entry.
- If the resume clearly lists skills or technologies, you MUST return them.

OUTPUT:
Return ONE valid JSON object ONLY (no markdown, no backticks) with this shape:

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

Rules for missing values:
- Use "" for unknown strings, [] for unknown arrays.
- For current roles: current=true and endDate="".
- Do not include null/undefined.`;

  console.log("[parseResume] Calling AI with text content...");
  const userContent = `Parse the following resume and extract all information according to the instructions.

<<<RESUME>>>
${input}
<<<END_RESUME>>>`;

  const aiResponse = await generateText({
    messages: [
      { role: "user", content: systemPrompt },
      { role: "user", content: userContent as any }
    ],
  });

  console.log("[parseResume] AI response received");
  let aiText = typeof aiResponse === "string" ? aiResponse : (aiResponse as any)?.text || "";
  aiText = aiText.trim();

  console.log("[parseResume] Raw AI response (first 500 chars):", aiText.slice(0, 500));

  if (aiText.startsWith("```")) {
    console.log("[parseResume] Stripping markdown fences...");
    aiText = aiText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(aiText);
    console.log("[parseResume] JSON.parse succeeded");
  } catch {
    console.error("[parseResume] JSON.parse failed, attempting to extract first JSON object...");
    const match = aiText.match(/\{[\s\S]*\}/);
    if (match) {
      parsed = JSON.parse(match[0]);
      console.log("[parseResume] Extracted and parsed JSON object from response");
    } else {
      throw new Error("Could not parse AI response as JSON");
    }
  }

  if (!parsed || typeof parsed !== "object") {
    console.error("[parseResume] Parsed result is not an object:", parsed);
    throw new Error("AI returned invalid response");
  }

  console.log("[parseResume] Parsed object keys:", Object.keys(parsed));
  console.log("[parseResume] Parsed data preview:", JSON.stringify(parsed, null, 2).slice(0, 500));

  console.log("[parseResume] Validating with Zod schema...");
  const validationResult = resumeSchema.safeParse(parsed);
  
  if (!validationResult.success) {
    console.warn("[parseResume] Zod validation failed:", validationResult.error);
    console.warn("[parseResume] Validation errors:", JSON.stringify(validationResult.error.issues, null, 2));
  }

  const validated: ResumeData = validationResult.success 
    ? validationResult.data 
    : {
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
        tools: Array.isArray(parsed.tools) ? parsed.tools : [],
        projects: Array.isArray(parsed.projects) ? parsed.projects : [],
        domainExperience: Array.isArray(parsed.domainExperience) ? parsed.domainExperience : [],
      };

  console.log("[parseResume] Pre-verification counts:", {
    experience: validated.experience?.length || 0,
    skills: validated.skills?.length || 0,
    tools: validated.tools?.length || 0,
    certifications: validated.certifications?.length || 0,
    projects: validated.projects?.length || 0,
    domainExperience: validated.domainExperience?.length || 0,
  });

  console.log("[parseResume] Running verification against resume source...");
  const verified = verifyAndCleanResumeExtraction(input, validated);

  const isNonTrivialResume = input.trim().length > 400;
  const nothingExtracted =
    verified.experience.length === 0 &&
    verified.skills.length === 0 &&
    verified.tools.length === 0 &&
    verified.certifications.length === 0 &&
    verified.projects.length === 0 &&
    verified.domainExperience.length === 0;

  if (isNonTrivialResume && nothingExtracted) {
    console.error("[parseResume] SANITY CHECK FAILED: Non-trivial resume but nothing extracted");
    console.error("[parseResume] Resume length:", input.length);
    console.error("[parseResume] Resume preview:", input.slice(0, 500));
    throw new Error(
      "Failed to extract any information from the resume. The resume may be in an unsupported format or the content could not be parsed."
    );
  }

  console.log("[parseResume] === END PARSE FUNCTION ===");
  console.log("[parseResume] Final verified counts:", {
    experience: verified.experience.length,
    skills: verified.skills.length,
    tools: verified.tools.length,
    certifications: verified.certifications.length,
    projects: verified.projects.length,
    domainExperience: verified.domainExperience.length,
  });

  return verified;
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
