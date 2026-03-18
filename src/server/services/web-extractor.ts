import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

interface WebExtractResult {
  text: string;
  title: string;
  byline: string | null;
  siteName: string | null;
}

export async function extractWebContent(url: string): Promise<WebExtractResult> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; Drawnema/1.0)',
      Accept: 'text/html,application/xhtml+xml',
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    throw new Error('URL does not point to an HTML page');
  }

  const html = await response.text();
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (!article || !article.textContent || article.textContent.trim().length < 100) {
    throw new Error('Could not extract meaningful content from this URL. Try a different page.');
  }

  // Clean up whitespace: collapse multiple newlines
  const text = article.textContent
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text,
    title: article.title || 'Untitled',
    byline: article.byline ?? null,
    siteName: article.siteName ?? null,
  };
}
