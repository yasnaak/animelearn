import { router, publicProcedure, protectedProcedure } from '../init';
import { episodes, flashcardProgress } from '@/server/db/schema';
import { eq, and, lte } from 'drizzle-orm';
import { z } from 'zod';
import type { QuizData, StudyNotes, FlashcardDeck } from '@/server/services/ai-pipeline';

// SM-2 Algorithm
function sm2(
  grade: number,
  prev: { easeFactor: number; interval: number; repetitions: number },
) {
  let { easeFactor, interval, repetitions } = prev;

  if (grade >= 3) {
    repetitions += 1;
    if (repetitions === 1) {
      interval = 1;
    } else if (repetitions === 2) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    easeFactor = Math.max(
      1.3,
      easeFactor + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02)),
    );
  } else {
    repetitions = 0;
    interval = 1;
    // easeFactor stays the same on failure
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { easeFactor, interval, repetitions, nextReviewDate };
}

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

  // ── Flashcard routes ──

  getFlashcards: publicProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const episode = await ctx.db
        .select({
          id: episodes.id,
          title: episodes.title,
          episodeNumber: episodes.episodeNumber,
          flashcardData: episodes.flashcardData,
          status: episodes.status,
        })
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || ep.status !== 'ready') {
        throw new Error('Episode not found or not ready');
      }

      if (!ep.flashcardData) {
        return null;
      }

      return {
        episodeId: ep.id,
        episodeTitle: ep.title,
        episodeNumber: ep.episodeNumber,
        deck: ep.flashcardData as unknown as FlashcardDeck,
      };
    }),

  getDueFlashcards: protectedProcedure
    .input(z.object({ episodeId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const episode = await ctx.db
        .select({
          flashcardData: episodes.flashcardData,
          status: episodes.status,
        })
        .from(episodes)
        .where(eq(episodes.id, input.episodeId))
        .limit(1);

      const ep = episode[0];
      if (!ep || ep.status !== 'ready' || !ep.flashcardData) {
        return { dueCards: [], totalCards: 0 };
      }

      const deck = ep.flashcardData as unknown as FlashcardDeck;

      // Get existing progress for this user + episode
      const progress = await ctx.db
        .select()
        .from(flashcardProgress)
        .where(
          and(
            eq(flashcardProgress.userId, ctx.user.id),
            eq(flashcardProgress.episodeId, input.episodeId),
          ),
        );

      const progressMap = new Map(
        progress.map((p) => [p.cardId, p]),
      );

      const now = new Date();
      const dueCards = deck.cards.filter((card) => {
        const prog = progressMap.get(card.id);
        if (!prog) return true; // Never reviewed = due
        return prog.nextReviewDate <= now;
      });

      return {
        dueCards: dueCards.map((card) => ({
          ...card,
          repetitions: progressMap.get(card.id)?.repetitions ?? 0,
        })),
        totalCards: deck.cards.length,
      };
    }),

  reviewFlashcard: protectedProcedure
    .input(
      z.object({
        episodeId: z.string().uuid(),
        cardId: z.string(),
        grade: z.number().int().min(0).max(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find existing progress
      const existing = await ctx.db
        .select()
        .from(flashcardProgress)
        .where(
          and(
            eq(flashcardProgress.userId, ctx.user.id),
            eq(flashcardProgress.episodeId, input.episodeId),
            eq(flashcardProgress.cardId, input.cardId),
          ),
        )
        .limit(1);

      const prev = existing[0] ?? {
        easeFactor: 2.5,
        interval: 0,
        repetitions: 0,
      };

      const result = sm2(input.grade, prev);

      if (existing[0]) {
        await ctx.db
          .update(flashcardProgress)
          .set({
            easeFactor: result.easeFactor,
            interval: result.interval,
            repetitions: result.repetitions,
            nextReviewDate: result.nextReviewDate,
            lastReviewedAt: new Date(),
          })
          .where(eq(flashcardProgress.id, existing[0].id));
      } else {
        await ctx.db.insert(flashcardProgress).values({
          userId: ctx.user.id,
          episodeId: input.episodeId,
          cardId: input.cardId,
          easeFactor: result.easeFactor,
          interval: result.interval,
          repetitions: result.repetitions,
          nextReviewDate: result.nextReviewDate,
          lastReviewedAt: new Date(),
        });
      }

      return {
        nextReviewDate: result.nextReviewDate,
        interval: result.interval,
        repetitions: result.repetitions,
      };
    }),
});
