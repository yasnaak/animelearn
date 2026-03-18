import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _client;
}

interface ClaudeOptions {
  model?: 'sonnet' | 'opus';
  maxTokens?: number;
  temperature?: number;
  systemPrompt: string;
  userPrompt: string;
  timeoutMs?: number;
}

interface ClaudeResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-6',
} as const;

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1500;
const DEFAULT_TIMEOUT_MS = 180_000; // 180s per API call

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Extract valid JSON from Claude's response text.
 * Handles: raw JSON, ```json code blocks, truncated blocks, text around JSON.
 */
function extractJSON(raw: string): string {
  let text = raw.trim();

  // Strip complete code blocks: ```json ... ```
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }
  // Strip opening ``` without closing (truncated)
  else if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\s*\n?/, '').trim();
  }

  // Try parsing as-is first
  try {
    JSON.parse(text);
    return text;
  } catch {
    // Find the outermost { ... } or [ ... ]
    const firstBrace = text.indexOf('{');
    const firstBracket = text.indexOf('[');
    const start = firstBrace === -1 ? firstBracket
      : firstBracket === -1 ? firstBrace
      : Math.min(firstBrace, firstBracket);

    if (start !== -1) {
      const opener = text[start];
      const closer = opener === '{' ? '}' : ']';
      const lastClose = text.lastIndexOf(closer);
      if (lastClose > start) {
        return text.slice(start, lastClose + 1);
      }
    }
  }

  return text;
}

export async function callClaude<T>(
  options: ClaudeOptions,
): Promise<ClaudeResult<T>> {
  const {
    model = 'sonnet',
    maxTokens = 8192,
    temperature = 0.7,
    systemPrompt,
    userPrompt,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  const modelId = MODEL_MAP[model];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Abort signal for timeout
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await getClient().messages.create(
        {
          model: modelId,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        },
        { signal: controller.signal },
      );

      clearTimeout(timer);

      // Log stop reason — catch truncation
      if (response.stop_reason === 'max_tokens') {
        console.warn(
          `[Claude] WARNING: output truncated (max_tokens). Input: ${response.usage.input_tokens}, Output: ${response.usage.output_tokens}`,
        );
      }

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      const jsonText = extractJSON(textBlock.text);
      const data = JSON.parse(jsonText) as T;

      console.log(
        `[Claude] ${model} | ${response.usage.input_tokens}in + ${response.usage.output_tokens}out tokens | ${response.stop_reason}`,
      );

      return {
        data,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: modelId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Timeout — don't retry, fail fast
      if (lastError.name === 'AbortError' || lastError.message.includes('abort')) {
        throw new Error(`Claude API call timed out after ${timeoutMs}ms`);
      }

      // JSON parse error — one retry with lower temperature
      if (lastError.message.includes('JSON')) {
        if (attempt === 0) {
          console.warn('[Claude] JSON parse failed, retrying with lower temperature');
          options.temperature = 0.3;
          continue;
        }
        throw lastError;
      }

      // Rate limit / server errors — retry with backoff
      if (attempt < MAX_RETRIES - 1) {
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `[Claude] Attempt ${attempt + 1} failed: ${lastError.message}. Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error('Claude call failed after retries');
}
