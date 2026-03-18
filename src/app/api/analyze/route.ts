import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { db } from '@/server/db';
import { projects, episodes, characters } from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import { analyzeContent, planSeries, type ContentAnalysis } from '@/server/services/ai-pipeline';

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { projectId, phase } = body as { projectId: string; phase: 'analyze' | 'plan' };

  if (!projectId || !phase) {
    return NextResponse.json({ error: 'Missing projectId or phase' }, { status: 400 });
  }

  const project = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);

  const p = project[0];
  if (!p || p.userId !== session.user.id) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  try {
    if (phase === 'analyze') {
      if (!p.rawContent) {
        return NextResponse.json({ error: 'No content to analyze' }, { status: 400 });
      }

      await db
        .update(projects)
        .set({ status: 'analyzing', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      const result = await analyzeContent(
        p.rawContent,
        p.sourceType as 'pdf' | 'youtube' | 'text' | 'idea' | 'url',
        p.language,
      );

      await db
        .update(projects)
        .set({ contentAnalysis: result.data, status: 'analyzed', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      return NextResponse.json({ success: true, phase: 'analyzed' });
    }

    if (phase === 'plan') {
      if (!p.contentAnalysis) {
        return NextResponse.json({ error: 'Not analyzed yet' }, { status: 400 });
      }

      await db
        .update(projects)
        .set({ status: 'planning', updatedAt: new Date() })
        .where(eq(projects.id, projectId));

      const planResult = await planSeries(
        p.contentAnalysis as ContentAnalysis,
        p.style,
        p.language,
      );

      for (const char of planResult.data.characters) {
        await db.insert(characters).values({
          projectId,
          name: char.name,
          role: char.role,
          visualDescription: char.visual_description,
          personality: char as unknown as Record<string, unknown>,
        });
      }

      for (const ep of planResult.data.episodes) {
        await db.insert(episodes).values({
          projectId,
          episodeNumber: ep.episode_number,
          title: ep.title,
          synopsis: ep.synopsis,
          status: 'planned',
        });
      }

      await db
        .update(projects)
        .set({
          seriesPlan: planResult.data,
          totalEpisodes: planResult.data.series.total_episodes,
          status: 'planned',
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId));

      return NextResponse.json({ success: true, phase: 'planned' });
    }

    return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
  } catch (error) {
    await db
      .update(projects)
      .set({ status: 'draft', updatedAt: new Date() })
      .where(eq(projects.id, projectId));

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 },
    );
  }
}
