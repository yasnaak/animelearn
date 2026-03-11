import Replicate from 'replicate';

let _client: Replicate | null = null;

function getClient(): Replicate {
  if (!_client) {
    _client = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });
  }
  return _client;
}

// ============================================================
// LTX-2.3 VIDEO GENERATION
// ============================================================

interface TextToVideoOptions {
  prompt: string;
  resolution?: '1080p' | '2k' | '4k';
  duration?: 6 | 8 | 10;
  aspectRatio?: '16:9' | '9:16';
  fps?: 24 | 25;
  cameraMotion?: 'static' | 'dolly_forward' | 'dolly_backward' | 'jib_up' | 'jib_down' | 'focus_shift';
  usePro?: boolean;
}

interface ImageToVideoOptions {
  prompt: string;
  imageUrl: string;
  resolution?: '1080p' | '2k' | '4k';
  duration?: 6 | 8 | 10;
  aspectRatio?: '16:9' | '9:16';
  fps?: 24 | 25;
  cameraMotion?: 'static' | 'dolly_forward' | 'dolly_backward' | 'jib_up' | 'jib_down' | 'focus_shift';
  usePro?: boolean;
}

interface VideoResult {
  videoUrl: string;
  durationSeconds: number;
}

/**
 * Generate video from text prompt using LTX-2.3
 */
export async function generateVideoFromText(
  options: TextToVideoOptions,
): Promise<VideoResult> {
  const {
    prompt,
    resolution = '1080p',
    duration = 6,
    aspectRatio = '16:9',
    fps = 24,
    cameraMotion = 'static',
    usePro = false,
  } = options;

  const model = usePro
    ? 'lightricks/ltx-2.3-pro'
    : 'lightricks/ltx-2.3-fast';

  const input: Record<string, unknown> = {
    prompt,
    resolution,
    duration,
    aspect_ratio: aspectRatio,
    fps,
  };

  if (cameraMotion !== 'static') {
    input.camera_motion = cameraMotion;
  }

  const output = await getClient().run(
    model as `${string}/${string}`,
    { input },
  );

  // Replicate returns a URL string or an object with url
  const videoUrl = typeof output === 'string'
    ? output
    : (output as Record<string, unknown>)?.url as string
      ?? (output as Record<string, unknown>)?.output as string
      ?? String(output);

  return {
    videoUrl,
    durationSeconds: duration,
  };
}

/**
 * Animate a still image into video using LTX-2.3 image-to-video
 */
export async function generateVideoFromImage(
  options: ImageToVideoOptions,
): Promise<VideoResult> {
  const {
    prompt,
    imageUrl,
    resolution = '1080p',
    duration = 6,
    aspectRatio = '16:9',
    fps = 24,
    cameraMotion = 'static',
    usePro = false,
  } = options;

  const model = usePro
    ? 'lightricks/ltx-2.3-pro'
    : 'lightricks/ltx-2.3-fast';

  const input: Record<string, unknown> = {
    prompt,
    start_image: imageUrl,
    resolution,
    duration,
    aspect_ratio: aspectRatio,
    fps,
  };

  if (cameraMotion !== 'static') {
    input.camera_motion = cameraMotion;
  }

  const output = await getClient().run(
    model as `${string}/${string}`,
    { input },
  );

  const videoUrl = typeof output === 'string'
    ? output
    : (output as Record<string, unknown>)?.url as string
      ?? (output as Record<string, unknown>)?.output as string
      ?? String(output);

  return {
    videoUrl,
    durationSeconds: duration,
  };
}

// ============================================================
// ANIME-SPECIFIC HELPERS
// ============================================================

/**
 * Map script parallax directions to LTX camera motions
 */
export function mapParallaxToCamera(
  backgroundMovement: string,
): ImageToVideoOptions['cameraMotion'] {
  const lower = backgroundMovement.toLowerCase();
  if (lower.includes('zoom_in') || lower.includes('dramatic')) return 'dolly_forward';
  if (lower.includes('zoom_out')) return 'dolly_backward';
  if (lower.includes('pan_up') || lower.includes('float')) return 'jib_up';
  if (lower.includes('pan_down')) return 'jib_down';
  if (lower.includes('focus') || lower.includes('shake')) return 'focus_shift';
  return 'static';
}

/**
 * Generate an anime scene video clip from panel data.
 * Primary: fal.ai (Wan-2.1 image-to-video) — works with existing fal.ai credits.
 * Fallback: Replicate LTX-2.3 (requires separate Replicate credits).
 */
export async function generateSceneClip(params: {
  prompt: string;
  referenceImageUrl?: string;
  cameraMotion?: ImageToVideoOptions['cameraMotion'];
  duration?: 6 | 8 | 10;
  usePro?: boolean;
}): Promise<VideoResult> {
  const { prompt, referenceImageUrl, cameraMotion = 'static', duration = 6, usePro = false } = params;

  const animePrompt = `${prompt}, anime style, cinematic anime, high quality animation, smooth motion, detailed`;

  // Try fal.ai first (image-to-video) if we have a reference image
  if (referenceImageUrl) {
    try {
      const { generateVideoFromStill } = await import('./fal');
      const result = await generateVideoFromStill({
        prompt: animePrompt,
        imageUrl: referenceImageUrl,
        duration: Math.min(duration, 5),
      });
      return result;
    } catch (falError) {
      console.warn('[Video] fal.ai video failed, trying Replicate:', falError instanceof Error ? falError.message : falError);
    }
  }

  // Fallback to Replicate LTX-2.3
  if (referenceImageUrl) {
    return generateVideoFromImage({
      prompt: animePrompt,
      imageUrl: referenceImageUrl,
      duration,
      cameraMotion,
      usePro,
    });
  }

  return generateVideoFromText({
    prompt: animePrompt,
    duration,
    cameraMotion,
    usePro,
  });
}
