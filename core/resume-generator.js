/**
 * Resume Generator
 * Generates tailored resumes based on user profile and job posting
 */

/**
 * Format experience section
 * @param {Array} experiences - User experiences
 * @param {Object} jobPosting - Job posting to tailor for
 * @returns {string} Formatted experience section
 */
export function formatExperienceSection(experiences, jobPosting) {
  if (!experiences || experiences.length === 0) {
    return 'EXPERIENCE\n\nNo experience added yet.';
  }

  const formatted = experiences.map(exp => {
    const duration = exp.current 
      ? `${exp.startDate} - Present`
      : `${exp.startDate} - ${exp.endDate || 'N/A'}`;

    const achievements = exp.achievements && exp.achievements.length > 0
      ? exp.achievements.map(a => `  • ${a}`).join('\n')
      : `  • ${exp.description}`;

    return `${exp.title} | ${exp.company}
${duration}
${achievements}`;
  }).join('\n\n');

  return `EXPERIENCE\n\n${formatted}`;
}

/**
 * Format skills section
 * @param {Array} skills - User skills
 * @param {Array} requiredSkills - Job required skills
 * @returns {string} Formatted skills section
 */
export function formatSkillsSection(skills, requiredSkills = []) {
  if (!skills || skills.length === 0) {
    return 'SKILLS\n\nNo skills added yet.';
  }

  // Prioritize skills that match job requirements
  const skillsByCategory = {};
  
  skills.forEach(skill => {
    const category = skill.category || 'General';
    if (!skillsByCategory[category]) {
      skillsByCategory[category] = [];
    }
    skillsByCategory[category].push(skill.name);
  });

  const formatted = Object.entries(skillsByCategory)
    .map(([category, skillList]) => {
      return `${category}: ${skillList.join(', ')}`;
    })
    .join('\n');

  return `SKILLS\n\n${formatted}`;
}

/**
 * Format certifications section
 * @param {Array} certifications - User certifications
 * @returns {string} Formatted certifications section
 */
export function formatCertificationsSection(certifications) {
  if (!certifications || certifications.length === 0) {
    return '';
  }

  const formatted = certifications.map(cert => {
    return `${cert.name} - ${cert.issuer} (${cert.date})`;
  }).join('\n');

  return `\n\nCERTIFICATIONS\n\n${formatted}`;
}

/**
 * Format projects section
 * @param {Array} projects - User projects
 * @returns {string} Formatted projects section
 */
export function formatProjectsSection(projects) {
  if (!projects || projects.length === 0) {
    return '';
  }

  const formatted = projects.map(project => {
    const tech = project.technologies && project.technologies.length > 0
      ? `\nTechnologies: ${project.technologies.join(', ')}`
      : '';
    
    return `${project.title}
${project.description}${tech}`;
  }).join('\n\n');

  return `\n\nPROJECTS\n\n${formatted}`;
}

/**
 * Generate a basic resume
 * @param {Object} profile - User profile
 * @param {Object} jobPosting - Optional job posting to tailor for
 * @returns {string} Formatted resume text
 */
export function generateBasicResume(profile, jobPosting = null) {
  const experience = formatExperienceSection(
    profile.experience, 
    jobPosting
  );
  
  const skills = formatSkillsSection(
    profile.skills, 
    jobPosting?.requiredSkills
  );
  
  const certifications = formatCertificationsSection(profile.certifications);
  const projects = formatProjectsSection(profile.projects);

  return `${experience}\n\n${skills}${certifications}${projects}`.trim();
}

/**
 * Generate resume bullets optimized for ATS
 * @param {Object} experience - Work experience
 * @param {Array} jobKeywords - Keywords from job posting
 * @returns {Array} Optimized bullets
 */
export function generateATSOptimizedBullets(experience, jobKeywords = []) {
  if (!experience.achievements || experience.achievements.length === 0) {
    return [experience.description];
  }

  // In a real implementation, this would use AI to rewrite bullets
  // For now, return the existing achievements
  return experience.achievements;
}

/**
 * Calculate resume match score
 * @param {Object} profile - User profile
 * @param {Object} jobPosting - Job posting
 * @returns {number} Match score 0-100
 */
export function calculateResumeMatchScore(profile, jobPosting) {
  let score = 0;
  let maxScore = 0;

  // Check for matching skills (40 points)
  maxScore += 40;
  if (profile.skills && jobPosting.requiredSkills) {
    const userSkills = profile.skills.map(s => s.name?.toLowerCase());
    const matchedSkills = jobPosting.requiredSkills.filter(skill =>
      userSkills.some(us => us.includes(skill.toLowerCase()))
    );
    score += (matchedSkills.length / jobPosting.requiredSkills.length) * 40;
  }

  // Check for experience (30 points)
  maxScore += 30;
  if (profile.experience && profile.experience.length > 0) {
    score += 30;
  }

  // Check for certifications (15 points)
  maxScore += 15;
  if (profile.certifications && profile.certifications.length > 0) {
    score += 15;
  }

  // Check for projects (15 points)
  maxScore += 15;
  if (profile.projects && profile.projects.length > 0) {
    score += 15;
  }

  return Math.round((score / maxScore) * 100);
}

/**
 * Extract key phrases from job description
 * @param {string} description - Job description
 * @returns {Array} Key phrases
 */
export function extractKeyPhrases(description) {
  if (!description) return [];

  // Simple extraction - split by common separators
  const phrases = description
    .split(/[.,;\n]/)
    .map(p => p.trim())
    .filter(p => p.length > 10 && p.length < 100);

  return phrases.slice(0, 10); // Top 10 phrases
}
