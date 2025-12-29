import mammoth from "mammoth";
import { ResumeExtractionError } from "./resumeTextExtractor";

export async function extractDocxText(params: {
  uri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<{ text: string; base64: string }> {
  console.log("[extractDocxText.web] Starting web DOCX extraction...");
  console.log("[extractDocxText.web] URI:", params.uri);

  try {
    console.log("[extractDocxText.web] Fetching file via web API...");
    const response = await fetch(params.uri);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    console.log("[extractDocxText.web] File fetched, size:", arrayBuffer.byteLength);

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new ResumeExtractionError(
        "File appears to be empty. Please check the file and try again."
      );
    }

    const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
    if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4B || 
        firstBytes[2] !== 0x03 || firstBytes[3] !== 0x04) {
      console.error("[extractDocxText.web] Invalid DOCX: Missing ZIP signature");
      throw new ResumeExtractionError(
        "This file isn't a valid .docx Word document. Please export/save as .docx (Word 2007+) and try again."
      );
    }

    console.log("[extractDocxText.web] Valid DOCX detected, calling mammoth...");
    let result;
    
    try {
      result = await mammoth.extractRawText({ arrayBuffer });
    } catch (mammothError: any) {
      console.error("[extractDocxText.web] Mammoth error:", mammothError);
      
      if (mammothError.message && (mammothError.message.includes('expected') || mammothError.message.includes('XML'))) {
        throw new ResumeExtractionError(
          "We couldn't parse this Word file. Try opening it in Word/Google Docs and re-saving as .docx."
        );
      }
      
      throw new ResumeExtractionError(
        `Word file parsing failed: ${mammothError.message || 'Unknown error'}`
      );
    }

    const cleanedText = result.value
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();

    console.log("[extractDocxText.web] Extraction complete, text length:", cleanedText.length);

    if (cleanedText.length === 0) {
      throw new ResumeExtractionError(
        "Could not extract text from Word document. The file may be empty or corrupted."
      );
    }

    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));

    return { text: cleanedText, base64 };
  } catch (error: any) {
    console.error("[extractDocxText.web] Extraction failed:", error);
    
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    
    throw new ResumeExtractionError(
      `Failed to extract DOCX text: ${error.message || 'Unknown error'}. Please ensure the file is a valid Word document.`
    );
  }
}
