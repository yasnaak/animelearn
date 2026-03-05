import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

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

  const audioStream = await client.textToSpeech.convert(voiceId, {
    text,
    modelId: 'eleven_multilingual_v2',
    voiceSettings: {
      stability,
      similarityBoost,
      style,
      speed,
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
  const result = await client.textToSoundEffects.convert({
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
  const stream = await client.music.compose({
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
  const voices = await client.voices.getAll();
  return (voices.voices ?? []).map((v) => ({
    id: v.voiceId,
    name: v.name,
    category: v.category,
    labels: v.labels,
    previewUrl: v.previewUrl,
  }));
}

// Default voice mappings for anime character archetypes
export const DEFAULT_VOICE_MAP: Record<string, string> = {
  // These are placeholder ElevenLabs voice IDs — replace with actual IDs
  protagonist_male: '21m00Tcm4TlvDq8ikWAM', // Rachel (placeholder)
  protagonist_female: 'EXAVITQu4vr4xnSDxMaL', // Bella
  mentor: 'VR6AewLTigWG4xSOukaG', // Arnold
  rival: 'pNInz6obpgDQGcFmaJgB', // Adam
  narrator: 'ThT5KcBeYPX3keUQqHPh', // Dorothy
  comic_relief: 'AZnzlk1XvdvUeBnXmlld', // Domi
};

export function getVoiceForRole(
  role: string,
  customVoiceId?: string,
): string {
  if (customVoiceId) return customVoiceId;
  return DEFAULT_VOICE_MAP[role] ?? DEFAULT_VOICE_MAP.narrator;
}
