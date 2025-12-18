import * as FileSystem from "expo-file-system/legacy";

export type ExtractedResumeText = {
  text: string;
  source: "local_docx" | "local_txt" | "remote_pdf";
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

function getFileTypeFromUri(uri: string, mimeType?: string): "pdf" | "docx" | "doc" | "txt" | "unknown" {
  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    if (mimeType === "application/msword") return "doc";
    if (mimeType === "text/plain") return "txt";
  }

  const fileName = uri.split('/').pop() || '';
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.endsWith('.pdf')) return "pdf";
  if (lowerName.endsWith('.docx')) return "docx";
  if (lowerName.endsWith('.doc')) return "doc";
  if (lowerName.endsWith('.txt')) return "txt";
  
  return "unknown";
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

async function extractPDFViaServer(uri: string): Promise<string> {
  console.log("[extractPDF] Starting server-side PDF extraction...");
  
  const extractorUrl = process.env.EXPO_PUBLIC_RESUME_EXTRACTOR_URL;
  
  if (!extractorUrl) {
    console.error("[extractPDF] EXPO_PUBLIC_RESUME_EXTRACTOR_URL not configured");
    throw new ResumeExtractionError(
      "PDF extraction requires the extractor service URL.\n\nPlease set EXPO_PUBLIC_RESUME_EXTRACTOR_URL in your environment configuration."
    );
  }

  console.log("[extractPDF] Extractor URL:", extractorUrl);

  const formData = new FormData();
  
  formData.append('file', {
    uri,
    type: 'application/pdf',
    name: 'resume.pdf',
  } as any);

  console.log("[extractPDF] Uploading PDF to server...");
  
  try {
    const response = await fetch(`${extractorUrl}/extract-resume-text`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log("[extractPDF] Server response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error("[extractPDF] Server error:", errorData);
      throw new ResumeExtractionError(
        errorData.error || `Server returned error: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("[extractPDF] Extraction successful, text length:", result.text?.length || 0);
    
    if (!result.text || result.text.trim().length === 0) {
      throw new ResumeExtractionError(
        "Server extracted no text from the PDF. The file may be empty or corrupted."
      );
    }

    return result.text;
  } catch (error: any) {
    console.error("[extractPDF] Extraction failed:", error);
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    throw new ResumeExtractionError(
      `Failed to extract PDF text: ${error.message || 'Network error'}`
    );
  }
}

async function extractDOCXLocally(uri: string): Promise<string> {
  console.log("[extractDOCX] Starting local DOCX extraction...");
  
  try {
    const mammoth = await import("mammoth");
    
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: "base64" as any,
    });
    
    console.log("[extractDOCX] Read file as base64, length:", base64.length);
    
    const arrayBuffer = Uint8Array.from(atob(base64), c => c.charCodeAt(0)).buffer;
    
    console.log("[extractDOCX] Converted to ArrayBuffer, calling mammoth...");
    const result = await mammoth.default.extractRawText({ arrayBuffer });
    
    console.log("[extractDOCX] Mammoth extraction complete");
    console.log("[extractDOCX] Extracted text length:", result.value.length);
    
    if (result.messages && result.messages.length > 0) {
      console.warn("[extractDOCX] Mammoth messages:", result.messages);
    }
    
    const cleanedText = result.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    
    console.log("[extractDOCX] Cleaned text length:", cleanedText.length);
    
    if (cleanedText.length === 0) {
      throw new ResumeExtractionError(
        "Could not extract text from Word document. The file may be empty or corrupted."
      );
    }
    
    return cleanedText;
  } catch (error: any) {
    console.error("[extractDOCX] Extraction failed:", error);
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    throw new ResumeExtractionError(
      `Failed to extract DOCX text: ${error.message || 'Unknown error'}`
    );
  }
}

async function extractTXTLocally(uri: string): Promise<string> {
  console.log("[extractTXT] Reading plain text file...");
  
  try {
    const content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
    console.log("[extractTXT] Read succeeded, length:", content.length);
    
    if (!content || content.trim().length === 0) {
      throw new ResumeExtractionError(
        "The text file appears to be empty."
      );
    }
    
    return content;
  } catch (error: any) {
    console.error("[extractTXT] Read failed:", error);
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    throw new ResumeExtractionError(
      `Failed to read text file: ${error.message || 'Unknown error'}`
    );
  }
}

export async function extractResumeText(
  uri: string,
  fileName?: string,
  mimeType?: string
): Promise<ExtractedResumeText> {
  console.log("[extractResumeText] Starting extraction");
  console.log("[extractResumeText] URI:", uri);
  console.log("[extractResumeText] fileName:", fileName);
  console.log("[extractResumeText] mimeType:", mimeType);
  
  const fileType = getFileTypeFromUri(uri, mimeType);
  console.log("[extractResumeText] Detected file type:", fileType);
  
  let text: string;
  let source: ExtractedResumeText["source"];
  
  switch (fileType) {
    case "pdf":
      text = await extractPDFViaServer(uri);
      source = "remote_pdf";
      break;
      
    case "docx":
      text = await extractDOCXLocally(uri);
      source = "local_docx";
      break;
      
    case "doc":
      throw new ResumeExtractionError(
        "Old Word format (.doc) is not supported.\n\nPlease save as .docx or .txt and try again."
      );
      
    case "txt":
      text = await extractTXTLocally(uri);
      source = "local_txt";
      break;
      
    default:
      throw new ResumeExtractionError(
        "Unsupported file format.\n\nSupported formats: PDF, DOCX, TXT"
      );
  }
  
  if (detectPDFMarkers(text)) {
    console.error("[extractResumeText] CRITICAL: PDF structure detected in extracted text!");
    console.error("[extractResumeText] First 500 chars:", text.slice(0, 500));
    throw new ResumeExtractionError(
      "Invalid extracted text: PDF structure detected. This indicates a bug in the extraction process."
    );
  }
  
  if (detectDOCXMarkers(text)) {
    console.error("[extractResumeText] CRITICAL: DOCX structure detected in extracted text!");
    throw new ResumeExtractionError(
      "Invalid extracted text: Word document structure detected. This indicates a bug in the extraction process."
    );
  }
  
  if (isProbablyBinary(text)) {
    console.error("[extractResumeText] CRITICAL: Binary content detected in extracted text!");
    throw new ResumeExtractionError(
      "Invalid extracted text: Binary content detected. This indicates a bug in the extraction process."
    );
  }
  
  if (text.trim().length < 50) {
    throw new ResumeExtractionError(
      "Extracted text is too short (less than 50 characters). Please ensure your resume has content."
    );
  }
  
  console.log("[extractResumeText] Extraction complete and validated");
  console.log("[extractResumeText] Source:", source);
  console.log("[extractResumeText] Text length:", text.length);
  console.log("[extractResumeText] First 200 chars:", text.slice(0, 200));
  
  return { text, source };
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
