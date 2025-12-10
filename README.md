# JobMatch - AI-Powered Job Fit & Resume Tailoring

A conversational AI application that helps users match their profiles with job postings and generate tailored resumes.

## Architecture

This is a greenfield rebuild with a modular architecture designed for maintainability and extensibility.

### Directory Structure

```
jobmatch-poc/
├── core/                    # Core business logic engines
│   ├── conversational-engine.js   # Chat conversation management
│   ├── question-engine.js         # Question generation & validation
│   ├── scoring-engine.js          # Job fit scoring algorithms
│   └── resume-generator.js        # Resume generation logic
├── parsers/                 # Data parsing modules
│   ├── resume-parser.js           # Resume text parsing with defensive error handling
│   └── job-posting-parser.js      # Job posting extraction
├── memory/                  # State management & persistence
│   ├── defaults.js               # Default values & constants
│   ├── schema.js                 # Zod validation schemas
│   └── user-profile-store.js     # Profile storage management
├── api/                     # External API integrations
│   ├── rork-client.js            # Rork AI client wrapper
│   └── upload-endpoints.js       # File upload API
├── ui/components/           # React Native UI components
│   └── upload-widget.jsx         # File upload widget
├── app/                     # Expo Router screens
├── contexts/                # React contexts
├── types/                   # TypeScript definitions
│   └── index.d.ts               # Centralized type definitions
├── tests/                   # Test suites
│   └── parsers.test.js          # Parser unit tests
└── README.md
```

## Features

### Core Engines

- **Conversational Engine**: Manages conversation flow, context, and message handling
- **Question Engine**: Generates clarifying questions based on profile gaps
- **Scoring Engine**: Calculates multi-dimensional job fit scores
- **Resume Generator**: Creates tailored resumes optimized for specific job postings

### Parsers

- **Resume Parser**: Defensive parser that extracts structured data from resume text
  - Work experience with achievements
  - Skills with categorization
  - Certifications, tools, and projects
  - Domain experience
- **Job Posting Parser**: Extracts job requirements, responsibilities, and metadata

### Memory & Storage

- **User Profile Store**: Manages profile persistence with AsyncStorage
- **Validation Schemas**: Zod schemas for runtime type checking
- **Default Values**: Centralized configuration and constants

### API Integration

- **Rork AI Client**: Wrapper for AI text generation and structured object extraction
- **Upload Endpoints**: File upload handling with retry logic and progress tracking

## Installation

### Prerequisites

- Node.js 18+ and npm/bun
- Expo CLI (for mobile development)

### Dependencies

Install core dependencies:

```bash
npm install express multer node-fetch zod
```

For mobile development:

```bash
npx expo install expo-file-system
```

Existing dependencies (already in package.json):
- @react-native-async-storage/async-storage
- expo-document-picker
- expo-file-system
- zod

## Usage

### Running Tests

```bash
node tests/parsers.test.js
```

### Core Module Examples

#### Resume Parsing

```javascript
import { parseResumeText, validateParsedResume } from './parsers/resume-parser.js';

const resumeText = `
Software Engineer
Tech Company | 2020 - Present
...
`;

const parsed = parseResumeText(resumeText);
if (validateParsedResume(parsed)) {
  console.log('Resume parsed successfully:', parsed);
}
```

#### Job Fit Scoring

```javascript
import { calculateFitScore } from './core/scoring-engine.js';

const fitScore = calculateFitScore(userProfile, jobPosting);
console.log('Overall fit:', fitScore.overall);
console.log('Rationale:', fitScore.rationale);
```

#### Resume Generation

```javascript
import { generateBasicResume } from './core/resume-generator.js';

const resume = generateBasicResume(userProfile, jobPosting);
console.log(resume);
```

### Upload Widget Usage

```jsx
import UploadWidget from './ui/components/upload-widget.jsx';

<UploadWidget
  onFileSelected={(file) => console.log('Selected:', file)}
  onUploadComplete={(file, content) => console.log('Uploaded:', content)}
  onUploadError={(error) => console.error('Error:', error)}
  label="Upload Resume"
/>
```

## Testing

### Testing Steps

1. **Upload Text Resume**
   - Select a .txt resume file
   - Verify file is processed and parsed correctly
   - Check that profile is updated with extracted data

2. **Cancel Picker**
   - Open document picker
   - Cancel without selecting a file
   - Verify no errors occur and UI returns to normal state

3. **PDF Handling**
   - Attempt to upload a PDF file
   - Verify appropriate error message or processing
   - Note: Full PDF support requires additional library

### Running Tests

```bash
# Run parser tests
node tests/parsers.test.js

# Expected output: All 10 tests should pass
```

## API Documentation

### Core Engines

#### Conversational Engine

- `generateSystemContext(profile)` - Generate AI system prompt
- `extractQuickReplies(text)` - Extract option buttons from response
- `createResumeUploadSuccessMessage(stats, profile)` - Create upload success message

#### Question Engine

- `getMissingInfo(profile)` - Identify profile gaps
- `generateFollowUpQuestions(profile)` - Generate clarifying questions
- `hasAskedQuestion(profile, key)` - Check if question was already asked

#### Scoring Engine

- `calculateFitScore(profile, jobPosting)` - Calculate overall fit score
- `calculateExperienceAlignment(experience, job)` - Score experience match
- `calculateTechnicalSkillMatch(skills, required, preferred)` - Score skill match

#### Resume Generator

- `generateBasicResume(profile, jobPosting)` - Generate formatted resume
- `formatExperienceSection(experiences, job)` - Format experience section
- `calculateResumeMatchScore(profile, job)` - Calculate ATS match score

### Parsers

#### Resume Parser

- `parseResumeText(text)` - Parse resume and extract structured data
- `validateParsedResume(data)` - Validate parsed resume
- `sanitizeResumeText(text)` - Clean and sanitize input text

#### Job Posting Parser

- `parseJobPosting(text)` - Parse job posting
- `validateJobPosting(data)` - Validate parsed job data
- `normalizeJobPosting(data)` - Normalize and add metadata

### Memory

#### User Profile Store

- `loadProfile()` - Load profile from storage
- `saveProfile(profile)` - Save profile to storage
- `updateProfile(updates)` - Update profile with partial data
- `addExperience(exp)` - Add work experience
- `addSkills(skills)` - Add skills
- `clearAllData()` - Clear all stored data

## Configuration

### Upload Configuration

- Max file size: 10MB
- Allowed types: PDF, DOC, DOCX, TXT
- Configurable in `memory/defaults.js`

### AI Configuration

- Default model: GPT-4
- Temperature: 0.7
- Max tokens: 2000
- Timeout: 30 seconds

### Score Weights

- Experience Alignment: 25%
- Technical Skill Match: 30%
- Domain Relevance: 20%
- Stage/Cultural Fit: 15%
- Impact Potential: 10%

## Error Handling

All modules include defensive error handling:

- Input validation
- Try-catch blocks
- Meaningful error messages
- Graceful degradation

## TypeScript Support

Full TypeScript definitions available in `types/index.d.ts`:

- All interfaces exported
- Utility types included
- Compatible with existing TypeScript codebase

## Contributing

### Development Workflow

1. Make changes to specific modules
2. Run tests: `node tests/parsers.test.js`
3. Test in the app: `bun run start-web`
4. Commit changes

### Adding New Features

1. Add core logic to appropriate engine in `core/`
2. Add parsing logic to `parsers/` if needed
3. Update schemas in `memory/schema.js`
4. Add tests to `tests/`
5. Update types in `types/index.d.ts`

## Troubleshooting

### Upload Issues

- Ensure file size is under 10MB
- Check file format is supported
- Verify file system permissions

### Parsing Issues

- Check resume format (structured text works best)
- Ensure clear section headers (SKILLS, EXPERIENCE, etc.)
- Validate input text is not empty

### Storage Issues

- Check AsyncStorage permissions
- Verify data structure matches schema
- Clear cache if corruption suspected

## License

Private project - All rights reserved

## Support

For issues or questions, please open an issue on the GitHub repository.

---

**Note**: This is a greenfield rebuild focused on modularity, defensive programming, and maintainability. All modules are designed to be independently testable and reusable.
