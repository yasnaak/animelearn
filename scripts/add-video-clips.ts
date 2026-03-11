import { config } from 'dotenv';
config({ path: '.env.local' });
import postgres from 'postgres';
import { fal } from '@fal-ai/client';

fal.config({ credentials: process.env.FAL_KEY });

const EPISODE_ID = '037e90d9-fcb6-4427-ac7e-65e8eee56fd1';
const sql = postgres(process.env.DATABASE_URL as string);

async function main() {
  const panels = await sql`SELECT id, panel_id, background_image_url FROM panels WHERE episode_id = ${EPISODE_ID} ORDER BY panel_order`;
  console.log(`Found ${panels.length} panels to animate\n`);

  let success = 0;
  for (let i = 0; i < panels.length; i++) {
    const p = panels[i];
    console.log(`[${i + 1}/${panels.length}] ${p.panel_id}...`);

    if (!p.background_image_url) {
      console.log('  No image, skipping');
      continue;
    }

    try {
      const result = await fal.subscribe('fal-ai/wan-i2v' as any, {
        input: {
          prompt: 'gentle cinematic animation, anime style, smooth subtle motion, atmospheric, high quality',
          image_url: p.background_image_url,
          num_frames: 81,
          fps: 16,
          enable_safety_checker: false,
        } as Record<string, unknown>,
      });

      const data = result.data as Record<string, unknown>;
      const video = data.video as { url: string } | undefined;

      if (video?.url) {
        await sql`UPDATE panels SET video_url = ${video.url} WHERE id = ${p.id}`;
        console.log(`  Done: ${video.url.substring(0, 60)}...`);
        success++;
      } else {
        console.log('  No video URL in response');
      }
    } catch (err: any) {
      console.error(`  Failed: ${err.message}`);
      if (err.body) console.error('  Body:', JSON.stringify(err.body));
    }
  }

  console.log(`\nAnimated ${success}/${panels.length} panels`);

  // Also update composition props on the episode
  // (the render service will rebuild them from panels + audio when loading)
  
  await sql.end();
}

main().catch(console.error);
