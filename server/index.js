const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const upload = multer({
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

app.post('/extract-resume-text', upload.single('file'), async (req, res) => {
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

app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[server] Resume extractor service running on port ${PORT}`);
  console.log(`[server] Health check: http://localhost:${PORT}/health`);
  console.log(`[server] Extract endpoint: http://localhost:${PORT}/extract-resume-text`);
});
