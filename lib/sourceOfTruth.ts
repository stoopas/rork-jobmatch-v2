import type { ResumeData } from "./resumeParser";

export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");
}

export function resumeContains(resumeText: string, needle: string): boolean {
  const trimmedNeedle = needle.trim();
  if (trimmedNeedle.length < 3) {
    return false;
  }

  const normalizedResume = normalizeText(resumeText);
  const normalizedNeedle = normalizeText(trimmedNeedle);

  return normalizedResume.includes(normalizedNeedle);
}

export function verifyAndCleanResumeExtraction(
  resumeText: string,
  parsed: ResumeData
): ResumeData {
  console.log("[verifyAndClean] Starting verification against resume text");
  console.log("[verifyAndClean] Resume text length:", resumeText.length);
  console.log("[verifyAndClean] Input data:", {
    experienceCount: parsed.experience?.length || 0,
    skillsCount: parsed.skills?.length || 0,
    toolsCount: parsed.tools?.length || 0,
    certificationsCount: parsed.certifications?.length || 0,
    projectsCount: parsed.projects?.length || 0,
    domainsCount: parsed.domainExperience?.length || 0,
  });

  const experiences = (parsed.experience || [])
    .map((exp) => ({
      ...exp,
      title: (exp.title || "").trim(),
      company: (exp.company || "").trim(),
      startDate: (exp.startDate || "").trim(),
      endDate: (exp.endDate || "").trim(),
      current: exp.current ?? false,
      description: (exp.description || "").trim(),
      achievements: (exp.achievements || []).map((a) => String(a || "").trim()).filter(Boolean),
    }))
    .filter((exp) => {
      if (!exp.title || !exp.company) {
        console.log("[verifyAndClean] Dropping experience: missing title or company");
        return false;
      }

      const companyInResume = resumeContains(resumeText, exp.company);
      const titleInResume = resumeContains(resumeText, exp.title);

      if (!companyInResume && !titleInResume) {
        console.log(
          `[verifyAndClean] HALLUCINATION DETECTED: Experience "${exp.title}" at "${exp.company}" not found in resume`
        );
        return false;
      }

      return true;
    });

  const skills = (parsed.skills || [])
    .map((skill) => ({
      ...skill,
      name: (skill.name || "").trim(),
      category: (skill.category || "General").trim(),
    }))
    .filter((skill) => {
      if (!skill.name) {
        return false;
      }

      const skillInResume = resumeContains(resumeText, skill.name);

      if (!skillInResume) {
        console.log(`[verifyAndClean] HALLUCINATION DETECTED: Skill "${skill.name}" not found in resume`);
        return false;
      }

      return true;
    });

  const uniqueSkills = skills.reduce((acc, skill) => {
    const normalized = normalizeText(skill.name);
    if (!acc.some((s) => normalizeText(s.name) === normalized)) {
      acc.push(skill);
    }
    return acc;
  }, [] as typeof skills);

  const tools = (parsed.tools || [])
    .map((tool) => ({
      ...tool,
      name: (tool.name || "").trim(),
      category: (tool.category || "General").trim(),
    }))
    .filter((tool) => {
      if (!tool.name) {
        return false;
      }

      const toolInResume = resumeContains(resumeText, tool.name);

      if (!toolInResume) {
        console.log(`[verifyAndClean] HALLUCINATION DETECTED: Tool "${tool.name}" not found in resume`);
        return false;
      }

      return true;
    });

  const uniqueTools = tools.reduce((acc, tool) => {
    const normalized = normalizeText(tool.name);
    if (!acc.some((t) => normalizeText(t.name) === normalized)) {
      acc.push(tool);
    }
    return acc;
  }, [] as typeof tools);

  const certifications = (parsed.certifications || [])
    .map((cert) => ({
      ...cert,
      name: (cert.name || "").trim(),
      issuer: (cert.issuer || "").trim(),
      date: (cert.date || "").trim(),
    }))
    .filter((cert) => {
      if (!cert.name) {
        return false;
      }

      const certInResume = resumeContains(resumeText, cert.name);

      if (!certInResume) {
        console.log(`[verifyAndClean] HALLUCINATION DETECTED: Certification "${cert.name}" not found in resume`);
        return false;
      }

      return true;
    });

  const projects = (parsed.projects || [])
    .map((project) => ({
      ...project,
      title: (project.title || "").trim(),
      description: (project.description || "").trim(),
      technologies: (project.technologies || []).map((t) => String(t || "").trim()).filter(Boolean),
    }))
    .filter((project) => {
      if (!project.title) {
        return false;
      }

      const titleInResume = resumeContains(resumeText, project.title);
      const anyTechInResume = project.technologies.some((tech) => resumeContains(resumeText, tech));

      if (!titleInResume && !anyTechInResume) {
        console.log(`[verifyAndClean] HALLUCINATION DETECTED: Project "${project.title}" not found in resume`);
        return false;
      }

      return true;
    });

  const domainExperience = (parsed.domainExperience || [])
    .map((domain) => String(domain || "").trim())
    .filter((domain) => {
      if (!domain) {
        return false;
      }

      const domainInResume = resumeContains(resumeText, domain);

      if (!domainInResume) {
        console.log(`[verifyAndClean] HALLUCINATION DETECTED: Domain "${domain}" not found in resume`);
        return false;
      }

      return true;
    });

  const verified: ResumeData = {
    experience: experiences,
    skills: uniqueSkills,
    certifications,
    tools: uniqueTools,
    projects,
    domainExperience,
  };

  console.log("[verifyAndClean] Verification complete. Output:", {
    experienceCount: experiences.length,
    skillsCount: uniqueSkills.length,
    toolsCount: uniqueTools.length,
    certificationsCount: certifications.length,
    projectsCount: projects.length,
    domainsCount: domainExperience.length,
  });

  return verified;
}
