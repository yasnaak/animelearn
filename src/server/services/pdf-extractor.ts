import { extractText } from 'unpdf';

export interface PDFExtractResult {
  text: string;
  numPages: number;
}

export async function extractPDFText(buffer: Buffer): Promise<PDFExtractResult> {
  const uint8 = new Uint8Array(buffer);
  const result = await extractText(uint8);

  const text = Array.isArray(result.text)
    ? result.text.join('\n\n')
    : String(result.text);

  return {
    text: text.trim(),
    numPages: result.totalPages,
  };
}
