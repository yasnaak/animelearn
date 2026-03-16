import type { Metadata } from 'next';
import { db } from '@/server/db';
import { episodes, projects } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SeriesPlan } from '@/server/services/ai-pipeline';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}): Promise<Metadata> {
  const { episodeId } = await params;

  if (!UUID_RE.test(episodeId)) {
    return { title: 'Episode Not Found — AnimeForge' };
  }

  const episode = await db
    .select({
      title: episodes.title,
      episodeNumber: episodes.episodeNumber,
      synopsis: episodes.synopsis,
      projectId: episodes.projectId,
      status: episodes.status,
    })
    .from(episodes)
    .where(eq(episodes.id, episodeId))
    .limit(1);

  const ep = episode[0];
  if (!ep || ep.status !== 'ready') {
    return {
      title: 'Episode Not Found — AnimeForge',
    };
  }

  const project = await db
    .select({ seriesPlan: projects.seriesPlan })
    .from(projects)
    .where(eq(projects.id, ep.projectId))
    .limit(1);

  const plan = project[0]?.seriesPlan as unknown as SeriesPlan | null;
  const seriesTitle = plan?.series?.title ?? 'AnimeForge';

  const title = `Episode ${ep.episodeNumber}: ${ep.title} — ${seriesTitle}`;
  const description =
    ep.synopsis ??
    `Watch Episode ${ep.episodeNumber} of ${seriesTitle} on AnimeForge`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'AnimeForge',
      type: 'video.episode',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default function WatchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
