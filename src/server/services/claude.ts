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
}

interface ClaudeResult<T> {
  data: T;
  inputTokens: number;
  outputTokens: number;
  model: string;
}

const MODEL_MAP = {
  sonnet: 'claude-sonnet-4-5-20241022',
  opus: 'claude-opus-4-5-20250514',
} as const;

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  } = options;

  const modelId = MODEL_MAP[model];
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await getClient().messages.create({
        model: modelId,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const textBlock = response.content.find((b) => b.type === 'text');
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response from Claude');
      }

      // Extract JSON from response (handle markdown code blocks)
      let jsonText = textBlock.text.trim();
      const codeBlockMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1].trim();
      }

      const data = JSON.parse(jsonText) as T;

      console.log(
        `[Claude] ${model} | ${response.usage.input_tokens}in + ${response.usage.output_tokens}out tokens`,
      );

      return {
        data,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: modelId,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on JSON parse errors (bad output, not transient)
      if (lastError.message.includes('JSON')) {
        // Try one more time with a stricter temperature
        if (attempt === 0) {
          console.warn('[Claude] JSON parse failed, retrying with lower temperature');
          options.temperature = 0.3;
          continue;
        }
        throw lastError;
      }

      // Retry on rate limit / server errors
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
