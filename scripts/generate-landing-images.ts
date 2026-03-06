/**
 * Temporary script to generate landing page images via fal.ai
 * Run with: npx tsx /tmp/generate-landing-images.ts
 */
import { fal } from '@fal-ai/client';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const OUT_DIR = '/Users/yassinnaeim/animelearn/public/landing';

fal.config({ credentials: process.env.FAL_KEY! });

interface FalResult {
  images: Array<{ url: string; width: number; height: number }>;
}

async function generate(
  prompt: string,
  negative: string,
  width: number,
  height: number,
): Promise<string> {
  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt,
      image_size: { width, height },
      num_images: 1,
      enable_safety_checker: true,
    },
  });
  const data = result.data as unknown as FalResult;
  return data.images[0].url;
}

async function downloadImage(url: string, filename: string) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  const path = join(OUT_DIR, filename);
  await writeFile(path, buffer);
  console.log(`Saved: ${path} (${(buffer.length / 1024).toFixed(0)}KB)`);
}

const STYLE_MODS = {
  clean_modern: {
    prompt: 'clean line art, vibrant colors, modern anime style, cel shading, sharp shadows, detailed background, high contrast, crisp lines',
    negative: 'blurry, low quality, realistic, 3d render, multiple characters, extra limbs, deformed, bad anatomy, text, watermark, nsfw',
  },
  soft_pastel: {
    prompt: 'soft pastel colors, warm lighting, atmospheric, soft shadows, gentle gradients, dreamy, watercolor influence, beautiful scenery',
    negative: 'blurry, low quality, realistic, 3d render, harsh lighting, oversaturated, text, watermark, nsfw',
  },
  dark_dramatic: {
    prompt: 'dark atmosphere, dramatic lighting, high contrast, deep shadows, intense colors, moody, cinematic, heavy shading, backlit',
    negative: 'blurry, low quality, realistic, 3d render, bright colors, cheerful, text, watermark, nsfw',
  },
  retro_classic: {
    prompt: '90s anime style, retro anime, limited color palette, thick outlines, film grain, expressive, classic cel animation look, nostalgic',
    negative: 'blurry, low quality, realistic, 3d render, modern anime, clean digital, text, watermark, nsfw',
  },
};

// The shared scene for style comparison: a student character in a study environment
// with floating scientific diagrams around them
const STYLE_SCENE =
  'anime girl student with short dark hair standing in a futuristic classroom, holographic diagrams of the solar system and DNA helix floating in the air around her, she is pointing at a glowing planet, bookshelves and screens in background, educational atmosphere, full scene wide shot';

async function main() {
  console.log('Generating landing page images via fal.ai...\n');

  // ── 1. HERO IMAGE ──
  console.log('--- Hero Image ---');
  const heroUrl = await generate(
    `${STYLE_MODS.clean_modern.prompt}, masterpiece, ultra detailed, cinematic composition, ${STYLE_SCENE}, dramatic lighting from holographic projections casting blue and purple glow on character, widescreen cinematic aspect ratio, 8k quality anime illustration`,
    STYLE_MODS.clean_modern.negative,
    1920,
    1080,
  );
  await downloadImage(heroUrl, 'hero.webp');

  // ── 2. FOUR STYLE CARDS ──
  console.log('\n--- Style Cards ---');
  for (const [styleName, mod] of Object.entries(STYLE_MODS)) {
    console.log(`Generating ${styleName}...`);
    const url = await generate(
      `${mod.prompt}, ${STYLE_SCENE}, anime illustration, high quality`,
      mod.negative,
      768,
      960,
    );
    await downloadImage(url, `style-${styleName.replace('_', '-')}.webp`);
  }

  // ── 3. SUBJECT GALLERY ──
  console.log('\n--- Subject Gallery ---');

  const subjects = [
    {
      name: 'biology',
      prompt: `${STYLE_MODS.clean_modern.prompt}, anime boy student in a laboratory, giant cell structure floating in mid-air with mitochondria and nucleus visible, microscope on desk, green and blue bioluminescent lighting, educational anime scene, detailed scientific illustration integrated into anime art`,
    },
    {
      name: 'history',
      prompt: `${STYLE_MODS.dark_dramatic.prompt}, anime scene depicting ancient Rome, a young anime narrator character standing in front of the Colosseum at sunset, Roman soldiers in background, dramatic golden hour lighting, historical anime episode, cinematic wide angle`,
    },
    {
      name: 'physics',
      prompt: `${STYLE_MODS.soft_pastel.prompt}, anime girl floating in space surrounded by orbiting planets and mathematical equations, starry background with nebula colors, Einstein-like whiteboard formulas floating around, dreamy educational cosmos scene, soft glowing particles`,
    },
    {
      name: 'literature',
      prompt: `${STYLE_MODS.retro_classic.prompt}, anime scene of characters acting out Shakespeare on a theater stage, spotlight from above, dramatic poses, one character holding a skull like Hamlet, curtains and audience silhouettes, theatrical anime episode`,
    },
  ];

  for (const subject of subjects) {
    console.log(`Generating ${subject.name}...`);
    const url = await generate(
      `${subject.prompt}, anime illustration, high quality`,
      STYLE_MODS.clean_modern.negative,
      1280,
      720,
    );
    await downloadImage(url, `subject-${subject.name}.webp`);
  }

  console.log('\nAll images generated successfully!');
}

main().catch(console.error);
