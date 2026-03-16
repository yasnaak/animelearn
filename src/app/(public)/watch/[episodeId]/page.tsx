'use client';

import { use, useMemo, useState } from 'react';
import { Player } from '@remotion/player';
import { trpc } from '@/lib/trpc/client';
import { EpisodeComposition } from '@/remotion/EpisodeComposition';
import { EpisodeCompositionV2 } from '@/remotion/EpisodeCompositionV2';
import type { EpisodeCompositionProps, EpisodeCompositionPropsV2 } from '@/remotion/types';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Download,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Youtube,
  Tag,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

const FPS = 30;
const INTRO_FRAMES = 150;
const END_CARD_FRAMES = 450;
const TRANSITION_FRAMES = 15;

// V2 constants
const COLD_OPEN_FRAMES = 3 * FPS;
const TITLE_CARD_FRAMES = 3 * FPS;
const INTRA_SCENE_TRANSITION = 3;
const INTER_SCENE_TRANSITION = 15;

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

function calculateTotalFramesV2(props: EpisodeCompositionPropsV2): number {
  let currentFrame = props.coldOpen ? COLD_OPEN_FRAMES : 0;
  currentFrame += TITLE_CARD_FRAMES;

  for (const scene of props.scenes) {
    for (let i = 0; i < scene.shots.length; i++) {
      const isFirstShotOfScene = i === 0;
      const transitionFrames = isFirstShotOfScene
        ? INTER_SCENE_TRANSITION
        : INTRA_SCENE_TRANSITION;
      currentFrame += scene.shots[i].durationFrames - transitionFrames;
    }
  }

  currentFrame += END_CARD_FRAMES;
  return currentFrame;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      className="h-7 gap-1 text-xs text-zinc-400 hover:text-zinc-200"
    >
      {copied ? (
        <Check className="h-3 w-3 text-green-400" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
      {copied ? 'Copied' : label}
    </Button>
  );
}

interface YouTubeMetadata {
  title?: string;
  description?: string;
  tags?: string[];
  chapters?: Array<{ time: string; label: string }>;
  thumbnail_prompt?: string;
  shorts_hook?: string;
}

function YouTubeMetadataPanel({ metadata }: { metadata: YouTubeMetadata }) {
  const [expanded, setExpanded] = useState(false);

  if (!metadata.title && !metadata.description && !metadata.tags?.length) {
    return null;
  }

  const fullDescription = [
    metadata.description ?? '',
    metadata.chapters?.length
      ? '\n\nChapters:\n' + metadata.chapters.map((c) => `${c.time} ${c.label}`).join('\n')
      : '',
    metadata.tags?.length
      ? '\n\n' + metadata.tags.map((t) => `#${t.replace(/\s+/g, '')}`).join(' ')
      : '',
  ]
    .filter(Boolean)
    .join('');

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Youtube className="h-4 w-4 text-red-400" />
          <span className="text-sm font-medium text-zinc-200">YouTube-Ready Metadata</span>
        </div>
        <span className="text-xs text-zinc-500">{expanded ? 'Collapse' : 'Expand'}</span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-zinc-800 px-4 py-4">
          {/* Title */}
          {metadata.title && (
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <FileText className="h-3 w-3" />
                  Video Title
                </label>
                <CopyButton text={metadata.title} label="Copy" />
              </div>
              <p className="mt-1 rounded bg-zinc-800/50 px-3 py-2 text-sm text-zinc-200">
                {metadata.title}
              </p>
            </div>
          )}

          {/* Description */}
          {fullDescription && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-500">
                  Description
                </label>
                <CopyButton text={fullDescription} label="Copy All" />
              </div>
              <pre className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded bg-zinc-800/50 px-3 py-2 text-xs leading-relaxed text-zinc-300">
                {fullDescription}
              </pre>
            </div>
          )}

          {/* Tags */}
          {metadata.tags && metadata.tags.length > 0 && (
            <div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                  <Tag className="h-3 w-3" />
                  Tags ({metadata.tags.length})
                </label>
                <CopyButton text={metadata.tags.join(', ')} label="Copy" />
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {metadata.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shorts hook */}
          {metadata.shorts_hook && (
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-500">
                  Shorts Hook
                </label>
                <CopyButton text={metadata.shorts_hook} label="Copy" />
              </div>
              <p className="mt-1 rounded bg-zinc-800/50 px-3 py-2 text-xs italic text-zinc-400">
                {metadata.shorts_hook}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
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

  const isV2 = data?.isV2 ?? false;

  const totalFrames = useMemo(() => {
    if (!data?.props) return 300;
    if (isV2) {
      return calculateTotalFramesV2(data.props as unknown as EpisodeCompositionPropsV2);
    }
    return calculateTotalFrames(data.props as unknown as EpisodeCompositionProps);
  }, [data?.props, isV2]);

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
          <Link href="/">Go Home</Link>
        </Button>
      </div>
    );
  }

  const { props, episode, series, youtubeMetadata, navigation } = data;
  const ytMeta = youtubeMetadata as YouTubeMetadata | null;

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
              component={
                isV2
                  ? (EpisodeCompositionV2 as unknown as React.ComponentType<Record<string, unknown>>)
                  : (EpisodeComposition as unknown as React.ComponentType<Record<string, unknown>>)
              }
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

        {/* Episode navigation */}
        {(navigation?.prev || navigation?.next) && (
          <div className="mt-4 flex items-center justify-between">
            {navigation.prev ? (
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200">
                <Link href={`/watch/${navigation.prev.id}`}>
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  Ep. {navigation.prev.episodeNumber}: {navigation.prev.title}
                </Link>
              </Button>
            ) : (
              <div />
            )}
            {navigation.next ? (
              <Button asChild variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-200">
                <Link href={`/watch/${navigation.next.id}`}>
                  Ep. {navigation.next.episodeNumber}: {navigation.next.title}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <div />
            )}
          </div>
        )}

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
            <div className="mt-4">
              <Button
                asChild
                variant="outline"
                size="sm"
                className="text-zinc-300"
              >
                <a href={`/api/download/${episodeId}`} download>
                  <Download className="mr-2 h-4 w-4" />
                  Download MP4
                </a>
              </Button>
            </div>
          </div>

          {/* YouTube metadata */}
          {ytMeta && <YouTubeMetadataPanel metadata={ytMeta} />}
        </div>
      </main>
    </div>
  );
}
