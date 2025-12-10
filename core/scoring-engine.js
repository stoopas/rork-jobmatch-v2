/**
 * Scoring Engine
 * Calculates job fit scores based on user profile and job posting
 */

/**
 * Calculate experience alignment score
 * @param {Array} userExperience - User's work experience
 * @param {Object} jobPosting - Job posting details
 * @returns {number} Score from 0-100
 */
export function calculateExperienceAlignment(userExperience, jobPosting) {
  if (!userExperience || userExperience.length === 0) return 0;

  const jobSeniorityLevels = {
    'entry': 0,
    'junior': 1,
    'mid': 2,
    'senior': 3,
    'staff': 4,
    'principal': 5,
    'lead': 4,
  };

  const userYearsOfExperience = userExperience.length * 1.5; // Rough estimate
  const jobLevel = jobSeniorityLevels[jobPosting.seniority?.toLowerCase()] || 2;
  const expectedYears = jobLevel * 2;

  const yearsDiff = Math.abs(userYearsOfExperience - expectedYears);
  const baseScore = Math.max(0, 100 - (yearsDiff * 10));

  // Check for relevant job titles
  const relevantTitles = userExperience.filter(exp => {
    const expTitle = exp.title?.toLowerCase() || '';
    const jobTitle = jobPosting.title?.toLowerCase() || '';
    return expTitle.includes(jobTitle.split(' ')[0]) || jobTitle.includes(expTitle.split(' ')[0]);
  });

  const titleBonus = relevantTitles.length > 0 ? 20 : 0;

  return Math.min(100, baseScore + titleBonus);
}

/**
 * Calculate technical skill match score
 * @param {Array} userSkills - User's skills
 * @param {Array} requiredSkills - Job's required skills
 * @param {Array} preferredSkills - Job's preferred skills
 * @returns {number} Score from 0-100
 */
export function calculateTechnicalSkillMatch(userSkills, requiredSkills = [], preferredSkills = []) {
  if (!userSkills || userSkills.length === 0) return 0;

  const userSkillNames = userSkills.map(s => s.name?.toLowerCase() || s.toLowerCase());
  
  const requiredMatches = requiredSkills.filter(skill => 
    userSkillNames.some(userSkill => 
      userSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(userSkill)
    )
  );

  const preferredMatches = preferredSkills.filter(skill => 
    userSkillNames.some(userSkill => 
      userSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(userSkill)
    )
  );

  const requiredScore = requiredSkills.length > 0 
    ? (requiredMatches.length / requiredSkills.length) * 70 
    : 70;

  const preferredScore = preferredSkills.length > 0 
    ? (preferredMatches.length / preferredSkills.length) * 30 
    : 30;

  return Math.min(100, Math.round(requiredScore + preferredScore));
}

/**
 * Calculate domain relevance score
 * @param {Array} userDomains - User's domain experience
 * @param {string} jobDomain - Job's domain
 * @returns {number} Score from 0-100
 */
export function calculateDomainRelevance(userDomains, jobDomain) {
  if (!userDomains || userDomains.length === 0) return 50; // Neutral score
  if (!jobDomain) return 50;

  const hasMatchingDomain = userDomains.some(domain => 
    domain.toLowerCase().includes(jobDomain.toLowerCase()) ||
    jobDomain.toLowerCase().includes(domain.toLowerCase())
  );

  return hasMatchingDomain ? 90 : 40;
}

/**
 * Calculate stage/cultural fit score
 * @param {Object} profile - User profile
 * @param {Object} jobPosting - Job posting
 * @returns {number} Score from 0-100
 */
export function calculateStageCulturalFit(profile, jobPosting) {
  // This would ideally use work style preferences and company info
  // For now, return a neutral score
  const workStyles = profile.workStyles || [];
  
  if (workStyles.length === 0) return 70;

  // Simple heuristic: if user has work style preferences, assume some level of fit
  return 75;
}

/**
 * Calculate impact potential score
 * @param {Object} profile - User profile
 * @param {Object} jobPosting - Job posting
 * @returns {number} Score from 0-100
 */
export function calculateImpactPotential(profile, jobPosting) {
  let score = 50; // Base score

  // Achievements boost
  if (profile.achievements && profile.achievements.length > 0) {
    score += 15;
  }

  // Projects boost
  if (profile.projects && profile.projects.length > 0) {
    score += 15;
  }

  // Certifications boost
  if (profile.certifications && profile.certifications.length > 0) {
    score += 10;
  }

  // Leadership indicators in experience
  const hasLeadership = profile.experience?.some(exp => 
    exp.title?.toLowerCase().includes('lead') || 
    exp.title?.toLowerCase().includes('senior') ||
    exp.title?.toLowerCase().includes('staff')
  );

  if (hasLeadership) {
    score += 10;
  }

  return Math.min(100, score);
}

/**
 * Calculate overall fit score
 * @param {Object} profile - User profile
 * @param {Object} jobPosting - Job posting
 * @returns {Object} Complete fit score with breakdown
 */
export function calculateFitScore(profile, jobPosting) {
  const experienceAlignment = calculateExperienceAlignment(
    profile.experience, 
    jobPosting
  );

  const technicalSkillMatch = calculateTechnicalSkillMatch(
    profile.skills,
    jobPosting.requiredSkills,
    jobPosting.preferredSkills
  );

  const domainRelevance = calculateDomainRelevance(
    profile.domainExperience,
    jobPosting.domain
  );

  const stageCulturalFit = calculateStageCulturalFit(profile, jobPosting);

  const impactPotential = calculateImpactPotential(profile, jobPosting);

  const overall = Math.round(
    (experienceAlignment * 0.25) +
    (technicalSkillMatch * 0.30) +
    (domainRelevance * 0.20) +
    (stageCulturalFit * 0.15) +
    (impactPotential * 0.10)
  );

  return {
    overall,
    experienceAlignment,
    technicalSkillMatch,
    domainRelevance,
    stageCulturalFit,
    impactPotential,
    rationale: {
      experienceAlignment: generateExperienceRationale(profile, jobPosting, experienceAlignment),
      technicalSkillMatch: generateTechnicalRationale(profile, jobPosting, technicalSkillMatch),
      domainRelevance: generateDomainRationale(profile, jobPosting, domainRelevance),
      stageCulturalFit: generateCultureRationale(profile, jobPosting, stageCulturalFit),
      impactPotential: generateImpactRationale(profile, jobPosting, impactPotential),
    },
  };
}

function generateExperienceRationale(profile, jobPosting, score) {
  const years = profile.experience?.length * 1.5 || 0;
  return `You have approximately ${years.toFixed(1)} years of experience across ${profile.experience?.length || 0} positions. ${score > 70 ? 'This aligns well with' : 'This may differ from'} the ${jobPosting.seniority || 'mid-level'} requirements.`;
}

function generateTechnicalRationale(profile, jobPosting, score) {
  const matchedSkills = profile.skills?.length || 0;
  return `You have ${matchedSkills} documented skills. ${score > 70 ? 'Strong overlap with' : 'Some gaps in'} the required technical stack for this role.`;
}

function generateDomainRationale(profile, jobPosting, score) {
  return `${score > 70 ? 'Relevant' : 'Limited'} experience in the ${jobPosting.domain || 'target'} domain. ${score > 70 ? 'This should help you contribute quickly.' : 'You may need to learn domain-specific knowledge.'}`;
}

function generateCultureRationale(profile, jobPosting, score) {
  return `Based on your work style preferences and experience, you appear ${score > 70 ? 'well-suited' : 'potentially suited'} for this role's culture and stage.`;
}

function generateImpactRationale(profile, jobPosting, score) {
  return `Your ${profile.achievements?.length || 0} documented achievements and ${profile.projects?.length || 0} projects demonstrate ${score > 70 ? 'strong' : 'developing'} potential for impact.`;
}
