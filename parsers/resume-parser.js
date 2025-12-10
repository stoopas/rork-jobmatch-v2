/**
 * Resume Parser
 * Defensive parser with error handling for resume text extraction
 */

/**
 * Parse resume text and extract structured information
 * @param {string} resumeText - Raw resume text
 * @returns {Object} Parsed resume data
 */
export function parseResumeText(resumeText) {
  if (!resumeText || typeof resumeText !== 'string') {
    throw new Error('Invalid resume text provided');
  }

  try {
    // This is a basic parser - in production, this would use AI or NLP
    const parsed = {
      experience: extractExperience(resumeText),
      skills: extractSkills(resumeText),
      certifications: extractCertifications(resumeText),
      tools: extractTools(resumeText),
      projects: extractProjects(resumeText),
      domainExperience: extractDomains(resumeText),
    };

    return parsed;
  } catch (error) {
    console.error('[parseResumeText] Error:', error);
    throw new Error(`Failed to parse resume: ${error.message}`);
  }
}

/**
 * Extract work experience from resume text
 * @param {string} text - Resume text
 * @returns {Array} Experience entries
 */
function extractExperience(text) {
  const experiences = [];
  
  // Look for common patterns like "Company Name | Job Title"
  // This is a simplified version - real implementation would be more robust
  const sections = text.split('\n\n');
  
  sections.forEach(section => {
    // Look for date patterns (e.g., "2020 - 2023" or "Jan 2020 - Present")
    const datePattern = /(\d{4}|\w{3}\s+\d{4})\s*[-–]\s*(Present|\d{4}|\w{3}\s+\d{4})/i;
    const dateMatch = section.match(datePattern);
    
    if (dateMatch) {
      const lines = section.split('\n').filter(l => l.trim());
      if (lines.length >= 2) {
        experiences.push({
          title: lines[0].trim(),
          company: lines[1]?.split('|')[0]?.trim() || 'Unknown',
          startDate: dateMatch[1],
          endDate: dateMatch[2] === 'Present' ? undefined : dateMatch[2],
          current: dateMatch[2].toLowerCase() === 'present',
          description: lines.slice(2).join(' ').trim(),
          achievements: extractBullets(section),
        });
      }
    }
  });

  return experiences;
}

/**
 * Extract bullet points from text
 * @param {string} text - Text containing bullets
 * @returns {Array} Bullet points
 */
function extractBullets(text) {
  const bullets = [];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.startsWith('*')) {
      bullets.push(trimmed.substring(1).trim());
    }
  });

  return bullets;
}

/**
 * Extract skills from resume text
 * @param {string} text - Resume text
 * @returns {Array} Skills
 */
function extractSkills(text) {
  const skills = [];
  
  // Look for skills section
  const skillsSection = extractSection(text, 'SKILLS');
  if (!skillsSection) return skills;

  // Common technical skills to look for
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'React', 'React Native',
    'Node.js', 'Angular', 'Vue', 'SQL', 'MongoDB', 'AWS', 'Azure', 'Docker',
    'Kubernetes', 'Git', 'REST API', 'GraphQL', 'Machine Learning', 'AI'
  ];

  commonSkills.forEach(skill => {
    const regex = new RegExp(skill, 'gi');
    if (regex.test(skillsSection)) {
      skills.push({
        name: skill,
        category: categorizeSkill(skill),
      });
    }
  });

  // Also extract from comma-separated or line-separated lists
  const lines = skillsSection.split(/[,\n]/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.length > 2 && trimmed.length < 30 && !skills.some(s => s.name === trimmed)) {
      skills.push({
        name: trimmed,
        category: 'General',
      });
    }
  });

  return skills;
}

/**
 * Categorize a skill
 * @param {string} skill - Skill name
 * @returns {string} Category
 */
function categorizeSkill(skill) {
  const languages = ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'Rust'];
  const frameworks = ['React', 'React Native', 'Angular', 'Vue', 'Node.js', 'Express'];
  const cloud = ['AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes'];
  
  if (languages.some(l => skill.includes(l))) return 'Programming Languages';
  if (frameworks.some(f => skill.includes(f))) return 'Frameworks';
  if (cloud.some(c => skill.includes(c))) return 'Cloud & DevOps';
  
  return 'Technical';
}

/**
 * Extract certifications from resume text
 * @param {string} text - Resume text
 * @returns {Array} Certifications
 */
function extractCertifications(text) {
  const certifications = [];
  
  const certsSection = extractSection(text, 'CERTIFICATIONS');
  if (!certsSection) return certifications;

  const lines = certsSection.split('\n').filter(l => l.trim());
  
  lines.forEach(line => {
    // Look for patterns like "Certification Name - Issuer (Year)"
    const match = line.match(/^(.+?)\s*[-–]\s*(.+?)\s*\((\d{4})\)/);
    if (match) {
      certifications.push({
        name: match[1].trim(),
        issuer: match[2].trim(),
        date: match[3],
      });
    }
  });

  return certifications;
}

/**
 * Extract tools from resume text
 * @param {string} text - Resume text
 * @returns {Array} Tools
 */
function extractTools(text) {
  const tools = [];
  
  const commonTools = [
    'Jira', 'Figma', 'Sketch', 'Photoshop', 'Illustrator', 'VS Code',
    'IntelliJ', 'Postman', 'Jenkins', 'GitHub', 'GitLab', 'Slack'
  ];

  commonTools.forEach(tool => {
    const regex = new RegExp(tool, 'gi');
    if (regex.test(text)) {
      tools.push({
        name: tool,
        category: 'Tools',
      });
    }
  });

  return tools;
}

/**
 * Extract projects from resume text
 * @param {string} text - Resume text
 * @returns {Array} Projects
 */
function extractProjects(text) {
  const projects = [];
  
  const projectsSection = extractSection(text, 'PROJECTS');
  if (!projectsSection) return projects;

  const projectBlocks = projectsSection.split('\n\n');
  
  projectBlocks.forEach(block => {
    const lines = block.split('\n').filter(l => l.trim());
    if (lines.length > 0) {
      projects.push({
        title: lines[0].trim(),
        description: lines.slice(1).join(' ').trim(),
        technologies: extractTechnologies(block),
      });
    }
  });

  return projects;
}

/**
 * Extract technologies from text
 * @param {string} text - Text containing technologies
 * @returns {Array} Technologies
 */
function extractTechnologies(text) {
  const techPattern = /Technologies?:\s*([^\n]+)/i;
  const match = text.match(techPattern);
  
  if (match) {
    return match[1].split(',').map(t => t.trim());
  }
  
  return [];
}

/**
 * Extract domain experience from resume text
 * @param {string} text - Resume text
 * @returns {Array} Domains
 */
function extractDomains(text) {
  const domains = [];
  
  const commonDomains = [
    'Healthcare', 'Finance', 'E-commerce', 'Enterprise Software',
    'Education', 'Gaming', 'Social Media', 'Fintech', 'AI/ML'
  ];

  commonDomains.forEach(domain => {
    const regex = new RegExp(domain, 'gi');
    if (regex.test(text)) {
      domains.push(domain);
    }
  });

  return [...new Set(domains)]; // Remove duplicates
}

/**
 * Extract a specific section from resume text
 * @param {string} text - Resume text
 * @param {string} sectionName - Section name to extract
 * @returns {string|null} Section content
 */
function extractSection(text, sectionName) {
  const pattern = new RegExp(`${sectionName}[\\s\\n]+([\\s\\S]*?)(?=\\n[A-Z]{3,}|$)`, 'i');
  const match = text.match(pattern);
  
  return match ? match[1].trim() : null;
}

/**
 * Validate parsed resume data
 * @param {Object} parsedData - Parsed resume data
 * @returns {boolean} True if valid
 */
export function validateParsedResume(parsedData) {
  if (!parsedData || typeof parsedData !== 'object') {
    return false;
  }

  // At minimum, we should have extracted something
  const hasData = 
    (parsedData.experience && parsedData.experience.length > 0) ||
    (parsedData.skills && parsedData.skills.length > 0) ||
    (parsedData.certifications && parsedData.certifications.length > 0);

  return hasData;
}

/**
 * Sanitize resume text
 * @param {string} text - Raw text
 * @returns {string} Sanitized text
 */
export function sanitizeResumeText(text) {
  if (!text) return '';
  
  // Remove excessive whitespace
  let sanitized = text.replace(/\s+/g, ' ');
  
  // Remove special characters that might cause parsing issues
  sanitized = sanitized.replace(/[^\x20-\x7E\n]/g, '');
  
  return sanitized.trim();
}
