import { router, protectedProcedure, publicProcedure } from '../init';
import {
  projects,
  episodes,
  panels,
  audioTracks,
  shots,
} from '@/server/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { z } from 'zod';
import { assembleEpisodeProps, assembleEpisodePropsV2 } from '@/server/services/render';
import type {
  EpisodeScript,
  AudioDirection,
  AudioDirectionV2,
  Screenplay,
  SeriesPlan,
} from '@/server/services/ai-pipeline';
import type { Database } from '@/server/db';

/**
 * Detects if an episode uses V2 (shot-based) pipeline by checking for valid screenplay data.
 */
function isV2Episode(ep: { screenplay: unknown; script: unknown }): boolean {
  const sp = ep.screenplay as { acts?: unknown[] } | null;
  return !!sp?.acts?.length;
}

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
      if (!ep) throw new Error('Episode not found');

      const plan = p.seriesPlan as unknown as SeriesPlan;

      if (isV2Episode(ep)) {
        return assembleV2Props(ctx.db, ep, plan);
      }

      if (!ep.script || !ep.audioDirection) {
        throw new Error('Episode must have script and audio direction');
      }
      return assembleV1Props(ctx.db, ep, plan);
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

      const project = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, ep.projectId))
        .limit(1);

      const p = project[0];
      if (!p) throw new Error('Project not found');

      const plan = p.seriesPlan as unknown as SeriesPlan;

      let props;
      if (isV2Episode(ep)) {
        props = await assembleV2Props(ctx.db, ep, plan);
      } else {
        if (!ep.script || !ep.audioDirection) {
          throw new Error('Episode data incomplete');
        }
        props = await assembleV1Props(ctx.db, ep, plan);
      }

      // Fetch sibling episodes for navigation
      const siblingEpisodes = await ctx.db
        .select({
          id: episodes.id,
          episodeNumber: episodes.episodeNumber,
          title: episodes.title,
          status: episodes.status,
        })
        .from(episodes)
        .where(eq(episodes.projectId, ep.projectId))
        .orderBy(episodes.episodeNumber);

      const currentIndex = siblingEpisodes.findIndex((e) => e.id === ep.id);
      const prevEpisode = currentIndex > 0 ? siblingEpisodes[currentIndex - 1] : null;
      const nextEpisode = currentIndex < siblingEpisodes.length - 1 ? siblingEpisodes[currentIndex + 1] : null;

      return {
        props,
        isV2: isV2Episode(ep),
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
        youtubeMetadata: ep.youtubeMetadata as Record<string, unknown> | null,
        navigation: {
          prev: prevEpisode?.status === 'ready' ? { id: prevEpisode.id, title: prevEpisode.title, episodeNumber: prevEpisode.episodeNumber } : null,
          next: nextEpisode?.status === 'ready' ? { id: nextEpisode.id, title: nextEpisode.title, episodeNumber: nextEpisode.episodeNumber } : null,
        },
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

// ============================================================
// V1: Panel-based assembly helper
// ============================================================

async function assembleV1Props(
  db: Database,
  ep: typeof episodes.$inferSelect,
  plan: SeriesPlan,
) {
  const panelRecords = await db
    .select()
    .from(panels)
    .where(eq(panels.episodeId, ep.id))
    .orderBy(panels.panelOrder);

  const audioTrackRecords = await db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.episodeId, ep.id));

  return assembleEpisodeProps({
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
}

// ============================================================
// V2: Shot-based assembly helper
// ============================================================

async function assembleV2Props(
  db: Database,
  ep: typeof episodes.$inferSelect,
  plan: SeriesPlan,
) {
  const shotRecords = await db
    .select()
    .from(shots)
    .where(eq(shots.episodeId, ep.id))
    .orderBy(shots.shotOrder);

  const audioTrackRecords = await db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.episodeId, ep.id));

  return assembleEpisodePropsV2({
    episodeNumber: ep.episodeNumber,
    episodeTitle: ep.title,
    seriesTitle: plan.series.title,
    screenplay: ep.screenplay as unknown as Screenplay,
    audioDirection: ep.audioDirection as unknown as AudioDirectionV2,
    shotRecords: shotRecords.map((sr) => ({
      shotId: sr.shotId,
      sceneId: sr.sceneId,
      shotType: sr.shotType,
      referenceImageUrl: sr.referenceImageUrl,
      videoUrl: sr.videoUrl,
      durationSeconds: sr.durationSeconds,
      metadata: sr.metadata,
    })),
    audioTrackRecords: audioTrackRecords.map((at) => ({
      trackType: at.trackType,
      audioUrl: at.audioUrl,
      durationMs: at.durationMs,
      shotId: at.shotId,
      metadata: at.metadata,
    })),
  });
}
