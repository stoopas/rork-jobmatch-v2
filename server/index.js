const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');
const mammoth = require('mammoth');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const uploadPDF = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// eslint-disable-next-line no-unused-vars
const uploadDOCX = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream'
    ];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only DOCX files are allowed'));
    }
  },
});

function cleanExtractedText(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'resume-extractor' });
});

app.post('/extract/docx', express.json(), async (req, res) => {
  console.log('[server] POST /extract/docx');

  try {
    const { base64, fileName, mimeType } = req.body;

    if (!base64) {
      return res.status(400).json({ error: 'base64 is required' });
    }

    console.log('[server] Decoding base64 DOCX...');
    console.log('[server] fileName:', fileName);
    console.log('[server] mimeType:', mimeType);
    console.log('[server] base64 length:', base64.length);

    // eslint-disable-next-line no-undef
    const buffer = Buffer.from(base64, 'base64');
    console.log('[server] Buffer size:', buffer.length);

    if (buffer.length < 4) {
      return res.status(400).json({ error: 'File is too small to be a valid DOCX' });
    }

    const firstBytes = buffer.slice(0, 4);
    if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4B || 
        firstBytes[2] !== 0x03 || firstBytes[3] !== 0x04) {
      console.error('[server] Invalid DOCX: Missing ZIP signature');
      console.error('[server] First 4 bytes:', firstBytes.toString('hex'));
      return res.status(400).json({ 
        error: "This file isn't a valid .docx Word document. Please ensure it's saved as .docx (Word 2007+)." 
      });
    }

    console.log('[server] Valid DOCX detected, extracting text with mammoth...');

    const result = await mammoth.extractRawText({ buffer });
    const text = cleanExtractedText(result.value);

    console.log('[server] Extraction successful');
    console.log('[server] Extracted text length:', text.length);

    if (text.length < 200) {
      console.warn('[server] Extracted text is very short');
      return res.status(400).json({
        error: 'Extracted text is too short. Please ensure your resume has content.',
        extractedLength: text.length,
      });
    }

    if (text.includes('%PDF-') || text.includes('/Title (') || text.includes('obj <</')) {
      console.error('[server] PDF markers detected in extracted text!');
      return res.status(400).json({
        error: 'Invalid extraction: PDF structure detected in text. Please use a DOCX file.',
      });
    }

    res.json({ text });
  } catch (error) {
    console.error('[server] Error extracting DOCX:', error);
    res.status(500).json({
      error: 'Failed to extract text from DOCX',
      message: error.message,
    });
  }
});

app.post('/extract-resume-text', uploadPDF.single('file'), async (req, res) => {
  console.log('[server] POST /extract-resume-text');

  try {
    if (!req.file) {
      console.error('[server] No file in request');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('[server] File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });

    const dataBuffer = req.file.buffer;

    console.log('[server] Parsing PDF with pdf-parse...');
    const data = await pdfParse(dataBuffer, {
      max: 0,
    });

    console.log('[server] PDF parsed successfully');
    console.log('[server] Pages:', data.numpages);
    console.log('[server] Raw text length:', data.text.length);

    const cleanedText = cleanExtractedText(data.text);

    console.log('[server] Cleaned text length:', cleanedText.length);

    if (cleanedText.length < 200) {
      console.warn('[server] Extracted text too short - possibly scanned PDF');
      return res.status(400).json({
        error: 'Could not extract text from PDF (possibly scanned). Try DOCX or enable OCR.',
        extractedLength: cleanedText.length,
      });
    }

    console.log('[server] Extraction successful, returning text');
    res.json({
      text: cleanedText,
      metadata: {
        pages: data.numpages,
        originalLength: data.text.length,
        cleanedLength: cleanedText.length,
      },
    });
  } catch (error) {
    console.error('[server] Error processing PDF:', error);
    res.status(500).json({
      error: 'Failed to extract text from PDF',
      message: error.message,
    });
  }
});

app.post('/resume/fingerprint-template', express.json(), async (req, res) => {
  console.log('[server] POST /resume/fingerprint-template');

  try {
    const { templateDocxBase64 } = req.body;

    if (!templateDocxBase64) {
      return res.status(400).json({ error: 'templateDocxBase64 is required' });
    }

    console.log('[server] Decoding base64 DOCX...');
    // eslint-disable-next-line no-undef
    const buffer = Buffer.from(templateDocxBase64, 'base64');

    console.log('[server] Extracting DOCX structure with mammoth...');
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    console.log('[server] Extracted text length:', text.length);

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const hasSummary = lines.some(line => 
      line.toLowerCase().includes('summary') || 
      line.toLowerCase().includes('objective')
    );

    const sectionOrder = [];
    if (hasSummary) sectionOrder.push('summary');
    if (text.toLowerCase().includes('experience')) sectionOrder.push('experience');
    if (text.toLowerCase().includes('skill')) sectionOrder.push('skills');
    if (text.toLowerCase().includes('education')) sectionOrder.push('education');
    if (text.toLowerCase().includes('certification')) sectionOrder.push('certifications');

    const experienceFingerprint = [];
    const experienceSection = text.match(/experience[\s\S]*?(?=\n\n[A-Z]|$)/i);
    if (experienceSection) {
      const bullets = experienceSection[0].match(/^[•\-*]\s+.+$/gm) || [];
      if (bullets.length > 0) {
        const avgBulletsPerEntry = Math.max(2, Math.floor(bullets.length / Math.max(1, (text.match(/\d{4}/g) || []).length / 2)));
        const avgBulletLength = Math.floor(bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length);
        
        experienceFingerprint.push({
          bulletCount: avgBulletsPerEntry,
          bulletCharBudgets: Array(avgBulletsPerEntry).fill(avgBulletLength),
        });
      }
    }

    if (experienceFingerprint.length === 0) {
      experienceFingerprint.push({
        bulletCount: 3,
        bulletCharBudgets: [100, 100, 100],
      });
    }

    const fingerprint = {
      hasSummary,
      sectionOrder,
      experience: experienceFingerprint,
      totalCharBudget: Math.floor(text.length * 0.8),
    };

    console.log('[server] Generated fingerprint:', JSON.stringify(fingerprint, null, 2));
    res.json(fingerprint);
  } catch (error) {
    console.error('[server] Error fingerprinting template:', error);
    res.status(500).json({
      error: 'Failed to fingerprint template',
      message: error.message,
    });
  }
});

app.post('/resume/render-docx', express.json(), async (req, res) => {
  console.log('[server] POST /resume/render-docx');

  try {
    const { resumeJson, options, templateDocxBase64 } = req.body;

    if (!resumeJson) {
      return res.status(400).json({ error: 'resumeJson is required' });
    }

    console.log('[server] Rendering mode:', options?.mode || 'standard');

    if (options?.mode === 'template' && templateDocxBase64) {
      console.log('[server] Template mode not yet fully implemented - falling back to standard');
    }

    console.log('[server] Creating DOCX with docx library...');
    const sections = [];

    if (resumeJson.header) {
      sections.push(
        new Paragraph({
          text: resumeJson.header.name || 'Candidate Name',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
        })
      );

      const contactParts = [];
      if (resumeJson.header.location) contactParts.push(resumeJson.header.location);
      if (resumeJson.header.phone) contactParts.push(resumeJson.header.phone);
      if (resumeJson.header.email) contactParts.push(resumeJson.header.email);

      if (contactParts.length > 0) {
        sections.push(
          new Paragraph({
            text: contactParts.join(' | '),
            alignment: AlignmentType.CENTER,
          })
        );
      }

      sections.push(new Paragraph({ text: '' }));
    }

    if (resumeJson.summary) {
      sections.push(
        new Paragraph({
          text: 'SUMMARY',
          heading: HeadingLevel.HEADING_2,
        }),
        new Paragraph({ text: resumeJson.summary }),
        new Paragraph({ text: '' })
      );
    }

    if (resumeJson.experience && resumeJson.experience.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EXPERIENCE',
          heading: HeadingLevel.HEADING_2,
        })
      );

      resumeJson.experience.forEach((exp) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: exp.title || 'Role', bold: true }),
              new TextRun({ text: ' | ' }),
              new TextRun({ text: exp.company || 'Company' }),
            ],
          })
        );

        if (exp.dates) {
          sections.push(
            new Paragraph({
              text: exp.dates,
              italics: true,
            })
          );
        }

        if (exp.bullets && exp.bullets.length > 0) {
          exp.bullets.forEach((bullet) => {
            sections.push(
              new Paragraph({
                text: `• ${bullet}`,
                indent: { left: 360 },
              })
            );
          });
        }

        sections.push(new Paragraph({ text: '' }));
      });
    }

    if (resumeJson.skills) {
      sections.push(
        new Paragraph({
          text: 'SKILLS',
          heading: HeadingLevel.HEADING_2,
        })
      );

      if (resumeJson.skills.core && resumeJson.skills.core.length > 0) {
        sections.push(
          new Paragraph({
            text: `Core: ${resumeJson.skills.core.join(', ')}`,
          })
        );
      }

      if (resumeJson.skills.tools && resumeJson.skills.tools.length > 0) {
        sections.push(
          new Paragraph({
            text: `Tools: ${resumeJson.skills.tools.join(', ')}`,
          })
        );
      }

      if (resumeJson.skills.domains && resumeJson.skills.domains.length > 0) {
        sections.push(
          new Paragraph({
            text: `Domains: ${resumeJson.skills.domains.join(', ')}`,
          })
        );
      }

      sections.push(new Paragraph({ text: '' }));
    }

    if (resumeJson.education && resumeJson.education.length > 0) {
      sections.push(
        new Paragraph({
          text: 'EDUCATION',
          heading: HeadingLevel.HEADING_2,
        })
      );

      resumeJson.education.forEach((edu) => {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({ text: edu.school || 'University', bold: true }),
              new TextRun({ text: ' | ' }),
              new TextRun({ text: edu.degree || 'Degree' }),
            ],
          })
        );

        if (edu.dates) {
          sections.push(
            new Paragraph({
              text: edu.dates,
              italics: true,
            })
          );
        }

        sections.push(new Paragraph({ text: '' }));
      });
    }

    if (resumeJson.certifications && resumeJson.certifications.length > 0) {
      sections.push(
        new Paragraph({
          text: 'CERTIFICATIONS',
          heading: HeadingLevel.HEADING_2,
        })
      );

      resumeJson.certifications.forEach((cert) => {
        sections.push(
          new Paragraph({
            text: `• ${cert}`,
            indent: { left: 360 },
          })
        );
      });
    }

    const doc = new Document({
      sections: [
        {
          children: sections,
        },
      ],
    });

    console.log('[server] Packing DOCX...');
    const buffer = await Packer.toBuffer(doc);

    console.log('[server] DOCX generated, size:', buffer.length);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': 'attachment; filename="tailored-resume.docx"',
    });
    res.send(buffer);
  } catch (error) {
    console.error('[server] Error rendering DOCX:', error);
    res.status(500).json({
      error: 'Failed to render DOCX',
      message: error.message,
    });
  }
});

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Resume extractor service running on port ${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
  console.log(`[server] Endpoints:`);
  console.log(`[server]   - POST /extract/docx`);
  console.log(`[server]   - POST /extract-resume-text`);
  console.log(`[server]   - POST /resume/fingerprint-template`);
  console.log(`[server]   - POST /resume/render-docx`);
});
