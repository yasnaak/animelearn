import { router, protectedProcedure } from '../init';
import { projects, episodes, characters, panels } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  generateVisualPrompts,
  type SeriesPlan,
  type EpisodeScript,
  type VisualPromptsResult,
} from '@/server/services/ai-pipeline';
import {
  generateCharacterSheet,
  generatePanelLayers,
  removeBackground,
} from '@/server/services/fal';

export const visualsRouter = router({
  // Generate character sheets for all characters in a project
  generateCharacterSheets: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const chars = await ctx.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, input.projectId));

      if (chars.length === 0) {
        throw new Error('No characters found. Run analysis first.');
      }

      const results: Array<{ characterId: string; name: string; sheetUrl: string }> = [];

      for (const char of chars) {
        if (char.characterSheetUrl) {
          results.push({
            characterId: char.id,
            name: char.name,
            sheetUrl: char.characterSheetUrl,
          });
          continue;
        }

        const sheet = await generateCharacterSheet(
          char.visualDescription,
          p.style,
        );

        await ctx.db
          .update(characters)
          .set({ characterSheetUrl: sheet.url })
          .where(eq(characters.id, char.id));

        results.push({
          characterId: char.id,
          name: char.name,
          sheetUrl: sheet.url,
        });
      }

      return { success: true, characters: results };
    }),

  // Generate visual prompts for an episode (AI phase)
  generateVisualPrompts: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || !ep.script) {
        throw new Error('Episode not found or script not generated');
      }

      const plan = p.seriesPlan as unknown as SeriesPlan;
      const script = ep.script as unknown as EpisodeScript;

      const result = await generateVisualPrompts(script, plan, p.style);

      await ctx.db
        .update(episodes)
        .set({
          visualPrompts: result.data as unknown as Record<string, unknown>,
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, input.episodeId));

      return { success: true, panelCount: result.data.panels.length };
    }),

  // Generate images for all panels of an episode
  generatePanelImages: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const p = project[0];
      if (!p || p.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep?.visualPrompts) {
        throw new Error('Visual prompts not generated yet');
      }

      const visualPrompts = ep.visualPrompts as unknown as VisualPromptsResult;
      const script = ep.script as unknown as EpisodeScript;
      const plan = p.seriesPlan as unknown as SeriesPlan;

      // Get character sheets for IP-Adapter reference
      const chars = await ctx.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, input.projectId));

      const charSheetMap = new Map(
        chars
          .filter((c) => c.characterSheetUrl)
          .map((c) => {
            const personality = c.personality as Record<string, unknown> | null;
            const charId = (personality?.id as string) ?? c.id;
            return [charId, c.characterSheetUrl!];
          }),
      );

      // Update episode status
      await ctx.db
        .update(episodes)
        .set({ status: 'visuals', updatedAt: new Date() })
        .where(eq(episodes.id, input.episodeId));

      const results: Array<{
        panelId: string;
        backgroundUrl: string;
        characterUrls: Array<{ characterId: string; url: string }>;
        effectsUrl?: string;
      }> = [];

      try {
        // Find matching script panels for mood/scene info
        const scriptPanelMap = new Map<string, { mood: string; sceneType: string }>();
        for (const scene of script.scenes) {
          for (const panel of scene.panels) {
            scriptPanelMap.set(panel.panel_id, {
              mood: scene.mood,
              sceneType: scene.scene_type,
            });
          }
        }

        for (const vp of visualPrompts.panels) {
          const sceneInfo = scriptPanelMap.get(vp.panel_id);

          // Find the corresponding script panel for layout info
          let layout = 'full_page';
          for (const scene of script.scenes) {
            const found = scene.panels.find((sp) => sp.panel_id === vp.panel_id);
            if (found) {
              layout = found.layout;
              break;
            }
          }

          const panelResult = await generatePanelLayers({
            panelId: vp.panel_id,
            style: p.style,
            backgroundDescription: vp.layers.background.prompt,
            timeOfDay: 'afternoon', // Could be extracted from script
            weather: 'clear',
            mood: sceneInfo?.mood ?? 'calm',
            characterPrompts: vp.layers.characters.map((charPrompt) => ({
              characterId: charPrompt.character_id,
              description: charPrompt.prompt,
              expression: '',
              pose: '',
              referenceImageUrl: charSheetMap.get(charPrompt.character_id),
            })),
            effectsDescription: vp.layers.effects.prompt ?? undefined,
            layout,
          });

          // Remove backgrounds from character images
          const processedChars: Array<{ characterId: string; url: string }> = [];
          for (const charResult of panelResult.characterUrls) {
            try {
              const noBgUrl = await removeBackground(charResult.url);
              processedChars.push({
                characterId: charResult.characterId,
                url: noBgUrl,
              });
            } catch {
              // Fallback to original if bg removal fails
              processedChars.push(charResult);
            }
          }

          // Store panel in DB
          const scriptPanel = script.scenes
            .flatMap((s) => s.panels)
            .find((sp) => sp.panel_id === vp.panel_id);

          const panelOrder = script.scenes
            .flatMap((s) => s.panels)
            .findIndex((sp) => sp.panel_id === vp.panel_id);

          await ctx.db.insert(panels).values({
            episodeId: input.episodeId,
            sceneId: vp.panel_id.split('_')[0] ?? 's01',
            panelId: vp.panel_id,
            panelOrder: panelOrder >= 0 ? panelOrder : 0,
            backgroundImageUrl: panelResult.backgroundUrl,
            characterLayerUrl: processedChars[0]?.url ?? null,
            effectLayerUrl: panelResult.effectsUrl ?? null,
            prompt: vp as unknown as Record<string, unknown>,
            metadata: {
              allCharacterUrls: processedChars,
              scriptPanel: scriptPanel ?? null,
            },
          });

          results.push({
            panelId: vp.panel_id,
            backgroundUrl: panelResult.backgroundUrl,
            characterUrls: processedChars,
            effectsUrl: panelResult.effectsUrl,
          });
        }

        // Update episode status
        await ctx.db
          .update(episodes)
          .set({ status: 'audio', updatedAt: new Date() })
          .where(eq(episodes.id, input.episodeId));

        return { success: true, panels: results };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Image generation failed',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, input.episodeId));
        throw error;
      }
    }),

  // List panels for an episode
  listPanels: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(panels)
        .where(eq(panels.episodeId, input.episodeId))
        .orderBy(panels.panelOrder);
    }),

  // List characters for a project
  listCharacters: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(characters)
        .where(eq(characters.projectId, input.projectId));
    }),
});
