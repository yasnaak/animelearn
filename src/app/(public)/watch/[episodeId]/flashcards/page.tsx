'use client';

import { use, useState, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ArrowLeft,
  RotateCcw,
  ChevronRight,
  Loader2,
  Check,
  X,
  Brain,
} from 'lucide-react';
import Link from 'next/link';

type Grade = 0 | 1 | 2 | 3 | 4 | 5;

const GRADE_LABELS: Record<Grade, { label: string; color: string; desc: string }> = {
  0: { label: 'Forgot', color: 'bg-red-600', desc: 'No clue' },
  1: { label: 'Hard', color: 'bg-orange-600', desc: 'Barely recalled' },
  2: { label: 'Difficult', color: 'bg-amber-600', desc: 'Struggled' },
  3: { label: 'Ok', color: 'bg-yellow-600', desc: 'Correct with effort' },
  4: { label: 'Good', color: 'bg-emerald-600', desc: 'Correct easily' },
  5: { label: 'Easy', color: 'bg-green-600', desc: 'Instant recall' },
};

interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  category: string;
  repetitions?: number;
}

export default function FlashcardsPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = use(params);

  const { data, isLoading } = trpc.learning.getFlashcards.useQuery({ episodeId });
  const reviewMutation = trpc.learning.reviewFlashcard.useMutation();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());
  const [sessionDone, setSessionDone] = useState(false);

  const cards: FlashcardItem[] = data?.deck?.cards ?? [];
  const currentCard = cards[currentIndex];

  const handleGrade = useCallback(
    async (grade: Grade) => {
      if (!currentCard) return;

      reviewMutation.mutate(
        { episodeId, cardId: currentCard.id, grade },
        {
          onError: () => {
            // SM-2 update failed silently — card still advances
          },
        },
      );

      setReviewed((prev) => new Set(prev).add(currentCard.id));
      setFlipped(false);

      if (currentIndex < cards.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else {
        setSessionDone(true);
      }
    },
    [currentCard, currentIndex, cards.length, episodeId, reviewMutation],
  );

  const handleRestart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setReviewed(new Set());
    setSessionDone(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!data?.deck || cards.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <p className="text-lg font-medium text-zinc-300">
          No flashcards available
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Flashcards haven&apos;t been generated for this episode yet.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/watch/${episodeId}`}>Back to Episode</Link>
        </Button>
      </div>
    );
  }

  if (sessionDone) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
        <div className="mx-auto max-w-md text-center">
          <div className="mb-6 flex h-16 w-16 mx-auto items-center justify-center rounded-full bg-emerald-500/10">
            <Check className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100">Session Complete</h2>
          <p className="mt-2 text-sm text-zinc-400">
            You reviewed {reviewed.size} of {cards.length} flashcards.
            Cards you found difficult will appear sooner in your next session.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <Button onClick={handleRestart} className="w-full">
              <RotateCcw className="mr-2 h-4 w-4" />
              Review Again
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href={`/watch/${episodeId}`}>Back to Episode</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-200"
          >
            <Link href={`/watch/${episodeId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              Flashcards
            </p>
            <h1 className="text-sm font-medium text-zinc-200">
              {data.episodeTitle}
            </h1>
          </div>
          <div className="text-xs text-zinc-500">
            {currentIndex + 1} / {cards.length}
          </div>
        </div>
      </header>

      {/* Progress bar */}
      <div className="mx-auto max-w-3xl px-4 pt-4">
        <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
            style={{
              width: `${((currentIndex + 1) / cards.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Card */}
      <main className="mx-auto max-w-3xl px-4 py-8">
        {currentCard && (
          <div className="space-y-6">
            {/* Category badge */}
            <div className="flex justify-center">
              <span className="rounded-full border border-zinc-700 bg-zinc-800/50 px-3 py-1 text-xs text-zinc-400">
                {currentCard.category}
              </span>
            </div>

            {/* Flashcard */}
            <Card
              className={`cursor-pointer border-zinc-700 transition-all duration-300 ${
                flipped
                  ? 'bg-gradient-to-br from-cyan-950/20 to-zinc-900'
                  : 'bg-zinc-900 hover:border-zinc-600'
              }`}
              onClick={() => setFlipped(!flipped)}
            >
              <CardContent className="flex min-h-[240px] flex-col items-center justify-center p-8 text-center">
                {!flipped ? (
                  <>
                    <Brain className="mb-4 h-6 w-6 text-cyan-400/50" />
                    <p className="text-lg font-medium text-zinc-100 leading-relaxed">
                      {currentCard.front}
                    </p>
                    <p className="mt-4 text-xs text-zinc-600">
                      Tap to reveal answer
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg text-zinc-200 leading-relaxed">
                      {currentCard.back}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Grade buttons */}
            {flipped && (
              <div className="space-y-3">
                <p className="text-center text-xs text-zinc-500">
                  How well did you know this?
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {([0, 1, 2, 3, 4, 5] as Grade[]).map((grade) => {
                    const info = GRADE_LABELS[grade];
                    return (
                      <button
                        key={grade}
                        onClick={() => handleGrade(grade)}
                        className={`rounded-lg ${info.color} px-2 py-2 text-center text-white transition-opacity hover:opacity-90`}
                      >
                        <div className="text-xs font-medium">{info.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Skip button when not flipped */}
            {!flipped && (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-zinc-500"
                  onClick={() => {
                    setFlipped(false);
                    if (currentIndex < cards.length - 1) {
                      setCurrentIndex((i) => i + 1);
                    } else {
                      setSessionDone(true);
                    }
                  }}
                >
                  Skip
                  <ChevronRight className="ml-1 h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
