/**
 * Job Posting Parser
 * Parses job postings and extracts structured information
 */

/**
 * Parse job posting text
 * @param {string} jobText - Raw job posting text
 * @returns {Object} Parsed job data
 */
export function parseJobPosting(jobText) {
  if (!jobText || typeof jobText !== 'string') {
    throw new Error('Invalid job posting text provided');
  }

  try {
    return {
      title: extractJobTitle(jobText),
      company: extractCompany(jobText),
      description: jobText,
      requiredSkills: extractRequiredSkills(jobText),
      preferredSkills: extractPreferredSkills(jobText),
      responsibilities: extractResponsibilities(jobText),
      seniority: extractSeniority(jobText),
      domain: extractDomain(jobText),
      location: extractLocation(jobText),
      salary: extractSalary(jobText),
    };
  } catch (error) {
    console.error('[parseJobPosting] Error:', error);
    throw new Error(`Failed to parse job posting: ${error.message}`);
  }
}

/**
 * Extract job title from job posting
 * @param {string} text - Job posting text
 * @returns {string} Job title
 */
function extractJobTitle(text) {
  // Look for common title indicators
  const lines = text.split('\n').filter(l => l.trim());
  
  // Usually the title is in the first few lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i].trim();
    if (line.length > 5 && line.length < 100) {
      // Check if it looks like a job title
      const titleKeywords = ['Engineer', 'Developer', 'Manager', 'Designer', 'Analyst', 'Scientist'];
      if (titleKeywords.some(keyword => line.includes(keyword))) {
        return line;
      }
    }
  }

  return lines[0]?.trim() || 'Unknown Position';
}

/**
 * Extract company name from job posting
 * @param {string} text - Job posting text
 * @returns {string} Company name
 */
function extractCompany(text) {
  // Look for patterns like "Company: XYZ" or "at XYZ"
  const companyPattern = /(?:Company|at|@):\s*([^\n,]+)/i;
  const match = text.match(companyPattern);
  
  if (match) {
    return match[1].trim();
  }

  return 'Unknown Company';
}

/**
 * Extract required skills from job posting
 * @param {string} text - Job posting text
 * @returns {Array} Required skills
 */
function extractRequiredSkills(text) {
  const skills = [];
  
  // Look for required/must-have skills section
  const requiredSection = extractSectionByKeywords(
    text,
    ['required', 'must have', 'requirements', 'qualifications']
  );

  if (requiredSection) {
    skills.push(...extractSkillsFromSection(requiredSection));
  }

  return [...new Set(skills)]; // Remove duplicates
}

/**
 * Extract preferred skills from job posting
 * @param {string} text - Job posting text
 * @returns {Array} Preferred skills
 */
function extractPreferredSkills(text) {
  const skills = [];
  
  // Look for preferred/nice-to-have skills section
  const preferredSection = extractSectionByKeywords(
    text,
    ['preferred', 'nice to have', 'bonus', 'plus']
  );

  if (preferredSection) {
    skills.push(...extractSkillsFromSection(preferredSection));
  }

  return [...new Set(skills)]; // Remove duplicates
}

/**
 * Extract skills from a section of text
 * @param {string} text - Section text
 * @returns {Array} Skills
 */
function extractSkillsFromSection(text) {
  const skills = [];
  
  const commonSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C\\+\\+', 'C#', 'Go', 'Rust',
    'React', 'React Native', 'Angular', 'Vue', 'Node.js', 'Express', 'Django',
    'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis',
    'AWS', 'Azure', 'GCP', 'Docker', 'Kubernetes',
    'Git', 'REST API', 'GraphQL', 'Microservices',
    'Machine Learning', 'AI', 'Data Science', 'Analytics'
  ];

  commonSkills.forEach(skill => {
    const regex = new RegExp(`\\b${skill}\\b`, 'gi');
    if (regex.test(text)) {
      skills.push(skill);
    }
  });

  return skills;
}

/**
 * Extract responsibilities from job posting
 * @param {string} text - Job posting text
 * @returns {Array} Responsibilities
 */
function extractResponsibilities(text) {
  const responsibilities = [];
  
  const respSection = extractSectionByKeywords(
    text,
    ['responsibilities', 'you will', 'duties', 'what you\'ll do']
  );

  if (respSection) {
    const bullets = extractBulletPoints(respSection);
    responsibilities.push(...bullets);
  }

  return responsibilities;
}

/**
 * Extract bullet points from text
 * @param {string} text - Text containing bullets
 * @returns {Array} Bullet points
 */
function extractBulletPoints(text) {
  const bullets = [];
  const lines = text.split('\n');
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.match(/^[•\-*]\s+/)) {
      bullets.push(trimmed.replace(/^[•\-*]\s+/, ''));
    }
  });

  return bullets;
}

/**
 * Extract seniority level from job posting
 * @param {string} text - Job posting text
 * @returns {string} Seniority level
 */
function extractSeniority(text) {
  const seniorityLevels = {
    'entry': ['entry', 'junior', 'associate', 'intern'],
    'mid': ['mid', 'intermediate', 'level 2', 'ii'],
    'senior': ['senior', 'sr.', 'level 3', 'iii'],
    'lead': ['lead', 'principal', 'staff', 'architect'],
  };

  const textLower = text.toLowerCase();

  for (const [level, keywords] of Object.entries(seniorityLevels)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return level;
    }
  }

  return 'mid'; // Default to mid-level
}

/**
 * Extract domain/industry from job posting
 * @param {string} text - Job posting text
 * @returns {string} Domain
 */
function extractDomain(text) {
  const domains = {
    'Healthcare': ['healthcare', 'medical', 'hospital', 'health tech', 'biotech'],
    'Finance': ['finance', 'fintech', 'banking', 'trading', 'investment'],
    'E-commerce': ['e-commerce', 'ecommerce', 'retail', 'marketplace'],
    'Enterprise Software': ['enterprise', 'b2b', 'saas', 'business'],
    'Education': ['education', 'edtech', 'learning', 'academic'],
    'Gaming': ['gaming', 'game', 'entertainment'],
    'Social Media': ['social', 'community', 'networking'],
    'AI/ML': ['ai', 'artificial intelligence', 'machine learning', 'ml'],
  };

  const textLower = text.toLowerCase();

  for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(keyword => textLower.includes(keyword))) {
      return domain;
    }
  }

  return 'Technology'; // Default domain
}

/**
 * Extract location from job posting
 * @param {string} text - Job posting text
 * @returns {string|null} Location
 */
function extractLocation(text) {
  // Look for location patterns
  const locationPattern = /Location:\s*([^\n]+)/i;
  const match = text.match(locationPattern);
  
  if (match) {
    return match[1].trim();
  }

  // Check for remote indicators
  if (/remote/i.test(text)) {
    return 'Remote';
  }

  return null;
}

/**
 * Extract salary information from job posting
 * @param {string} text - Job posting text
 * @returns {string|null} Salary range
 */
function extractSalary(text) {
  // Look for salary patterns like "$100k - $150k" or "$100,000-$150,000"
  const salaryPattern = /\$\s*\d{1,3}[,k]\d{0,3}\s*[-–]\s*\$?\s*\d{1,3}[,k]\d{0,3}/i;
  const match = text.match(salaryPattern);
  
  return match ? match[0] : null;
}

/**
 * Extract section by keywords
 * @param {string} text - Full text
 * @param {Array} keywords - Keywords to search for
 * @returns {string|null} Section content
 */
function extractSectionByKeywords(text, keywords) {
  const textLower = text.toLowerCase();
  
  for (const keyword of keywords) {
    const index = textLower.indexOf(keyword);
    if (index !== -1) {
      // Extract from keyword to next section or end
      const fromKeyword = text.substring(index);
      const nextSectionMatch = fromKeyword.match(/\n\n[A-Z][^\n:]+:/);
      
      if (nextSectionMatch) {
        return fromKeyword.substring(0, nextSectionMatch.index);
      }
      
      // Return next 500 characters if no clear section boundary
      return fromKeyword.substring(0, 500);
    }
  }
  
  return null;
}

/**
 * Validate parsed job posting
 * @param {Object} jobData - Parsed job data
 * @returns {boolean} True if valid
 */
export function validateJobPosting(jobData) {
  if (!jobData || typeof jobData !== 'object') {
    return false;
  }

  // Must have at least a title
  return !!jobData.title && jobData.title !== 'Unknown Position';
}

/**
 * Normalize job posting data
 * @param {Object} jobData - Raw job data
 * @returns {Object} Normalized job data
 */
export function normalizeJobPosting(jobData) {
  return {
    id: `job-${Date.now()}`,
    title: jobData.title || 'Unknown Position',
    company: jobData.company || 'Unknown Company',
    description: jobData.description || '',
    requiredSkills: jobData.requiredSkills || [],
    preferredSkills: jobData.preferredSkills || [],
    responsibilities: jobData.responsibilities || [],
    seniority: jobData.seniority || 'mid',
    domain: jobData.domain || 'Technology',
    location: jobData.location,
    salary: jobData.salary,
    timestamp: new Date().toISOString(),
  };
}
