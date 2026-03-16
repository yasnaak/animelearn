import { fal } from '@fal-ai/client';

let _falConfigured = false;
function ensureFalConfig() {
  if (!_falConfigured) {
    fal.config({ credentials: process.env.FAL_KEY });
    _falConfigured = true;
  }
}

/**
 * Retry wrapper for transient API failures (fal.ai rate limits, timeouts, etc.)
 * Retries up to `maxRetries` times with exponential backoff.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  { maxRetries = 2, baseDelayMs = 2000, label = 'API call' } = {},
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

// Style prompt modifiers from the design doc
const STYLE_MODIFIERS: Record<string, { prompt: string; negative: string }> = {
  clean_modern: {
    prompt:
      'clean line art, vibrant colors, modern anime style, cel shading, sharp shadows, detailed background, high contrast, crisp lines',
    negative:
      'blurry, low quality, realistic, 3d render, multiple characters, extra limbs, deformed, bad anatomy, text, watermark, nsfw',
  },
  soft_pastel: {
    prompt:
      'soft pastel colors, warm lighting, atmospheric, soft shadows, gentle gradients, dreamy, watercolor influence, beautiful scenery',
    negative:
      'blurry, low quality, realistic, 3d render, harsh lighting, oversaturated, text, watermark, nsfw',
  },
  dark_dramatic: {
    prompt:
      'dark atmosphere, dramatic lighting, high contrast, deep shadows, intense colors, moody, cinematic, heavy shading, backlit',
    negative:
      'blurry, low quality, realistic, 3d render, bright colors, cheerful, text, watermark, nsfw',
  },
  retro_classic: {
    prompt:
      '90s anime style, retro anime, limited color palette, thick outlines, film grain, expressive, classic cel animation look, nostalgic',
    negative:
      'blurry, low quality, realistic, 3d render, modern anime, clean digital, text, watermark, nsfw',
  },
};

export function getStyleModifiers(style: string) {
  return STYLE_MODIFIERS[style] ?? STYLE_MODIFIERS.clean_modern;
}

// ============================================================
// IMAGE GENERATION
// ============================================================

interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  numImages?: number;
  seed?: number;
  imageUrl?: string; // For IP-Adapter reference
}

interface FalImageResult {
  url: string;
  width: number;
  height: number;
  seed: number;
}

export async function generateImage(
  options: GenerateImageOptions,
): Promise<FalImageResult> {
  ensureFalConfig();
  const {
    prompt,
    negativePrompt,
    width = 1920,
    height = 1080,
    numImages = 1,
    seed,
    imageUrl,
  } = options;

  // Use Flux Dev by default, with IP-Adapter if reference image provided
  const model = imageUrl
    ? 'fal-ai/flux/dev/image-to-image'
    : 'fal-ai/flux/dev';

  const input: Record<string, unknown> = {
    prompt,
    image_size: { width, height },
    num_images: numImages,
    enable_safety_checker: true,
  };

  if (negativePrompt) {
    input.negative_prompt = negativePrompt;
  }
  if (seed !== undefined) {
    input.seed = seed;
  }
  if (imageUrl) {
    input.image_url = imageUrl;
    input.strength = 0.65; // How much to deviate from reference
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await fal.subscribe(model as any, { input: input as any });

  const images = (result.data as Record<string, unknown>).images as Array<{
    url: string;
    width: number;
    height: number;
  }>;

  if (!images || images.length === 0) {
    throw new Error('No images generated');
  }

  return {
    url: images[0].url,
    width: images[0].width,
    height: images[0].height,
    seed: ((result.data as Record<string, unknown>).seed as number) ?? 0,
  };
}

// ============================================================
// CHARACTER SHEET GENERATION
// ============================================================

export async function generateCharacterSheet(
  visualDescription: string,
  style: string,
): Promise<FalImageResult> {
  ensureFalConfig();
  const styleMod = getStyleModifiers(style);

  const prompt = `anime character design sheet, ${styleMod.prompt}, front view, full body, ${visualDescription}, white background, clean line art, detailed outfit, cel shading, high quality, professional character design, multiple expressions reference`;

  return generateImage({
    prompt,
    negativePrompt: `${styleMod.negative}, background scenery, multiple characters`,
    width: 1024,
    height: 1024,
  });
}

// ============================================================
// PANEL GENERATION (3 LAYERS)
// ============================================================

interface PanelGenerationInput {
  panelId: string;
  style: string;
  backgroundDescription: string;
  timeOfDay: string;
  weather: string;
  mood: string;
  characterPrompts: Array<{
    characterId: string;
    description: string;
    expression: string;
    pose: string;
    referenceImageUrl?: string;
  }>;
  effectsDescription?: string;
  layout: string;
}

interface PanelGenerationResult {
  panelId: string;
  backgroundUrl: string;
  characterUrls: Array<{ characterId: string; url: string }>;
  effectsUrl?: string;
}

function getLayoutDimensions(layout: string): {
  width: number;
  height: number;
} {
  switch (layout) {
    case 'widescreen':
      return { width: 1920, height: 823 };
    case 'closeup':
      return { width: 1080, height: 1080 };
    case 'vertical':
      return { width: 1080, height: 1920 };
    default: // full_page, half_page, third_page
      return { width: 1920, height: 1080 };
  }
}

export async function generatePanelLayers(
  input: PanelGenerationInput,
): Promise<PanelGenerationResult> {
  ensureFalConfig();
  const styleMod = getStyleModifiers(input.style);
  const { width, height } = getLayoutDimensions(input.layout);

  // Layer 1: Background
  const bgPrompt = `${styleMod.prompt}, anime background, ${input.backgroundDescription}, ${input.timeOfDay} lighting, ${input.weather}, ${input.mood} mood, no characters, empty scene, detailed environment, scenic`;

  const background = await generateImage({
    prompt: bgPrompt,
    negativePrompt: `${styleMod.negative}, characters, people, person`,
    width,
    height,
  });

  // Layer 2: Characters (generate each separately)
  const characterResults: Array<{ characterId: string; url: string }> = [];

  for (const char of input.characterPrompts) {
    const charPrompt = `${styleMod.prompt}, anime character, ${char.description}, ${char.expression}, ${char.pose}, transparent background, isolated character, full body, single character`;

    const charImage = await generateImage({
      prompt: charPrompt,
      negativePrompt: `${styleMod.negative}, background, scenery, multiple characters`,
      width: 768,
      height: 1024,
      imageUrl: char.referenceImageUrl,
    });

    characterResults.push({
      characterId: char.characterId,
      url: charImage.url,
    });
  }

  // Layer 3: Effects (optional)
  let effectsUrl: string | undefined;
  if (input.effectsDescription) {
    const effectsImage = await generateImage({
      prompt: `${input.effectsDescription}, transparent background, anime effects, overlay, ${styleMod.prompt}`,
      negativePrompt: `${styleMod.negative}, characters, background`,
      width,
      height,
    });
    effectsUrl = effectsImage.url;
  }

  return {
    panelId: input.panelId,
    backgroundUrl: background.url,
    characterUrls: characterResults,
    effectsUrl,
  };
}

// ============================================================
// VIDEO GENERATION (image-to-video via fal.ai)
// ============================================================

interface FalVideoResult {
  videoUrl: string;
  durationSeconds: number;
}

/**
 * Animate a still image into video using fal.ai's LTX Video model
 */
export async function generateVideoFromStill(options: {
  prompt: string;
  imageUrl: string;
  duration?: number;
}): Promise<FalVideoResult> {
  ensureFalConfig();
  const { prompt, imageUrl, duration = 5 } = options;

  // Use Wan-2.1 image-to-video (high quality anime-friendly model on fal.ai)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await fal.subscribe('fal-ai/wan-i2v' as any, {
    input: {
      prompt: `${prompt}, anime style, cinematic anime, smooth motion, high quality animation`,
      image_url: imageUrl,
      num_frames: 81, // ~5s at 16fps — Wan-2.1 works best at 81 frames
      fps: 16,
      enable_safety_checker: false,
    } as Record<string, unknown>,
  });

  const data = result.data as Record<string, unknown>;
  const video = data.video as { url: string } | undefined;

  if (!video?.url) {
    throw new Error('No video generated from fal.ai');
  }

  return {
    videoUrl: video.url,
    durationSeconds: duration,
  };
}

// ============================================================
// LOCATION REFERENCE GENERATION (v2 — shot-based pipeline)
// ============================================================

/**
 * Generate a reference image for a location (NO characters, just environment).
 * Used as IP-Adapter reference for all shots at this location.
 */
export async function generateLocationReference(options: {
  referencePrompt: string;
  style: string;
  colorPalette?: string[];
}): Promise<FalImageResult> {
  const styleMod = getStyleModifiers(options.style);
  const paletteHint = options.colorPalette?.length
    ? `, color palette: ${options.colorPalette.join(', ')}`
    : '';

  const prompt = `${styleMod.prompt}, anime background, no characters, no people, empty scene, ${options.referencePrompt}${paletteHint}, professional anime background art, detailed environment, scenic, high quality`;

  return withRetry(
    () =>
      generateImage({
        prompt,
        negativePrompt: `${styleMod.negative}, characters, people, person, human, figure`,
        width: 1920,
        height: 1080,
      }),
    { label: 'location-reference' },
  );
}

// ============================================================
// ENHANCED CHARACTER SHEET (v2 — with signature features)
// ============================================================

/**
 * Generate a character sheet with signature features for IP-Adapter consistency.
 */
export async function generateCharacterSheetV2(options: {
  visualDescription: string;
  signatureFeatures: string[];
  style: string;
}): Promise<FalImageResult> {
  const styleMod = getStyleModifiers(options.style);
  const features = options.signatureFeatures.length
    ? `, MUST INCLUDE: ${options.signatureFeatures.join(', ')}`
    : '';

  const prompt = `anime character design sheet, ${styleMod.prompt}, front view, 3/4 view, full body, ${options.visualDescription}${features}, white background, clean line art, detailed outfit, cel shading, high quality, professional character reference sheet, consistent design, multiple angles`;

  return generateImage({
    prompt,
    negativePrompt: `${styleMod.negative}, background scenery, multiple characters, different characters`,
    width: 1024,
    height: 1024,
  });
}

// ============================================================
// SHOT IMAGE GENERATION (v2 — IP-Adapter references)
// ============================================================

/**
 * IP-Adapter strength by shot type:
 * - establishing/wide: location ref (0.65)
 * - medium/over_shoulder/low_angle/high_angle: location ref (0.5)
 * - close_up/extreme_close_up: character sheet (0.55)
 * - pov/dutch_angle: location ref (0.4) — more creative freedom
 * - insert: no reference
 */
function getIPAdapterConfig(shotType: string): {
  source: 'location' | 'character' | 'none';
  strength: number;
} {
  switch (shotType) {
    case 'establishing':
    case 'wide':
      return { source: 'location', strength: 0.65 };
    case 'medium':
    case 'over_shoulder':
    case 'low_angle':
    case 'high_angle':
      return { source: 'location', strength: 0.5 };
    case 'close_up':
    case 'extreme_close_up':
      return { source: 'character', strength: 0.55 };
    case 'pov':
    case 'dutch_angle':
      return { source: 'location', strength: 0.4 };
    case 'insert':
    default:
      return { source: 'none', strength: 0 };
  }
}

interface ShotImageOptions {
  shotId: string;
  shotType: string;
  visualDirection: string;
  style: string;
  locationRefUrl?: string;
  characterRefUrl?: string;
}

interface ShotImageResult {
  shotId: string;
  imageUrl: string;
  width: number;
  height: number;
  seed: number;
}

/**
 * Generate a still image for a specific shot using IP-Adapter references.
 * Uses a single fal.ai call with the correct IP-Adapter strength per shot type.
 */
export async function generateShotImage(
  options: ShotImageOptions,
): Promise<ShotImageResult> {
  const styleMod = getStyleModifiers(options.style);
  const ipConfig = getIPAdapterConfig(options.shotType);

  // Select reference image based on shot type
  let referenceUrl: string | undefined;
  if (ipConfig.source === 'location' && options.locationRefUrl) {
    referenceUrl = options.locationRefUrl;
  } else if (ipConfig.source === 'character' && options.characterRefUrl) {
    referenceUrl = options.characterRefUrl;
  }

  // Warn if shot type expects a reference but none is available
  if (ipConfig.source !== 'none' && !referenceUrl) {
    console.warn(
      `[V2] Shot ${options.shotId} (${options.shotType}) expected ${ipConfig.source} ref but none available`,
    );
  }

  if (!options.visualDirection?.trim()) {
    throw new Error(`Shot ${options.shotId} has empty visual_direction`);
  }

  const prompt = `${styleMod.prompt}, ${options.visualDirection}`;

  // With IP-Adapter reference: single direct call with correct strength
  if (referenceUrl) {
    ensureFalConfig();
    const input: Record<string, unknown> = {
      prompt,
      image_url: referenceUrl,
      strength: ipConfig.strength,
      image_size: { width: 1920, height: 1080 },
      num_images: 1,
      enable_safety_checker: true,
    };
    if (styleMod.negative) {
      input.negative_prompt = styleMod.negative;
    }

    const falResult = await withRetry(
      () =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        fal.subscribe('fal-ai/flux/dev/image-to-image' as any, {
          input: input as Record<string, unknown>,
        }),
      { label: `shot-image ${options.shotId}` },
    );

    const images = (falResult.data as Record<string, unknown>).images as Array<{
      url: string;
      width: number;
      height: number;
    }>;

    if (!images || images.length === 0) {
      throw new Error(`No image generated for shot ${options.shotId}`);
    }

    return {
      shotId: options.shotId,
      imageUrl: images[0].url,
      width: images[0].width,
      height: images[0].height,
      seed: ((falResult.data as Record<string, unknown>).seed as number) ?? 0,
    };
  }

  // No reference — generate without IP-Adapter
  const result = await generateImage({
    prompt,
    negativePrompt: styleMod.negative,
    width: 1920,
    height: 1080,
  });

  return {
    shotId: options.shotId,
    imageUrl: result.url,
    width: result.width,
    height: result.height,
    seed: result.seed,
  };
}

// ============================================================
// SHOT ANIMATION (v2 — shot-specific motion prompts)
// ============================================================

/**
 * Animate a shot still image into video with shot-specific motion prompt.
 */
export async function animateShot(options: {
  shotId: string;
  stillImageUrl: string;
  cameraMovement: string;
  actions: string[];
  mood: string;
  durationSeconds: 3 | 4 | 5;
}): Promise<{ shotId: string; videoUrl: string; durationSeconds: number }> {
  ensureFalConfig();

  // Build motion prompt from shot details
  const cameraMotionDesc: Record<string, string> = {
    static: 'camera is steady and still',
    slow_push_in: 'camera slowly pushes in toward the subject',
    slow_pull_out: 'camera slowly pulls back to reveal more of the scene',
    pan_left: 'camera pans smoothly to the left',
    pan_right: 'camera pans smoothly to the right',
    tilt_up: 'camera tilts upward slowly',
    tilt_down: 'camera tilts downward slowly',
    tracking: 'camera tracks alongside the moving subject',
    crane_up: 'camera rises dramatically upward',
    crane_down: 'camera descends smoothly downward',
    handheld_shake: 'slight handheld camera shake for urgency',
  };

  const cameraDesc = cameraMotionDesc[options.cameraMovement];
  if (!cameraDesc) {
    console.warn(
      `[V2] Unknown camera movement "${options.cameraMovement}" for shot ${options.shotId}, defaulting to static`,
    );
  }
  const filteredActions = options.actions.filter((a) => a.trim());
  const actionDesc = filteredActions.length
    ? filteredActions.join(', ')
    : 'subtle breathing and ambient motion';

  const resolvedCamera = cameraDesc ?? 'camera is steady';
  const moodPart = options.mood?.trim() ? `${options.mood} atmosphere, ` : '';
  const motionPrompt = `${resolvedCamera}, ${actionDesc}, ${moodPart}anime style, cinematic anime, smooth high quality animation, detailed motion`;

  const result = await withRetry(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fal.subscribe('fal-ai/wan-i2v' as any, {
        input: {
          prompt: motionPrompt,
          image_url: options.stillImageUrl,
          num_frames: 81, // ~5s at 16fps — Wan-2.1 works best at 81 frames
          fps: 16,
          enable_safety_checker: false,
        } as Record<string, unknown>,
      }),
    { label: `animate-shot ${options.shotId}`, baseDelayMs: 3000 },
  );

  const data = result.data as Record<string, unknown>;
  const video = data.video as { url: string } | undefined;

  if (!video?.url) {
    throw new Error(`No video generated for shot ${options.shotId}`);
  }

  return {
    shotId: options.shotId,
    videoUrl: video.url,
    durationSeconds: options.durationSeconds,
  };
}

// ============================================================
// BACKGROUND REMOVAL
// ============================================================

export async function removeBackground(
  imageUrl: string,
): Promise<string> {
  ensureFalConfig();
  const result = await fal.subscribe('fal-ai/birefnet', {
    input: { image_url: imageUrl },
  });

  const output = result.data as { image: { url: string } };
  return output.image.url;
}

/**
 * Generate an anime-style YouTube thumbnail at 1280x720.
 */
export async function generateThumbnail(options: {
  prompt: string;
  style?: string;
}): Promise<string> {
  const styleMod = getStyleModifiers(options.style ?? 'clean_modern');
  const prompt = `${styleMod.prompt}, ${options.prompt}, dramatic anime key visual, eye-catching composition, vibrant colors, high contrast, YouTube thumbnail style`;

  const result = await generateImage({
    prompt,
    negativePrompt: styleMod.negative,
    width: 1280,
    height: 720,
  });

  return result.url;
}
