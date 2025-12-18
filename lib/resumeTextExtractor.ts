import * as FileSystem from "expo-file-system";

export type ExtractedText = {
  text: string;
  fileName: string;
  fileType: string;
};

export class ResumeExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeExtractionError";
  }
}

function detectPDFMarkers(content: string): boolean {
  const preview = content.slice(0, 1000);
  
  const pdfMarkers = [
    "%PDF-",
    " obj <</",
    "/Title (",
    "/Producer (",
    "/Creator (",
    "endobj",
    "/Type /Catalog",
    "/Type /Page",
    "%%EOF",
  ];

  return pdfMarkers.some(marker => preview.includes(marker));
}

function detectDOCXMarkers(content: string): boolean {
  const preview = content.slice(0, 1000);
  
  const docxMarkers = [
    "PK\x03\x04",
    "word/document.xml",
    "[Content_Types].xml",
    "_rels/.rels",
  ];

  return docxMarkers.some(marker => preview.includes(marker));
}

function isProbablyBinary(content: string): boolean {
  const preview = content.slice(0, 500);
  let nullCount = 0;
  let nonPrintableCount = 0;

  for (let i = 0; i < preview.length; i++) {
    const code = preview.charCodeAt(i);
    if (code === 0) nullCount++;
    if (code < 32 && code !== 9 && code !== 10 && code !== 13) {
      nonPrintableCount++;
    }
  }

  return nullCount > 0 || nonPrintableCount > preview.length * 0.1;
}

export async function extractResumeText(uri: string, fileName?: string): Promise<ExtractedText> {
  console.log("[extractResumeText] Starting extraction for:", fileName || uri);

  const detectedFileName = fileName || uri.split('/').pop() || 'resume';
  const fileExt = detectedFileName.toLowerCase();

  if (fileExt.endsWith('.pdf')) {
    console.error("[extractResumeText] PDF file detected by extension");
    throw new ResumeExtractionError(
      "PDF files are not currently supported.\n\nPlease either:\n• Save your resume as a .txt file\n• Copy-paste your resume content in the chat\n\nWe're working on proper PDF text extraction."
    );
  }

  if (fileExt.endsWith('.doc') || fileExt.endsWith('.docx')) {
    console.error("[extractResumeText] Word document detected by extension");
    throw new ResumeExtractionError(
      "Word documents are not currently supported.\n\nPlease either:\n• Save your resume as a .txt file\n• Copy-paste your resume content in the chat\n\nWe're working on proper document text extraction."
    );
  }

  let content: string | null = null;
  
  try {
    console.log("[extractResumeText] Reading file as UTF-8 string...");
    content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
    console.log("[extractResumeText] Read succeeded, length:", content.length);
  } catch (fsErr) {
    console.warn("[extractResumeText] FileSystem read failed, trying fetch fallback...", fsErr);
    try {
      const resp = await fetch(uri);
      content = await resp.text();
      console.log("[extractResumeText] Fetch fallback succeeded");
    } catch (fetchErr) {
      console.error("[extractResumeText] Fetch fallback also failed:", fetchErr);
      throw new ResumeExtractionError(
        "Could not read the selected file. Please try a different file or paste your resume content in the chat."
      );
    }
  }

  if (!content || content.trim().length === 0) {
    console.error("[extractResumeText] Content is empty after read");
    throw new ResumeExtractionError(
      "The selected file appears to be empty. Please select a different file."
    );
  }

  console.log("[extractResumeText] Content length:", content.length);
  console.log("[extractResumeText] First 200 chars:", content.slice(0, 200));

  if (detectPDFMarkers(content)) {
    console.error("[extractResumeText] CRITICAL: PDF structure detected in content");
    console.error("[extractResumeText] This file was read as binary/metadata, not as text");
    console.error("[extractResumeText] First 500 chars:", content.slice(0, 500));
    throw new ResumeExtractionError(
      "This file contains PDF metadata or structure.\n\nPDF files cannot be processed correctly by this app yet.\n\nPlease save your resume as a plain text (.txt) file or paste the content in the chat."
    );
  }

  if (detectDOCXMarkers(content)) {
    console.error("[extractResumeText] CRITICAL: DOCX structure detected in content");
    throw new ResumeExtractionError(
      "This file contains Word document structure.\n\nWord files cannot be processed correctly by this app yet.\n\nPlease save your resume as a plain text (.txt) file or paste the content in the chat."
    );
  }

  if (isProbablyBinary(content)) {
    console.error("[extractResumeText] CRITICAL: Binary content detected");
    throw new ResumeExtractionError(
      "This file appears to be a binary format that cannot be processed.\n\nPlease save your resume as a plain text (.txt) file or paste the content in the chat."
    );
  }

  console.log("[extractResumeText] All validation checks passed");
  console.log("[extractResumeText] Content is clean text, length:", content.length);

  return {
    text: content,
    fileName: detectedFileName,
    fileType: fileExt.split('.').pop() || 'unknown',
  };
}

export function validateResumeTextBeforeParsing(text: string): void {
  console.log("[validateResumeText] Running pre-parse validation...");
  console.log("[validateResumeText] Text length:", text.length);

  const preview = text.slice(0, 500);
  console.log("[validateResumeText] First 500 chars:", preview);

  if (detectPDFMarkers(text)) {
    console.error("[validateResumeText] BLOCKING: PDF markers detected in text");
    throw new ResumeExtractionError(
      "Invalid input: PDF structure or metadata detected. Resume text must be extracted first, not raw file bytes."
    );
  }

  if (detectDOCXMarkers(text)) {
    console.error("[validateResumeText] BLOCKING: DOCX markers detected in text");
    throw new ResumeExtractionError(
      "Invalid input: Word document structure detected. Resume text must be extracted first, not raw file bytes."
    );
  }

  if (isProbablyBinary(text)) {
    console.error("[validateResumeText] BLOCKING: Binary content detected in text");
    throw new ResumeExtractionError(
      "Invalid input: Binary content detected. Only human-readable text is allowed."
    );
  }

  if (text.trim().length < 50) {
    console.error("[validateResumeText] BLOCKING: Text too short");
    throw new ResumeExtractionError(
      "Resume text is too short (less than 50 characters). Please provide a complete resume."
    );
  }

  console.log("[validateResumeText] Validation passed - text is clean");
}
