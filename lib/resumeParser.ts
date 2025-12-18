import { Alert } from "react-native";
import { generateText } from "@rork-ai/toolkit-sdk";
import { z } from "zod";

const experienceItemSchema = z.object({
  title: z.string(),
  company: z.string(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  current: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
});

const skillItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
});

const certificationItemSchema = z.object({
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
});

const toolItemSchema = z.object({
  name: z.string(),
  category: z.string().optional(),
});

const projectItemSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  technologies: z.array(z.string()).optional(),
});

export const resumeSchema = z.object({
  experience: z.array(experienceItemSchema).optional(),
  skills: z.array(skillItemSchema).optional(),
  certifications: z.array(certificationItemSchema).optional(),
  tools: z.array(toolItemSchema).optional(),
  projects: z.array(projectItemSchema).optional(),
  domainExperience: z.array(z.string()).optional(),
});

export type ResumeData = z.infer<typeof resumeSchema>;

export async function parseResumeText(resumeText: string): Promise<ResumeData> {
  const prompt = `Extract structured data from this resume. Return ONLY valid JSON with no markdown formatting.

Return this structure:
{
  "experience": [{"title": "", "company": "", "startDate": "", "endDate": "", "current": false, "description": "", "achievements": []}],
  "skills": [{"name": "", "category": ""}],
  "certifications": [{"name": "", "issuer": "", "date": ""}],
  "tools": [{"name": "", "category": ""}],
  "projects": [{"title": "", "description": "", "technologies": []}],
  "domainExperience": []
}

Resume:
${resumeText}`;

  const aiResponse = await generateText({
    messages: [{ role: "user", content: prompt }],
  });

  let aiText = typeof aiResponse === "string" ? aiResponse : (aiResponse as any)?.text || "";
  aiText = aiText.trim();

  if (aiText.startsWith("```")) {
    aiText = aiText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }

  const parsed = JSON.parse(aiText);
  const validated = resumeSchema.parse(parsed);

  return {
    experience: validated.experience || [],
    skills: validated.skills || [],
    certifications: validated.certifications || [],
    tools: validated.tools || [],
    projects: validated.projects || [],
    domainExperience: validated.domainExperience || [],
  };
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
