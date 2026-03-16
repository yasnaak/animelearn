'use client';

import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Play, Clock, Loader2 } from 'lucide-react';
import Link from 'next/link';

const STYLE_LABELS: Record<string, string> = {
  clean_modern: 'Clean Modern',
  soft_pastel: 'Soft Pastel',
  dark_dramatic: 'Dark Dramatic',
  retro_classic: 'Retro Classic',
};

export default function ExamplesPage() {
  const { data: examples, isLoading } = trpc.render.listExamples.useQuery();

  return (
    <div className="min-h-screen bg-black">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-4">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-zinc-400 hover:text-zinc-200"
          >
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold text-zinc-100">
              Example Episodes
            </h1>
            <p className="text-xs text-zinc-500">
              See what AnimeForge can create — no account needed
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
          </div>
        )}

        {!isLoading && (!examples || examples.length === 0) && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <p className="text-lg font-medium text-zinc-300">
              No example episodes yet
            </p>
            <p className="mt-2 max-w-md text-sm text-zinc-500">
              Example episodes will appear here once they are generated and
              marked as public. Check back soon!
            </p>
            <Button asChild className="mt-8" variant="outline">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        )}

        {examples && examples.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {examples.map((ep) => (
              <Link key={ep.id} href={`/watch/${ep.id}`}>
                <Card className="group cursor-pointer border-zinc-800 bg-zinc-900/50 transition-all hover:border-zinc-700 hover:bg-zinc-900">
                  {/* Thumbnail placeholder */}
                  <div className="relative aspect-video overflow-hidden rounded-t-lg bg-gradient-to-br from-zinc-800 to-zinc-900">
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
                        <Play className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2">
                      <Badge
                        variant="outline"
                        className="border-zinc-600 bg-black/60 text-xs text-zinc-300 backdrop-blur-sm"
                      >
                        {STYLE_LABELS[ep.style] ?? ep.style}
                      </Badge>
                    </div>
                    {ep.durationSeconds && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-zinc-300 backdrop-blur-sm">
                        <Clock className="h-3 w-3" />
                        {Math.round(ep.durationSeconds / 60)} min
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">
                      {ep.seriesTitle}
                    </p>
                    <h3 className="mt-1 font-medium text-zinc-200 line-clamp-1">
                      Ep. {ep.episodeNumber}: {ep.title}
                    </h3>
                    {ep.synopsis && (
                      <p className="mt-2 text-xs text-zinc-500 line-clamp-2">
                        {ep.synopsis}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
