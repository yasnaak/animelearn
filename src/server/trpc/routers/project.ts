import { router, protectedProcedure } from '../init';
import { projects } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { extractYouTubeTranscript } from '@/server/services/youtube-extractor';
import { extractWebContent } from '@/server/services/web-extractor';

export const projectRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(projects)
      .where(eq(projects.userId, ctx.user.id))
      .orderBy(desc(projects.createdAt));
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      const project = result[0];
      if (!project || project.userId !== ctx.user.id) {
        return null;
      }
      return project;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        sourceType: z.enum(['pdf', 'youtube', 'text', 'idea', 'url']),
        sourceUrl: z.string().optional(),
        rawContent: z.string().optional(),
        style: z
          .enum(['clean_modern', 'soft_pastel', 'dark_dramatic', 'retro_classic', 'sketch_cartoon', 'illustrated_cartoon'])
          .default('clean_modern'),
        language: z.string().default('en'),
        targetDurationMinutes: z.number().int().min(1).max(15).default(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(projects)
        .values({
          userId: ctx.user.id,
          title: input.title,
          sourceType: input.sourceType,
          sourceUrl: input.sourceUrl,
          rawContent: input.rawContent,
          style: input.style,
          language: input.language,
          targetDurationMinutes: input.targetDurationMinutes,
        })
        .returning();

      return result[0];
    }),

  extractYoutube: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const project = result[0];
      if (!project || project.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const { text, videoId, durationSeconds } =
        await extractYouTubeTranscript(input.url);

      if (text.length < 50) {
        throw new Error(
          'Transcript too short — the video may not have enough spoken content.',
        );
      }

      const minutes = Math.round(durationSeconds / 60);
      await ctx.db
        .update(projects)
        .set({
          rawContent: text,
          description: `YouTube video (${minutes} min) — ${videoId}`,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));

      return { textLength: text.length, durationSeconds, videoId };
    }),

  extractUrl: protectedProcedure
    .input(z.object({ projectId: z.string().uuid(), url: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.projectId))
        .limit(1);

      const project = result[0];
      if (!project || project.userId !== ctx.user.id) {
        throw new Error('Project not found');
      }

      const { text, title, siteName } = await extractWebContent(input.url);

      if (text.length < 100) {
        throw new Error(
          'Page content too short — could not extract enough text from this URL.',
        );
      }

      const desc = siteName ? `${siteName}: ${title}` : title;
      await ctx.db
        .update(projects)
        .set({
          rawContent: text,
          description: desc,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, input.projectId));

      return { textLength: text.length, title };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(projects)
        .where(eq(projects.id, input.id))
        .limit(1);

      const project = result[0];
      if (!project || project.userId !== ctx.user.id) {
        return { success: false };
      }

      await ctx.db.delete(projects).where(eq(projects.id, input.id));
      return { success: true };
    }),
});
