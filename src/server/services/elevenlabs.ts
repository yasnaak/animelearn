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

  const audioStream = await getClient().textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2',
    voiceSettings: {
      stability,
      similarityBoost,
      style,
      speed: clampedSpeed,
    },
    outputFormat: 'mp3_44100_128',
  });

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
  const result = await getClient().textToSoundEffects.convert({
    text: description,
    durationSeconds,
  });

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
  const stream = await getClient().music.compose({
    prompt,
    musicLengthMs: durationSeconds * 1000,
    outputFormat: 'mp3_44100_128',
    forceInstrumental: true,
  });

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
