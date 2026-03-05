/**
 * Splits long text into chunks that fit within a token budget.
 * Uses a simple heuristic: ~4 chars per token.
 */

const CHARS_PER_TOKEN = 4;

interface ChunkOptions {
  maxTokens?: number;
  overlap?: number; // tokens of overlap between chunks
}

export function chunkText(
  text: string,
  { maxTokens = 8000, overlap = 200 }: ChunkOptions = {},
): string[] {
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  const overlapChars = overlap * CHARS_PER_TOKEN;

  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    let end = start + maxChars;

    // Try to break at a paragraph or sentence boundary
    if (end < text.length) {
      const slice = text.slice(start, end);
      const lastParagraph = slice.lastIndexOf('\n\n');
      const lastSentence = slice.lastIndexOf('. ');

      if (lastParagraph > maxChars * 0.5) {
        end = start + lastParagraph + 2;
      } else if (lastSentence > maxChars * 0.5) {
        end = start + lastSentence + 2;
      }
    }

    chunks.push(text.slice(start, end).trim());
    start = end - overlapChars;
  }

  return chunks;
}

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}
