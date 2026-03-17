import { YoutubeTranscript } from 'youtube-transcript';
import ytdl from '@distube/ytdl-core';
import { transcribeAudio } from './fal';

export interface YouTubeExtractResult {
  text: string;
  videoId: string;
  durationSeconds: number;
}

const VIDEO_ID_RE =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractVideoId(url: string): string | null {
  const match = url.match(VIDEO_ID_RE);
  return match?.[1] ?? null;
}

/**
 * Fallback: extract audio URL from YouTube and transcribe with Whisper via fal.ai.
 * Used when captions/transcripts are disabled on the video.
 */
async function transcribeYouTubeAudio(
  videoId: string,
): Promise<YouTubeExtractResult> {
  const info = await ytdl.getInfo(videoId);

  // Pick an audio-only format (smallest to minimize transfer time)
  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: 'lowestaudio',
    filter: 'audioonly',
  });

  if (!audioFormat?.url) {
    throw new Error(
      'Could not extract audio from this YouTube video. It may be restricted.',
    );
  }

  const durationSeconds =
    parseInt(info.videoDetails.lengthSeconds, 10) || 0;

  // Send audio URL directly to fal.ai Whisper (no local download needed)
  const result = await transcribeAudio(audioFormat.url);

  if (!result.text?.trim()) {
    throw new Error(
      'Audio transcription returned empty — the video may not have spoken content.',
    );
  }

  return { text: result.text.trim(), videoId, durationSeconds };
}

/**
 * Extract transcript from a YouTube video.
 * 1. Tries built-in captions first (free, instant)
 * 2. Falls back to audio extraction + Whisper transcription
 */
export async function extractYouTubeTranscript(
  url: string,
): Promise<YouTubeExtractResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL — could not extract video ID');
  }

  // Strategy 1: Built-in captions (free, fast)
  try {
    const segments = await YoutubeTranscript.fetchTranscript(videoId);

    if (segments && segments.length > 0) {
      const text = segments.map((s) => s.text).join(' ');
      const lastSegment = segments[segments.length - 1];
      const durationSeconds = Math.ceil(
        (lastSegment?.offset ?? 0) / 1000 +
          (lastSegment?.duration ?? 0) / 1000,
      );
      return { text: text.trim(), videoId, durationSeconds };
    }
  } catch (err) {
    console.warn(
      `[youtube] Captions unavailable for ${videoId}, falling back to audio transcription:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Strategy 2: Audio extraction + Whisper transcription
  return transcribeYouTubeAudio(videoId);
}
