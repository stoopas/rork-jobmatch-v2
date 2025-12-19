/**
 * Conversational Engine
 * Manages conversation flow, context, and message handling
 */

/**
 * Generate system context for the AI agent
 * @param {Object} profile - User profile data
 * @returns {string} System context string
 */
export function generateSystemContext(profile) {
  return `<system>
You are Jobular, a conversational job-fit and resume-tailoring agent.

RULES:
1. Ask ONE short question at a time (max 8-12 words)
2. ALWAYS provide 2-5 clickable options. Format them EXACTLY like this at the END of your message:
   [Options: Option1 | Option2 | Option3]
3. NEVER ask the same question twice - check clarifyingAnswers
4. Always store answers using the tools provided
5. Keep tone friendly and simple

Current user profile:
${JSON.stringify(profile, null, 2)}

IMPORTANT: ALWAYS end questions with [Options: choice1 | choice2 | ...] format.
</system>`;
}

/**
 * Extract quick reply options from AI response text
 * @param {string} text - AI response text
 * @returns {Object} Object with cleanText and options array
 */
export function extractQuickReplies(text) {
  const optionsMatch = text.match(/\[Options?:\s*([^\]]+)\]/i);
  if (!optionsMatch) {
    return { cleanText: text, options: [] };
  }

  const cleanText = text.replace(/\[Options?:\s*([^\]]+)\]/gi, '').trim();
  const optionsString = optionsMatch[1];
  const options = optionsString
    .split('|')
    .map(opt => opt.trim())
    .filter(opt => opt.length > 0)
    .map(opt => ({ label: opt, value: opt }));

  return { cleanText, options };
}

/**
 * Create a success message after resume upload
 * @param {Object} stats - Upload statistics
 * @param {Object} profile - Updated profile
 * @returns {string} Success message
 */
export function createResumeUploadSuccessMessage(stats, profile) {
  return `<system>
You are Jobular, a conversational job-fit and resume-tailoring agent.

RULES:
1. Ask ONE short question at a time (max 8-12 words)
2. ALWAYS provide 2-5 clickable options. Format them EXACTLY like this at the END of your message:
   [Options: Option1 | Option2 | Option3]
3. NEVER ask the same question twice - check clarifyingAnswers
4. Always store answers using the tools provided
5. Keep tone friendly and simple

Current user profile:
${JSON.stringify(profile, null, 2)}

IMPORTANT: ALWAYS end questions with [Options: choice1 | choice2 | ...] format.
</system>

User uploaded resume. Successfully extracted:
- ${stats.experience} experiences
- ${stats.skills} skills
- ${stats.certifications} certifications
- ${stats.tools} tools
- ${stats.projects} projects

Now confirm the upload success briefly and ask ONE simple clarifying question with options to improve the profile. Focus on the most important missing info.`;
}

/**
 * Validate message format
 * @param {string} message - Message to validate
 * @returns {boolean} True if valid
 */
export function isValidMessage(message) {
  return typeof message === 'string' && message.trim().length > 0;
}

/**
 * Create message object for chat
 * @param {string} role - Message role (user/assistant)
 * @param {string} content - Message content
 * @returns {Object} Message object
 */
export function createMessage(role, content) {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    role,
    parts: [
      {
        type: 'text',
        text: content,
      },
    ],
    timestamp: new Date().toISOString(),
  };
}
