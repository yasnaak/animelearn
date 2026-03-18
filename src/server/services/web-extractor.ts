interface WebExtractResult {
  text: string;
  title: string;
  byline: string | null;
  siteName: string | null;
}

/**
 * Extract readable text from a web page using regex-based HTML stripping.
 * No heavy dependencies (no jsdom, no cheerio) — safe for serverless.
 */
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

  // Extract title from <title> tag
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Untitled';

  // Extract og:site_name
  const siteNameMatch = html.match(/<meta[^>]*property=["']og:site_name["'][^>]*content=["']([^"']+)["']/i);
  const siteName = siteNameMatch ? siteNameMatch[1] : null;

  // Extract og:author or article:author
  const authorMatch = html.match(/<meta[^>]*(?:name=["']author["']|property=["']article:author["'])[^>]*content=["']([^"']+)["']/i);
  const byline = authorMatch ? authorMatch[1] : null;

  // Remove script, style, nav, header, footer, aside, and SVG tags
  let cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<aside[\s\S]*?<\/aside>/gi, '')
    .replace(/<svg[\s\S]*?<\/svg>/gi, '');

  // Try to extract <article> or <main> content first
  const articleMatch = cleaned.match(/<(?:article|main)[\s\S]*?>([\s\S]*?)<\/(?:article|main)>/i);
  if (articleMatch) {
    cleaned = articleMatch[1];
  }

  // Strip all remaining HTML tags, decode entities
  const text = cleaned
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length < 100) {
    throw new Error('Could not extract meaningful content from this URL. Try a different page.');
  }

  return { text, title, byline, siteName };
}
