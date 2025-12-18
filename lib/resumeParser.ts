import { Alert } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

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

  const prompt = `You are an expert resume parser. Parse the resume text below and extract all information into structured JSON.

**CRITICAL RULES:**

1. ONLY use information that is explicitly written in the resume text below. Do NOT use any external knowledge, prior conversations, or assumptions.

2. Extract ALL of the following from the resume:
   - Work experience (job titles, companies, dates, descriptions, achievements)
   - Skills (programming languages, frameworks, methodologies, soft skills)
   - Tools and technologies (software, platforms, tools mentioned)
   - Certifications (degrees, certificates, licenses)
   - Projects (personal or professional projects mentioned)
   - Domain experience (industries, sectors, business areas)

3. For skills and tools:
   - Include ANY technology, tool, framework, language, or skill explicitly mentioned
   - Include tools mentioned in job descriptions (e.g., "used Python", "worked with AWS")
   - Categorize appropriately (e.g., "Programming", "Cloud", "Data", "Design", "Management")

4. For experience:
   - Extract company name, job title, dates (approximate if needed like "2020" or "2020-2022")
   - Include key responsibilities and achievements
   - Set "current": true for present/current roles, false otherwise
   - For current roles, set "endDate": "" (empty string)

5. For dates: Extract in any format mentioned (YYYY, MM/YYYY, Month YYYY, etc.)

6. If a field is truly not mentioned in the resume, use "" (empty string) or [] (empty array)

**OUTPUT FORMAT:**

Return ONLY a valid JSON object with this exact structure:

{
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "startDate": "2020-01",
      "endDate": "2022-06",
      "current": false,
      "description": "Brief summary of role",
      "achievements": ["Achievement 1", "Achievement 2"]
    }
  ],
  "skills": [
    { "name": "JavaScript", "category": "Programming" },
    { "name": "Project Management", "category": "Management" }
  ],
  "certifications": [
    { "name": "Certification Name", "issuer": "Issuing Organization", "date": "2021" }
  ],
  "tools": [
    { "name": "VS Code", "category": "Development" },
    { "name": "AWS", "category": "Cloud" }
  ],
  "projects": [
    {
      "title": "Project Name",
      "description": "Project description",
      "technologies": ["React", "Node.js"]
    }
  ],
  "domainExperience": ["E-commerce", "FinTech", "Healthcare"]
}

**IMPORTANT:**
- Return ONLY the JSON object
- No markdown code fences (no \`\`\`json)
- No explanations before or after
- No comments in the JSON
- Ensure all strings are properly escaped
- Do NOT include null or undefined values

**RESUME TEXT:**

${resumeText}
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
