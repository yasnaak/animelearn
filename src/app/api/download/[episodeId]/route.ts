import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/server/db';
import {
  episodes,
  projects,
  panels,
  audioTracks,
  shots,
} from '@/server/db/schema';
import { eq } from 'drizzle-orm';
import {
  assembleEpisodeProps,
  assembleEpisodePropsV2,
} from '@/server/services/render';
import { renderEpisodeMp4 } from '@/server/services/remotion-render';
import type {
  EpisodeScript,
  AudioDirection,
  AudioDirectionV2,
  Screenplay,
  SeriesPlan,
} from '@/server/services/ai-pipeline';
import { readFile, unlink } from 'fs/promises';
import path from 'path';
import os from 'os';

export const maxDuration = 300; // 5 min for Vercel Pro

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ episodeId: string }> },
) {
  const { episodeId } = await params;

  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_RE.test(episodeId)) {
    return NextResponse.json({ error: 'Invalid episode ID' }, { status: 400 });
  }

  // Fetch episode
  const ep = (
    await db
      .select()
      .from(episodes)
      .where(eq(episodes.id, episodeId))
      .limit(1)
  )[0];

  if (!ep || ep.status !== 'ready') {
    return NextResponse.json(
      { error: 'Episode not found or not ready' },
      { status: 404 },
    );
  }

  // If already rendered, redirect to stored URL
  if (ep.videoUrl) {
    return NextResponse.redirect(ep.videoUrl);
  }

  const isV2 = !!(ep.screenplay as unknown as Screenplay | null)?.acts?.length;

  if (!isV2 && (!ep.script || !ep.audioDirection)) {
    return NextResponse.json(
      { error: 'Episode data incomplete' },
      { status: 422 },
    );
  }
  if (isV2 && !ep.audioDirection) {
    return NextResponse.json(
      { error: 'Episode data incomplete' },
      { status: 422 },
    );
  }

  // Load project
  const project = (
    await db
      .select()
      .from(projects)
      .where(eq(projects.id, ep.projectId))
      .limit(1)
  )[0];

  if (!project) {
    return NextResponse.json(
      { error: 'Project not found' },
      { status: 404 },
    );
  }

  const plan = project.seriesPlan as unknown as SeriesPlan;

  const audioTrackRecords = await db
    .select()
    .from(audioTracks)
    .where(eq(audioTracks.episodeId, episodeId));

  let props;

  if (isV2) {
    const shotRecords = await db
      .select()
      .from(shots)
      .where(eq(shots.episodeId, episodeId))
      .orderBy(shots.shotOrder);

    props = assembleEpisodePropsV2({
      episodeNumber: ep.episodeNumber,
      episodeTitle: ep.title,
      seriesTitle: plan.series.title,
      screenplay: ep.screenplay as unknown as Screenplay,
      audioDirection: ep.audioDirection as unknown as AudioDirectionV2,
      shotRecords: shotRecords.map((sr) => ({
        shotId: sr.shotId,
        sceneId: sr.sceneId,
        shotType: sr.shotType,
        referenceImageUrl: sr.referenceImageUrl,
        videoUrl: sr.videoUrl,
        durationSeconds: sr.durationSeconds,
        metadata: sr.metadata,
      })),
      audioTrackRecords: audioTrackRecords.map((at) => ({
        trackType: at.trackType,
        audioUrl: at.audioUrl,
        durationMs: at.durationMs,
        shotId: at.shotId,
        metadata: at.metadata,
      })),
    });
  } else {
    const panelRecords = await db
      .select()
      .from(panels)
      .where(eq(panels.episodeId, episodeId))
      .orderBy(panels.panelOrder);

    props = assembleEpisodeProps({
      episodeNumber: ep.episodeNumber,
      episodeTitle: ep.title,
      seriesTitle: plan.series.title,
      script: ep.script as unknown as EpisodeScript,
      audioDirection: ep.audioDirection as unknown as AudioDirection,
      panelRecords: panelRecords.map((pr) => ({
        panelId: pr.panelId,
        backgroundImageUrl: pr.backgroundImageUrl,
        characterLayerUrl: pr.characterLayerUrl,
        effectLayerUrl: pr.effectLayerUrl,
        videoUrl: pr.videoUrl,
        metadata: pr.metadata,
      })),
      audioTrackRecords: audioTrackRecords.map((at) => ({
        trackType: at.trackType,
        audioUrl: at.audioUrl,
        durationMs: at.durationMs,
        panelId: at.panelId,
        metadata: at.metadata,
      })),
    });
  }

  // Render to temp file
  const outputPath = path.join(
    os.tmpdir(),
    `animeforge-${episodeId}-${Date.now()}.mp4`,
  );

  try {
    await renderEpisodeMp4(props, outputPath);

    const fileBuffer = await readFile(outputPath);

    // Clean up temp file
    await unlink(outputPath).catch(() => {});

    const safeTitle = ep.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 60);

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeTitle}.mp4"`,
        'Content-Length': String(fileBuffer.length),
      },
    });
  } catch (error) {
    // Clean up on failure
    await unlink(outputPath).catch(() => {});
    console.error('MP4 render failed:', error);
    return NextResponse.json(
      {
        error:
          'Rendering failed. This feature requires significant server resources and may not be available in all environments.',
      },
      { status: 500 },
    );
  }
}
