import { YoutubeTranscript } from 'youtube-transcript';

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

export async function extractYouTubeTranscript(
  url: string,
): Promise<YouTubeExtractResult> {
  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error('Invalid YouTube URL — could not extract video ID');
  }

  const segments = await YoutubeTranscript.fetchTranscript(videoId);

  if (!segments || segments.length === 0) {
    throw new Error(
      'No transcript available for this video. Make sure captions are enabled.',
    );
  }

  const text = segments.map((s) => s.text).join(' ');
  const lastSegment = segments[segments.length - 1];
  const durationSeconds = Math.ceil(
    (lastSegment?.offset ?? 0) / 1000 + (lastSegment?.duration ?? 0) / 1000,
  );

  return { text: text.trim(), videoId, durationSeconds };
}
