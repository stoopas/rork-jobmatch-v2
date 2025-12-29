import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { toByteArray } from "base64-js";
import { ResumeExtractionError } from "./resumeTextExtractor";
import { ensureLocalCacheUri } from "./fileUtils";

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

export async function extractDocxText(params: {
  uri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<{ text: string; base64: string }> {
  console.log("[extractDocxText.native] Starting native DOCX extraction...");
  console.log("[extractDocxText.native] Platform:", Platform.OS);
  console.log("[extractDocxText.native] URI:", params.uri);

  try {
    let workingUri = params.uri;

    if (Platform.OS === 'ios') {
      console.log("[extractDocxText.native] iOS - copying to cache first...");
      workingUri = await ensureLocalCacheUri(params.uri, params.fileName);
      console.log("[extractDocxText.native] Using cached URI:", workingUri);
    }

    console.log("[extractDocxText.native] Reading file as base64...");
    const base64 = await FileSystem.readAsStringAsync(workingUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    console.log("[extractDocxText.native] Base64 read complete, length:", base64.length);

    if (!base64 || base64.length < 1000) {
      throw new ResumeExtractionError(
        "Couldn't read this file on your device. Try selecting it again (or move it out of iCloud)."
      );
    }

    console.log("[extractDocxText.native] Decoding base64 to bytes using base64-js...");
    const bytes = toByteArray(base64);
    const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);

    console.log("[extractDocxText.native] ArrayBuffer created, size:", arrayBuffer.byteLength);

    if (__DEV__) {
      const firstBytes = new Uint8Array(arrayBuffer.slice(0, 8));
      console.log("[extractDocxText.native] First 8 bytes (hex):", bytesToHex(firstBytes));
      console.log("[extractDocxText.native] First 8 bytes (ASCII):", bytesToAscii(firstBytes));
      
      const startsWithPK = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B;
      console.log("[extractDocxText.native] Starts with PK:", startsWithPK);
      
      const isValidZip = firstBytes[0] === 0x50 && firstBytes[1] === 0x4B && 
                        firstBytes[2] === 0x03 && firstBytes[3] === 0x04;
      console.log("[extractDocxText.native] Valid ZIP signature:", isValidZip);
    }

    const firstBytes = new Uint8Array(arrayBuffer.slice(0, 4));
    if (firstBytes[0] !== 0x50 || firstBytes[1] !== 0x4B || 
        firstBytes[2] !== 0x03 || firstBytes[3] !== 0x04) {
      console.error("[extractDocxText.native] INVALID FILE: Not a valid ZIP/DOCX");
      console.error("[extractDocxText.native] First 4 bytes:", bytesToHex(firstBytes, 4));
      
      throw new ResumeExtractionError(
        "This file isn't a valid .docx Word document. Please export/save as .docx (Word 2007+) and try again."
      );
    }

    console.log("[extractDocxText.native] Valid DOCX detected, sending to server...");

    const extractorUrl = process.env.EXPO_PUBLIC_RESUME_EXTRACTOR_URL;

    if (!extractorUrl) {
      console.error("[extractDocxText.native] EXPO_PUBLIC_RESUME_EXTRACTOR_URL not configured");
      throw new ResumeExtractionError(
        "DOCX extraction isn't available right now on mobile. Please try again later or upload a plain text resume."
      );
    }

    console.log("[extractDocxText.native] Extractor URL:", extractorUrl);
    console.log("[extractDocxText.native] Calling POST /extract/docx...");

    const response = await fetch(`${extractorUrl}/extract/docx`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        base64,
        fileName: params.fileName,
        mimeType: params.mimeType,
      }),
    });

    console.log("[extractDocxText.native] Server response status:", response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error("[extractDocxText.native] Server error:", errorData);
      throw new ResumeExtractionError(
        errorData.error || `Server returned error: ${response.status}`
      );
    }

    const result = await response.json();
    console.log("[extractDocxText.native] Server extraction successful, text length:", result.text?.length || 0);

    if (!result.text || result.text.trim().length === 0) {
      throw new ResumeExtractionError(
        "Server extracted no text from the DOCX. The file may be empty or corrupted."
      );
    }

    const text = result.text.trim();

    if (text.includes("%PDF-") || text.includes("/Title (") || text.includes("obj <</")) {
      console.error("[extractDocxText.native] PDF markers detected in extracted text!");
      throw new ResumeExtractionError(
        "Invalid extracted text: PDF structure detected. This indicates a bug in the extraction process."
      );
    }

    if (text.length < 200) {
      console.warn("[extractDocxText.native] Extracted text is very short:", text.length);
      throw new ResumeExtractionError(
        "Extracted text is too short. Please ensure your resume has content."
      );
    }

    console.log("[extractDocxText.native] Extraction complete and validated");
    return { text, base64 };

  } catch (error: any) {
    console.error("[extractDocxText.native] Extraction failed:", error);
    
    if (error instanceof ResumeExtractionError) {
      throw error;
    }
    
    throw new ResumeExtractionError(
      `Failed to extract DOCX text: ${error.message || 'Unknown error'}. Please ensure the file is a valid Word document.`
    );
  }
}
