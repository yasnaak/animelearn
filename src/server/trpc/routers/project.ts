import { router, protectedProcedure } from '../init';
import { projects } from '@/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';

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
        sourceType: z.enum(['pdf', 'youtube']),
        sourceUrl: z.string().optional(),
        style: z
          .enum(['clean_modern', 'soft_pastel', 'dark_dramatic', 'retro_classic'])
          .default('clean_modern'),
        language: z.string().default('es'),
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
          style: input.style,
          language: input.language,
        })
        .returning();

      return result[0];
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
