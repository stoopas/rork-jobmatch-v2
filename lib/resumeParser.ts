import { Alert } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

export const resumeSchema = z.object({
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      startDate: z.string(),
      endDate: z.string().transform(val => val || ""),
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

export type ResumeData = z.infer<typeof resumeSchema>;

export async function parseResumeText(resumeText: string): Promise<ResumeData> {
  console.log("[parseResume] === START PARSE FUNCTION ===");
  console.log("[parseResume] Parsing resume with AI via generateText...");
  console.log("[parseResume] Resume text length:", resumeText.length);

  const prompt = `You are a STRICT resume parser.

Your ONLY source of truth is the resume text provided below.

You MUST follow these rules:

1. You are FORBIDDEN from using any information not explicitly present in the resume text.
2. Ignore all prior conversations, chat history, user profiles, or external memory.
3. Do NOT invent, infer, or hallucinate any jobs, companies, dates, skills, tools, projects, domains, or achievements.
4. If a job, company, skill, tool, project, certification, or domain is not clearly mentioned in the resume text, you MUST NOT include it.
5. Do NOT guess based on job titles alone. Only include skills/tools/technologies if they are explicitly named in the resume.
6. If something is missing or ambiguous, return an empty string or empty array for that field.
7. You MUST return a single JSON object that matches EXACTLY this schema:

{
  "experience": [{
    "title": "string",
    "company": "string",
    "startDate": "string",
    "endDate": "string (use empty string \"\" for current positions)",
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
- Do not include comments in the JSON.
- Do not include undefined or null values - use empty strings or empty arrays instead.
- For current positions, set "current": true and "endDate": "" (empty string).
- For past positions, set "current": false and provide "endDate" as a non-empty string.
- Return ONLY the JSON object - no explanation, no markdown fences, no backticks, no extra text.

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
      throw new Error("Parsed resume does not match expected schema");
    }

    console.log("[parseResume] === VALIDATION SUCCEEDED ===");
    console.log("[parseResume] Returning validated data with:");
    console.log("[parseResume] - experience count:", validated.data.experience.length);
    console.log("[parseResume] - skills count:", validated.data.skills.length);
    console.log("[parseResume] - certifications count:", validated.data.certifications.length);
    console.log("[parseResume] - tools count:", validated.data.tools.length);
    console.log("[parseResume] - projects count:", validated.data.projects.length);
    console.log("[parseResume] === END PARSE FUNCTION ===");
    return validated.data as ResumeData;
  } catch (err: any) {
    console.error("[parseResume] Error parsing resume with generateText:", err?.message ?? err, err?.stack ?? err);
    throw err;
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
