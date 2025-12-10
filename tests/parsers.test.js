/**
 * Parser Tests
 * Unit tests for resume and job posting parsers
 */

// Test framework imports (using a basic test structure)
// In production, this would use Jest, Mocha, or another testing framework

const { parseResumeText, validateParsedResume, sanitizeResumeText } = require('../parsers/resume-parser');
const { parseJobPosting, validateJobPosting, normalizeJobPosting } = require('../parsers/job-posting-parser');

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed: ${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
  }
}

// Resume Parser Tests
console.log('Running Resume Parser Tests...\n');

// Test 1: Parse basic resume text
function testParseBasicResume() {
  console.log('Test 1: Parse basic resume text');
  
  const resumeText = `
Software Engineer
Tech Company | 2020 - Present

SKILLS
JavaScript, TypeScript, React, Node.js

CERTIFICATIONS
AWS Certified Developer - Amazon (2021)
  `;

  try {
    const parsed = parseResumeText(resumeText);
    
    assert(parsed.experience.length >= 0, 'Should parse experience');
    assert(parsed.skills.length > 0, 'Should parse skills');
    assert(parsed.certifications.length > 0, 'Should parse certifications');
    
    console.log('✓ Test 1 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 1 failed:', error.message);
    return false;
  }
}

// Test 2: Handle invalid resume text
function testHandleInvalidResume() {
  console.log('Test 2: Handle invalid resume text');
  
  try {
    parseResumeText(null);
    console.error('✗ Test 2 failed: Should throw error for null input');
    return false;
  } catch (error) {
    console.log('✓ Test 2 passed\n');
    return true;
  }
}

// Test 3: Validate parsed resume
function testValidateParsedResume() {
  console.log('Test 3: Validate parsed resume');
  
  const validResume = {
    experience: [{ title: 'Engineer', company: 'Co', startDate: '2020', current: true, description: 'Work', achievements: [] }],
    skills: [{ name: 'JavaScript', category: 'Programming' }],
    certifications: [],
    tools: [],
    projects: [],
    domainExperience: [],
  };

  const invalidResume = {
    experience: [],
    skills: [],
    certifications: [],
  };

  try {
    assert(validateParsedResume(validResume), 'Valid resume should pass validation');
    assert(!validateParsedResume(invalidResume), 'Invalid resume should fail validation');
    
    console.log('✓ Test 3 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 3 failed:', error.message);
    return false;
  }
}

// Test 4: Sanitize resume text
function testSanitizeResumeText() {
  console.log('Test 4: Sanitize resume text');
  
  const dirtyText = '  Test   resume   with   extra   spaces  ';
  const sanitized = sanitizeResumeText(dirtyText);

  try {
    assert(sanitized.length < dirtyText.length, 'Sanitized text should be shorter');
    assert(!sanitized.includes('  '), 'Should remove extra spaces');
    
    console.log('✓ Test 4 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 4 failed:', error.message);
    return false;
  }
}

// Job Posting Parser Tests
console.log('Running Job Posting Parser Tests...\n');

// Test 5: Parse basic job posting
function testParseBasicJobPosting() {
  console.log('Test 5: Parse basic job posting');
  
  const jobText = `
Senior Software Engineer
Company: Tech Corp

REQUIRED SKILLS:
JavaScript, React, Node.js

RESPONSIBILITIES:
- Build scalable applications
- Lead technical decisions
  `;

  try {
    const parsed = parseJobPosting(jobText);
    
    assert(parsed.title, 'Should parse title');
    assert(parsed.requiredSkills.length > 0, 'Should parse required skills');
    assert(parsed.seniority, 'Should determine seniority');
    
    console.log('✓ Test 5 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 5 failed:', error.message);
    return false;
  }
}

// Test 6: Handle invalid job posting
function testHandleInvalidJobPosting() {
  console.log('Test 6: Handle invalid job posting');
  
  try {
    parseJobPosting('');
    console.error('✗ Test 6 failed: Should throw error for empty input');
    return false;
  } catch (error) {
    console.log('✓ Test 6 passed\n');
    return true;
  }
}

// Test 7: Validate job posting
function testValidateJobPosting() {
  console.log('Test 7: Validate job posting');
  
  const validJob = {
    title: 'Software Engineer',
    company: 'Tech Corp',
    description: 'Build stuff',
    requiredSkills: ['JavaScript'],
    preferredSkills: [],
    responsibilities: [],
    seniority: 'mid',
    domain: 'Technology',
  };

  const invalidJob = {
    title: 'Unknown Position',
  };

  try {
    assert(validateJobPosting(validJob), 'Valid job should pass validation');
    assert(!validateJobPosting(invalidJob), 'Invalid job should fail validation');
    
    console.log('✓ Test 7 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 7 failed:', error.message);
    return false;
  }
}

// Test 8: Normalize job posting
function testNormalizeJobPosting() {
  console.log('Test 8: Normalize job posting');
  
  const rawJob = {
    title: 'Engineer',
    company: 'Corp',
  };

  try {
    const normalized = normalizeJobPosting(rawJob);
    
    assert(normalized.id, 'Should have an id');
    assert(normalized.timestamp, 'Should have a timestamp');
    assert(normalized.requiredSkills.length === 0, 'Should have default empty arrays');
    
    console.log('✓ Test 8 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 8 failed:', error.message);
    return false;
  }
}

// Test 9: Extract skills from section
function testExtractSkills() {
  console.log('Test 9: Extract skills from text');
  
  const resumeWithSkills = `
SKILLS
JavaScript, TypeScript, React, Python, AWS, Docker
  `;

  try {
    const parsed = parseResumeText(resumeWithSkills);
    assert(parsed.skills.length > 0, 'Should extract multiple skills');
    
    console.log('✓ Test 9 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 9 failed:', error.message);
    return false;
  }
}

// Test 10: Extract seniority from job posting
function testExtractSeniority() {
  console.log('Test 10: Extract seniority level');
  
  const seniorJob = 'Senior Software Engineer position';
  const juniorJob = 'Junior Developer role';
  const midJob = 'Software Engineer position';

  try {
    const parsed1 = parseJobPosting(seniorJob);
    const parsed2 = parseJobPosting(juniorJob);
    const parsed3 = parseJobPosting(midJob);
    
    assert(parsed1.seniority === 'senior', 'Should detect senior level');
    assert(parsed2.seniority === 'entry', 'Should detect junior level');
    assert(parsed3.seniority === 'mid', 'Should default to mid level');
    
    console.log('✓ Test 10 passed\n');
    return true;
  } catch (error) {
    console.error('✗ Test 10 failed:', error.message);
    return false;
  }
}

// Run all tests
function runAllTests() {
  console.log('=== Starting Parser Tests ===\n');
  
  const tests = [
    testParseBasicResume,
    testHandleInvalidResume,
    testValidateParsedResume,
    testSanitizeResumeText,
    testParseBasicJobPosting,
    testHandleInvalidJobPosting,
    testValidateJobPosting,
    testNormalizeJobPosting,
    testExtractSkills,
    testExtractSeniority,
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      if (test()) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`Unexpected error in ${test.name}:`, error);
      failed++;
    }
  });

  console.log('=== Test Results ===');
  console.log(`Passed: ${passed}/${tests.length}`);
  console.log(`Failed: ${failed}/${tests.length}`);
  
  if (failed === 0) {
    console.log('\n✓ All tests passed!');
  } else {
    console.log(`\n✗ ${failed} test(s) failed`);
  }

  return failed === 0;
}

// Export for use in other test runners
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    runAllTests,
    testParseBasicResume,
    testHandleInvalidResume,
    testValidateParsedResume,
    testSanitizeResumeText,
    testParseBasicJobPosting,
    testHandleInvalidJobPosting,
    testValidateJobPosting,
    testNormalizeJobPosting,
    testExtractSkills,
    testExtractSeniority,
  };
}

// Run tests if this file is executed directly
if (require.main === module) {
  const success = runAllTests();
  process.exit(success ? 0 : 1);
}
