'use client';

import { use, useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { trpc } from '@/lib/trpc/client';
import { EpisodeComposition } from '@/remotion/EpisodeComposition';
import type { EpisodeCompositionProps } from '@/remotion/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lightbulb,
  HelpCircle,
} from 'lucide-react';
import Link from 'next/link';
import type { StudyNotes } from '@/server/services/ai-pipeline';

const FPS = 30;
const INTRO_FRAMES = 150;
const END_CARD_FRAMES = 450;
const TRANSITION_FRAMES = 15;

function calculateTotalFrames(props: EpisodeCompositionProps): number {
  let panelFrames = 0;
  for (const scene of props.scenes) {
    for (let i = 0; i < scene.panels.length; i++) {
      panelFrames += scene.panels[i].durationFrames;
      if (i < scene.panels.length - 1) {
        panelFrames -= TRANSITION_FRAMES;
      }
    }
  }
  return INTRO_FRAMES + panelFrames + END_CARD_FRAMES;
}

function StudyNotesSection({ notes }: { notes: StudyNotes }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base text-zinc-200">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            Study Notes
          </CardTitle>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-6 pt-0">
          {/* Summary */}
          <div>
            <p className="text-sm leading-relaxed text-zinc-400">
              {notes.summary}
            </p>
          </div>

          {/* Key Concepts */}
          <div>
            <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
              Key Concepts
            </h4>
            <div className="space-y-3">
              {notes.key_concepts.map((concept, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-zinc-800 bg-zinc-800/30 p-3"
                >
                  <p className="text-sm font-medium text-zinc-200">
                    {concept.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {concept.definition}
                  </p>
                  <p className="mt-1 text-xs italic text-zinc-500">
                    {concept.importance}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Key Takeaways */}
          <div>
            <h4 className="mb-2 text-sm font-medium text-zinc-300">
              Key Takeaways
            </h4>
            <ul className="space-y-1">
              {notes.key_takeaways.map((point, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-zinc-400"
                >
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Review Questions */}
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-300">
              <HelpCircle className="h-3.5 w-3.5 text-fuchsia-400" />
              Review Questions
            </h4>
            <ol className="space-y-2">
              {notes.review_questions.map((q, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm text-zinc-400"
                >
                  <span className="shrink-0 text-zinc-600">{i + 1}.</span>
                  {q}
                </li>
              ))}
            </ol>
          </div>

          {notes.connections_to_next && (
            <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/5 p-3">
              <p className="text-xs font-medium text-cyan-400">
                Coming up next...
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                {notes.connections_to_next}
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function WatchEpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = use(params);

  const { data, isLoading, error } =
    trpc.render.getPublicCompositionProps.useQuery({ episodeId });

  const { data: notesData } = trpc.learning.getStudyNotes.useQuery(
    { episodeId },
    { enabled: !!data },
  );

  const { data: quizData } = trpc.learning.getQuiz.useQuery(
    { episodeId },
    { enabled: !!data },
  );

  const totalFrames = useMemo(() => {
    if (!data?.props) return 300;
    return calculateTotalFrames(data.props);
  }, [data?.props]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          <p className="text-sm text-zinc-400">Loading episode...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black">
        <p className="text-lg font-medium text-zinc-300">Episode not found</p>
        <p className="mt-1 text-sm text-zinc-500">
          This episode may not exist or is still being generated.
        </p>
        <Button asChild variant="outline" className="mt-6">
          <Link href="/">Go to AnimeLearn</Link>
        </Button>
      </div>
    );
  }

  const { props, episode, series } = data;

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <Button asChild variant="ghost" size="icon" className="text-zinc-400 hover:text-zinc-200">
            <Link href={`/dashboard/projects/${data.projectId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">
              {series.title}
            </p>
            <h1 className="truncate text-sm font-medium text-zinc-200">
              Episode {episode.episodeNumber}: {episode.title}
            </h1>
          </div>
        </div>
      </header>

      {/* Player */}
      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="relative overflow-hidden rounded-lg bg-zinc-900 shadow-2xl shadow-black/50">
          <div className="aspect-video">
            <Player
              component={EpisodeComposition as unknown as React.ComponentType<Record<string, unknown>>}
              inputProps={props}
              durationInFrames={totalFrames}
              compositionWidth={1920}
              compositionHeight={1080}
              fps={FPS}
              style={{ width: '100%', height: '100%' }}
              controls
              autoPlay={false}
              clickToPlay
              doubleClickToFullscreen
              spaceKeyToPlayOrPause
            />
          </div>
        </div>

        {/* Episode info + actions */}
        <div className="mt-6 max-w-3xl space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-zinc-100">
              Episode {episode.episodeNumber}: {episode.title}
            </h2>
            {episode.synopsis && (
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {episode.synopsis}
              </p>
            )}
            <div className="mt-3 flex items-center gap-4 text-xs text-zinc-500">
              <span>{series.title}</span>
              <span>Episode {episode.episodeNumber} of {series.totalEpisodes}</span>
              {episode.durationSeconds && (
                <span>{Math.round(episode.durationSeconds / 60)} min</span>
              )}
            </div>
          </div>

          {/* Quiz CTA */}
          {quizData?.quiz && (
            <Card className="border-fuchsia-500/20 bg-gradient-to-r from-fuchsia-950/20 to-cyan-950/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/10">
                  <BrainCircuit className="h-5 w-5 text-fuchsia-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-200">
                    Test your knowledge
                  </p>
                  <p className="text-xs text-zinc-500">
                    {quizData.quiz.questions.length} questions based on this episode
                  </p>
                </div>
                <Button asChild size="sm" className="bg-gradient-to-r from-fuchsia-500 to-cyan-500">
                  <Link href={`/watch/${episodeId}/quiz`}>
                    Take Quiz
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Study Notes */}
          {notesData?.notes && (
            <StudyNotesSection notes={notesData.notes} />
          )}
        </div>
      </main>
    </div>
  );
}
