import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

let _client: ElevenLabsClient | null = null;

function getClient(): ElevenLabsClient {
  if (!_client) {
    _client = new ElevenLabsClient({
      apiKey: process.env.ELEVENLABS_API_KEY,
    });
  }
  return _client;
}

/**
 * Retry wrapper for transient ElevenLabs API failures (rate limits, timeouts).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 2, baseDelayMs = 1500, label = 'ElevenLabs call' } = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt);
        console.warn(
          `[retry] ${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms:`,
          err instanceof Error ? err.message : err,
        );
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ============================================================
// TEXT TO SPEECH
// ============================================================

interface TTSOptions {
  text: string;
  voiceId: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  speed?: number;
}

interface TTSResult {
  audioBuffer: Buffer;
  durationMs: number;
}

export async function generateSpeech(options: TTSOptions): Promise<TTSResult> {
  const {
    text,
    voiceId,
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.3,
    speed = 1.0,
  } = options;

  // ElevenLabs speed must be between 0.7 and 1.2
  const clampedSpeed = Math.min(1.2, Math.max(0.7, speed));

  const audioStream = await withRetry(
    () =>
      getClient().textToSpeech.convert(voiceId, {
        text,
        modelId: 'eleven_multilingual_v2',
        voiceSettings: {
          stability,
          similarityBoost,
          style,
          speed: clampedSpeed,
        },
        outputFormat: 'mp3_44100_128',
      }),
    { label: 'TTS' },
  );

  // Collect stream into buffer
  const reader = audioStream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const audioBuffer = Buffer.concat(chunks);

  // Estimate duration from buffer size (MP3 128kbps = 16KB/s)
  const durationMs = Math.round((audioBuffer.length / 16000) * 1000);

  return { audioBuffer, durationMs };
}

// ============================================================
// SOUND EFFECTS
// ============================================================

interface SFXResult {
  audioBuffer: Buffer;
  durationMs: number;
}

export async function generateSoundEffect(
  description: string,
  durationSeconds: number = 3,
): Promise<SFXResult> {
  const result = await withRetry(
    () =>
      getClient().textToSoundEffects.convert({
        text: description,
        durationSeconds,
      }),
    { label: 'SFX' },
  );

  const reader = (result as ReadableStream<Uint8Array>).getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const audioBuffer = Buffer.concat(chunks);
  const durationMs = Math.round((audioBuffer.length / 16000) * 1000);

  return { audioBuffer, durationMs };
}

// ============================================================
// MUSIC GENERATION
// ============================================================

interface MusicResult {
  audioUrl: string;
  durationMs: number;
}

export async function generateMusic(
  prompt: string,
  durationSeconds: number = 30,
): Promise<MusicResult> {
  const stream = await withRetry(
    () =>
      getClient().music.compose({
        prompt,
        musicLengthMs: durationSeconds * 1000,
        outputFormat: 'mp3_44100_128',
        forceInstrumental: true,
      }),
    { label: 'music' },
  );

  // Collect stream into buffer
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const audioBuffer = Buffer.concat(chunks);
  const audioUrl = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

  return {
    audioUrl,
    durationMs: durationSeconds * 1000,
  };
}

// ============================================================
// VOICE MANAGEMENT
// ============================================================

export async function listVoices() {
  const voices = await getClient().voices.getAll();
  return (voices.voices ?? []).map((v) => ({
    id: v.voiceId,
    name: v.name,
    category: v.category,
    labels: v.labels,
    previewUrl: v.previewUrl,
  }));
}

// Anime-optimized voice mappings using expressive ElevenLabs voices
export const DEFAULT_VOICE_MAP: Record<string, string> = {
  protagonist_male: 'IKne3meq5aSn9XLyUdCD',   // Charlie — energetic, young, confident
  protagonist: 'IKne3meq5aSn9XLyUdCD',         // Charlie
  protagonist_female: 'cgSgspJ2msm6clMCkdW9',  // Jessica — playful, bright, warm
  mentor: 'JBFqnCBsd6RMkjVDRZzb',              // George — warm storyteller
  sensei: 'JBFqnCBsd6RMkjVDRZzb',              // George
  rival: 'SOYHLrjzK2X1ezoPC6cr',               // Harry — fierce warrior
  antagonist: 'SOYHLrjzK2X1ezoPC6cr',          // Harry
  narrator: 'JBFqnCBsd6RMkjVDRZzb',            // George — warm storyteller
  comic_relief: 'N2lVS1w4EtoT3dr4eOWO',        // Callum — husky trickster
  sidekick: 'N2lVS1w4EtoT3dr4eOWO',            // Callum
  support_female: 'FGY2WhTYpPnrIDTdsKH5',      // Laura — enthusiast, quirky
  support_male: 'TX3LPaxmHKxFdv7VOQHJ',        // Liam — energetic
};

export function getVoiceForRole(
  role: string,
  customVoiceId?: string,
): string {
  if (customVoiceId) return customVoiceId;
  return DEFAULT_VOICE_MAP[role] ?? DEFAULT_VOICE_MAP.narrator;
}

// ============================================================
// DELIVERY → VOICE SETTINGS (v2 — shot-based pipeline)
// ============================================================

interface DeliveryVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
}

/**
 * Map screenplay dialogue delivery descriptions to ElevenLabs voice settings.
 * The delivery field from the screenplay (e.g. "whispered trembling", "shouted with fist raised")
 * gets translated to optimal TTS parameters for expressive anime voices.
 */
export function deliveryToVoiceSettings(delivery: string): DeliveryVoiceSettings {
  const d = delivery.toLowerCase();

  // Check for specific keywords and combine their effects
  let stability = 0.5;
  let similarityBoost = 0.75;
  let style = 0.6;
  let speed = 1.0;

  // Volume/intensity modifiers
  if (d.includes('whisper') || d.includes('murmur') || d.includes('sotto voce')) {
    stability = 0.3;
    speed = 0.85;
    style = 0.7;
  } else if (d.includes('shout') || d.includes('yell') || d.includes('scream')) {
    stability = 0.7;
    speed = 1.15;
    style = 0.8;
  } else if (d.includes('quiet') || d.includes('soft') || d.includes('gentle')) {
    stability = 0.4;
    speed = 0.9;
    style = 0.65;
  } else if (d.includes('loud') || d.includes('booming') || d.includes('commanding')) {
    stability = 0.65;
    speed = 1.1;
    style = 0.75;
  }

  // Emotional modifiers (layer on top)
  if (d.includes('trembl') || d.includes('shak') || d.includes('nervous')) {
    stability = Math.max(0.2, stability - 0.15);
    style = Math.min(1.0, style + 0.1);
  }
  if (d.includes('confident') || d.includes('determined') || d.includes('resolute')) {
    stability = Math.min(0.8, stability + 0.15);
    speed = Math.min(1.2, speed + 0.05);
  }
  if (d.includes('sad') || d.includes('melanchol') || d.includes('grief')) {
    speed = Math.max(0.7, speed - 0.1);
    style = Math.min(1.0, style + 0.1);
  }
  if (d.includes('excited') || d.includes('enthusiast') || d.includes('eager')) {
    speed = Math.min(1.2, speed + 0.1);
    stability = Math.max(0.2, stability - 0.1);
    style = Math.min(1.0, style + 0.1);
  }
  if (d.includes('calm') || d.includes('serene') || d.includes('composed')) {
    stability = Math.min(0.8, stability + 0.1);
    speed = Math.max(0.7, speed - 0.05);
  }
  if (d.includes('angry') || d.includes('furious') || d.includes('rage')) {
    stability = Math.max(0.2, stability - 0.1);
    speed = Math.min(1.2, speed + 0.1);
    style = Math.min(1.0, style + 0.15);
  }
  if (d.includes('sarcastic') || d.includes('ironic') || d.includes('mocking')) {
    style = Math.min(1.0, style + 0.15);
    speed = Math.min(1.2, speed + 0.05);
  }
  if (d.includes('dramatic') || d.includes('theatrical')) {
    style = Math.min(1.0, style + 0.2);
    stability = Math.max(0.2, stability - 0.1);
  }

  // Clamp speed to ElevenLabs range
  speed = Math.min(1.2, Math.max(0.7, speed));

  return { stability, similarityBoost, style, speed };
}
