import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { toByteArray } from "base64-js";
import JSZip from "jszip";
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

function wordXmlToText(xml: string): string {
  console.log("[wordXmlToText] Converting WordprocessingML to plain text, xml length:", xml.length);
  
  let text = xml;
  
  text = text.replace(/<\/w:p>/g, '\n');
  text = text.replace(/<w:br\s*\/>/g, '\n');
  text = text.replace(/<w:cr\s*\/>/g, '\n');
  text = text.replace(/<w:tab\s*\/>/g, '\t');
  
  const textMatches = text.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g);
  const extractedParts: string[] = [];
  
  for (const match of textMatches) {
    if (match[1]) {
      extractedParts.push(match[1]);
    }
  }
  
  let result = extractedParts.join('');
  
  result = result.replace(/&amp;/g, '&');
  result = result.replace(/&lt;/g, '<');
  result = result.replace(/&gt;/g, '>');
  result = result.replace(/&quot;/g, '"');
  result = result.replace(/&apos;/g, "'");
  
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.replace(/[ \t]{2,}/g, ' ');
  result = result.trim();
  
  console.log("[wordXmlToText] Conversion complete, result length:", result.length);
  return result;
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
    
    const arrayBuffer: ArrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

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

    console.log("[extractDocxText.native] Valid DOCX detected, extracting locally with JSZip...");

    console.log("[extractDocxText.native] Loading DOCX as ZIP archive...");
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    console.log("[extractDocxText.native] ZIP loaded successfully");
    const fileNames = Object.keys(zip.files);
    console.log("[extractDocxText.native] Files in DOCX:", fileNames.length);
    
    if (__DEV__) {
      console.log("[extractDocxText.native] DOCX structure:", fileNames.slice(0, 10).join(', '));
    }

    const documentFile = zip.file("word/document.xml");
    if (!documentFile) {
      console.error("[extractDocxText.native] word/document.xml not found in DOCX");
      throw new ResumeExtractionError(
        "This DOCX file appears to be corrupted (missing document.xml). Please re-save it and try again."
      );
    }

    console.log("[extractDocxText.native] Extracting word/document.xml...");
    const documentXml = await documentFile.async("string");
    console.log("[extractDocxText.native] document.xml length:", documentXml.length);

    let text = wordXmlToText(documentXml);

    const headerFiles = fileNames.filter(name => name.startsWith("word/header") && name.endsWith(".xml"));
    const footerFiles = fileNames.filter(name => name.startsWith("word/footer") && name.endsWith(".xml"));
    
    console.log("[extractDocxText.native] Found", headerFiles.length, "headers and", footerFiles.length, "footers");

    for (const headerPath of headerFiles) {
      const headerFile = zip.file(headerPath);
      if (headerFile) {
        console.log("[extractDocxText.native] Processing header:", headerPath);
        const headerXml = await headerFile.async("string");
        const headerText = wordXmlToText(headerXml);
        if (headerText.trim().length > 0) {
          text = headerText + "\n" + text;
        }
      }
    }

    for (const footerPath of footerFiles) {
      const footerFile = zip.file(footerPath);
      if (footerFile) {
        console.log("[extractDocxText.native] Processing footer:", footerPath);
        const footerXml = await footerFile.async("string");
        const footerText = wordXmlToText(footerXml);
        if (footerText.trim().length > 0) {
          text = text + "\n" + footerText;
        }
      }
    }

    text = text.trim();
    console.log("[extractDocxText.native] Local extraction complete, total text length:", text.length);

    if (!text || text.length === 0) {
      throw new ResumeExtractionError(
        "Could not extract text from this Word document. The file may be empty or corrupted."
      );
    }

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
