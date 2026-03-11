import { router, protectedProcedure, publicProcedure } from '../init';
import { projects, episodes, panels, audioTracks } from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { assembleEpisodeProps } from '@/server/services/render';
import type {
  EpisodeScript,
  AudioDirection,
  SeriesPlan,
} from '@/server/services/ai-pipeline';

export const renderRouter = router({
  // Get composition props for an episode (for preview / render)
  getCompositionProps: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        episodeId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
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
      if (!ep?.script || !ep?.audioDirection) {
        throw new Error('Episode must have script and audio direction');
      }

      const panelRecords = await ctx.db
        .select()
        .from(panels)
        .where(eq(panels.episodeId, input.episodeId))
        .orderBy(panels.panelOrder);

      const audioTrackRecords = await ctx.db
        .select()
        .from(audioTracks)
        .where(eq(audioTracks.episodeId, input.episodeId));

      const plan = p.seriesPlan as unknown as SeriesPlan;

      const props = assembleEpisodeProps({
        episodeNumber: ep.episodeNumber,
        episodeTitle: ep.title,
        seriesTitle: plan.series.title,
        script: ep.script as unknown as EpisodeScript,
        audioDirection: ep.audioDirection as unknown as AudioDirection,
        panelRecords: panelRecords.map((pr) => ({
          panelId: pr.panelId,
          backgroundImageUrl: pr.backgroundImageUrl,
          characterLayerUrl: pr.characterLayerUrl,
          effectLayerUrl: pr.effectLayerUrl,
          videoUrl: pr.videoUrl,
          metadata: pr.metadata,
        })),
        audioTrackRecords: audioTrackRecords.map((at) => ({
          trackType: at.trackType,
          audioUrl: at.audioUrl,
          durationMs: at.durationMs,
          panelId: at.panelId,
          metadata: at.metadata,
        })),
      });

      return props;
    }),

  // Get composition props for public viewing (no auth required)
  getPublicCompositionProps: publicProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const episode = await ctx.db
        .select()
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || ep.status !== 'ready') {
        throw new Error('Episode not found or not ready');
      }

      if (!ep.script || !ep.audioDirection) {
        throw new Error('Episode data incomplete');
      }

      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, ep.projectId))
        .limit(1);

      const p = project[0];
      if (!p) throw new Error('Project not found');

      const panelRecords = await ctx.db
        .select()
        .from(panels)
        .where(eq(panels.episodeId, input.episodeId))
        .orderBy(panels.panelOrder);

      const audioTrackRecords = await ctx.db
        .select()
        .from(audioTracks)
        .where(eq(audioTracks.episodeId, input.episodeId));

      const plan = p.seriesPlan as unknown as SeriesPlan;

      const props = assembleEpisodeProps({
        episodeNumber: ep.episodeNumber,
        episodeTitle: ep.title,
        seriesTitle: plan.series.title,
        script: ep.script as unknown as EpisodeScript,
        audioDirection: ep.audioDirection as unknown as AudioDirection,
        panelRecords: panelRecords.map((pr) => ({
          panelId: pr.panelId,
          backgroundImageUrl: pr.backgroundImageUrl,
          characterLayerUrl: pr.characterLayerUrl,
          effectLayerUrl: pr.effectLayerUrl,
          videoUrl: pr.videoUrl,
          metadata: pr.metadata,
        })),
        audioTrackRecords: audioTrackRecords.map((at) => ({
          trackType: at.trackType,
          audioUrl: at.audioUrl,
          durationMs: at.durationMs,
          panelId: at.panelId,
          metadata: at.metadata,
        })),
      });

      return {
        props,
        episode: {
          id: ep.id,
          title: ep.title,
          episodeNumber: ep.episodeNumber,
          synopsis: ep.synopsis,
          durationSeconds: ep.durationSeconds,
        },
        series: {
          title: plan.series.title,
          totalEpisodes: plan.series.total_episodes,
        },
        projectId: p.id,
      };
    }),

  // List public example episodes for the showcase
  listExamples: publicProcedure.query(async ({ ctx }) => {
    const publicEpisodes = await ctx.db
      .select({
        id: episodes.id,
        title: episodes.title,
        episodeNumber: episodes.episodeNumber,
        synopsis: episodes.synopsis,
        durationSeconds: episodes.durationSeconds,
        projectId: episodes.projectId,
      })
      .from(episodes)
      .where(
        and(eq(episodes.isPublic, true), eq(episodes.status, 'ready')),
      )
      .orderBy(desc(episodes.createdAt))
      .limit(6);

    // Enrich with project/series info
    const enriched = await Promise.all(
      publicEpisodes.map(async (ep) => {
        const project = (
          await ctx.db
            .select({ title: projects.title, style: projects.style, seriesPlan: projects.seriesPlan })
            .from(projects)
            .where(eq(projects.id, ep.projectId))
            .limit(1)
        )[0];
        const plan = project?.seriesPlan as { series?: { title?: string } } | null;
        return {
          ...ep,
          seriesTitle: plan?.series?.title ?? project?.title ?? 'Untitled',
          style: project?.style ?? 'clean_modern',
        };
      }),
    );

    return enriched;
  }),

  // Mark episode as ready (after render completes)
  markReady: protectedProcedure
    .input(
      z.object({
        episodeId: z.string().uuid(),
        videoUrl: z.string().url().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(episodes)
        .set({
          status: 'ready',
          videoUrl: input.videoUrl,
          generationCompletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(episodes.id, input.episodeId));

      return { success: true };
    }),
});
