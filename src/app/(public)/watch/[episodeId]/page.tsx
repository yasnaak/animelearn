'use client';

import { use, useMemo } from 'react';
import { Player } from '@remotion/player';
import { trpc } from '@/lib/trpc/client';
import { EpisodeComposition } from '@/remotion/EpisodeComposition';
import type { EpisodeCompositionProps } from '@/remotion/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

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

export default function WatchEpisodePage({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}) {
  const { episodeId } = use(params);

  const { data, isLoading, error } =
    trpc.render.getPublicCompositionProps.useQuery({ episodeId });

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

        {/* Episode info */}
        <div className="mt-6 max-w-3xl">
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
      </main>
    </div>
  );
}
