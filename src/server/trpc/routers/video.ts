import { router, protectedProcedure } from '../init';
import { projects, episodes, panels, characters } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  type EpisodeScript,
  type SeriesPlan,
  type VisualPromptsResult,
} from '@/server/services/ai-pipeline';
import {
  generateSceneClip,
  mapParallaxToCamera,
} from '@/server/services/replicate';
import { generateImage, getStyleModifiers } from '@/server/services/fal';

export const videoRouter = router({
  /**
   * Generate video clips for all panels of an episode using LTX-2.3.
   * Hybrid approach:
   * 1. Generate a reference still image with fal.ai (fast, consistent style)
   * 2. Animate it with LTX-2.3 image-to-video (adds motion)
   */
  generateVideoClips: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
        usePro: z.boolean().default(false),
        duration: z.enum(['6', '8', '10']).default('6'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) throw new Error('Project not found');

      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep?.visualPrompts) throw new Error('Visual prompts not generated yet');
      if (!ep?.script) throw new Error('Script not generated yet');

      const visualPrompts = ep.visualPrompts as unknown as VisualPromptsResult;
      const script = ep.script as unknown as EpisodeScript;
      const styleMod = getStyleModifiers(p.style);
      const durationNum = parseInt(input.duration) as 6 | 8 | 10;

      // Update status
      await ctx.db
        .update(episodes)
        .set({ status: 'visuals', updatedAt: new Date() })
        .where(eq(episodes.id, input.episodeId));

      const results: Array<{
        panelId: string;
        videoUrl: string;
        referenceImageUrl: string;
      }> = [];

      try {
        for (const vp of visualPrompts.panels) {
          // Find the matching script panel for camera/parallax info
          let parallaxBgMovement = 'static';
          let panelOrder = 0;
          let sceneId = 's01';

          for (const scene of script.scenes) {
            const idx = scene.panels.findIndex((sp) => sp.panel_id === vp.panel_id);
            if (idx >= 0) {
              parallaxBgMovement = scene.panels[idx].parallax?.background_movement ?? 'static';
              sceneId = scene.scene_id;
              panelOrder = script.scenes
                .flatMap((s) => s.panels)
                .findIndex((sp) => sp.panel_id === vp.panel_id);
              break;
            }
          }

          // Step 1: Generate reference still image with fal.ai
          const bgPrompt = `${styleMod.prompt}, ${vp.layers.background.prompt}`;
          const referenceImage = await generateImage({
            prompt: bgPrompt,
            negativePrompt: styleMod.negative,
            width: 1920,
            height: 1080,
          });

          // Step 2: Animate with LTX-2.3
          const cameraMotion = mapParallaxToCamera(parallaxBgMovement);
          const videoPrompt = `${vp.layers.background.prompt}, ${vp.composition_notes}, anime scene, cinematic`;

          const video = await generateSceneClip({
            prompt: videoPrompt,
            referenceImageUrl: referenceImage.url,
            cameraMotion,
            duration: durationNum,
            usePro: input.usePro,
          });

          // Store in DB
          await ctx.db.insert(panels).values({
            episodeId: input.episodeId,
            sceneId,
            panelId: vp.panel_id,
            panelOrder: panelOrder >= 0 ? panelOrder : 0,
            backgroundImageUrl: referenceImage.url,
            videoUrl: video.videoUrl,
            prompt: vp as unknown as Record<string, unknown>,
            metadata: {
              cameraMotion,
              durationSeconds: video.durationSeconds,
              usedPro: input.usePro,
            },
          });

          results.push({
            panelId: vp.panel_id,
            videoUrl: video.videoUrl,
            referenceImageUrl: referenceImage.url,
          });
        }

        // Update status
        await ctx.db
          .update(episodes)
          .set({ status: 'audio', updatedAt: new Date() })
          .where(eq(episodes.id, input.episodeId));

        return { success: true, clips: results };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Video generation failed',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, input.episodeId));
        throw error;
      }
    }),

  /**
   * Generate a single video clip for preview/testing
   */
  generateSingleClip: protectedProcedure
    .input(
      z.object({
        prompt: z.string(),
        referenceImageUrl: z.string().optional(),
        cameraMotion: z.enum(['static', 'dolly_forward', 'dolly_backward', 'jib_up', 'jib_down', 'focus_shift']).default('static'),
        duration: z.enum(['6', '8', '10']).default('6'),
        usePro: z.boolean().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      const video = await generateSceneClip({
        prompt: input.prompt,
        referenceImageUrl: input.referenceImageUrl,
        cameraMotion: input.cameraMotion,
        duration: parseInt(input.duration) as 6 | 8 | 10,
        usePro: input.usePro,
      });

      return video;
    }),
});
