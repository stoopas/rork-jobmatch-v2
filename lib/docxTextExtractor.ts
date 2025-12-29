export type DocxTextExtractorParams = {
  uri: string;
  fileName?: string;
  mimeType?: string;
};

export type DocxTextExtractorResult = {
  text: string;
  base64: string;
};

export async function extractDocxText(
  params: DocxTextExtractorParams
): Promise<DocxTextExtractorResult> {
  throw new Error(
    "extractDocxText must be implemented in platform-specific files (.web.ts or .native.ts)"
  );
}
