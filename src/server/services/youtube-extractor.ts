import { YoutubeTranscript } from 'youtube-transcript';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

let _genAI: GoogleGenerativeAI | null = null;

function getGemini() {
  if (!_genAI) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY is required to transcribe YouTube videos without captions.');
    }
    _genAI = new GoogleGenerativeAI(key);
  }
  return _genAI;
}

/**
 * Transcribe via Gemini with a hard 50s timeout using Promise.race.
 * Gemini SDK doesn't support AbortSignal, so we race against a timer.
 */
async function transcribeWithGemini(videoId: string): Promise<YouTubeExtractResult> {
  const model = getGemini().getGenerativeModel({
    model: 'gemini-2.0-flash',
  });

  const geminiPromise = model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: `https://www.youtube.com/watch?v=${videoId}`,
            mimeType: 'video/*',
          },
        },
        {
          text: 'Transcribe ALL spoken content in this video verbatim. Output ONLY the raw transcript text — no timestamps, no speaker labels, no commentary, no formatting.',
        },
      ],
    }],
  });

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('GEMINI_TIMEOUT')), 50_000);
  });

  const result = await Promise.race([geminiPromise, timeoutPromise]);

  const text = result.response.text();
  if (!text?.trim()) {
    throw new Error('Transcription returned empty — the video may not have spoken content.');
  }

  const wordCount = text.trim().split(/\s+/).length;
  const estimatedDuration = Math.ceil((wordCount / 150) * 60);

  return { text: text.trim(), videoId, durationSeconds: estimatedDuration };
}

/**
 * Extract transcript from a YouTube video.
 * 1. Tries built-in captions first (free, instant)
 * 2. Falls back to Gemini transcription with 50s timeout
 */
export async function extractYouTubeTranscript(url: string): Promise<YouTubeExtractResult> {
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
        (lastSegment?.offset ?? 0) / 1000 + (lastSegment?.duration ?? 0) / 1000,
      );
      return { text: text.trim(), videoId, durationSeconds };
    }
  } catch (err) {
    console.warn(
      `[youtube] Captions unavailable for ${videoId}, falling back to Gemini:`,
      err instanceof Error ? err.message : err,
    );
  }

  // Strategy 2: Gemini transcription with timeout
  try {
    return await transcribeWithGemini(videoId);
  } catch (err) {
    if (err instanceof Error && err.message === 'GEMINI_TIMEOUT') {
      throw new Error(
        'Transcript extraction timed out. This video has no captions and is too long to transcribe on the current plan. Try a shorter video or one with subtitles enabled.',
      );
    }
    throw err;
  }
}
