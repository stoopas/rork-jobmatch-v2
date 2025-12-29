import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { ResumeExtractionError } from "./resumeTextExtractor";

export async function ensureLocalCacheUri(uri: string, fileName?: string): Promise<string> {
  if (Platform.OS !== "ios") {
    console.log("[ensureLocalCacheUri] Non-iOS platform, using original URI");
    return uri;
  }

  console.log("[ensureLocalCacheUri] iOS detected - copying file to cache");
  console.log("[ensureLocalCacheUri] Original URI:", uri);

  try {
    const safeName = (fileName || "resume.docx").replace(/[^a-zA-Z0-9._-]/g, "_");
    const timestamp = Date.now();
    const cachedUri = `${FileSystem.cacheDirectory}${timestamp}_${safeName}`;

    console.log("[ensureLocalCacheUri] Target cache path:", cachedUri);
    console.log("[ensureLocalCacheUri] Copying file...");

    await FileSystem.copyAsync({ from: uri, to: cachedUri });

    console.log("[ensureLocalCacheUri] File copied successfully");
    return cachedUri;
  } catch (error: any) {
    console.error("[ensureLocalCacheUri] Copy failed:", error);
    console.error("[ensureLocalCacheUri] Error message:", error.message);

    const isICloudUri = uri.includes("icloud") || uri.includes("CloudDocs");
    if (isICloudUri) {
      throw new ResumeExtractionError(
        "Couldn't access this file from iCloud/Files. Please download it to your phone first and try again."
      );
    }

    throw new ResumeExtractionError(
      `Couldn't access this file: ${error.message || "Unknown error"}`
    );
  }
}
