import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { toByteArray } from "base64-js";

export type ExtractedResumeText = {
  text: string;
  source: "local_docx" | "local_txt" | "remote_pdf";
  docxBase64?: string;
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

function getFileTypeFromUri(uri: string, fileName?: string, mimeType?: string): "pdf" | "docx" | "doc" | "txt" | "unknown" {
  if (fileName) {
    const lowerName = fileName.toLowerCase();
    if (lowerName.endsWith('.pdf')) return "pdf";
    if (lowerName.endsWith('.docx')) return "docx";
    if (lowerName.endsWith('.doc')) return "doc";
    if (lowerName.endsWith('.txt')) return "txt";
  }

  if (mimeType) {
    if (mimeType === "application/pdf") return "pdf";
    if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
    if (mimeType === "application/msword") return "doc";
    if (mimeType === "text/plain") return "txt";
  }

  const uriFileName = uri.split('/').pop() || '';
  const lowerName = uriFileName.toLowerCase();
  
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

function bytesToHex(bytes: Uint8Array, count: number = 8): string {
  return Array.from(bytes.slice(0, count))
    .map(b => b.toString(16).padStart(2, '0'))
    .join(' ');
}

function bytesToAscii(bytes: Uint8Array, count: number = 8): string {
  return Array.from(bytes.slice(0, count))
    .map(b => (b >= 32 && b < 127) ? String.fromCharCode(b) : '.')
    .join('');
}

async function extractDOCXLocally(uri: string): Promise<{ text: string; base64: string }> {
  console.log("[extractDOCX] Starting local DOCX extraction...");
  console.log("[extractDOCX] Platform:", Platform.OS);
  console.log("[extractDOCX] URI:", uri);
  
  try {
    console.log("[extractDOCX] Importing mammoth...");
    const mammoth = await import("mammoth");
    console.log("[extractDOCX] Mammoth imported successfully");
    
    let arrayBuffer: ArrayBuffer;
    let base64: string;
    
    if (Platform.OS === 'web') {
      console.log("[extractDOCX] Using web File API");
      
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      arrayBuffer = await response.arrayBuffer();
      console.log("[extractDOCX] Fetched file as ArrayBuffer, size:", arrayBuffer.byteLength);
      
      const uint8Array = new Uint8Array(arrayBuffer);
      base64 = btoa(String.fromCharCode(...uint8Array));
    } else {
      console.log("[extractDOCX] Using expo-file-system for mobile");
      
      let workingUri = uri;
      
      if (Platform.OS === 'ios') {
        console.log("[extractDOCX] iOS detected - forcing copy to cache directory");
        console.log("[extractDOCX] Original URI:", uri);
        
        const isICloudUri = uri.includes('icloud') || uri.includes('CloudDocs');
        console.log("[extractDOCX] Is iCloud URI:", isICloudUri);
        
        try {
          const timestamp = Date.now();
          const safeName = uri.split('/').pop() || `resume_${timestamp}.docx`;
          const cachedUri = `${FileSystem.cacheDirectory}${timestamp}_${safeName}`;
          
          console.log("[extractDOCX] Copying to cache:", cachedUri);
          await FileSystem.copyAsync({ from: uri, to: cachedUri });
          
          workingUri = cachedUri;
          console.log("[extractDOCX] Copy successful, using cached URI:", workingUri);
        } catch (copyError: any) {
          console.warn("[extractDOCX] Copy to cache failed:", copyError.message);
          console.warn("[extractDOCX] Falling back to original URI");
          
          if (isICloudUri) {
            throw new ResumeExtractionError(
              "Couldn't access this file. If it's in iCloud, please download it to your phone first, then try uploading again."
            );
          }
        }
      }
      
      try {
        console.log("[extractDOCX] Reading file as base64 from:", workingUri);
        base64 = await FileSystem.readAsStringAsync(workingUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        console.log("[extractDOCX] Successfully read file as base64");
        console.log("[extractDOCX] Base64 length:", base64.length);
        
        if (!base64 || base64.length < 1000) {
          throw new ResumeExtractionError(
            "Couldn't read this file on your device. Try selecting it again (or move it out of iCloud)."
          );
        }
        
        console.log("[extractDOCX] Converting base64 to ArrayBuffer using base64-js...");
        
        const bytes = toByteArray(base64);
        arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
        
        console.log("[extractDOCX] ArrayBuffer created, size:", arrayBuffer.byteLength);
        
        if (__DEV__) {
          const firstBytes = new Uint8Array(arrayBuffer.slice(0, 8));
          console.log("[extractDOCX] First 8 bytes (hex):", bytesToHex(firstBytes));
          console.log("[extractDOCX] First 8 bytes (ASCII):", bytesToAscii(firstBytes));
          
          const startsWithPK = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B;
          console.log("[extractDOCX] Starts with PK (ZIP header):", startsWithPK);
          
          const isValidZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && 
                            firstBytes[2] === 0x03 && firstBytes[3] === 0x04;
          console.log("[extractDOCX] Valid ZIP signature (PK 03 04):", isValidZip);
        }
        
        const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
        if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4B || 
            firstBytes[2] !== 0x03 || firstBytes[3] !== 0x04) {
          console.error("[extractDOCX] INVALID FILE: Does not start with valid ZIP signature (PK 03 04)");
          console.error("[extractDOCX] First 4 bytes:", bytesToHex(firstBytes, 4));
          
          throw new ResumeExtractionError(
            "This file isn't a valid .docx Word document. Please export/save as .docx (Word 2007+) and try again."
          );
        }
      } catch (fsError: any) {
        console.error("[extractDOCX] FileSystem read error:", fsError);
        
        if (fsError instanceof ResumeExtractionError) {
          throw fsError;
        }
        
        throw new ResumeExtractionError(
          `Failed to read file: ${fsError.message}`
        );
      }
    }
    
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new ResumeExtractionError(
        "File appears to be empty. Please check the file and try again."
      );
    }
    
    console.log("[extractDOCX] Calling mammoth.extractRawText...");
    
    let result;
    try {
      result = await mammoth.default.extractRawText({ arrayBuffer });
    } catch (mammothError: any) {
      console.error("[extractDOCX] Mammoth parsing error:", mammothError);
      console.error("[extractDOCX] Mammoth error message:", mammothError.message);
      
      if (mammothError.message && (mammothError.message.includes('expected') || mammothError.message.includes('XML'))) {
        throw new ResumeExtractionError(
          "We couldn't parse this Word file. Try opening it in Word/Google Docs and re-saving as .docx."
        );
      }
      
      throw new ResumeExtractionError(
        `Word file parsing failed: ${mammothError.message || 'Unknown error'}`
      );
    }
    
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
    
    if (__DEV__) {
      console.log("[extractDOCX] First 200 chars:", cleanedText.slice(0, 200));
    }
    
    if (cleanedText.length === 0) {
      throw new ResumeExtractionError(
        "Could not extract text from Word document. The file may be empty or corrupted."
      );
    }
    
    return { text: cleanedText, base64 };
  } catch (error: any) {
    console.error("[extractDOCX] Extraction failed:", error);
    console.error("[extractDOCX] Error name:", error.name);
    console.error("[extractDOCX] Error message:", error.message);
    
    if (__DEV__) {
      console.error("[extractDOCX] Error stack:", error.stack);
    }
    
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    
    throw new ResumeExtractionError(
      `Failed to extract DOCX text: ${error.message || 'Unknown error'}. Please ensure the file is a valid Word document.`
    );
  }
}

async function extractTXTLocally(uri: string): Promise<string> {
  console.log("[extractTXT] Reading plain text file...");
  console.log("[extractTXT] Platform:", Platform.OS);
  
  try {
    let content: string;
    
    if (Platform.OS === 'web') {
      console.log("[extractTXT] Using web fetch API");
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }
      content = await response.text();
    } else {
      console.log("[extractTXT] Using expo-file-system");
      content = await FileSystem.readAsStringAsync(uri, { encoding: "utf8" });
    }
    
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
  
  const fileType = getFileTypeFromUri(uri, fileName, mimeType);
  console.log("[extractResumeText] Detected file type:", fileType);
  
  let text: string;
  let source: ExtractedResumeText["source"];
  
  let docxBase64: string | undefined;
  
  switch (fileType) {
    case "pdf":
      text = await extractPDFViaServer(uri);
      source = "remote_pdf";
      break;
      
    case "docx":
      const docxResult = await extractDOCXLocally(uri);
      text = docxResult.text;
      docxBase64 = docxResult.base64;
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
  console.log("[extractResumeText] Has docxBase64:", !!docxBase64);
  console.log("[extractResumeText] First 200 chars:", text.slice(0, 200));
  
  return { text, source, docxBase64 };
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
