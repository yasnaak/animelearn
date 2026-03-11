import { fal } from '@fal-ai/client';

let _falConfigured = false;
function ensureFalConfig() {
  if (!_falConfigured) {
    fal.config({ credentials: process.env.FAL_KEY });
    _falConfigured = true;
  }
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
