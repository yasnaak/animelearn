import { router, publicProcedure } from '../init';
import { episodes } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import type { QuizData, StudyNotes } from '@/server/services/ai-pipeline';

export const learningRouter = router({
  getQuiz: publicProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const episode = await ctx.db
        .select({
          id: episodes.id,
          title: episodes.title,
          episodeNumber: episodes.episodeNumber,
          quizData: episodes.quizData,
          status: episodes.status,
        })
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || ep.status !== 'ready') {
        throw new Error('Episode not found or not ready');
      }

      if (!ep.quizData) {
        return null;
      }

      return {
        episodeId: ep.id,
        episodeTitle: ep.title,
        episodeNumber: ep.episodeNumber,
        quiz: ep.quizData as unknown as QuizData,
      };
    }),

  getStudyNotes: publicProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const episode = await ctx.db
        .select({
          id: episodes.id,
          title: episodes.title,
          episodeNumber: episodes.episodeNumber,
          studyNotes: episodes.studyNotes,
          status: episodes.status,
        })
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || ep.status !== 'ready') {
        throw new Error('Episode not found or not ready');
      }

      if (!ep.studyNotes) {
        return null;
      }

      return {
        episodeId: ep.id,
        episodeTitle: ep.title,
        episodeNumber: ep.episodeNumber,
        notes: ep.studyNotes as unknown as StudyNotes,
      };
    }),
});
