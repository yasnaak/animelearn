import type { Metadata } from 'next';
import { db } from '@/server/db';
import { episodes, projects } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import type { SeriesPlan } from '@/server/services/ai-pipeline';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ episodeId: string }>;
}): Promise<Metadata> {
  const { episodeId } = await params;

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
      title: 'Episode Not Found — AnimeLearn',
    };
  }

  const project = await db
    .select({ seriesPlan: projects.seriesPlan })
    .from(projects)
    .where(eq(projects.id, ep.projectId))
    .limit(1);

  const plan = project[0]?.seriesPlan as unknown as SeriesPlan | null;
  const seriesTitle = plan?.series?.title ?? 'AnimeLearn';

  const title = `Episode ${ep.episodeNumber}: ${ep.title} — ${seriesTitle}`;
  const description =
    ep.synopsis ??
    `Watch Episode ${ep.episodeNumber} of ${seriesTitle} on AnimeLearn`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: 'AnimeLearn',
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
