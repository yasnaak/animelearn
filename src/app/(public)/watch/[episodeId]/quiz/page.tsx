'use client';

import { use, useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Loader2,
  Trophy,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';

type QuizState = 'answering' | 'feedback' | 'results';

export default function QuizPage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = use(params);
  const { data, isLoading, error } = trpc.learning.getQuiz.useQuery({
    episodeId,
  });

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Map<number, number>>(new Map());
  const [state, setState] = useState<QuizState>('answering');

  const results = useMemo(() => {
    if (!data?.quiz) return { correct: 0, total: 0, percentage: 0 };
    let correct = 0;
    answers.forEach((answer, qIndex) => {
      if (data.quiz.questions[qIndex]?.correct_answer === answer) {
        correct++;
      }
    });
    const total = data.quiz.questions.length;
    return { correct, total, percentage: Math.round((correct / total) * 100) };
  }, [answers, data?.quiz]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !data?.quiz) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <BookOpen className="h-12 w-12 text-zinc-600" />
        <p className="mt-4 text-lg text-zinc-300">No quiz available yet</p>
        <p className="mt-1 text-sm text-zinc-500">
          The quiz for this episode hasn&apos;t been generated.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href={`/watch/${episodeId}`}>Back to Episode</Link>
        </Button>
      </div>
    );
  }

  const { quiz } = data;
  const question = quiz.questions[currentQuestion];
  const isLastQuestion = currentQuestion === quiz.questions.length - 1;
  const userAnswer = answers.get(currentQuestion);
  const isCorrect = userAnswer === question?.correct_answer;

  const handleSelectAnswer = (optionIndex: number) => {
    if (state === 'feedback') return;
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    const newAnswers = new Map(answers);
    newAnswers.set(currentQuestion, selectedAnswer);
    setAnswers(newAnswers);
    setState('feedback');
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setState('results');
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedAnswer(null);
      setState('answering');
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers(new Map());
    setState('answering');
  };

  // Results screen
  if (state === 'results') {
    const passed = results.percentage >= quiz.passing_score;
    return (
      <div className="min-h-screen bg-black">
        <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
            <Button asChild variant="ghost" size="icon" className="text-zinc-400">
              <Link href={`/watch/${episodeId}`}>
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="text-sm font-medium text-zinc-200">
              Quiz Results — Episode {data.episodeNumber}
            </h1>
          </div>
        </header>

        <main className="mx-auto max-w-lg px-4 py-12">
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-24 w-24 items-center justify-center rounded-full ${
                passed
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              <Trophy className="h-12 w-12" />
            </div>

            <h2 className="mt-6 text-3xl font-bold text-zinc-100">
              {results.percentage}%
            </h2>
            <p className="mt-1 text-zinc-400">
              {results.correct} of {results.total} correct
            </p>
            <p
              className={`mt-3 text-sm font-medium ${
                passed ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              {passed
                ? 'Great job! You passed the quiz.'
                : 'Keep studying — you can try again!'}
            </p>

            {/* Per-question breakdown */}
            <div className="mt-8 w-full space-y-2">
              {quiz.questions.map((q, i) => {
                const userAns = answers.get(i);
                const correct = userAns === q.correct_answer;
                return (
                  <div
                    key={q.id}
                    className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm ${
                      correct
                        ? 'border-green-500/20 bg-green-500/5 text-green-300'
                        : 'border-red-500/20 bg-red-500/5 text-red-300'
                    }`}
                  >
                    {correct ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0" />
                    )}
                    <span className="flex-1 truncate">{q.question}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex gap-3">
              <Button variant="outline" onClick={handleRetry}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button asChild>
                <Link href={`/watch/${episodeId}`}>
                  Back to Episode
                </Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Question screen
  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="text-zinc-400">
            <Link href={`/watch/${episodeId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-sm font-medium text-zinc-200">
              Episode {data.episodeNumber}: {data.episodeTitle}
            </h1>
          </div>
          <span className="text-xs text-zinc-500">
            {currentQuestion + 1} / {quiz.questions.length}
          </span>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-zinc-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-fuchsia-500 transition-all duration-300"
            style={{
              width: `${((currentQuestion + (state === 'feedback' ? 1 : 0)) / quiz.questions.length) * 100}%`,
            }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                  question.difficulty === 'easy'
                    ? 'bg-green-500/10 text-green-400'
                    : question.difficulty === 'medium'
                      ? 'bg-amber-500/10 text-amber-400'
                      : 'bg-red-500/10 text-red-400'
                }`}
              >
                {question.difficulty}
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">
                {question.concept_tested}
              </span>
            </div>
            <CardTitle className="mt-2 text-lg leading-relaxed text-zinc-100">
              {question.question}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            {question.options.map((option, i) => {
              let optionStyle =
                'border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800';

              if (state === 'feedback') {
                if (i === question.correct_answer) {
                  optionStyle =
                    'border-green-500/50 bg-green-500/10 text-green-300';
                } else if (i === userAnswer && !isCorrect) {
                  optionStyle =
                    'border-red-500/50 bg-red-500/10 text-red-300';
                } else {
                  optionStyle =
                    'border-zinc-800 bg-zinc-900/50 text-zinc-600';
                }
              } else if (selectedAnswer === i) {
                optionStyle =
                  'border-cyan-500/50 bg-cyan-500/10 text-cyan-300';
              }

              return (
                <button
                  key={i}
                  onClick={() => handleSelectAnswer(i)}
                  disabled={state === 'feedback'}
                  className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left text-sm transition-colors ${optionStyle}`}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/30 text-xs font-medium">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span>{option}</span>
                  {state === 'feedback' && i === question.correct_answer && (
                    <CheckCircle2 className="ml-auto h-4 w-4 shrink-0 text-green-400" />
                  )}
                  {state === 'feedback' &&
                    i === userAnswer &&
                    !isCorrect && (
                      <XCircle className="ml-auto h-4 w-4 shrink-0 text-red-400" />
                    )}
                </button>
              );
            })}

            {/* Feedback explanation */}
            {state === 'feedback' && (
              <div
                className={`mt-4 rounded-lg border p-4 text-sm ${
                  isCorrect
                    ? 'border-green-500/20 bg-green-500/5 text-green-300'
                    : 'border-amber-500/20 bg-amber-500/5 text-amber-300'
                }`}
              >
                <p className="font-medium">
                  {isCorrect ? 'Correct!' : 'Not quite.'}
                </p>
                <p className="mt-1 text-zinc-400">{question.explanation}</p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex justify-end gap-3 pt-4">
              {state === 'answering' ? (
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={selectedAnswer === null}
                  className="bg-gradient-to-r from-cyan-500 to-fuchsia-500"
                >
                  Check Answer
                </Button>
              ) : (
                <Button onClick={handleNext}>
                  {isLastQuestion ? 'See Results' : 'Next Question'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
