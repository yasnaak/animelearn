import { router, protectedProcedure } from '../init';
import { projects, episodes, characters } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  analyzeContent,
  planSeries,
  generateScript,
  validateScript,
  type ContentAnalysis,
  type SeriesPlan,
  type EpisodeScript,
} from '@/server/services/ai-pipeline';

export const generationRouter = router({
  // Phase 1+2: Analyze content and plan series
  analyze: protectedProcedure
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

      if (!p.rawContent) {
        throw new Error('No content to analyze. Upload a PDF first.');
      }

      // Update status to analyzing
      await ctx.db
        .update(projects)
        .set({ status: 'analyzing', updatedAt: new Date() })
        .where(eq(projects.id, input.projectId));

      try {
        // Phase 1: Content Analysis
        const analysisResult = await analyzeContent(
          p.rawContent,
          p.sourceType as 'pdf' | 'youtube',
          p.language,
        );

        await ctx.db
          .update(projects)
          .set({
            contentAnalysis: analysisResult.data,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        // Phase 2: Series Planning
        const planResult = await planSeries(
          analysisResult.data,
          p.style,
          p.language,
        );

        // Save characters
        for (const char of planResult.data.characters) {
          await ctx.db.insert(characters).values({
            projectId: input.projectId,
            name: char.name,
            role: char.role,
            visualDescription: char.visual_description,
            personality: char as unknown as Record<string, unknown>,
          });
        }

        // Create episode entries
        for (const ep of planResult.data.episodes) {
          await ctx.db.insert(episodes).values({
            projectId: input.projectId,
            episodeNumber: ep.episode_number,
            title: ep.title,
            synopsis: ep.synopsis,
            status: 'planned',
          });
        }

        await ctx.db
          .update(projects)
          .set({
            seriesPlan: planResult.data,
            totalEpisodes: planResult.data.series.total_episodes,
            status: 'planned',
            updatedAt: new Date(),
          })
          .where(eq(projects.id, input.projectId));

        return {
          success: true,
          analysis: analysisResult.data,
          plan: planResult.data,
          tokensUsed: {
            analysis: analysisResult.inputTokens + analysisResult.outputTokens,
            planning: planResult.inputTokens + planResult.outputTokens,
          },
        };
      } catch (error) {
        await ctx.db
          .update(projects)
          .set({ status: 'failed', updatedAt: new Date() })
          .where(eq(projects.id, input.projectId));
        throw error;
      }
    }),

  // Phase 3: Generate script for a single episode
  generateScript: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeNumber: z.number().int().positive(),
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

      if (!p.contentAnalysis || !p.seriesPlan) {
        throw new Error('Project must be analyzed first');
      }

      const analysis = p.contentAnalysis as unknown as ContentAnalysis;
      const plan = p.seriesPlan as unknown as SeriesPlan;

      // Find the episode entry
      const episodeRows = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId));

      const episode = episodeRows.find(
        (e) => e.episodeNumber === input.episodeNumber,
      );
      if (!episode) {
        throw new Error(`Episode ${input.episodeNumber} not found`);
      }

      // Update episode status
      await ctx.db
        .update(episodes)
        .set({ status: 'script', updatedAt: new Date() })
        .where(eq(episodes.id, episode.id));

      try {
        // Generate script (uses Opus)
        const scriptResult = await generateScript(
          analysis,
          plan,
          input.episodeNumber,
          p.language,
        );

        // Validate script (uses Sonnet)
        const validation = await validateScript(
          scriptResult.data,
          plan,
          analysis,
          input.episodeNumber,
        );

        // Store script + validation
        await ctx.db
          .update(episodes)
          .set({
            script: scriptResult.data as unknown as Record<string, unknown>,
            status: validation.data.is_valid ? 'visuals' : 'script',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));

        return {
          success: true,
          script: scriptResult.data,
          validation: validation.data,
          tokensUsed: {
            script: scriptResult.inputTokens + scriptResult.outputTokens,
            validation: validation.inputTokens + validation.outputTokens,
          },
        };
      } catch (error) {
        await ctx.db
          .update(episodes)
          .set({
            status: 'failed',
            generationError:
              error instanceof Error ? error.message : 'Unknown error',
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episode.id));
        throw error;
      }
    }),

  // Get episodes for a project
  listEpisodes: protectedProcedure
    .input(z.object({ projectId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.projectId, input.projectId))
        .orderBy(episodes.episodeNumber);
    }),
});
